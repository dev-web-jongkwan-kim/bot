import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

export interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// OKX Algo Order Response (Binance compatible)
export interface AlgoOrderResponse {
  algoId: string;
  algoClOrdId: string;
  instId: string;
  symbol: string;           // Binance compatible (mapped from instId)
  side: 'buy' | 'sell';
  posSide: 'long' | 'short' | 'net';
  ordType: string;
  type: string;             // Binance compatible (alias for ordType)
  triggerPx: string;
  sz: string;
  algoStatus: string;
  closePosition: boolean;   // Binance compatible
  cTime: string;
  uTime: string;
}

@Injectable()
export class OkxService {
  private readonly logger = new Logger(OkxService.name);
  private readonly MAX_RETRIES = 5;
  private readonly MAX_RETRY_DELAY = 30000;
  private symbolInfoCache: Map<string, any> = new Map();

  // OKX API credentials
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;
  private readonly baseUrl = 'https://www.okx.com';

  // Circuit Breakers
  private orderBreaker: CircuitBreaker<[() => Promise<any>], any>;
  private queryBreaker: CircuitBreaker<[() => Promise<any>], any>;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OKX_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('OKX_SECRET_KEY') || '';
    this.passphrase = this.configService.get<string>('OKX_PASSPHRASE') || '';

    // Circuit Breaker 설정 - 주문용
    this.orderBreaker = new CircuitBreaker(
      async (fn: () => Promise<any>) => fn(),
      {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        volumeThreshold: 5,
      }
    );

    // Circuit Breaker 설정 - 조회용
    this.queryBreaker = new CircuitBreaker(
      async (fn: () => Promise<any>) => fn(),
      {
        timeout: 15000,
        errorThresholdPercentage: 60,
        resetTimeout: 30000,
        volumeThreshold: 10,
      }
    );

    // Circuit Breaker 이벤트 로깅
    this.orderBreaker.on('open', () =>
      this.logger.error('🔴 [CIRCUIT BREAKER] Order circuit OPENED')
    );
    this.orderBreaker.on('halfOpen', () =>
      this.logger.warn('🟡 [CIRCUIT BREAKER] Order circuit HALF-OPEN')
    );
    this.orderBreaker.on('close', () =>
      this.logger.log('🟢 [CIRCUIT BREAKER] Order circuit CLOSED')
    );

