import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { BinanceService } from '../../binance/binance.service';
import { SCALPING_CONFIG } from '../constants/scalping.config';

/**
 * 스캘핑 전략에 필요한 추가 데이터 수집
 *
 * 기존에 WebSocket으로 받는 데이터:
 * - 5분봉, 15분봉, 실시간 가격
 *
 * 이 서비스에서 추가로 수집하는 데이터:
 * - Funding Rate (REST API, 1분마다)
 * - Open Interest (REST API, 1분마다)
 * - Book Ticker / Spread (REST API)
 */
@Injectable()
export class ScalpingDataService implements OnModuleInit {
  private readonly logger = new Logger(ScalpingDataService.name);

  // 모니터링할 심볼 목록 (동적으로 갱신)
  private symbols: string[] = [];

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly binance: BinanceService,
  ) {}

  async onModuleInit() {
    this.logger.log(
      '═══════════════════════════════════════════════════════════',
    );
    this.logger.log('📊 [SCALPING DATA] 서비스 초기화 시작...');

    // 초기 심볼 목록 로드
    await this.loadSymbolList();

    // 초기 데이터 수집
    await this.collectAllData();

    this.logger.log('✅ [SCALPING DATA] 서비스 초기화 완료');
    this.logger.log(
      '═══════════════════════════════════════════════════════════',
    );
  }

  /**
   * 과거 캔들 데이터를 Binance API에서 가져와 Redis에 저장
   * Trading 시작 시 호출됨
   */
  async loadHistoricalCandles(symbols: string[]): Promise<void> {
    this.logger.log(`[CANDLES] 📥 과거 캔들 데이터 로드 시작... (${symbols.length}개 심볼)`);

    const intervals: ('5m' | '15m')[] = ['5m', '15m'];
    const limit = 50; // 최근 50개 캔들
    let successCount = 0;
    let failCount = 0;

    // 병렬 처리 (한번에 10개씩)
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const promises = batch.flatMap((symbol) =>
        intervals.map(async (interval) => {
          try {
            const candles = await this.binance.getHistoricalCandles(symbol, interval, limit);

            if (candles && candles.length > 0) {
              const key = `candles:${symbol}:${interval}`;
              const pipeline = this.redis.pipeline();

              // 기존 데이터 삭제
              pipeline.del(key);

              // 새 캔들 저장 (최신부터 역순으로 저장)
              // getHistoricalCandles는 CandleData[] 형식 반환
              for (let j = candles.length - 1; j >= 0; j--) {
                const candle = candles[j];
                const candleJson = JSON.stringify({
                  timestamp: candle.timestamp instanceof Date
                    ? candle.timestamp.toISOString()
                    : new Date(candle.timestamp).toISOString(),
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                  volume: candle.volume,
                });
                pipeline.lpush(key, candleJson);
              }

              // TTL 설정 (15분)
              pipeline.ltrim(key, 0, 49);
              pipeline.expire(key, 900);

              await pipeline.exec();
              successCount++;
            }
          } catch (error: any) {
            failCount++;
            this.logger.debug(`[CANDLES] ${symbol}:${interval} 실패: ${error.message}`);
          }
        })
      );

      await Promise.all(promises);

      // Rate limit 방지를 위한 딜레이
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`[CANDLES] ✅ 로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
  }

  /**
   * 심볼 목록 로드
   * Binance USDT-M 선물 중 거래량 상위 종목
   */
  private async loadSymbolList(): Promise<void> {
    try {
      this.logger.debug('[SYMBOL LOAD] 거래소 정보 로드 중...');

      const exchangeInfo = await this.binance.getExchangeInfo();

      this.symbols = exchangeInfo.symbols
        .filter(
          (s: any) =>
            s.quoteAsset === 'USDT' &&
            s.status === 'TRADING' &&
            s.contractType === 'PERPETUAL',
        )
        .map((s: any) => s.symbol);

      this.logger.log(
        `[SYMBOL LOAD] ✅ ${this.symbols.length}개 심볼 로드 완료`,
      );
      this.logger.debug(
        `[SYMBOL LOAD] 샘플: ${this.symbols.slice(0, 5).join(', ')}...`,
      );
    } catch (error: any) {
      this.logger.error(`[SYMBOL LOAD] ❌ 실패: ${error.message}`);
    }
  }

  /**
   * 1분마다 실행: Funding Rate + OI + Spread 수집
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectAllData(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(
      '[DATA COLLECT] ──────────────────────────────────────',
    );
    this.logger.debug('[DATA COLLECT] 데이터 수집 시작...');

    try {
      await Promise.all([
        this.collectFundingRates(),
        this.collectOpenInterest(),
        this.collectSpreads(),
      ]);

      const elapsed = Date.now() - startTime;
      this.logger.debug(`[DATA COLLECT] ✅ 완료 (${elapsed}ms)`);
    } catch (error: any) {
      this.logger.error(`[DATA COLLECT] ❌ 실패: ${error.message}`);
    }

    this.logger.debug(
      '[DATA COLLECT] ──────────────────────────────────────',
    );
  }

  /**
   * Funding Rate 수집
   *
   * API: GET /fapi/v1/premiumIndex
   * - 1회 호출로 전체 종목 조회 가능
   */
  private async collectFundingRates(): Promise<void> {
    try {
      this.logger.debug('[FUNDING] Funding Rate 수집 중...');

      // Binance API로 전체 종목 Funding 조회
      const premiumIndex = await this.binance.getPremiumIndex();

      if (!Array.isArray(premiumIndex)) {
        this.logger.warn('[FUNDING] 응답이 배열이 아님');
        return;
      }

      const pipeline = this.redis.pipeline();
      let count = 0;

      for (const item of premiumIndex) {
        if (!item.symbol) continue;

        const data = {
          symbol: item.symbol,
          lastFundingRate: parseFloat(item.lastFundingRate || '0'),
          markPrice: parseFloat(item.markPrice || '0'),
          indexPrice: parseFloat(item.indexPrice || '0'),
          nextFundingTime: item.nextFundingTime,
          updatedAt: Date.now(),
        };

        pipeline.set(`funding:${item.symbol}`, JSON.stringify(data), 'EX', 120);
        count++;
      }

      await pipeline.exec();
      this.logger.debug(`[FUNDING] ✅ ${count}개 심볼 저장 완료`);
    } catch (error: any) {
      this.logger.error(`[FUNDING] ❌ 수집 실패: ${error.message}`);
    }
  }

  /**
   * Open Interest 수집
   *
   * 전체 모니터링 종목 조회 (Rate Limit 고려하여 배치 처리)
   * - Binance Rate Limit: 2400 weight/min
   * - OI API: 5 weight/call
   * - 안전하게 1분에 200개 정도 처리 (약 1000 weight)
   */
  private async collectOpenInterest(): Promise<void> {
    try {
      this.logger.log(`[OI] Open Interest 수집 중... (${this.symbols.length}개 심볼)`);

      // 전체 심볼 처리 (최대 모니터링 종목 수 = 140개)
      const targetSymbols = this.symbols.slice(0, SCALPING_CONFIG.scan.maxSymbols);
      let successCount = 0;
      let failCount = 0;

      // 배치 사이즈: 20개씩 처리 (Rate Limit 여유 확보)
      const batchSize = 20;
      // 배치 간 딜레이: 300ms (1분에 약 200개 = 안전 마진)
      const batchDelay = 300;

      for (let i = 0; i < targetSymbols.length; i += batchSize) {
        const batch = targetSymbols.slice(i, i + batchSize);
        const pipeline = this.redis.pipeline();

        // 배치 내 병렬 처리
        const results = await Promise.allSettled(
          batch.map(async (symbol) => {
            const oiResponse = await this.binance.getOpenInterest(symbol);
            return { symbol, oiResponse };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { symbol, oiResponse } = result.value;
            const currentOi = parseFloat(oiResponse?.openInterest || '0');

            // 이전 OI 조회
            const prevData = await this.redis.get(`oi:${symbol}`);
            const prevOi = prevData ? JSON.parse(prevData).openInterest : currentOi;

            // 변화율 계산
            const oiChange = currentOi - prevOi;
            const oiChangePercent = prevOi > 0 ? oiChange / prevOi : 0;

            const data = {
              symbol,
              openInterest: currentOi,
              oiChange,
              oiChangePercent,
              direction:
                oiChangePercent > 0 ? 'UP' : oiChangePercent < 0 ? 'DOWN' : 'FLAT',
              updatedAt: Date.now(),
            };

            pipeline.set(`oi:${symbol}`, JSON.stringify(data), 'EX', 180); // TTL 3분
            successCount++;
          } else {
            failCount++;
          }
        }

        await pipeline.exec();

        // 다음 배치 전 딜레이 (마지막 배치는 제외)
        if (i + batchSize < targetSymbols.length) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
        }
      }

      this.logger.log(
        `[OI] ✅ 완료: 성공 ${successCount}개, 실패 ${failCount}개 (총 ${targetSymbols.length}개)`,
      );
    } catch (error: any) {
      this.logger.error(`[OI] ❌ 수집 실패: ${error.message}`);
    }
  }

  /**
   * 스프레드 수집
   *
   * API: GET /fapi/v1/ticker/bookTicker
   * - 1회 호출로 전체 종목 조회 가능
   */
  private async collectSpreads(): Promise<void> {
    try {
      this.logger.debug('[SPREAD] 스프레드 수집 중...');

      const bookTickers = await this.binance.getBookTickers();

      if (!Array.isArray(bookTickers)) {
        this.logger.warn('[SPREAD] 응답이 배열이 아님');
        return;
      }

      const pipeline = this.redis.pipeline();
      let count = 0;

      for (const ticker of bookTickers) {
        if (!ticker.symbol) continue;

        const bidPrice = parseFloat(ticker.bidPrice || '0');
        const askPrice = parseFloat(ticker.askPrice || '0');
        const midPrice = (bidPrice + askPrice) / 2;
        const spread = askPrice - bidPrice;
        const spreadPercent = midPrice > 0 ? spread / midPrice : 0;

        const data = {
          symbol: ticker.symbol,
          bidPrice,
          askPrice,
          midPrice,
          spread,
          spreadPercent,
          updatedAt: Date.now(),
        };

        pipeline.set(`spread:${ticker.symbol}`, JSON.stringify(data), 'EX', 30);
        count++;
      }

      await pipeline.exec();
      this.logger.debug(`[SPREAD] ✅ ${count}개 심볼 저장 완료`);
    } catch (error: any) {
      this.logger.error(`[SPREAD] ❌ 수집 실패: ${error.message}`);
    }
  }

  // ============================================
  // 유틸리티 메서드
  // ============================================

  /**
   * CVD 계산을 위한 헬퍼
   *
   * 캔들 데이터에서 CVD 추출
   * CVD = takerBuyVolume - takerSellVolume
   *     = 2 * takerBuyVolume - totalVolume
   */
  calculateCvdFromCandle(candle: any[]): number {
    const totalVolume = parseFloat(candle[5]); // index 5 = volume
    const takerBuyVolume = parseFloat(candle[9] || '0'); // index 9 = taker buy volume

    // taker buy volume이 없는 경우 (Binance REST API 캔들)
    if (!candle[9] || candle[9] === '') {
      // 캔들 방향으로 추정
      const open = parseFloat(candle[1]);
      const close = parseFloat(candle[4]);
      return close > open ? totalVolume * 0.6 : -totalVolume * 0.6;
    }

    const takerSellVolume = totalVolume - takerBuyVolume;
    return takerBuyVolume - takerSellVolume;
  }

  /**
   * ATR 계산
   *
   * ATR = Average True Range
   * TR = max(high - low, |high - prevClose|, |low - prevClose|)
   */
  calculateAtr(candles: any[], period: number = 14): number {
    if (candles.length < 2) {
      return 0;
    }

    if (candles.length < period + 1) {
      // 데이터 부족 시 최근 봉의 high-low 평균 사용
      const ranges = candles.map(
        (c) => parseFloat(c[2]) - parseFloat(c[3]),
      );
      return ranges.reduce((a, b) => a + b, 0) / ranges.length;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = parseFloat(candles[i][2]);
      const low = parseFloat(candles[i][3]);
      const prevClose = parseFloat(candles[i - 1][4]);

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose),
      );

      trueRanges.push(tr);
    }

    // 최근 period개의 평균
    const recentTr = trueRanges.slice(-period);
    return recentTr.reduce((a, b) => a + b, 0) / recentTr.length;
  }

  /**
   * ATR을 퍼센트로 변환
   */
  calculateAtrPercent(candles: any[], period: number = 14): number {
    const atr = this.calculateAtr(candles, period);
    const currentPrice = parseFloat(candles[candles.length - 1][4]); // 최근 종가
    return currentPrice > 0 ? atr / currentPrice : 0;
  }

  // ============================================
  // 외부 접근 메서드
  // ============================================

  /**
   * 모니터링 심볼 목록 반환
   */
  getSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * 심볼 목록 업데이트
   */
  setSymbols(symbols: string[]): void {
    this.symbols = symbols;
    this.logger.log(`[SYMBOLS] 심볼 목록 업데이트: ${symbols.length}개`);
  }
}
