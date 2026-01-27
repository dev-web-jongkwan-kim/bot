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
        mgnMode: 'isolated', // isolated margin (격리 마진)
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
   * ✅ OKX SWAP: sz는 계약 수 (quantity / ctVal)
   */
  formatQuantity(symbol: string, quantity: number): string {
    const symbolInfo = this.symbolInfoCache.get(symbol);
    if (!symbolInfo) {
      this.logger.warn(`No symbol info for ${symbol}, using default precision`);
      return quantity.toFixed(3);
    }

    // OKX SWAP: ctVal = 1 contract의 가치 (base currency 단위)
    // 예: ctVal = 10 이면 1계약 = 10 ZAMA
    const ctVal = parseFloat(symbolInfo.ctVal || '1');

    // quantity는 base currency 단위, sz는 계약 수
    // sz = quantity / ctVal
    let contractQty = quantity / ctVal;

    // OKX uses lotSz for step size
    const lotSz = parseFloat(symbolInfo.lotSz || '1');
    const precision = Math.max(0, Math.abs(Math.log10(lotSz)));

    // Round to lot size (OKX 계약은 보통 정수)
    const rounded = Math.floor(contractQty / lotSz) * lotSz;

    // 최소 1 계약 보장
    const finalQty = Math.max(rounded, lotSz);

    this.logger.log(`[QTY] ${symbol}: qty=${quantity.toFixed(2)} / ctVal=${ctVal} = ${finalQty} contracts`);

    return finalQty.toFixed(precision > 10 ? 0 : precision);
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

      // ✅ 전략이 이미 리버스 로직을 처리하므로 signal.side를 그대로 사용
      // - BUY → buy (롱 포지션 오픈)
      // - SELL → sell (숏 포지션 오픈)
      const finalSide: 'buy' | 'sell' = params.side === 'BUY' ? 'buy' : 'sell';
      this.logger.log(`[ORDER] ${params.reduceOnly ? 'Close' : 'Entry'}: ${params.side} → ${finalSide.toUpperCase()}`)

      // OKX order type mapping
      let ordType = 'market';
      if (params.type === 'LIMIT') ordType = 'limit';

      const orderBody: any = {
        instId,
        tdMode: 'isolated',  // ✅ isolated margin (격리 마진)
        side: finalSide,
        posSide: 'net',   // ✅ OKX one-way mode
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
        `  Side: ${finalSide.toUpperCase()}\n` +
        `  Quantity: ${orderBody.sz}\n` +
        `  Price: ${orderBody.px || 'N/A'}\n` +
        `  Body: ${body}`
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
        this.logger.error(`[ORDER] OKX Error Response: ${JSON.stringify(response)}`);
        throw new Error(`OKX order error: ${response.msg} (code: ${response.code})`);
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
   * ✅ SL/TP 알고 주문 생성 (포지션 청산용)
   * caller가 지정한 side 그대로 사용 (LONG 청산=SELL, SHORT 청산=BUY)
   */
  async createAlgoOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    triggerPrice: number;
    quantity?: number;
    quantityInContracts?: number;  // v12.2: 이미 contracts 단위인 수량 (formatQuantity 스킵)
    closePosition?: boolean;
    isStrategyPosition?: boolean;  // DEPRECATED: 더 이상 사용하지 않음 (backwards compatibility)
  }): Promise<AlgoOrderResponse> {
    const instId = this.toOkxInstId(params.symbol);
    const path = '/api/v5/trade/order-algo';

    // ✅ SL/TP는 포지션 청산용이므로 caller가 지정한 방향 그대로 사용
    // - LONG 포지션 청산: side = 'SELL' → sell
    // - SHORT 포지션 청산: side = 'BUY' → buy
    const finalSide: 'buy' | 'sell' = params.side === 'BUY' ? 'buy' : 'sell';
    this.logger.log(`[ALGO ORDER] ${params.type}: ${params.side} → ${finalSide.toUpperCase()}`)

    // OKX algo order type: conditional
    // ✅ OKX one-way mode: posSide는 'net'으로 설정 (또는 생략)
    const orderBody: any = {
      instId,
      tdMode: 'isolated',  // ✅ isolated margin (격리 마진)
      side: finalSide,  // ✅ 최종 방향
      posSide: 'net',   // ✅ One-way mode에서는 'net' 사용
      ordType: 'conditional',
    };

    if (params.closePosition) {
      // ✅ closeFraction 사용 시 reduceOnly 필요 (SL만 지원)
      orderBody.closeFraction = '1';  // Close 100%
      orderBody.reduceOnly = true;
    } else if (params.quantityInContracts) {
      // v12.2: 이미 contracts 단위 - formatQuantity 스킵
      orderBody.sz = String(params.quantityInContracts);
      orderBody.reduceOnly = true;  // ✅ 필수: 새 포지션 오픈 방지
      this.logger.log(`[ALGO ORDER] Using raw contracts: ${params.quantityInContracts}`);
    } else if (params.quantity) {
      // 기존 방식: base currency → contracts 변환
      orderBody.sz = this.formatQuantity(params.symbol, params.quantity);
      orderBody.reduceOnly = true;  // ✅ 필수: 새 포지션 오픈 방지
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
      `  Final Side: ${finalSide.toUpperCase()} (posSide: net)\n` +
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
        posSide: 'net',
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
            unRealizedProfit: p.upl,  // v16: Binance 호환용 alias
            markPrice: p.markPx || p.avgPx,  // v16: Mark price 추가
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
      // OKX는 모든 algo order에 ordType: 'conditional' 반환
      // SL: slTriggerPx 속성 존재
      // TP: tpTriggerPx 속성 존재
      const mappedOrders = orders.map((o: any) => {
        let type = 'STOP_MARKET';  // default
        if (o.tpTriggerPx && parseFloat(o.tpTriggerPx) > 0) {
          type = 'TAKE_PROFIT_MARKET';
        } else if (o.slTriggerPx && parseFloat(o.slTriggerPx) > 0) {
          type = 'STOP_MARKET';
        }

        return {
          ...o,
          symbol: this.fromOkxInstId(o.instId),  // Binance compatible
          type: type,                             // ✅ SL vs TP 구분
          closePosition: o.closeFraction === '1', // Binance compatible
        };
      });

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
   * Get historical candles (with pagination for OKX 300 limit)
   */
  async getHistoricalCandles(
    symbol: string,
    interval: '5m' | '15m',
    limit: number = 100
  ): Promise<CandleData[]> {
    try {
      const OKX_MAX_LIMIT = 300;
      let allCandles: Candle[] = [];
      let endTime: number | undefined = undefined;

      // OKX는 최대 300개만 반환하므로 페이지네이션 필요
      while (allCandles.length < limit) {
        const remaining = limit - allCandles.length;
        const fetchLimit = Math.min(remaining, OKX_MAX_LIMIT);

        const candles = await this.getKlines(symbol, interval, fetchLimit, undefined, endTime);

        if (candles.length === 0) break;

        // 오래된 캔들을 앞에 추가 (시간순 정렬 유지)
        allCandles = [...candles, ...allCandles];

        // 다음 페이지를 위해 가장 오래된 캔들의 시간 설정
        endTime = candles[0].openTime;

        // API rate limit 방지
        if (allCandles.length < limit) {
          await this.sleep(200);
        }
      }

      return allCandles.slice(-limit).map(c => ({
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
      // ✅ side 파라미터는 실제 포지션 방향 (DB에서 가져옴) - 반전 불필요
      const newSlOrder = await this.createAlgoOrder({
        symbol,
        side: side === 'LONG' ? 'SELL' : 'BUY',
        type: 'STOP_MARKET',
        triggerPrice: newStopPrice,
        closePosition: true,
        isStrategyPosition: false,  // ✅ 실제 포지션 방향 - 반전 불필요
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
          commission: t.fee || '0',  // OKX uses 'fee', map to 'commission' for Binance compatibility
          side: t.side?.toUpperCase() || '',  // 'buy' or 'sell' → 'BUY' or 'SELL'
          time: parseInt(t.fillTime),
        }));
      },
      `getRecentTrades(${symbol})`,
    );
  }

  /**
   * v13: Get closed position history with accurate PnL
   * OKX API: GET /api/v5/account/positions-history
   */
  async getClosedPositionPnl(symbol: string): Promise<{ realizedPnl: number; fee: number; closePrice: number; closeTime: number } | null> {
    return this.retryOperation(
      async () => {
        const instId = this.toOkxInstId(symbol);
        const path = `/api/v5/account/positions-history?instType=SWAP&instId=${instId}&limit=1`;
        const headers = this.getHeaders('GET', path);

        const response = await fetch(`${this.baseUrl}${path}`, { headers });
        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX API error: ${data.msg}`);
        }

        if (!data.data || data.data.length === 0) {
          return null;
        }

        const pos = data.data[0];
        return {
          realizedPnl: parseFloat(pos.realizedPnl || pos.pnl || '0'),
          fee: Math.abs(parseFloat(pos.fee || '0')),
          closePrice: parseFloat(pos.closeAvgPx || '0'),
          closeTime: parseInt(pos.uTime || '0'),
        };
      },
      `getClosedPositionPnl(${symbol})`,
    );
  }

  /**
   * Change margin type (ISOLATED / CROSSED)
   * OKX API: POST /api/v5/account/set-leverage
   */
  async changeMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED', leverage: number = 15): Promise<any> {
    const instId = this.toOkxInstId(symbol);
    const path = '/api/v5/account/set-leverage';

    // OKX mgnMode: isolated = 격리, cross = 교차
    const mgnMode = marginType === 'ISOLATED' ? 'isolated' : 'cross';

    // v14: 레버리지를 파라미터로 받아서 사용 (기본값 15x)
    const leverageStr = String(leverage);

    const requestBody = {
      instId: instId,
      lever: leverageStr,
      mgnMode: mgnMode,
    };

    const body = JSON.stringify(requestBody);
    const headers = this.getHeaders('POST', path, body);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body,
      });

      const result = await response.json();

      if (result.code === '0') {
        this.logger.log(`[MARGIN TYPE] ✓ ${symbol} set to ${marginType} (${mgnMode}) with ${leverageStr}x leverage`);
        return { success: true, data: result.data };
      } else if (result.code === '51010') {
        // 이미 같은 설정인 경우
        this.logger.log(`[MARGIN TYPE] ${symbol} already set to ${marginType}`);
        return { success: true, alreadySet: true };
      } else {
        this.logger.warn(`[MARGIN TYPE] ${symbol} - OKX response: ${JSON.stringify(result)}`);
        // 실패해도 진행 (포지션이 이미 있는 경우 등)
        return { success: false, error: result.msg };
      }
    } catch (error: any) {
      this.logger.error(`[MARGIN TYPE] Error setting ${marginType} for ${symbol}: ${error.message}`);
      return { success: false, error: error.message };
    }
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