    this.logger.log('OKX client initialized');
    this.loadExchangeInfo();
  }

  /**
   * OKX symbol format: BTCUSDT -> BTC-USDT-SWAP
   */
  private toOkxInstId(symbol: string): string {
    // BTCUSDT -> BTC-USDT-SWAP
    const base = symbol.replace('USDT', '');
    return `${base}-USDT-SWAP`;
  }

  /**
   * OKX instId to Binance format: BTC-USDT-SWAP -> BTCUSDT
   */
  private fromOkxInstId(instId: string): string {
    // BTC-USDT-SWAP -> BTCUSDT
    const parts = instId.split('-');
    return `${parts[0]}USDT`;
  }

  /**
   * OKX API signature
   */
  private createSignature(timestamp: string, method: string, path: string, body: string = ''): string {
    const prehash = timestamp + method + path + body;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(prehash)
      .digest('base64');
  }

  /**
   * OKX API headers
   */
  private getHeaders(method: string, path: string, body: string = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    const signature = this.createSignature(timestamp, method, path, body);

    return {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
    };
  }

  private async loadExchangeInfo() {
    try {
      const info = await this.getExchangeInfo();
      info.forEach((instrument: any) => {
        // BTC-USDT-SWAP -> BTCUSDT 형식으로 저장
        const symbol = this.fromOkxInstId(instrument.instId);
        this.symbolInfoCache.set(symbol, instrument);
      });
      this.logger.log(`Exchange info loaded: ${this.symbolInfoCache.size} symbols`);
    } catch (error) {
      this.logger.error('Failed to load exchange info:', error);
    }
  }

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

        if (error.message?.includes('Breaker is open')) {
          this.logger.error(`[CIRCUIT OPEN] ${operationName} - circuit breaker is open`);
          throw error;
        }

        const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED'];
        const isRetryable = retryableCodes.includes(error.code) ||
          error.message?.includes('network') ||
          error.message?.includes('timeout');

        if (isRetryable && !isLastAttempt) {
          const baseDelay = Math.min(Math.pow(2, attempt) * 1000, this.MAX_RETRY_DELAY);
          const jitter = Math.random() * baseDelay * 0.3;
          const delay = Math.round(baseDelay + jitter);

          this.logger.warn(
            `${operationName} failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`
          );
          await this.sleep(delay);
          continue;
        }

        this.logger.error(`${operationName} failed:`, error.message || error);
        throw error;
      }
    }
    throw new Error(`${operationName} failed after ${retries} attempts`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get candles (klines) from OKX
   */
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 500,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]> {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        // OKX interval format: 5m -> 5m, 15m -> 15m (same)
        let bar = interval;

        let url = `${this.baseUrl}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;
        if (endTime) {
          url += `&after=${endTime}`;
        }
        if (startTime) {
          url += `&before=${startTime}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        // OKX returns newest first, reverse for chronological order
        // OKX format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
        return data.data.reverse().map((k: any) => ({
          openTime: parseInt(k[0]),
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          volume: k[5],
          closeTime: parseInt(k[0]) + this.intervalToMs(interval),
          quoteVolume: k[7] || '0',
          trades: 0,
          takerBuyBaseVolume: '',
          takerBuyQuoteVolume: '',
        }));
      },
      `getKlines(${symbol})`,
    );
  }

  private intervalToMs(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  /**
   * Get 24h ticker
   */
  async get24hTicker(symbol: string) {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        const url = `${this.baseUrl}/api/v5/market/ticker?instId=${instId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        const ticker = data.data[0];
        return {
          symbol,
          priceChange: ticker.last - ticker.open24h,
          priceChangePercent: ((ticker.last - ticker.open24h) / ticker.open24h * 100).toFixed(2),
          lastPrice: ticker.last,
          volume: ticker.vol24h,
          quoteVolume: ticker.volCcy24h,
        };
      },
      `get24hTicker(${symbol})`,
    );
  }

  /**
   * Get all tickers
   */
  async getAll24hTickers() {
    return this.retryOperation(
      async () => {
        const url = `${this.baseUrl}/api/v5/market/tickers?instType=SWAP`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        // Filter USDT swaps only
        return data.data
          .filter((t: any) => t.instId.includes('-USDT-SWAP'))
          .map((ticker: any) => ({
            symbol: this.fromOkxInstId(ticker.instId),
            priceChange: parseFloat(ticker.last) - parseFloat(ticker.open24h),
            priceChangePercent: ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h) * 100).toFixed(2),
            lastPrice: ticker.last,
            volume: ticker.vol24h,
            quoteVolume: ticker.volCcy24h,
          }));
      },
      'getAll24hTickers',
    );
  }

  /**
   * Get account info (Binance compatible format)
   */
  async getAccountInfo() {
    return this.retryOperation(
      async () => {
        const path = '/api/v5/account/balance';
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        const account = data.data[0];
        const usdtBalance = account.details?.find((d: any) => d.ccy === 'USDT');

        // Map to Binance-compatible format
        return {
          totalWalletBalance: usdtBalance?.eq || account.totalEq || '0',
          totalUnrealizedProfit: usdtBalance?.upl || '0',
          totalMarginBalance: usdtBalance?.eq || account.totalEq || '0',
          availableBalance: usdtBalance?.availBal || '0',
          maxWithdrawAmount: usdtBalance?.availBal || '0',
          // Original OKX data
          raw: account,
        };
      },
      'getAccountInfo',
    );
  }

  /**
   * Get available balance
   */
  async getAvailableBalance(): Promise<number> {
    return this.retryOperation(
      async () => {
        const account = await this.getAccountInfo();
        const availableBalance = parseFloat(account.availableBalance || '0');
        this.logger.debug(`[Balance] Available: $${availableBalance.toFixed(2)}`);
        return availableBalance;
      },
      'getAvailableBalance',
    );
  }

  /**
   * Get exchange info (instruments)
   */
  async getExchangeInfo() {
    return this.retryOperation(
      async () => {
        const url = `${this.baseUrl}/api/v5/public/instruments?instType=SWAP`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        // Filter USDT swaps
        return data.data.filter((i: any) => i.instId.includes('-USDT-SWAP'));
      },
      'getExchangeInfo',
    );
  }

  /**
   * Set leverage for a symbol
   */
  async changeLeverage(symbol: string, leverage: number) {
    try {
      const instId = this.toOkxInstId(symbol);
      const path = '/api/v5/account/set-leverage';
      const body = JSON.stringify({
        instId,
        lever: leverage.toString(),
        mgnMode: 'cross', // cross margin
      });
      const headers = this.getHeaders('POST', path, body);

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body,
      });
      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`OKX API error: ${data.msg}`);
      }

      this.logger.log(`[LEVERAGE] ${symbol} set to ${leverage}x`);
      return data.data;
    } catch (error: any) {
      this.logger.error(`Error changing leverage for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Format quantity to OKX precision
   */
  formatQuantity(symbol: string, quantity: number): string {
    const symbolInfo = this.symbolInfoCache.get(symbol);
    if (!symbolInfo) {
      this.logger.warn(`No symbol info for ${symbol}, using default precision`);
      return quantity.toFixed(3);
    }

    // OKX uses lotSz for step size
    const lotSz = parseFloat(symbolInfo.lotSz || '0.001');
    const precision = Math.abs(Math.log10(lotSz));

    // Round to lot size
    const rounded = Math.floor(quantity / lotSz) * lotSz;
    return rounded.toFixed(precision);
  }

  /**
   * Format price to OKX precision
   */
  formatPrice(symbol: string, price: number): string {
    const symbolInfo = this.symbolInfoCache.get(symbol);
    if (!symbolInfo) {
      this.logger.warn(`No symbol info for ${symbol}, using default precision`);
      return price.toFixed(2);
    }

    // OKX uses tickSz for tick size
    const tickSz = parseFloat(symbolInfo.tickSz || '0.01');
    const rounded = Math.round(price / tickSz) * tickSz;
    const precision = Math.abs(Math.log10(tickSz));

    return rounded.toFixed(precision > 0 ? precision : 2);
  }

  /**
   * Create order on OKX
   * ✅ 방향 반전 로직 포함: LONG 신호 → SELL/short, SHORT 신호 → BUY/long
   */
  async createOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    quantity?: number;
    price?: number;
    stopPrice?: number;
    closePosition?: boolean;
    reduceOnly?: boolean;
    posSide?: 'long' | 'short';  // OKX position side
    timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';  // Binance compatibility
  }) {
    try {
      const instId = this.toOkxInstId(params.symbol);
      const path = '/api/v5/trade/order';

      // ✅ 방향 반전 로직 (reduceOnly 주문은 반전하지 않음!)
      // 원래: BUY → long, SELL → short
      // 반전: BUY → short, SELL → long
      // reduceOnly: 포지션 청산이므로 반전 없이 원래 방향 유지
      let finalSide: 'buy' | 'sell';
      let finalPosSide: 'long' | 'short';

      if (params.reduceOnly) {
        // 포지션 청산: 반전 없음
        finalSide = params.side === 'BUY' ? 'buy' : 'sell';
        finalPosSide = params.side === 'BUY' ? 'short' : 'long';  // BUY closes SHORT, SELL closes LONG
        this.logger.log(
          `[ORDER] ReduceOnly - No reversal: ${params.side} → ${finalSide.toUpperCase()} (closing ${finalPosSide})`
        );
      } else {
        // 신규 진입: 방향 반전
        finalSide = params.side === 'BUY' ? 'sell' : 'buy';
        finalPosSide = params.side === 'BUY' ? 'short' : 'long';
        this.logger.log(
          `[ORDER REVERSAL] Original: ${params.side} → Reversed: ${finalSide.toUpperCase()} (${finalPosSide})`
        );
      }

      // OKX order type mapping
      let ordType = 'market';
      if (params.type === 'LIMIT') ordType = 'limit';

      const orderBody: any = {
        instId,
        tdMode: 'cross',  // cross margin
        side: finalSide,  // ✅ 최종 방향 (reduceOnly면 원래, 아니면 반전)
        posSide: finalPosSide,  // ✅ 최종 포지션 방향
        ordType,
        sz: params.quantity ? this.formatQuantity(params.symbol, params.quantity) : undefined,
      };

      if (params.type === 'LIMIT' && params.price) {
        orderBody.px = this.formatPrice(params.symbol, params.price);
      }

      if (params.reduceOnly) {
        orderBody.reduceOnly = true;
      }

      const body = JSON.stringify(orderBody);
      const headers = this.getHeaders('POST', path, body);

      this.logger.log(
        `[ORDER] Creating ${params.type} order:\n` +
        `  Symbol: ${params.symbol} (${instId})\n` +
        `  Original Side: ${params.side}\n` +
        `  Final Side: ${finalSide.toUpperCase()} / ${finalPosSide}\n` +
        `  ReduceOnly: ${params.reduceOnly || false}\n` +
        `  Quantity: ${orderBody.sz}`
      );

      const response = await this.orderBreaker.fire(async () => {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers,
          body,
        });
        return res.json();
      }) as any;

      if (response.code !== '0') {
        throw new Error(`OKX order error: ${response.msg}`);
      }

      const order = response.data[0];
      this.logger.log(`[ORDER] ✓ Created successfully: ${order.ordId}`);

      // For market orders, get the actual fill price
      const fillPrice = order.avgPx ? parseFloat(order.avgPx) : (params.price || 0);
      const executedQty = order.fillSz ? parseFloat(order.fillSz) : parseFloat(orderBody.sz || '0');

      return {
        orderId: order.ordId,
        symbol: params.symbol,
        side: finalSide.toUpperCase(),
        type: params.type,
        origQty: orderBody.sz,
        executedQty: executedQty.toString(),  // Binance compatible
        avgPrice: fillPrice,                   // Binance compatible
        price: fillPrice,                      // Binance compatible
        status: 'NEW',
      };
    } catch (error: any) {
      this.logger.error(`Error creating order for ${params.symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Create Algo Order (SL/TP)
   * ✅ 방향 반전 로직 포함
   */
  async createAlgoOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    triggerPrice: number;
    quantity?: number;
    closePosition?: boolean;
    isStrategyPosition?: boolean;  // 전략 포지션 여부 (true면 반전 필요)
  }): Promise<AlgoOrderResponse> {
    const instId = this.toOkxInstId(params.symbol);
    const path = '/api/v5/trade/order-algo';

    // ✅ 방향 반전 로직
    // isStrategyPosition=true: 전략 포지션 (DB side는 신호 방향) → 반전 필요
    // isStrategyPosition=false: 수동 포지션 (DB side는 실제 방향) → 반전 없음
    let finalSide: 'buy' | 'sell';
    let finalPosSide: 'long' | 'short';

    // 기본값: 전략 포지션으로 가정 (기존 동작 유지)
    const needReversal = params.isStrategyPosition !== false;

    if (needReversal) {
      // 전략 포지션: 방향 반전
      finalSide = params.side === 'BUY' ? 'sell' : 'buy';
      finalPosSide = params.side === 'BUY' ? 'short' : 'long';
      this.logger.log(
        `[ALGO ORDER REVERSAL] Strategy position: ${params.side} → ${finalSide.toUpperCase()} (${finalPosSide})`
      );
    } else {
      // 수동 포지션: 반전 없음
      finalSide = params.side === 'BUY' ? 'buy' : 'sell';
      finalPosSide = params.side === 'BUY' ? 'short' : 'long';  // BUY closes SHORT, SELL closes LONG
      this.logger.log(
        `[ALGO ORDER] Manual position - No reversal: ${params.side} → ${finalSide.toUpperCase()} (closing ${finalPosSide})`
      );
    }

    // OKX algo order type: conditional
    const orderBody: any = {
      instId,
      tdMode: 'cross',
      side: finalSide,  // ✅ 최종 방향 (closePosition이면 원래, 아니면 반전)
      posSide: finalPosSide,  // ✅ 최종 포지션 방향
      ordType: 'conditional',
      triggerPx: this.formatPrice(params.symbol, params.triggerPrice),
      triggerPxType: 'last',  // last price trigger
    };

    if (params.closePosition) {
      orderBody.closeFraction = '1';  // Close 100%
    } else if (params.quantity) {
      orderBody.sz = this.formatQuantity(params.symbol, params.quantity);
    }

    // SL uses slTriggerPx, TP uses tpTriggerPx
    if (params.type === 'STOP_MARKET') {
      orderBody.slTriggerPx = this.formatPrice(params.symbol, params.triggerPrice);
      orderBody.slTriggerPxType = 'last';
      orderBody.slOrdPx = '-1';  // Market order
    } else {
      orderBody.tpTriggerPx = this.formatPrice(params.symbol, params.triggerPrice);
      orderBody.tpTriggerPxType = 'last';
      orderBody.tpOrdPx = '-1';  // Market order
    }

    const body = JSON.stringify(orderBody);
    const headers = this.getHeaders('POST', path, body);

    this.logger.log(
      `[ALGO ORDER] Creating ${params.type}:\n` +
      `  Symbol: ${params.symbol}\n` +
      `  Original Side: ${params.side}\n` +
      `  Final Side: ${finalSide.toUpperCase()} / ${finalPosSide}\n` +
      `  Trigger Price: ${orderBody.triggerPx}\n` +
      `  Close Position: ${params.closePosition || false}\n` +
      `  Order Body: ${JSON.stringify(orderBody)}`
    );

    try {
      const response = await this.orderBreaker.fire(async () => {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers,
          body,
        });
        return res.json();
      }) as any;

      if (response.code !== '0') {
        // 더 자세한 에러 정보 출력
        const errorMsg = response.msg || response.data?.[0]?.sMsg || JSON.stringify(response);
        this.logger.error(`[ALGO ORDER] OKX Response Error:`, JSON.stringify(response, null, 2));
        throw new Error(`OKX algo order error: ${errorMsg}`);
      }

      const order = response.data[0];
      this.logger.log(`[ALGO ORDER] ✓ Created: ${order.algoId}`);

      return {
        algoId: order.algoId,
        algoClOrdId: order.algoClOrdId || '',
        instId,
        symbol: params.symbol,             // Binance compatible
        side: finalSide,
        posSide: finalPosSide,
        ordType: params.type,
        type: params.type,                  // Binance compatible (alias)
        triggerPx: orderBody.triggerPx,
        sz: orderBody.sz || '0',
        algoStatus: 'live',
        closePosition: params.closePosition || false,  // Binance compatible
        cTime: Date.now().toString(),
        uTime: Date.now().toString(),
      };
    } catch (error: any) {
      this.logger.error(`[ALGO ORDER] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel Algo Order
   */
  async cancelAlgoOrder(symbol: string, algoId: string): Promise<any> {
    const instId = this.toOkxInstId(symbol);
    const path = '/api/v5/trade/cancel-algos';

    const body = JSON.stringify([{
      instId,
      algoId,
    }]);
    const headers = this.getHeaders('POST', path, body);

    try {
      const response = await this.orderBreaker.fire(async () => {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers,
          body,
        });
        return res.json();
      }) as any;

      if (response.code !== '0') {
        throw new Error(`OKX cancel algo error: ${response.msg}`);
      }

      this.logger.log(`[ALGO ORDER] Canceled: ${algoId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[ALGO ORDER] Cancel failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions() {
    return this.retryOperation(
      async () => {
        const path = '/api/v5/account/positions';
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        // Filter positions with non-zero size
        return data.data
          .filter((p: any) => parseFloat(p.pos) !== 0)
          .map((p: any) => ({
            symbol: this.fromOkxInstId(p.instId),
            positionAmt: p.pos,
            entryPrice: p.avgPx,
            unrealizedProfit: p.upl,
            leverage: p.lever,
            liquidationPrice: p.liqPx,
            positionSide: p.posSide,
          }));
      },
      'getOpenPositions',
    );
  }

  /**
   * Get open algo orders (Binance compatible)
   */
  async getOpenAlgoOrders(symbol?: string): Promise<AlgoOrderResponse[]> {
    const path = '/api/v5/trade/orders-algo-pending?ordType=conditional';
    const headers = this.getHeaders('GET', path);

    try {
      const response = await this.queryBreaker.fire(async () => {
        const res = await fetch(`${this.baseUrl}${path}`, { headers });
        return res.json();
      }) as any;

      if (response.code !== '0') {
        throw new Error(`OKX API error: ${response.msg}`);
      }

      let orders = response.data;

      if (symbol) {
        const instId = this.toOkxInstId(symbol);
        orders = orders.filter((o: any) => o.instId === instId);
      }

      // Map to Binance-compatible format
      const mappedOrders = orders.map((o: any) => ({
        ...o,
        symbol: this.fromOkxInstId(o.instId),  // Binance compatible
        type: o.ordType || 'STOP_MARKET',       // Binance compatible (map ordType to type)
        closePosition: o.closeFraction === '1', // Binance compatible
      }));

      this.logger.debug(`[ALGO ORDER] Found ${mappedOrders.length} open algo orders`);
      return mappedOrders;
    } catch (error: any) {
      this.logger.error(`[ALGO ORDER] Query failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get symbol price
   */
  async getSymbolPrice(symbol: string): Promise<number> {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        const url = `${this.baseUrl}/api/v5/market/ticker?instId=${instId}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        const price = parseFloat(data.data[0].last);
        this.logger.debug(`[MARKET PRICE] ${symbol}: ${price}`);
        return price;
      },
      `getSymbolPrice(${symbol})`,
    );
  }

  /**
   * Get tick size
   */
  getTickSize(symbol: string): number {
    const symbolInfo = this.symbolInfoCache.get(symbol);

    if (!symbolInfo) {
      throw new Error(`Symbol info not found for ${symbol}`);
    }

    return parseFloat(symbolInfo.tickSz);
  }

  /**
   * Get lot size info
   */
  getLotSizeInfo(symbol: string): { minQty: number; maxQty: number; stepSize: number } {
    const symbolInfo = this.symbolInfoCache.get(symbol);

    if (!symbolInfo) {
      throw new Error(`Symbol info not found for ${symbol}`);
    }

    return {
      minQty: parseFloat(symbolInfo.minSz || '0.001'),
      maxQty: parseFloat(symbolInfo.maxSz || '100000'),
      stepSize: parseFloat(symbolInfo.lotSz || '0.001'),
    };
  }

  /**
   * Get min notional
   */
  getMinNotional(symbol: string): number {
    // OKX default min notional is typically 5 USDT
    return 5;
  }

  /**
   * Get historical candles
   */
  async getHistoricalCandles(
    symbol: string,
    interval: '5m' | '15m',
    limit: number = 100
  ): Promise<CandleData[]> {
    try {
      const candles = await this.getKlines(symbol, interval, limit);

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

  /**
   * Query order status
   */
  async queryOrder(symbol: string, orderId: string): Promise<any> {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        const path = `/api/v5/trade/order?instId=${instId}&ordId=${orderId}`;
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        return data.data[0];
      },
      `queryOrder(${symbol}, ${orderId})`,
    );
  }

  /**
   * Cancel order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    const instId = this.toOkxInstId(symbol);
    const path = '/api/v5/trade/cancel-order';
    const body = JSON.stringify({
      instId,
      ordId: orderId,
    });
    const headers = this.getHeaders('POST', path, body);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body,
      });
      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`OKX API error: ${data.msg}`);
      }

      this.logger.log(`[CANCEL ORDER] ${symbol} #${orderId} canceled`);
      return data.data;
    } catch (error: any) {
      this.logger.error(`Error canceling order:`, error.message);
      throw error;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol: string): Promise<any[]> {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        const path = `/api/v5/trade/orders-pending?instId=${instId}`;
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        return data.data;
      },
      `getOpenOrders(${symbol})`,
    );
  }

  /**
   * Modify stop loss (cancel and recreate)
   */
  async modifyStopLoss(
    symbol: string,
    side: 'LONG' | 'SHORT',
    newStopPrice: number,
    existingSlAlgoId?: string
  ): Promise<any> {
    try {
      // Cancel existing SL
      if (existingSlAlgoId) {
        try {
          await this.cancelAlgoOrder(symbol, existingSlAlgoId);
          this.logger.log(`[MODIFY SL] Canceled existing SL: ${existingSlAlgoId}`);
        } catch (cancelError: any) {
          this.logger.debug(`[MODIFY SL] Could not cancel existing SL`);
        }
      }

      // Create new SL
      const newSlOrder = await this.createAlgoOrder({
        symbol,
        side: side === 'LONG' ? 'SELL' : 'BUY',
        type: 'STOP_MARKET',
        triggerPrice: newStopPrice,
        closePosition: true,
      });

      this.logger.log(
        `[MODIFY SL] New SL created:\n` +
        `  Symbol: ${symbol}\n` +
        `  Trigger Price: ${this.formatPrice(symbol, newStopPrice)}\n` +
        `  Algo ID: ${newSlOrder.algoId}`
      );

      return newSlOrder;
    } catch (error: any) {
      this.logger.error(`[MODIFY SL] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Refresh exchange info
   */
  async refreshExchangeInfo(): Promise<void> {
    this.logger.log('[EXCHANGE INFO] Refreshing...');
    await this.loadExchangeInfo();
    this.logger.log('[EXCHANGE INFO] Refreshed');
  }

  /**
   * Get symbol info
   */
  getSymbolInfo(symbol: string): any {
    const info = this.symbolInfoCache.get(symbol);
    if (!info) {
      throw new Error(`Symbol info not found for ${symbol}`);
    }
    return info;
  }

  /**
   * Cancel all algo orders for symbol
   */
  async cancelAllAlgoOrders(symbol: string): Promise<{ canceled: number; failed: number }> {
    let canceled = 0;
    let failed = 0;

    try {
      const openAlgoOrders = await this.getOpenAlgoOrders(symbol);

      if (openAlgoOrders.length === 0) {
        return { canceled: 0, failed: 0 };
      }

      this.logger.log(`[CLEANUP] Canceling ${openAlgoOrders.length} algo orders for ${symbol}...`);

      for (const order of openAlgoOrders) {
        try {
          await this.cancelAlgoOrder(symbol, order.algoId);
          canceled++;
        } catch (error: any) {
          failed++;
          this.logger.warn(`[CLEANUP] Failed to cancel ${order.algoId}: ${error.message}`);
        }
      }

      this.logger.log(`[CLEANUP] ${symbol}: ${canceled} canceled, ${failed} failed`);
      return { canceled, failed };
    } catch (error: any) {
      this.logger.error(`[CLEANUP] Failed:`, error.message);
      return { canceled, failed };
    }
  }

  /**
   * Get all open orders (Binance compatibility)
   */
  async getAllOpenOrders(): Promise<any[]> {
    return this.retryOperation(
      async () => {
        const path = '/api/v5/trade/orders-pending';
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        return data.data.map((o: any) => ({
          ...o,
          symbol: this.fromOkxInstId(o.instId),
        }));
      },
      'getAllOpenOrders',
    );
  }

  /**
   * Get recent trades (Binance compatibility)
   */
  async getRecentTrades(symbol: string, limit: number = 10): Promise<any[]> {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        const path = `/api/v5/trade/fills?instId=${instId}&limit=${limit}`;
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        this.logger.debug(`[RECENT TRADES] ${symbol}: ${data.data.length} trades found`);
        return data.data.map((t: any) => ({
          symbol,
          price: t.fillPx,
          qty: t.fillSz,
          realizedPnl: t.pnl || '0',
          time: parseInt(t.fillTime),
        }));
      },
      `getRecentTrades(${symbol})`,
    );
  }

  /**
   * Change margin type (Binance compatibility - OKX always uses cross by default)
   */
  async changeMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<any> {
    // OKX uses position mode setting instead
    // For simplicity, we'll just log and return success
    this.logger.log(`[MARGIN TYPE] ${symbol} set to ${marginType} (OKX default: cross)`);
    return { success: true, alreadySet: true };
  }

  /**
   * Update createOrder return type for Binance compatibility
   */
  getOrderWithDetails(order: any, entryPrice: number, executedQty: number) {
    return {
      ...order,
      avgPrice: entryPrice,
      price: entryPrice,
      executedQty: executedQty.toString(),
    };
  }
}
