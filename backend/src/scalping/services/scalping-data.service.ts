import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { SymbolSelectionService } from '../../symbol-selection/symbol-selection.service';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import {
  FundingData,
  OiData,
  SpreadData,
  CandleData,
  SymbolMarketData,
  AtrResult,
  CvdResult,
} from '../interfaces';

/**
 * 스캘핑 전략에 필요한 추가 데이터 수집
 *
 * 기존에 WebSocket으로 받는 데이터:
 * - 5분봉, 15분봉, 실시간 가격
 *
 * 이 서비스에서 추가로 수집하는 데이터:
 * - Funding Rate (REST API, 1분마다)
 * - Open Interest (REST API, 1분마다)
 * - Book Ticker / Spread (REST API 또는 WebSocket)
 */
@Injectable()
export class ScalpingDataService implements OnModuleInit {
  private readonly logger = new Logger(ScalpingDataService.name);

  // OKX API 설정
  private readonly baseUrl = 'https://www.okx.com';

  // 모니터링할 심볼 목록
  private symbols: string[] = [];

  // 데이터 수집 통계
  private stats = {
    fundingUpdates: 0,
    oiUpdates: 0,
    spreadUpdates: 0,
    lastUpdateTime: 0,
  };

  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
    private configService: ConfigService,
    private symbolSelectionService: SymbolSelectionService,
  ) {}

  async onModuleInit() {
    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log('[ScalpingData] Initializing data service...');
    this.logger.log('[ScalpingData] Waiting for symbols to be selected via TradingControl...');
    this.logger.log('═══════════════════════════════════════════════════════════');
  }

  /**
   * 심볼 목록 로드
   *
   * SymbolSelectionService가 선택한 심볼 목록 사용
   * (WebSocket이 구독하는 심볼과 동일)
   */
  private async loadSymbolList(): Promise<void> {
    try {
      this.logger.log('[ScalpingData] STEP: Loading symbol list from SymbolSelectionService...');

      // SymbolSelectionService에서 선택된 심볼 가져오기
      this.symbols = this.symbolSelectionService.getSelectedSymbols();

      if (this.symbols.length === 0) {
        this.logger.warn('[ScalpingData] ⚠️ No symbols selected yet, waiting for SymbolSelectionService...');
        // 5초 후 재시도
        await new Promise((resolve) => setTimeout(resolve, 5000));
        this.symbols = this.symbolSelectionService.getSelectedSymbols();
      }

      this.logger.log(
        `[ScalpingData] ✓ Using ${this.symbols.length} symbols from SymbolSelectionService`,
      );
      this.logger.debug(
        `[ScalpingData] Symbols: ${this.symbols.slice(0, 10).join(', ')}...`,
      );
    } catch (error) {
      this.logger.error('[ScalpingData] ✗ Failed to load symbol list', error);
    }
  }

  // 초기 캔들 로드 완료 플래그
  private initialCandlesLoaded = false;

  /**
   * 심볼 목록 갱신 (SymbolSelectionService에서 다시 로드)
   */
  async refreshSymbolList(): Promise<void> {
    if (SCALPING_CONFIG.logging.verbose) {
      this.logger.log('[ScalpingData] Refreshing symbol list...');
    }
    const prevCount = this.symbols.length;
    this.symbols = this.symbolSelectionService.getSelectedSymbols();

    // 심볼 수가 변경된 경우에만 로깅
    if (this.symbols.length !== prevCount) {
      this.logger.log(`[ScalpingData] Symbol list updated: ${prevCount} → ${this.symbols.length} symbols`);
      if (this.symbols.length > 0) {
        this.logger.debug(`[ScalpingData] Symbols: ${this.symbols.slice(0, 5).join(', ')}...`);
      }
    }

    // 심볼이 처음 로드되면 초기 캔들 데이터 로드
    if (this.symbols.length > 0 && !this.initialCandlesLoaded) {
      this.logger.log('[ScalpingData] 🚀 Loading initial candle data from OKX REST API...');
      await this.loadInitialCandles();
      this.initialCandlesLoaded = true;
    }
    if (SCALPING_CONFIG.logging.verbose && this.symbols.length === 0) {
      this.logger.warn('[ScalpingData] No symbols available after refresh');
    }
  }

  /**
   * OKX REST API에서 초기 캔들 데이터 로드
   *
   * 서버 시작 시 WebSocket 캔들이 닫히기를 기다리지 않고
   * 히스토리 캔들을 미리 로드합니다.
   */
  private async loadInitialCandles(): Promise<void> {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    // 전체 심볼 로드 (Rate Limit: 20 req/2sec = 10 req/sec)
    const timeframes = ['5m', '15m'];
    const totalRequests = this.symbols.length * timeframes.length;

    this.logger.log(`[ScalpingData] Loading candles for ALL ${this.symbols.length} symbols (${timeframes.join(', ')})...`);
    this.logger.log(`[ScalpingData] Total requests: ${totalRequests}, estimated time: ${Math.ceil(totalRequests * 50 / 1000)}s`);

    for (const symbol of this.symbols) {
      for (const timeframe of timeframes) {
        try {
          await this.loadCandlesForSymbol(symbol, timeframe);
          successCount++;
        } catch (error) {
          errorCount++;
          if (errorCount <= 5) {
            this.logger.warn(`[ScalpingData] Failed to load ${symbol} ${timeframe}: ${error.message}`);
          }
        }
        // Rate limit 방지: 50ms 딜레이 (20 req/sec)
        await this.sleep(50);
      }
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `[ScalpingData] ✓ Initial candles loaded: ${successCount} success, ${errorCount} errors (${elapsed}ms)`,
    );
  }

  /**
   * 단일 심볼의 캔들 데이터 로드
   *
   * OKX API: GET /api/v5/market/candles
   */
  private async loadCandlesForSymbol(symbol: string, timeframe: string): Promise<void> {
    const instId = this.toOkxInstId(symbol);
    const limit = timeframe === '5m' ? 50 : 20; // 5분봉 50개, 15분봉 20개

    const response = await fetch(
      `${this.baseUrl}/api/v5/market/candles?instId=${instId}&bar=${timeframe}&limit=${limit}`,
    );
    const data = await response.json();

    if (data.code !== '0' || !data.data || data.data.length === 0) {
      throw new Error(`OKX API error: ${data.msg || 'No data'}`);
    }

    const key = `candles:${symbol}:${timeframe}`;
    const pipeline = this.redis.pipeline();

    // 기존 데이터 삭제
    pipeline.del(key);

    // OKX 캔들 형식: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
    // 역순으로 저장 (최신 것을 먼저 LPUSH)
    const candles = data.data.reverse(); // OKX는 최신부터 반환하므로 역순

    for (const candleData of candles) {
      const [ts, o, h, l, c, vol] = candleData;

      // 완료된 캔들만 저장 (confirm=1 또는 과거 캔들)
      const candleJson = JSON.stringify({
        timestamp: new Date(parseInt(ts)).toISOString(),
        open: parseFloat(o),
        high: parseFloat(h),
        low: parseFloat(l),
        close: parseFloat(c),
        volume: parseFloat(vol),
      });

      pipeline.lpush(key, candleJson);
    }

    // 최근 50개만 유지 + TTL 설정
    pipeline.ltrim(key, 0, 49);
    pipeline.expire(key, 900); // 15분 TTL

    await pipeline.exec();

    if (SCALPING_CONFIG.logging.verbose && symbol === 'BTCUSDT') {
      this.logger.debug(`[ScalpingData] Loaded ${candles.length} ${timeframe} candles for ${symbol}`);
    }
  }

  /**
   * OKX instId 변환: BTC-USDT-SWAP -> BTCUSDT
   */
  private fromOkxInstId(instId: string): string {
    const parts = instId.split('-');
    return `${parts[0]}USDT`;
  }

  /**
   * Binance 심볼 -> OKX instId 변환: BTCUSDT -> BTC-USDT-SWAP
   */
  private toOkxInstId(symbol: string): string {
    const base = symbol.replace('USDT', '');
    return `${base}-USDT-SWAP`;
  }

  /**
   * 1분마다 실행: 모든 마켓 데이터 수집
   */
  @Cron('0 * * * * *') // 매 분 0초
  async collectAllData(): Promise<void> {
    // 매번 심볼 목록 갱신 (TradingControl 시작 후 심볼이 선택됨)
    await this.refreshSymbolList();

    // 심볼이 없으면 스킵
    if (this.symbols.length === 0) {
      this.logger.debug('[ScalpingData] No symbols available, skipping data collection');
      return;
    }

    const startTime = Date.now();

    if (SCALPING_CONFIG.logging.verbose) {
      this.logger.log('────────────────────────────────────────────────────────────');
      this.logger.log(`[ScalpingData] Starting data collection for ${this.symbols.length} symbols...`);
    }

    try {
      await Promise.all([
        this.collectFundingRates(),
        this.collectOpenInterest(),
        this.collectSpreads(),
      ]);

      this.stats.lastUpdateTime = Date.now();
      const elapsed = Date.now() - startTime;

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.log(
          `[ScalpingData] ✓ Data collection completed in ${elapsed}ms ` +
            `(Funding: ${this.stats.fundingUpdates}, OI: ${this.stats.oiUpdates}, Spread: ${this.stats.spreadUpdates})`,
        );
      }
    } catch (error) {
      this.logger.error('[ScalpingData] ✗ Data collection failed', error);
    }
  }

  /**
   * Funding Rate 수집
   *
   * OKX API: GET /api/v5/public/funding-rate
   * - 1회 호출로 전체 종목 조회 가능
   */
  private async collectFundingRates(): Promise<void> {
    try {
      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug('[ScalpingData] Collecting funding rates...');
      }

      let updateCount = 0;
      const pipeline = this.redis.pipeline();

      // OKX는 단일 심볼씩 조회해야 함
      // 전체 종목 처리 (딜레이로 Rate Limit 대응)
      for (const symbol of this.symbols) {
        try {
          const instId = this.toOkxInstId(symbol);
          const response = await fetch(
            `${this.baseUrl}/api/v5/public/funding-rate?instId=${instId}`,
          );
          const data = await response.json();

          if (data.code === '0' && data.data && data.data[0]) {
            const item = data.data[0];
            const fundingData: FundingData = {
              symbol,
              fundingRate: parseFloat(item.fundingRate),
              nextFundingTime: parseInt(item.nextFundingTime),
              markPrice: parseFloat(item.markPx || '0'),
              indexPrice: parseFloat(item.indexPx || '0'),
              updatedAt: Date.now(),
            };

            pipeline.set(
              `scalping:funding:${symbol}`,
              JSON.stringify(fundingData),
              'EX',
              120, // 2분 TTL
            );
            updateCount++;

            if (SCALPING_CONFIG.logging.verbose && updateCount <= 5) {
              this.logger.debug(
                `[ScalpingData] Funding: ${symbol} = ${(fundingData.fundingRate * 100).toFixed(4)}%`,
              );
            }
          }

          // Rate limit 방지: 30ms 딜레이
          await this.sleep(30);
        } catch (symbolError) {
          // 개별 심볼 에러는 무시하고 계속
        }
      }

      await pipeline.exec();
      this.stats.fundingUpdates = updateCount;

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingData] ✓ Funding rates updated: ${updateCount} symbols`,
        );
      }
    } catch (error) {
      this.logger.error('[ScalpingData] ✗ Failed to collect funding rates', error);
    }
  }

  /**
   * Open Interest 수집
   *
   * OKX API: GET /api/v5/public/open-interest
   */
  private async collectOpenInterest(): Promise<void> {
    try {
      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug('[ScalpingData] Collecting open interest...');
      }

      let updateCount = 0;
      const pipeline = this.redis.pipeline();

      // 전체 종목 처리 (딜레이로 Rate Limit 대응)
      for (const symbol of this.symbols) {
        try {
          const instId = this.toOkxInstId(symbol);
          const response = await fetch(
            `${this.baseUrl}/api/v5/public/open-interest?instType=SWAP&instId=${instId}`,
          );
          const data = await response.json();

          if (data.code === '0' && data.data && data.data[0]) {
            const item = data.data[0];
            const currentOi = parseFloat(item.oi);

            // 이전 OI 조회
            const prevDataStr = await this.redis.get(`scalping:oi:${symbol}`);
            const prevOi = prevDataStr ? JSON.parse(prevDataStr).openInterest : currentOi;

            // 변화율 계산
            const oiChange = currentOi - prevOi;
            const oiChangePercent = prevOi > 0 ? oiChange / prevOi : 0;

            const oiData: OiData = {
              symbol,
              openInterest: currentOi,
              oiChange,
              oiChangePercent,
              direction: oiChangePercent > 0 ? 'UP' : oiChangePercent < 0 ? 'DOWN' : 'FLAT',
              updatedAt: Date.now(),
            };

            pipeline.set(
              `scalping:oi:${symbol}`,
              JSON.stringify(oiData),
              'EX',
              120, // 2분 TTL
            );
            updateCount++;

            if (
              SCALPING_CONFIG.logging.verbose &&
              updateCount <= 5 &&
              Math.abs(oiChangePercent) > 0.001
            ) {
              this.logger.debug(
                `[ScalpingData] OI: ${symbol} = ${currentOi.toFixed(2)} (${oiChangePercent >= 0 ? '+' : ''}${(oiChangePercent * 100).toFixed(2)}%)`,
              );
            }
          }

          // Rate limit 방지: 30ms 딜레이
          await this.sleep(30);
        } catch (symbolError) {
          // 개별 심볼 에러는 무시하고 계속
        }
      }

      await pipeline.exec();
      this.stats.oiUpdates = updateCount;

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingData] ✓ Open interest updated: ${updateCount} symbols`,
        );
      }
    } catch (error) {
      this.logger.error('[ScalpingData] ✗ Failed to collect open interest', error);
    }
  }

  /**
   * Spread (Book Ticker) 수집
   *
   * OKX API: GET /api/v5/market/books (depth 1)
   */
  private async collectSpreads(): Promise<void> {
    try {
      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug('[ScalpingData] Collecting spreads...');
      }

      let updateCount = 0;
      const pipeline = this.redis.pipeline();

      // 전체 심볼 처리 (Book ticker는 빠름)
      for (const symbol of this.symbols) {
        try {
          const instId = this.toOkxInstId(symbol);
          const response = await fetch(
            `${this.baseUrl}/api/v5/market/books?instId=${instId}&sz=1`,
          );
          const data = await response.json();

          if (data.code === '0' && data.data && data.data[0]) {
            const item = data.data[0];
            const bidPrice = parseFloat(item.bids?.[0]?.[0] || '0');
            const askPrice = parseFloat(item.asks?.[0]?.[0] || '0');

            if (bidPrice > 0 && askPrice > 0) {
              const midPrice = (bidPrice + askPrice) / 2;
              const spread = askPrice - bidPrice;
              const spreadPercent = spread / midPrice;

              const spreadData: SpreadData = {
                symbol,
                bidPrice,
                askPrice,
                midPrice,
                spread,
                spreadPercent,
                updatedAt: Date.now(),
              };

              pipeline.set(
                `scalping:spread:${symbol}`,
                JSON.stringify(spreadData),
                'EX',
                90, // 90초 TTL (스캔 주기 60초 고려)
              );
              updateCount++;

              if (SCALPING_CONFIG.logging.verbose && spreadPercent > 0.001 && updateCount <= 3) {
                this.logger.debug(
                  `[ScalpingData] Spread: ${symbol} = ${(spreadPercent * 100).toFixed(4)}% (bid: ${bidPrice}, ask: ${askPrice})`,
                );
              }
            }
          }

          // Rate limit 방지: 20ms 딜레이 (Book ticker는 가벼움)
          await this.sleep(20);
        } catch (symbolError) {
          // 개별 심볼 에러는 무시하고 계속
        }
      }

      await pipeline.exec();
      this.stats.spreadUpdates = updateCount;

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingData] ✓ Spreads updated: ${updateCount} symbols`,
        );
      }
    } catch (error) {
      this.logger.error('[ScalpingData] ✗ Failed to collect spreads', error);
    }
  }

  // ============================================
  // 데이터 조회 메서드
  // ============================================

  /**
   * Redis에서 캔들 데이터 가져오기
   */
  async getCandles(symbol: string, timeframe: string, limit: number = 20): Promise<CandleData[]> {
    const key = `candles:${symbol}:${timeframe}`;
    const data = await this.redis.lrange(key, 0, limit - 1);

    return data
      .map((json) => {
        const parsed = JSON.parse(json);
        return {
          timestamp: new Date(parsed.timestamp).getTime(),
          open: parseFloat(parsed.open),
          high: parseFloat(parsed.high),
          low: parseFloat(parsed.low),
          close: parseFloat(parsed.close),
          volume: parseFloat(parsed.volume),
        };
      })
      .reverse(); // 오래된 것부터
  }

  /**
   * Funding 데이터 가져오기
   */
  async getFunding(symbol: string): Promise<FundingData | null> {
    const data = await this.redis.get(`scalping:funding:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * OI 데이터 가져오기
   */
  async getOi(symbol: string): Promise<OiData | null> {
    const data = await this.redis.get(`scalping:oi:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Spread 데이터 가져오기
   */
  async getSpread(symbol: string): Promise<SpreadData | null> {
    const data = await this.redis.get(`scalping:spread:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * 현재가 가져오기 (Spread의 midPrice 사용)
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    const spreadData = await this.getSpread(symbol);
    return spreadData?.midPrice || null;
  }

  /**
   * 심볼의 모든 마켓 데이터 가져오기
   */
  async getSymbolMarketData(symbol: string): Promise<SymbolMarketData> {
    const [candles5m, candles15m, fundingData, oiData, spreadData] = await Promise.all([
      this.getCandles(symbol, '5m', 20),
      this.getCandles(symbol, '15m', 10),
      this.getFunding(symbol),
      this.getOi(symbol),
      this.getSpread(symbol),
    ]);

    const missingFields: string[] = [];
    // 캔들 데이터만 필수 (funding/OI/spread는 F1 필터에서 체크)
    if (candles5m.length < 10) missingFields.push('candles5m');
    if (candles15m.length < 4) missingFields.push('candles15m');
    // funding, OI, spread는 선택적 - F1 필터에서 없으면 해당 심볼 스킵
    // if (!fundingData) missingFields.push('funding');
    // if (!oiData) missingFields.push('oi');
    // if (!spreadData) missingFields.push('spread');

    if (SCALPING_CONFIG.logging.verbose && missingFields.length > 0) {
      this.logger.debug(
        `[ScalpingData] [${symbol}] Missing fields: ${missingFields.join(', ')}`,
      );
    }

    return {
      symbol,
      candles5m,
      candles15m,
      currentPrice: spreadData?.midPrice || candles5m[candles5m.length - 1]?.close || 0,
      fundingData,
      oiData,
      spreadData,
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }

  // ============================================
  // 지표 계산 헬퍼
  // ============================================

  /**
   * ATR (Average True Range) 계산
   *
   * ATR = SMA(TR, period)
   * TR = max(high - low, |high - prevClose|, |low - prevClose|)
   */
  calculateAtr(candles: CandleData[], period: number = 14): AtrResult {
    if (candles.length < period + 1) {
      // 데이터 부족 시 최근 봉의 high-low 평균 사용
      const ranges = candles.map((c) => c.high - c.low);
      const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length;
      const currentPrice = candles[candles.length - 1]?.close || 1;

      return {
        atr,
        atrPercent: atr / currentPrice,
        candleCount: candles.length,
      };
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

      trueRanges.push(tr);
    }

    // 최근 period개의 평균
    const recentTr = trueRanges.slice(-period);
    const atr = recentTr.reduce((a, b) => a + b, 0) / recentTr.length;
    const currentPrice = candles[candles.length - 1]?.close || 1;

    return {
      atr,
      atrPercent: atr / currentPrice,
      candleCount: candles.length,
    };
  }

  /**
   * CVD (Cumulative Volume Delta) 계산
   *
   * CVD = sum of (close - open) / open * volume
   * 양수 = 매수 체결 우세, 음수 = 매도 체결 우세
   */
  calculateCvd(candles: CandleData[], periods: number = 3): CvdResult {
    if (candles.length < periods) {
      return {
        cvd: 0,
        direction: 'NEUTRAL',
        candleCount: candles.length,
      };
    }

    const recentCandles = candles.slice(-periods);
    let cvd = 0;

    for (const candle of recentCandles) {
      // 캔들 방향 + 변동폭 기반으로 volume delta 추정
      // 범위 대비 몸통 비율을 사용해 과도한 왜곡을 줄임
      const range = candle.high - candle.low;
      if (range <= 0) {
        continue;
      }
      const body = candle.close - candle.open;
      let bodyRatio = body / range; // [-1, 1] 범위에 가까움
      if (bodyRatio > 1) bodyRatio = 1;
      if (bodyRatio < -1) bodyRatio = -1;
      cvd += bodyRatio * candle.volume;
    }

    return {
      cvd,
      direction: cvd > 0 ? 'BUY' : cvd < 0 ? 'SELL' : 'NEUTRAL',
      candleCount: recentCandles.length,
    };
  }

  /**
   * 모니터링 심볼 목록 반환
   */
  getMonitoredSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * 데이터 수집 통계 반환
   */
  getStats() {
    return { ...this.stats };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
