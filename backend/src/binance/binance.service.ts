import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Binance from 'binance-api-node';
import CircuitBreaker from 'opossum';
import * as crypto from 'crypto';

export interface Candle {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private client: ReturnType<typeof Binance>;
  private readonly MAX_RETRIES = 5;  // ✅ 증가된 재시도 횟수
  private readonly MAX_RETRY_DELAY = 30000; // ✅ 최대 30초 대기
  private symbolInfoCache: Map<string, any> = new Map();

  // ✅ API credentials for Algo Order API (signed requests)
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl = 'https://fapi.binance.com';

  // ✅ Circuit Breaker for API resilience
  private orderBreaker: CircuitBreaker<[() => Promise<any>], any>;
  private queryBreaker: CircuitBreaker<[() => Promise<any>], any>;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('BINANCE_SECRET_KEY') || '';
    const testnet = this.configService.get<string>('BINANCE_TESTNET') === 'true';

    this.client = Binance({
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
    });

    // ✅ Circuit Breaker 설정 - 주문용 (더 엄격)
    this.orderBreaker = new CircuitBreaker(
      async (fn: () => Promise<any>) => fn(),
      {
        timeout: 30000,  // 30초 타임아웃
        errorThresholdPercentage: 50,  // 50% 실패율에서 열림
        resetTimeout: 60000,  // 1분 후 반열림 상태로 전환
        volumeThreshold: 5,  // 최소 5번의 요청 후 판단
        // ✅ 특정 에러는 Circuit Breaker 실패로 카운트하지 않음
        errorFilter: (err: any) => {
          // -4509: "TIF GTE can only be used with open positions"
          // 이 에러는 일시적 상태 문제 (포지션 인식 지연)
          // -4130: 이미 동일한 주문이 존재함
          // 이러한 에러는 실패로 카운트하지 않음 (true 반환 = 성공 취급)
          if (err?.code === -4509 || err?.code === -4130) {
            this.logger.debug(`[CIRCUIT BREAKER] Ignoring error ${err.code} - not counting as failure`);
            return true;  // 실패로 카운트하지 않음
          }
          return false;  // 다른 에러는 실패로 카운트
        },
      }
    );

    // ✅ Circuit Breaker 설정 - 조회용 (덜 엄격)
    this.queryBreaker = new CircuitBreaker(
      async (fn: () => Promise<any>) => fn(),
      {
        timeout: 15000,  // 15초 타임아웃
        errorThresholdPercentage: 60,  // 60% 실패율에서 열림
        resetTimeout: 30000,  // 30초 후 반열림
        volumeThreshold: 10,
      }
    );

    // Circuit Breaker 이벤트 로깅
    this.orderBreaker.on('open', () =>
      this.logger.error('🔴 [CIRCUIT BREAKER] Order circuit OPENED - requests will fail fast')
    );
    this.orderBreaker.on('halfOpen', () =>
      this.logger.warn('🟡 [CIRCUIT BREAKER] Order circuit HALF-OPEN - testing')
    );
    this.orderBreaker.on('close', () =>
      this.logger.log('🟢 [CIRCUIT BREAKER] Order circuit CLOSED - normal operation')
    );

