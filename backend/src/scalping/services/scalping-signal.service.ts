import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { ScalpingDataService } from './scalping-data.service';
import { TrendAnalyzer, TrendResult } from '../strategies/trend-analyzer';
import { MomentumAnalyzer, MomentumResult } from '../strategies/momentum-analyzer';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import {
  ScalpingSignal,
  SignalDirection,
  SignalGenerationResult,
  TrendDirection,
} from '../interfaces/signal.interface';

/**
 * 스캘핑 시그널 생성 서비스
 *
 * STEP 1: 데이터 로드 (Redis에서)
 * STEP 2: 1차 필터 (Funding, 스프레드)
 * STEP 3: 2차 필터 (15분봉 추세)
 * STEP 4: 3차 필터 (5분봉 모멘텀 + CVD)
 * STEP 5: 시그널 생성
 * STEP 6: 리스크 필터
 */
@Injectable()
export class ScalpingSignalService {
  private readonly logger = new Logger(ScalpingSignalService.name);

  // 현재 유효한 시그널들
  private activeSignals: ScalpingSignal[] = [];

  // 스캔 통계
  private lastScanStats = {
    totalSymbols: 0,
    passedFilter1: 0,
    passedFilter2: 0,
    passedFilter3: 0,
    signalsGenerated: 0,
    scanTimeMs: 0,
  };

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly dataService: ScalpingDataService,
    private readonly trendAnalyzer: TrendAnalyzer,
    private readonly momentumAnalyzer: MomentumAnalyzer,
  ) {}

  /**
   * 메인 스캔 루프
   * 매 1분마다 실행
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanForSignals(): Promise<void> {
    const startTime = Date.now();

    this.logger.log(
      '\n═══════════════════════════════════════════════════════════',
    );
    this.logger.log('📡 [SIGNAL SCAN] 스캔 시작...');
    this.logger.log(
      '═══════════════════════════════════════════════════════════',
    );

    try {
      // 전체 심볼 목록 가져오기
      const symbols = await this.getMonitoredSymbols();
      this.lastScanStats.totalSymbols = symbols.length;

      this.logger.log(`[SCAN] 총 ${symbols.length}개 심볼 스캔`);

      const candidates: ScalpingSignal[] = [];
      const results: SignalGenerationResult[] = [];

      // 심볼별 분석
      for (const symbol of symbols) {
        const result = await this.analyzeSymbol(symbol);
        results.push(result);

        if (result.passed && result.signal) {
          candidates.push(result.signal);
        }
      }

      // 통계 계산
      this.lastScanStats.passedFilter1 = results.filter(
        (r) => r.step === undefined || r.step > 2,
      ).length;
      this.lastScanStats.passedFilter2 = results.filter(
        (r) => r.step === undefined || r.step > 3,
      ).length;
      this.lastScanStats.passedFilter3 = results.filter(
        (r) => r.step === undefined || r.step > 4,
      ).length;

      // 강도순 정렬
      this.activeSignals = candidates.sort((a, b) => b.strength - a.strength);
      this.lastScanStats.signalsGenerated = this.activeSignals.length;

      const elapsed = Date.now() - startTime;
      this.lastScanStats.scanTimeMs = elapsed;

      // 결과 요약
      this.logger.log('\n─────────────────────────────────────────────────────');
      this.logger.log('[SCAN RESULT] 스캔 결과 요약:');
      this.logger.log(`  총 심볼:      ${symbols.length}`);
      this.logger.log(`  1차 필터 통과: ${this.lastScanStats.passedFilter1}`);
      this.logger.log(`  2차 필터 통과: ${this.lastScanStats.passedFilter2}`);
      this.logger.log(`  3차 필터 통과: ${this.lastScanStats.passedFilter3}`);
      this.logger.log(`  ✅ 시그널 생성: ${this.activeSignals.length}개`);
      this.logger.log(`  소요 시간:     ${elapsed}ms`);
      this.logger.log('─────────────────────────────────────────────────────');

      // 생성된 시그널 상세 출력
      if (this.activeSignals.length > 0) {
        this.logger.log('\n[SIGNALS] 생성된 시그널:');
        for (const signal of this.activeSignals.slice(0, 10)) {
          this.logger.log(
            `  📊 ${signal.symbol} ${signal.direction} | ` +
              `강도: ${signal.strength.toFixed(1)} | ` +
              `진입: ${signal.entryPrice.toFixed(6)} | ` +
              `TP: ${signal.tpPrice.toFixed(6)} | ` +
              `SL: ${signal.slPrice.toFixed(6)}`,
          );
        }
        if (this.activeSignals.length > 10) {
          this.logger.log(`  ... 외 ${this.activeSignals.length - 10}개`);
        }
      }

      this.logger.log(
        '═══════════════════════════════════════════════════════════\n',
      );
    } catch (error: any) {
      this.logger.error(`[SCAN] ❌ 스캔 실패: ${error.message}`);
    }
  }

  /**
   * 단일 종목 분석
   * STEP 2 → 3 → 4 → 5 순서로 필터링
   */
  private async analyzeSymbol(symbol: string): Promise<SignalGenerationResult> {
    try {
      // ========================================
      // STEP 1: 데이터 로드 (Redis에서)
      // ========================================
      this.logger.debug(`[${symbol}] [STEP 1] 데이터 로드...`);

      const [candles5m, candles15m, fundingData, oiData, spreadData, priceData] =
        await Promise.all([
          this.getCandles(symbol, '5m', 20),
          this.getCandles(symbol, '15m', 10),
          this.getFunding(symbol),
          this.getOi(symbol),
          this.getSpread(symbol),
          this.getPrice(symbol),
        ]);

      // 데이터 누락 체크
      if (!candles5m || candles5m.length < 10) {
        this.logger.debug(`[${symbol}] ❌ 5분봉 데이터 부족`);
        return { symbol, passed: false, rejectReason: '5분봉 데이터 부족', step: 1 };
      }
      if (!candles15m || candles15m.length < 4) {
        this.logger.debug(`[${symbol}] ❌ 15분봉 데이터 부족`);
        return { symbol, passed: false, rejectReason: '15분봉 데이터 부족', step: 1 };
      }

      this.logger.debug(
        `[${symbol}] [STEP 1] ✓ 데이터 로드 완료 | 5m: ${candles5m.length}, 15m: ${candles15m.length}`,
      );

      // ========================================
      // STEP 2: 1차 필터 (거시적 조건)
      // ========================================
      this.logger.debug(`[${symbol}] [STEP 2] 1차 필터 (스프레드, 펀딩)...`);

      // 2-1. 스프레드 필터
      if (spreadData) {
        const spreadPercent = spreadData.spreadPercent || 0;
        if (spreadPercent > SCALPING_CONFIG.filter1.maxSpreadPercent) {
          this.logger.debug(
            `[${symbol}] ❌ 스프레드 과다: ${(spreadPercent * 100).toFixed(4)}% > ${(SCALPING_CONFIG.filter1.maxSpreadPercent * 100).toFixed(4)}%`,
          );
          return { symbol, passed: false, rejectReason: '스프레드 과다', step: 2 };
        }
        this.logger.debug(
          `[${symbol}] [STEP 2] ✓ 스프레드: ${(spreadPercent * 100).toFixed(4)}%`,
        );
      }

      this.logger.debug(`[${symbol}] [STEP 2] ✓ 1차 필터 통과`);

      // ========================================
      // STEP 3: 2차 필터 (15분봉 추세)
      // ========================================
      this.logger.debug(`[${symbol}] [STEP 3] 2차 필터 (15분봉 추세)...`);

      const trend = this.trendAnalyzer.analyzeTrend(candles15m, symbol);

      if (trend.direction === 'NEUTRAL') {
        this.logger.debug(`[${symbol}] ❌ 추세 없음 (NEUTRAL)`);
        return { symbol, passed: false, rejectReason: '추세 없음', step: 3 };
      }

      this.logger.debug(
        `[${symbol}] [STEP 3] ✓ 추세: ${trend.direction} (강도: ${(trend.strength * 100).toFixed(1)}%)`,
      );

      // OI 방향 로깅 (참고용)
      if (oiData) {
        this.logger.debug(
          `[${symbol}] [STEP 3] OI 방향: ${oiData.direction} (${(oiData.oiChangePercent * 100).toFixed(2)}%)`,
        );
      }

      // ========================================
      // STEP 4: 3차 필터 (5분봉 모멘텀)
      // ========================================
      this.logger.debug(`[${symbol}] [STEP 4] 3차 필터 (5분봉 모멘텀)...`);

      const momentum = this.momentumAnalyzer.analyzeMomentum(candles5m, symbol);

      // 소진 상태면 진입 금지
      if (momentum.state === 'EXHAUSTED') {
        this.logger.debug(`[${symbol}] ❌ 모멘텀 소진 (EXHAUSTED)`);
        return { symbol, passed: false, rejectReason: '모멘텀 소진', step: 4 };
      }

      // 모멘텀 진행 중이면 대기
      if (momentum.state === 'MOMENTUM') {
        this.logger.debug(`[${symbol}] ❌ 모멘텀 진행 중 (대기 필요)`);
        return { symbol, passed: false, rejectReason: '모멘텀 진행 중', step: 4 };
      }

      // PULLBACK 상태만 통과
      if (momentum.state !== 'PULLBACK') {
        this.logger.debug(`[${symbol}] ❌ 풀백 아님 (${momentum.state})`);
        return { symbol, passed: false, rejectReason: `풀백 아님: ${momentum.state}`, step: 4 };
      }

      // CVD 계산
      const cvdSum = this.calculateCvdSum(
        candles5m,
        SCALPING_CONFIG.filter3.cvdBars,
      );

      this.logger.debug(
        `[${symbol}] [STEP 4] ✓ 모멘텀: ${momentum.state} | CVD: ${cvdSum > 0 ? '+' : ''}${cvdSum.toFixed(2)}`,
      );

      // ========================================
      // STEP 5: 시그널 생성
      // ========================================
      this.logger.debug(`[${symbol}] [STEP 5] 시그널 생성...`);

      let direction: SignalDirection | null = null;
      const fundingRate = fundingData?.lastFundingRate || 0;

      // 롱 조건
      if (trend.direction === 'UP' && momentum.direction === 'UP') {
        // Funding 체크
        if (fundingRate > SCALPING_CONFIG.filter1.funding.maxForLong) {
          this.logger.debug(
            `[${symbol}] ❌ Funding 과열 (롱): ${(fundingRate * 100).toFixed(4)}%`,
          );
          return { symbol, passed: false, rejectReason: 'Funding 과열 (롱)', step: 5 };
        }

        // CVD 체크
        if (cvdSum <= 0) {
          this.logger.debug(`[${symbol}] ❌ CVD 음수 (매도 우세)`);
          return { symbol, passed: false, rejectReason: 'CVD 음수', step: 5 };
        }

        direction = 'LONG';
      }
      // 숏 조건
      else if (trend.direction === 'DOWN' && momentum.direction === 'DOWN') {
        // Funding 체크
        if (fundingRate < SCALPING_CONFIG.filter1.funding.minForShort) {
          this.logger.debug(
            `[${symbol}] ❌ Funding 역방향 과열 (숏): ${(fundingRate * 100).toFixed(4)}%`,
          );
          return { symbol, passed: false, rejectReason: 'Funding 역방향 과열 (숏)', step: 5 };
        }

        // CVD 체크
        if (cvdSum >= 0) {
          this.logger.debug(`[${symbol}] ❌ CVD 양수 (매수 우세)`);
          return { symbol, passed: false, rejectReason: 'CVD 양수', step: 5 };
        }

        direction = 'SHORT';
      }

      if (!direction) {
        this.logger.debug(
          `[${symbol}] ❌ 방향 조건 불충족 | 추세: ${trend.direction}, 모멘텀: ${momentum.direction}`,
        );
        return { symbol, passed: false, rejectReason: '방향 조건 불충족', step: 5 };
      }

      // ========================================
      // ATR 및 가격 계산
      // ========================================
      const atr = this.dataService.calculateAtr(
        candles5m,
        SCALPING_CONFIG.order.atrPeriod,
      );
      const atrPercent = this.dataService.calculateAtrPercent(candles5m);
      const currentPrice =
        priceData?.price || parseFloat(candles5m[candles5m.length - 1][4]);

      // 진입가 계산
      const entryOffset = atr * SCALPING_CONFIG.order.entryOffsetAtr;
      const entryPrice =
        direction === 'LONG'
          ? currentPrice - entryOffset
          : currentPrice + entryOffset;

      // TP/SL 계산
      const tpDistance = atr * SCALPING_CONFIG.order.tpAtr;
      const slDistance = atr * SCALPING_CONFIG.order.slAtr;

      const tpPrice =
        direction === 'LONG' ? entryPrice + tpDistance : entryPrice - tpDistance;

      const slPrice =
        direction === 'LONG' ? entryPrice - slDistance : entryPrice + slDistance;

      // 강도 계산
      const strength = this.calculateStrength({
        trendStrength: trend.strength,
        momentumStrength: momentum.strength,
        cvdStrength: Math.abs(cvdSum),
        fundingFavorable: this.isFundingFavorable(fundingRate, direction),
        oiIncreasing: oiData?.direction === 'UP',
      });

      // ========================================
      // 시그널 객체 생성
      // ========================================
      const signal: ScalpingSignal = {
        symbol,
        direction,
        strength,

        // 가격 정보
        currentPrice,
        entryPrice,
        tpPrice,
        slPrice,

        // ATR 정보
        atr,
        atrPercent,

        // 지표 정보
        trend: trend.direction,
        momentum: momentum.state,
        cvd: cvdSum,
        fundingRate,
        oiChange: oiData?.oiChangePercent || 0,

        // 메타 정보
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000, // 1분 후 만료

        filtersPassed: {
          spread: true,
          funding: true,
          trend: true,
          momentum: true,
          cvd: true,
        },
      };

      this.logger.log(
        `\n[${symbol}] ✅ 시그널 생성!`,
      );
      this.logger.log(`  방향:     ${direction}`);
      this.logger.log(`  강도:     ${strength.toFixed(1)}`);
      this.logger.log(`  현재가:   ${currentPrice.toFixed(6)}`);
      this.logger.log(`  진입가:   ${entryPrice.toFixed(6)}`);
      this.logger.log(`  TP:       ${tpPrice.toFixed(6)} (+${(tpDistance / entryPrice * 100).toFixed(3)}%)`);
      this.logger.log(`  SL:       ${slPrice.toFixed(6)} (-${(slDistance / entryPrice * 100).toFixed(3)}%)`);
      this.logger.log(`  ATR:      ${atr.toFixed(6)} (${(atrPercent * 100).toFixed(3)}%)`);
      this.logger.log(`  펀딩:     ${(fundingRate * 100).toFixed(4)}%`);
      this.logger.log(`  CVD:      ${cvdSum > 0 ? '+' : ''}${cvdSum.toFixed(2)}`);

      return { symbol, passed: true, signal };
    } catch (error: any) {
      this.logger.warn(`[${symbol}] ⚠️ 분석 오류: ${error.message}`);
      return { symbol, passed: false, rejectReason: error.message, step: 0 };
    }
  }

  /**
   * CVD 합계 계산
   */
  private calculateCvdSum(candles: any[], periods: number): number {
    const recentCandles = candles.slice(-periods);
    return recentCandles.reduce((sum, candle) => {
      return sum + this.dataService.calculateCvdFromCandle(candle);
    }, 0);
  }

  /**
   * Funding이 유리한지 판단
   */
  private isFundingFavorable(
    fundingRate: number | undefined,
    direction: SignalDirection,
  ): boolean {
    if (fundingRate === undefined) return true;

    if (direction === 'LONG') {
      return fundingRate < SCALPING_CONFIG.filter1.funding.maxForLong;
    } else {
      return fundingRate > SCALPING_CONFIG.filter1.funding.minForShort;
    }
  }

  /**
   * 시그널 강도 계산
   * 각 요소에 가중치를 부여하여 0-100 점수로 변환
   */
  private calculateStrength(factors: {
    trendStrength: number;
    momentumStrength: number;
    cvdStrength: number;
    fundingFavorable: boolean;
    oiIncreasing: boolean;
  }): number {
    let score = 0;

    // 추세 강도 (0-30점)
    score += Math.min(factors.trendStrength * 30, 30);

    // 모멘텀 강도 (0-25점)
    score += Math.min(factors.momentumStrength * 25, 25);

    // CVD 강도 (0-20점) - 정규화 필요
    score += Math.min(factors.cvdStrength * 0.1, 20);

    // Funding 유리 (0-15점)
    score += factors.fundingFavorable ? 15 : 0;

    // OI 증가 (0-10점)
    score += factors.oiIncreasing ? 10 : 0;

    return Math.min(score, 100);
  }

  // ========================================
  // Redis 헬퍼 메서드들
  // ========================================

  private async getCandles(
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<any[] | null> {
    try {
      // 기존 WebSocket 형식: candles:BTCUSDT:5m
      const key = `candles:${symbol}:${interval}`;
      const data = await this.redis.lrange(key, 0, limit - 1);

      if (!data || data.length === 0) {
        this.logger.debug(`[${symbol}] 캔들 데이터 없음 (key: ${key})`);
        return null;
      }

      // Redis에서 가져온 데이터 파싱 (역순 정렬 필요할 수 있음)
      // 객체 형태를 배열 형태로 변환 (Binance REST API 형식)
      // [timestamp, open, high, low, close, volume]
      const candles = data.map((item) => {
        const c = JSON.parse(item);
        return [
          new Date(c.timestamp).getTime(), // 0: timestamp (ms)
          c.open.toString(),                // 1: open
          c.high.toString(),                // 2: high
          c.low.toString(),                 // 3: low
          c.close.toString(),               // 4: close
          c.volume.toString(),              // 5: volume
        ];
      });
      return candles.reverse(); // 오래된 것 → 최신 순으로
    } catch (error) {
      return null;
    }
  }

  private async getFunding(symbol: string): Promise<any | null> {
    try {
      const data = await this.redis.get(`funding:${symbol}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  private async getOi(symbol: string): Promise<any | null> {
    try {
      const data = await this.redis.get(`oi:${symbol}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  private async getSpread(symbol: string): Promise<any | null> {
    try {
      const data = await this.redis.get(`spread:${symbol}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  private async getPrice(symbol: string): Promise<any | null> {
    try {
      const data = await this.redis.get(`price:${symbol}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  private async getMonitoredSymbols(): Promise<string[]> {
    // ScalpingDataService에서 심볼 목록 가져오기
    const symbols = this.dataService.getSymbols();
    if (symbols.length > 0) return symbols;

    // 캐시된 심볼 목록 시도
    try {
      const data = await this.redis.get('monitored_symbols');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  // ========================================
  // 외부 접근 메서드
  // ========================================

  /**
   * 현재 유효한 시그널 목록 반환
   */
  getActiveSignals(): ScalpingSignal[] {
    return this.activeSignals.filter((s) => s.expiresAt > Date.now());
  }

  /**
   * 상위 N개 시그널 반환
   */
  getTopSignals(count: number): ScalpingSignal[] {
    return this.getActiveSignals().slice(0, count);
  }

  /**
   * 마지막 스캔 통계 반환
   */
  getLastScanStats() {
    return { ...this.lastScanStats };
  }
}