    this.logger.log(`Binance client initialized (testnet: ${testnet})`);
    this.loadExchangeInfo();
  }

  private async loadExchangeInfo() {
    try {
      const info = await this.getExchangeInfo();
      info.symbols.forEach((symbol: any) => {
        this.symbolInfoCache.set(symbol.symbol, symbol);
      });
      this.logger.log(`Exchange info loaded: ${this.symbolInfoCache.size} symbols`);
    } catch (error) {
      this.logger.error('Failed to load exchange info:', error);
    }
  }

  // ✅ Exponential Backoff with Jitter
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = this.MAX_RETRIES,
    useCircuitBreaker = true,
  ): Promise<T> {
    const breaker = useCircuitBreaker ? this.queryBreaker : null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (breaker) {
          return await breaker.fire(() => operation()) as T;
        }
        return await operation();
      } catch (error: any) {
        const isLastAttempt = attempt === retries - 1;

        // Circuit breaker가 열린 경우
        if (error.message?.includes('Breaker is open')) {
          this.logger.error(`[CIRCUIT OPEN] ${operationName} - circuit breaker is open, failing fast`);
          throw error;
        }

        // 재시도 가능한 에러 코드
        const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', -1003, -1015];
        const isRetryable = retryableCodes.includes(error.code) ||
          error.message?.includes('network') ||
          error.message?.includes('timeout');

        if (isRetryable && !isLastAttempt) {
          // ✅ Exponential backoff with jitter
          const baseDelay = Math.min(Math.pow(2, attempt) * 1000, this.MAX_RETRY_DELAY);
          const jitter = Math.random() * baseDelay * 0.3;  // 30% jitter
          const delay = Math.round(baseDelay + jitter);

          this.logger.warn(
            `${operationName} failed (attempt ${attempt + 1}/${retries}), ` +
            `retrying in ${delay}ms... [Error: ${error.code || error.message}]`,
          );
          await this.sleep(delay);
          continue;
        }

        // Critical errors - don't retry
        this.logger.error(`${operationName} failed:`, error.message || error);
        throw error;
      }
    }
    throw new Error(`${operationName} failed after ${retries} attempts`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 500,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]> {
    return this.retryOperation(
      async () => {
        const klines = await this.client.futuresCandles({
          symbol,
          interval: interval as any,
          limit,
          startTime,
          endTime,
        });

        return klines.map(k => ({
          openTime: k.openTime,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
          closeTime: k.closeTime,
          quoteVolume: k.quoteVolume,
          trades: k.trades,
          takerBuyBaseVolume: '',
          takerBuyQuoteVolume: '',
        }));
      },
      `getKlines(${symbol})`,
    );
  }

  async get24hTicker(symbol: string) {
    return this.retryOperation(
      async () => {
        const ticker = await this.client.futuresDailyStats({
          symbol,
        });
        return ticker;
      },
      `get24hTicker(${symbol})`,
    );
  }

  /**
   * 모든 선물 종목의 24시간 거래 통계 가져오기
   * 거래량 기반 종목 선택에 사용
   */
  async getAll24hTickers() {
    return this.retryOperation(
      async () => {
        const tickers = await this.client.futuresDailyStats();
        return tickers;
      },
      'getAll24hTickers',
    );
  }

  async getAccountInfo() {
    return this.retryOperation(
      async () => {
        const account = await this.client.futuresAccountInfo();
        return account;
      },
      'getAccountInfo',
    );
  }

  /**
   * Get available USDT balance from futures account
   * Used for dynamic position sizing (compound interest)
   */
  async getAvailableBalance(): Promise<number> {
    return this.retryOperation(
      async () => {
        const account = await this.client.futuresAccountInfo();
        const usdtAsset = account.assets?.find((a: any) => a.asset === 'USDT');

        if (!usdtAsset) {
          this.logger.warn('USDT asset not found in futures account');
          return 0;
        }

        const availableBalance = parseFloat(usdtAsset.availableBalance || '0');
        const walletBalance = parseFloat(usdtAsset.walletBalance || '0');

        this.logger.debug(
          `[Balance] Wallet: $${walletBalance.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
        );

        return availableBalance;
      },
      'getAvailableBalance',
    );
  }

  async getExchangeInfo() {
    return this.retryOperation(
      async () => {
        const info = await this.client.futuresExchangeInfo();
        return info;
      },
      'getExchangeInfo',
    );
  }

  async changeLeverage(symbol: string, leverage: number) {
    try {
      const result = await this.client.futuresLeverage({
        symbol,
        leverage,
      });
      return result;
    } catch (error) {
      this.logger.error(`Error changing leverage for ${symbol}:`, error);
      throw error;
    }
  }

  async changeMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED') {
    try {
      const result = await this.client.futuresMarginType({
        symbol,
        marginType,
      });
      return result;
    } catch (error: any) {
      // 이미 해당 마진 타입인 경우 에러 무시
      if (error.message && error.message.includes('No need to change margin type')) {
        this.logger.debug(`${symbol} already set to ${marginType}`);
        return { success: true, alreadySet: true };
      }
      this.logger.error(`Error changing margin type for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Quantity를 심볼의 precision에 맞게 포맷팅
   */
  formatQuantity(symbol: string, quantity: number): string {
    const symbolInfo = this.symbolInfoCache.get(symbol);
    if (!symbolInfo) {
      this.logger.warn(`No symbol info for ${symbol}, using default precision`);
      return quantity.toFixed(3);
    }

    // quantityPrecision 또는 LOT_SIZE 필터에서 stepSize 확인
    let precision = 3; // 기본값

    if (symbolInfo.quantityPrecision !== undefined) {
      precision = symbolInfo.quantityPrecision;
    } else if (symbolInfo.filters) {
      const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
      if (lotSizeFilter && lotSizeFilter.stepSize) {
        // stepSize에서 소수점 자릿수 계산 (예: 0.001 → 3)
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        precision = Math.abs(Math.log10(stepSize));
      }
    }

    return quantity.toFixed(precision);
  }

  /**
   * ✅ Price를 심볼의 tick size에 맞게 정렬 및 포맷팅
   * 단순 precision이 아닌 tick size의 정수 배수로 반올림
   */
  formatPrice(symbol: string, price: number): string {
    const symbolInfo = this.symbolInfoCache.get(symbol);
    if (!symbolInfo) {
      this.logger.warn(`No symbol info for ${symbol}, using default precision`);
      return price.toFixed(2);
    }

    // PRICE_FILTER에서 tickSize 추출
    const priceFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');

    if (priceFilter?.tickSize) {
      const tickSize = parseFloat(priceFilter.tickSize);

      // tick size의 정수 배수로 반올림
      // 예: price=0.0076542, tickSize=0.000001 → 0.007654
      const roundedPrice = Math.round(price / tickSize) * tickSize;

      // tick size에서 소수점 자릿수 계산
      const tickSizeStr = priceFilter.tickSize;
      const decimalPlaces = tickSizeStr.includes('.')
        ? tickSizeStr.split('.')[1].replace(/0+$/, '').length
        : 0;

      // tick size가 1 이상인 경우 (예: tickSize=1) 소수점 없이 반환
      if (tickSize >= 1) {
        return Math.round(roundedPrice).toString();
      }

      return roundedPrice.toFixed(decimalPlaces > 0 ? decimalPlaces : symbolInfo.pricePrecision || 2);
    }

    // fallback: precision 사용
    let precision = symbolInfo.pricePrecision ?? 2;
    return price.toFixed(precision);
  }

  // ✅ clientOrderId 생성 - 멱등성 보장 (최대 36자)
  private generateClientOrderId(symbol: string, type: string): string {
    // 바이낸스 제한: 36자 미만
    // 형식: SYM_T_TIMESTAMP_RANDOM (예: BONK_L_abc123_xyz789)
    const shortSymbol = symbol.replace('USDT', '').replace('1000', '').substring(0, 6);
    const typeChar = type.charAt(0); // L=LIMIT, M=MARKET, S=STOP_MARKET, T=TAKE_PROFIT_MARKET
    const timestamp = Date.now().toString(36); // base36로 변환 (8자)
    const random = Math.random().toString(36).substring(2, 8); // 6자
    return `${shortSymbol}_${typeChar}_${timestamp}_${random}`; // 최대 25자
  }

  async createOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    quantity?: number;
    price?: number;
    stopPrice?: number;
    closePosition?: boolean;
    reduceOnly?: boolean;  // 포지션 청산용 (MARKET 주문에서 사용)
    timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
    clientOrderId?: string;  // ✅ 멱등성용 ID
  }) {
    // ✅ clientOrderId가 없으면 자동 생성 (멱등성 보장)
    const clientOrderId = params.clientOrderId || this.generateClientOrderId(params.symbol, params.type);

    try {
      // Precision에 맞게 포맷팅
      const formattedQuantity = params.quantity
        ? this.formatQuantity(params.symbol, params.quantity)
        : undefined;

      const formattedPrice = params.price
        ? this.formatPrice(params.symbol, params.price)
        : undefined;

      const formattedStopPrice = params.stopPrice
        ? this.formatPrice(params.symbol, params.stopPrice)
        : undefined;

      // ✅ Circuit Breaker를 통한 주문 실행
      const order = await this.orderBreaker.fire(async () => {
        // ✅ 주문 파라미터 구성 - stopPrice는 STOP_MARKET/TAKE_PROFIT_MARKET에서만 사용
        const orderParams: any = {
          symbol: params.symbol,
          side: params.side,
          type: params.type,
          newClientOrderId: clientOrderId,
        };

        // quantity 추가 (closePosition이 아닌 경우에만, reduceOnly는 quantity 필요)
        if (formattedQuantity && (!params.closePosition || params.reduceOnly)) {
          orderParams.quantity = formattedQuantity;
        }

        // price 추가 (LIMIT 주문에만)
        if (formattedPrice && params.type === 'LIMIT') {
          orderParams.price = formattedPrice;
          orderParams.timeInForce = params.timeInForce || 'GTC';
        }

        // stopPrice 추가 (STOP_MARKET, TAKE_PROFIT_MARKET에서만)
        if (formattedStopPrice && (params.type === 'STOP_MARKET' || params.type === 'TAKE_PROFIT_MARKET')) {
          orderParams.stopPrice = formattedStopPrice;
        }

        // closePosition 추가 (true인 경우에만, STOP_MARKET/TAKE_PROFIT_MARKET용)
        if (params.closePosition) {
          orderParams.closePosition = 'true';
        }

        // reduceOnly 추가 (포지션 청산용 MARKET 주문)
        if (params.reduceOnly) {
          orderParams.reduceOnly = 'true';
        }

        return await this.client.futuresOrder(orderParams);
      }) as any;

      this.logger.debug(`[ORDER] Created with clientOrderId: ${clientOrderId}`);
      return order;
    } catch (error: any) {
      // ✅ 중복 주문 에러 처리 (-2015: Invalid API-key, IP, or permissions)
      // 이미 같은 clientOrderId로 주문이 존재하는 경우
      if (error.code === -2022 || error.message?.includes('Order would immediately trigger')) {
        this.logger.warn(`[ORDER] Order already exists or would trigger: ${clientOrderId}`);

        // 기존 주문 조회 시도
        try {
          const existingOrder = await this.client.futuresGetOrder({
            symbol: params.symbol,
            origClientOrderId: clientOrderId,
          });
          this.logger.log(`[ORDER] Retrieved existing order: ${existingOrder.orderId}`);
          return existingOrder;
        } catch (queryError) {
          // 조회 실패 시 원래 에러 throw
          throw error;
        }
      }

      this.logger.error(`Error creating order for ${params.symbol}:`, error);
      throw error;
    }
  }

  async getOpenPositions() {
    return this.retryOperation(
      async () => {
        const positions = await this.client.futuresPositionRisk();
        return positions.filter((p) => parseFloat(p.positionAmt) !== 0);
      },
      'getOpenPositions',
    );
  }

  /**
   * ✅ 심볼의 틱 사이즈 조회 (Binance Exchange Info API 사용)
   * PRICE_FILTER의 tickSize를 반환
   */
  getTickSize(symbol: string): number {
    const symbolInfo = this.symbolInfoCache.get(symbol);

    if (!symbolInfo) {
      this.logger.error(`[TICK SIZE] No symbol info found for ${symbol} in cache`);
      throw new Error(`Symbol info not found for ${symbol}. Exchange info may not be loaded.`);
    }

    // PRICE_FILTER에서 tickSize 추출
    const priceFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');

    if (!priceFilter || !priceFilter.tickSize) {
      this.logger.error(`[TICK SIZE] No PRICE_FILTER found for ${symbol}`);
      throw new Error(`PRICE_FILTER not found for ${symbol}`);
    }

    const tickSize = parseFloat(priceFilter.tickSize);
    this.logger.debug(`[TICK SIZE] ${symbol}: ${tickSize}`);

    return tickSize;
  }

  /**
   * ✅ 심볼의 최소/최대 수량 및 스텝 사이즈 조회
   * LOT_SIZE 필터에서 추출
   */
  getLotSizeInfo(symbol: string): { minQty: number; maxQty: number; stepSize: number } {
    const symbolInfo = this.symbolInfoCache.get(symbol);

    if (!symbolInfo) {
      this.logger.error(`[LOT SIZE] No symbol info found for ${symbol} in cache`);
      throw new Error(`Symbol info not found for ${symbol}`);
    }

    const lotSizeFilter = symbolInfo.filters?.find((f: any) => f.filterType === 'LOT_SIZE');

    if (!lotSizeFilter) {
      this.logger.error(`[LOT SIZE] No LOT_SIZE filter found for ${symbol}`);
      throw new Error(`LOT_SIZE filter not found for ${symbol}`);
    }

    const info = {
      minQty: parseFloat(lotSizeFilter.minQty),
      maxQty: parseFloat(lotSizeFilter.maxQty),
      stepSize: parseFloat(lotSizeFilter.stepSize),
    };

    this.logger.debug(`[LOT SIZE] ${symbol}: min=${info.minQty}, max=${info.maxQty}, step=${info.stepSize}`);

    return info;
  }

  /**
   * ✅ 심볼의 현재 시장가 조회
   * 메이커 주문 가격 계산에 사용
   */
  async getSymbolPrice(symbol: string): Promise<number> {
    return this.retryOperation(
      async () => {
        const ticker = await this.client.futuresPrices({ symbol });
        const price = parseFloat(ticker[symbol]);

        if (!price || isNaN(price)) {
          throw new Error(`Invalid price for ${symbol}: ${ticker[symbol]}`);
        }

        this.logger.debug(`[MARKET PRICE] ${symbol}: ${price}`);
        return price;
      },
      `getSymbolPrice(${symbol})`,
    );
  }

  /**
   * ✅ 최근 거래 내역 조회 (PnL 확인용)
   */
  async getRecentTrades(symbol: string, limit: number = 10): Promise<any[]> {
    return this.retryOperation(
      async () => {
        const trades = await this.client.futuresUserTrades({
          symbol,
          limit,
        });

        this.logger.debug(`[RECENT TRADES] ${symbol}: ${trades.length} trades found`);
        return trades;
      },
      `getRecentTrades(${symbol})`,
    );
  }

  /**
   * ✅ 주문 상태 조회
   */
  async queryOrder(symbol: string, orderId: number): Promise<any> {
    return this.retryOperation(
      async () => {
        const order = await this.client.futuresGetOrder({
          symbol,
          orderId,
        });

        this.logger.debug(`[QUERY ORDER] ${symbol} #${orderId}: ${order.status}`);
        return order;
      },
      `queryOrder(${symbol}, ${orderId})`,
    );
  }

  /**
   * ✅ 주문 취소
   */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    return this.retryOperation(
      async () => {
        const result = await this.client.futuresCancelOrder({
          symbol,
          orderId,
        });

        this.logger.log(`[CANCEL ORDER] ${symbol} #${orderId} canceled`);
        return result;
      },
      `cancelOrder(${symbol}, ${orderId})`,
    );
  }

  /**
   * ✅ 심볼의 최소 명목 가치 조회
   * MIN_NOTIONAL 필터에서 추출
   */
  getMinNotional(symbol: string): number {
    const symbolInfo = this.symbolInfoCache.get(symbol);

    if (!symbolInfo) {
      this.logger.warn(`[MIN NOTIONAL] No symbol info found for ${symbol}, using default 5 USDT`);
      return 5; // 기본값
    }

    const minNotionalFilter = symbolInfo.filters?.find(
      (f: any) => f.filterType === 'MIN_NOTIONAL'
    );

    if (!minNotionalFilter || !minNotionalFilter.notional) {
      this.logger.warn(`[MIN NOTIONAL] No MIN_NOTIONAL filter for ${symbol}, using default 5 USDT`);
      return 5;
    }

    const minNotional = parseFloat(minNotionalFilter.notional);
    this.logger.debug(`[MIN NOTIONAL] ${symbol}: ${minNotional} USDT`);

    return minNotional;
  }

  /**
   * ✅ Exchange Info 캐시 강제 새로고침
   * 심볼 정보 업데이트 필요 시 호출
   */
  async refreshExchangeInfo(): Promise<void> {
    this.logger.log('[EXCHANGE INFO] Refreshing exchange info cache...');
    await this.loadExchangeInfo();
    this.logger.log('[EXCHANGE INFO] Cache refreshed successfully');
  }

  /**
   * ✅ 심볼의 전체 거래 규칙 조회
   */
  getSymbolInfo(symbol: string): any {
    const info = this.symbolInfoCache.get(symbol);

    if (!info) {
      this.logger.error(`[SYMBOL INFO] No info found for ${symbol} in cache`);
      throw new Error(`Symbol info not found for ${symbol}`);
    }

    return info;
  }

  getClient() {
    return this.client;
  }

  /**
   * 특정 심볼의 모든 열린 주문 조회
   */
  async getOpenOrders(symbol: string): Promise<any[]> {
    return this.retryOperation(
      async () => {
        const orders = await this.client.futuresOpenOrders({ symbol });
        return orders;
      },
      `getOpenOrders(${symbol})`,
    );
  }

  /**
   * ✅ 모든 심볼의 열린 주문 조회 (symbol 파라미터 없음)
   */
  async getAllOpenOrders(): Promise<any[]> {
    return this.retryOperation(
      async () => {
        const orders = await this.client.futuresOpenOrders({});
        return orders;
      },
      `getAllOpenOrders()`,
    );
  }

  /**
   * 손절가 수정 (SL 본전 이동용)
   * 기존 SL 주문을 취소하고 새로운 SL 주문 생성
   * ✅ 2025-12-09: Algo Order API 사용으로 변경
   */
  async modifyStopLoss(
    symbol: string,
    side: 'LONG' | 'SHORT',
    newStopPrice: number,
    existingSlAlgoId?: number
  ): Promise<any> {
    try {
      // 1. 기존 SL Algo Order 취소 (있는 경우)
      if (existingSlAlgoId) {
        try {
          await this.cancelAlgoOrder(symbol, existingSlAlgoId);
          this.logger.log(`[MODIFY SL] Canceled existing SL algo order: ${existingSlAlgoId}`);
        } catch (cancelError: any) {
          // 이미 취소되었거나 체결된 경우 무시
          this.logger.debug(`[MODIFY SL] Could not cancel existing SL (may be already triggered/canceled)`);
        }
      }

      // 2. 새로운 SL Algo Order 생성 (closePosition 사용)
      const newSlOrder = await this.createAlgoOrder({
        symbol,
        side: side === 'LONG' ? 'SELL' : 'BUY',
        type: 'STOP_MARKET',
        triggerPrice: newStopPrice,
        closePosition: true,
      });

      this.logger.log(
        `[MODIFY SL] New SL algo order created:\n` +
        `  Symbol: ${symbol}\n` +
        `  Trigger Price: ${this.formatPrice(symbol, newStopPrice)}\n` +
        `  Algo ID: ${newSlOrder.algoId}`
      );

      return newSlOrder;
    } catch (error: any) {
      this.logger.error(`[MODIFY SL] Error modifying SL for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * 과거 캔들 데이터 가져오기 (실시간 매매 초기화용)
   */
  async getHistoricalCandles(
    symbol: string,
    interval: '5m' | '15m',
    limit: number = 100
  ): Promise<CandleData[]> {
    try {
      const candles = await this.client.futuresCandles({
        symbol,
        interval,
        limit,
      });

      return candles.map(c => ({
        timestamp: new Date(c.openTime),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume),
      }));
    } catch (error) {
      this.logger.error(`Failed to get historical candles for ${symbol} ${interval}:`, error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ NEW ALGO ORDER API (2025-12-09 바이낸스 API 변경 대응)
  // STOP_MARKET, TAKE_PROFIT_MARKET 등 조건부 주문은 이제 Algo Order API 사용 필수
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * ✅ HMAC SHA256 서명 생성
   */
  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * ✅ Algo Order API로 조건부 주문 생성 (STOP_MARKET, TAKE_PROFIT_MARKET)
   * 2025-12-09부터 필수: 기존 /fapi/v1/order 대신 /fapi/v1/algoOrder 사용
   *
   * @param params 주문 파라미터
   * @returns Algo Order 응답
   */
  async createAlgoOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'STOP' | 'TAKE_PROFIT' | 'TRAILING_STOP_MARKET';
    triggerPrice: number;
    quantity?: number;
    closePosition?: boolean;
    workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
    priceProtect?: boolean;
    callbackRate?: number;  // TRAILING_STOP_MARKET 전용 (0.1 ~ 10)
    activatePrice?: number; // TRAILING_STOP_MARKET 전용
  }): Promise<AlgoOrderResponse> {
    // Precision에 맞게 포맷팅
    const formattedTriggerPrice = this.formatPrice(params.symbol, params.triggerPrice);
    const formattedQuantity = params.quantity
      ? this.formatQuantity(params.symbol, params.quantity)
      : undefined;

    // 요청 파라미터 구성
    const requestParams: Record<string, string | number | boolean> = {
      algoType: 'CONDITIONAL',
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      triggerPrice: formattedTriggerPrice,
      workingType: params.workingType || 'CONTRACT_PRICE',
      timestamp: Date.now(),
    };

    // quantity 또는 closePosition 설정
    if (params.closePosition) {
      requestParams.closePosition = 'true';
    } else if (formattedQuantity) {
      requestParams.quantity = formattedQuantity;
    }

    // 가격 보호 설정
    if (params.priceProtect !== undefined) {
      requestParams.priceProtect = params.priceProtect ? 'TRUE' : 'FALSE';
    }

    // TRAILING_STOP_MARKET 전용 파라미터
    if (params.type === 'TRAILING_STOP_MARKET') {
      if (params.callbackRate) {
        requestParams.callbackRate = params.callbackRate;
      }
      if (params.activatePrice) {
        requestParams.activatePrice = this.formatPrice(params.symbol, params.activatePrice);
      }
    }

    // 쿼리 스트링 생성 및 서명
    const queryString = Object.entries(requestParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const signature = this.createSignature(queryString);

    const url = `${this.baseUrl}/fapi/v1/algoOrder?${queryString}&signature=${signature}`;

    this.logger.log(
      `[ALGO ORDER] Creating ${params.type} order:\n` +
      `  Symbol:        ${params.symbol}\n` +
      `  Side:          ${params.side}\n` +
      `  Trigger Price: ${formattedTriggerPrice}\n` +
      `  Quantity:      ${formattedQuantity || 'closePosition'}\n` +
      `  Working Type:  ${requestParams.workingType}`
    );

    try {
      const response = await this.orderBreaker.fire(async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const data = await res.json();

        if (!res.ok) {
          const error = new Error(data.msg || `Algo order failed: ${res.status}`);
          (error as any).code = data.code;
          throw error;
        }

        return data;
      }) as AlgoOrderResponse;

      this.logger.log(
        `[ALGO ORDER] ✓ Order created successfully:\n` +
        `  Algo ID:      ${response.algoId}\n` +
        `  Client Algo:  ${response.clientAlgoId}\n` +
        `  Status:       ${response.algoStatus}`
      );

      return response;
    } catch (error: any) {
      this.logger.error(
        `[ALGO ORDER] ❌ Failed to create ${params.type} order:\n` +
        `  Symbol: ${params.symbol}\n` +
        `  Error:  ${error.message}\n` +
        `  Code:   ${error.code || 'N/A'}`
      );
      throw error;
    }
  }

  /**
   * ✅ Algo Order 취소
   */
  async cancelAlgoOrder(symbol: string, algoId: number): Promise<any> {
    const requestParams: Record<string, string | number> = {
      symbol,
      algoId,
      timestamp: Date.now(),
    };

    const queryString = Object.entries(requestParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const signature = this.createSignature(queryString);

    const url = `${this.baseUrl}/fapi/v1/algoOrder?${queryString}&signature=${signature}`;

    try {
      const response = await this.orderBreaker.fire(async () => {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          const error = new Error(data.msg || `Cancel algo order failed: ${res.status}`);
          (error as any).code = data.code;
          throw error;
        }

        return data;
      });

      this.logger.log(`[ALGO ORDER] Canceled algo order ${algoId} for ${symbol}`);
      return response;
    } catch (error: any) {
      this.logger.error(`[ALGO ORDER] Failed to cancel algo order ${algoId}:`, error.message);
      throw error;
    }
  }

  /**
   * ✅ 열린 Algo Order 조회
   */
  async getOpenAlgoOrders(symbol?: string): Promise<AlgoOrderResponse[]> {
    const requestParams: Record<string, string | number> = {
      timestamp: Date.now(),
    };

    if (symbol) {
      requestParams.symbol = symbol;
    }

    const queryString = Object.entries(requestParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const signature = this.createSignature(queryString);

    const url = `${this.baseUrl}/fapi/v1/openAlgoOrders?${queryString}&signature=${signature}`;

    try {
      const rawResponse = await this.queryBreaker.fire(async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          const error = new Error(data.msg || `Query open algo orders failed: ${res.status}`);
          (error as any).code = data.code;
          throw error;
        }

        return data;
      }) as any[];

      // ✅ Binance는 orderType을 사용하지만 기존 코드는 type을 사용 → 호환성 추가
      const response: AlgoOrderResponse[] = rawResponse.map(order => ({
        ...order,
        type: order.orderType || order.type,  // type alias 추가
      }));

      this.logger.debug(`[ALGO ORDER] Found ${response.length} open algo orders${symbol ? ` for ${symbol}` : ''}: ${response.map(o => `${o.symbol}:${o.type}`).join(', ')}`);
      return response;
    } catch (error: any) {
      this.logger.error(`[ALGO ORDER] Failed to get open algo orders:`, error.message);
      throw error;
    }
  }

  /**
   * ✅ 특정 심볼의 모든 Algo Order 취소 (포지션 청산 후 정리용)
   */
  async cancelAllAlgoOrders(symbol: string): Promise<{ canceled: number; failed: number }> {
    let canceled = 0;
    let failed = 0;

    try {
      const openAlgoOrders = await this.getOpenAlgoOrders(symbol);

      if (openAlgoOrders.length === 0) {
        this.logger.debug(`[CLEANUP] No open algo orders for ${symbol}`);
        return { canceled: 0, failed: 0 };
      }

      this.logger.log(`[CLEANUP] Canceling ${openAlgoOrders.length} algo orders for ${symbol}...`);

      for (const order of openAlgoOrders) {
        try {
          await this.cancelAlgoOrder(symbol, order.algoId);
          canceled++;
          this.logger.log(`[CLEANUP] ✓ Canceled ${order.type} algo order ${order.algoId}`);
        } catch (error: any) {
          failed++;
          this.logger.warn(`[CLEANUP] ✗ Failed to cancel algo order ${order.algoId}: ${error.message}`);
        }
      }

      this.logger.log(`[CLEANUP] ${symbol} cleanup complete: ${canceled} canceled, ${failed} failed`);
      return { canceled, failed };
    } catch (error: any) {
      this.logger.error(`[CLEANUP] Failed to cleanup algo orders for ${symbol}:`, error.message);
      return { canceled, failed };
    }
  }
}

// ✅ Algo Order API 응답 타입 (Binance 공식 문서 기준)
interface AlgoOrderResponse {
  algoId: number;
  clientAlgoId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: string;  // 'STOP_MARKET', 'TAKE_PROFIT_MARKET' 등 (Binance는 type이 아닌 orderType 사용)
  type?: string;      // Alias for backward compatibility
  triggerPrice: string;
  quantity: string;
  closePosition?: boolean | string;  // boolean 또는 'true'/'false' 문자열
  algoStatus: 'NEW' | 'EXECUTING' | 'CANCELLED' | 'TRIGGERED' | 'REJECTED' | 'EXPIRED';
  workingType: string;
  createTime: number;
  updateTime: number;
}

interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}


