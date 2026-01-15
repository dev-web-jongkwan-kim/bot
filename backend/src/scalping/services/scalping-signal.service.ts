import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScalpingDataService } from './scalping-data.service';
import { TrendAnalyzer, TrendResult } from '../strategies/trend-analyzer';
import { MomentumAnalyzer, MomentumResult } from '../strategies/momentum-analyzer';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import {
  ScalpingSignal,
  SignalDirection,
  FilterResult,
  SignalAnalysisResult,
  ScanSummary,
  CandleData,
} from '../interfaces';

/**
 * 스캘핑 시그널 생성 서비스
 *
 * 매 1분마다 전체 종목 스캔
 * STEP 1: 데이터 로드
 * STEP 2: 1차 필터 (Funding, Spread, Volume)
 * STEP 3: 2차 필터 (15분봉 추세)
 * STEP 4: 3차 필터 (5분봉 모멘텀 + CVD)
 * STEP 5: 시그널 생성
 */
@Injectable()
export class ScalpingSignalService {
  private readonly logger = new Logger(ScalpingSignalService.name);

  // 현재 유효한 시그널들
  private activeSignals: ScalpingSignal[] = [];

  // 스캔 통계
  private lastScanSummary: ScanSummary | null = null;

  constructor(
    private readonly dataService: ScalpingDataService,
    private readonly trendAnalyzer: TrendAnalyzer,
    private readonly momentumAnalyzer: MomentumAnalyzer,
  ) {}

  /**
   * 메인 스캔 루프
   *
   * 매 1분마다 실행
   * - 상위 50개 종목 스캔
   * - 조건 충족 종목에 시그널 생성
   */
  @Cron('30 * * * * *') // 매 분 30초 (데이터 수집 후)
  async scanForSignals(): Promise<void> {
    const startTime = Date.now();

    this.logger.log('════════════════════════════════════════════════════════════');
    this.logger.log(
      `[ScalpingSignal] Scanning at ${new Date().toISOString().slice(11, 19)}`,
    );
    this.logger.log('════════════════════════════════════════════════════════════');

    try {
      // 전체 심볼 목록 가져오기
      const symbols = this.dataService.getMonitoredSymbols();

      const candidates: ScalpingSignal[] = [];
      let dataComplete = 0;
      let passedFilter1 = 0;
      let passedFilter2 = 0;
      let passedFilter3 = 0;

      for (const symbol of symbols) {
        const result = await this.analyzeSymbol(symbol);

        // 데이터 완전성 체크 (STEP 1)
        if (!result.filter1Result.reason?.startsWith('Missing data')) {
          dataComplete++;
        }
        if (result.filter1Result.passed) passedFilter1++;
        if (result.filter2Result.passed) passedFilter2++;
        if (result.filter3Result.passed) passedFilter3++;

        if (result.signal) {
          candidates.push(result.signal);
        }
      }

      // 강도순 정렬
      this.activeSignals = candidates.sort((a, b) => b.strength - a.strength);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // 스캔 요약
      this.lastScanSummary = {
        startTime,
        endTime,
        totalSymbols: symbols.length,
        passedFilter1,
        passedFilter2,
        passedFilter3,
        signalsGenerated: this.activeSignals.length,
        signals: this.activeSignals.map((s) => ({
          symbol: s.symbol,
          direction: s.direction,
          strength: s.strength,
        })),
      };

      // 요약 로깅
      this.logger.log('────────────────────────────────────────────────────────────');
      this.logger.log(
        `[ScalpingSignal] Scan completed: ${symbols.length} symbols, ${elapsed}ms`,
      );
      this.logger.log(
        `[ScalpingSignal] Filter results: Data=${dataComplete}/${symbols.length}, F1=${passedFilter1}, F2=${passedFilter2}, F3=${passedFilter3}`,
      );

      if (this.activeSignals.length > 0) {
        this.logger.log(
          `[ScalpingSignal] ⭐ ${this.activeSignals.length} signals generated:`,
        );
        for (const signal of this.activeSignals.slice(0, 5)) {
          this.logger.log(
            `[ScalpingSignal]   ${signal.symbol} ${signal.direction} (strength: ${signal.strength.toFixed(0)})` +
              ` | Entry: ${signal.entryPrice.toFixed(2)}, TP: ${signal.tpPrice.toFixed(2)}, SL: ${signal.slPrice.toFixed(2)}`,
          );
        }
      } else {
        this.logger.log('[ScalpingSignal] No signals generated this cycle');
      }
      this.logger.log('════════════════════════════════════════════════════════════');
    } catch (error) {
      this.logger.error('[ScalpingSignal] ✗ Scan failed', error);
    }
  }

  /**
   * 단일 종목 분석
   *
   * STEP 1 → 2 → 3 → 4 → 5 순서로 필터링
   */
  private async analyzeSymbol(symbol: string): Promise<SignalAnalysisResult> {
    const analysisStart = Date.now();

    // 기본 결과 초기화
    const result: SignalAnalysisResult = {
      symbol,
      signal: null,
      filter1Result: { passed: false, details: {} },
      filter2Result: { passed: false, details: {} },
      filter3Result: { passed: false, details: {} },
      analysisTimeMs: 0,
    };

    try {
      // ========================================
      // STEP 1: 데이터 로드
      // ========================================
      const marketData = await this.dataService.getSymbolMarketData(symbol);

      if (!marketData.isComplete) {
        if (SCALPING_CONFIG.logging.logFilterResults) {
          this.logger.debug(
            `[ScalpingSignal] [${symbol}] STEP 1: Data incomplete - missing: ${marketData.missingFields.join(', ')}`,
          );
        }
        result.filter1Result.reason = `Missing data: ${marketData.missingFields.join(', ')}`;
        result.analysisTimeMs = Date.now() - analysisStart;
        return result;
      }

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingSignal] [${symbol}] STEP 1: Data loaded (5m: ${marketData.candles5m.length}, 15m: ${marketData.candles15m.length})`,
        );
      }

      // ========================================
      // STEP 2: 1차 필터 (거시적 조건)
      // ========================================
      const filter1 = this.checkFilter1(marketData);
      result.filter1Result = filter1;

      if (!filter1.passed) {
        if (SCALPING_CONFIG.logging.logFilterResults) {
          this.logger.debug(
            `[ScalpingSignal] [${symbol}] STEP 2: Filter 1 FAILED - ${filter1.reason}`,
          );
        }
        result.analysisTimeMs = Date.now() - analysisStart;
        return result;
      }

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingSignal] [${symbol}] STEP 2: Filter 1 ✓ (Funding=${(filter1.details.fundingRate as number * 100).toFixed(3)}%, Spread=${(filter1.details.spreadPercent as number * 100).toFixed(3)}%)`,
        );
      }

      // ========================================
      // STEP 3: 2차 필터 (15분봉 추세)
      // ========================================
      const trendResult = this.trendAnalyzer.analyzeTrend(
        marketData.candles15m,
        symbol,
      );
      const filter2 = this.checkFilter2(trendResult, marketData);
      result.filter2Result = filter2;

      if (!filter2.passed) {
        if (SCALPING_CONFIG.logging.logFilterResults) {
          this.logger.debug(
            `[ScalpingSignal] [${symbol}] STEP 3: Filter 2 FAILED - ${filter2.reason}`,
          );
        }
        result.analysisTimeMs = Date.now() - analysisStart;
        return result;
      }

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingSignal] [${symbol}] STEP 3: Filter 2 ✓ (Trend=${trendResult.direction}, Strength=${trendResult.strength.toFixed(2)})`,
        );
      }

      // ========================================
      // STEP 4: 3차 필터 (5분봉 모멘텀 + CVD)
      // ========================================
      const momentumResult = this.momentumAnalyzer.analyzeMomentum(
        marketData.candles5m,
        symbol,
      );
      const cvdResult = this.dataService.calculateCvd(
        marketData.candles5m,
        SCALPING_CONFIG.filter3.cvdBars,
      );
      const cvdRatio = this.calculateCvdRatio(
        marketData.candles5m,
        cvdResult.cvd,
        SCALPING_CONFIG.filter3.cvdBars,
      );
      const filter3 = this.checkFilter3(
        trendResult,
        momentumResult,
        cvdResult,
        cvdRatio,
        marketData,
      );
      result.filter3Result = filter3;

      if (!filter3.passed) {
        // F2 통과 후 F3 실패 시 info 레벨로 로깅 (분석용)
        this.logger.log(
          `[ScalpingSignal] [${symbol}] F3 FAILED: ${filter3.reason} ` +
            `(momentum=${momentumResult.state}, dir=${momentumResult.direction}, cvd=${cvdResult.cvd.toFixed(0)})`,
        );
        result.analysisTimeMs = Date.now() - analysisStart;
        return result;
      }

      if (SCALPING_CONFIG.logging.verbose) {
        this.logger.debug(
          `[ScalpingSignal] [${symbol}] STEP 4: Filter 3 ✓ (Momentum=${momentumResult.state}, CVD=${cvdResult.cvd.toFixed(0)})`,
        );
      }

      // ========================================
      // STEP 5: 시그널 생성
      // ========================================
      const direction: SignalDirection =
        trendResult.direction === 'UP' ? 'LONG' : 'SHORT';

      // ATR 계산
      const atrResult = this.dataService.calculateAtr(
        marketData.candles5m,
        SCALPING_CONFIG.order.atrPeriod,
      );
      if (atrResult.atrPercent < SCALPING_CONFIG.order.minAtrPercent) {
        this.logger.debug(
          `[ScalpingSignal] [${symbol}] ATR% too low: ${(atrResult.atrPercent * 100).toFixed(3)}% < ${(SCALPING_CONFIG.order.minAtrPercent * 100).toFixed(3)}%`,
        );
        result.analysisTimeMs = Date.now() - analysisStart;
        return result;
      }

      // 가격 계산
      const currentPrice = marketData.currentPrice;
      const entryOffset = atrResult.atr * SCALPING_CONFIG.order.entryOffsetAtr;

      const entryPrice =
        direction === 'LONG'
          ? currentPrice - entryOffset
          : currentPrice + entryOffset;

      // ATR 기반 거리 계산 (부분 청산: TP1, TP2)
      const atrTp1Distance = atrResult.atr * SCALPING_CONFIG.order.tp1Atr;
      const atrTp2Distance = atrResult.atr * SCALPING_CONFIG.order.tp2Atr;
      const atrTpDistance = atrResult.atr * SCALPING_CONFIG.order.tpAtr; // 단일 TP (fallback)
      const atrSlDistance = atrResult.atr * SCALPING_CONFIG.order.slAtr;

      // 최소 TP/SL 거리 (수수료 + 스프레드 + 슬리피지 반영)
      const spreadPercent = marketData.spreadData?.spreadPercent || 0;
      const minTpSlPercent = Math.max(
        SCALPING_CONFIG.order.minTpSlPercent,
        (SCALPING_CONFIG.order.feePercent * 2) +
          (spreadPercent * 2) +
          SCALPING_CONFIG.order.slippagePercent,
      );
      const minTp1Distance = entryPrice * minTpSlPercent;
      const minTp2Distance = entryPrice * (minTpSlPercent * 1.5); // TP2는 더 크게
      const minTpDistance = entryPrice * minTpSlPercent;
      const minSlDistance = entryPrice * minTpSlPercent;

      // ATR 기반과 최소값 중 큰 값 사용
      const tp1Distance = Math.max(atrTp1Distance, minTp1Distance);
      const tp2Distance = Math.max(atrTp2Distance, minTp2Distance);
      const tpDistance = Math.max(atrTpDistance, minTpDistance);
      const slDistance = Math.max(atrSlDistance, minSlDistance);

      // TP1, TP2 가격 계산 (부분 청산)
      const tp1Price =
        direction === 'LONG'
          ? entryPrice + tp1Distance
          : entryPrice - tp1Distance;

      const tp2Price =
        direction === 'LONG'
          ? entryPrice + tp2Distance
          : entryPrice - tp2Distance;

      // 단일 TP 가격 (fallback)
      const tpPrice =
        direction === 'LONG'
          ? entryPrice + tpDistance
          : entryPrice - tpDistance;

      const slPrice =
        direction === 'LONG'
          ? entryPrice - slDistance
          : entryPrice + slDistance;

      // 강도 계산
      const strength = this.calculateStrength({
        trendStrength: trendResult.strength,
        momentumStrength: momentumResult.strength,
        cvdStrength: Math.abs(cvdResult.cvd),
        cvdRatio,
        fundingFavorable: this.isFundingFavorable(
          marketData.fundingData?.fundingRate || 0,
          direction,
        ),
        oiIncreasing: marketData.oiData?.direction === 'UP',
      });

      // 시그널 객체 생성
      const signal: ScalpingSignal = {
        symbol,
        direction,
        strength,

        // 가격 정보
        currentPrice,
        entryPrice,
        tpPrice, // 단일 TP (fallback)
        tp1Price, // 부분 청산 TP1 (50%)
        tp2Price, // 부분 청산 TP2 (나머지 50%)
        slPrice,

        // ATR 정보
        atr: atrResult.atr,
        atrPercent: atrResult.atrPercent,

        // 지표 정보
        trend: trendResult.direction,
        trendStrength: trendResult.strength,
        momentum: momentumResult.state,
        cvd: cvdResult.cvd,
        fundingRate: marketData.fundingData?.fundingRate || 0,
        oiChange: marketData.oiData?.oiChangePercent || 0,
        spreadPercent: marketData.spreadData?.spreadPercent || 0,

        // 필터 통과 정보
        passedFilter1: true,
        passedFilter2: true,
        passedFilter3: true,

        // 메타 정보
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000, // 1분 후 만료
        reason: `${trendResult.direction} trend + ${momentumResult.state} momentum`,
      };

      result.signal = signal;

      // 시그널 생성 로깅
      this.logger.log(
        `[ScalpingSignal] [${symbol}] STEP 5: ⭐ Signal generated - ${direction}`,
      );
      this.logger.log(
        `[ScalpingSignal] [${symbol}]   Entry: ${entryPrice.toFixed(4)}, TP1: ${tp1Price.toFixed(4)} (+${((tp1Price / entryPrice - 1) * 100).toFixed(2)}%), TP2: ${tp2Price.toFixed(4)} (+${((tp2Price / entryPrice - 1) * 100).toFixed(2)}%), SL: ${slPrice.toFixed(4)} (${((slPrice / entryPrice - 1) * 100).toFixed(2)}%)`,
      );
      this.logger.log(
        `[ScalpingSignal] [${symbol}]   ATR: ${atrResult.atr.toFixed(4)} (${(atrResult.atrPercent * 100).toFixed(2)}%), Strength: ${strength.toFixed(0)}/100`,
      );
      this.logger.debug(
        `[ScalpingSignal] [${symbol}]   Min TP/SL: ${(minTpSlPercent * 100).toFixed(3)}% ` +
          `(fee=${(SCALPING_CONFIG.order.feePercent * 100).toFixed(3)}%, ` +
          `spread=${(spreadPercent * 100).toFixed(3)}%, ` +
          `slip=${(SCALPING_CONFIG.order.slippagePercent * 100).toFixed(3)}%)`,
      );
    } catch (error) {
      this.logger.error(`[ScalpingSignal] [${symbol}] Analysis error`, error);
    }

    result.analysisTimeMs = Date.now() - analysisStart;
    return result;
  }

  /**
   * 1차 필터: Funding Rate, Spread
   */
  private checkFilter1(marketData: any): FilterResult {
    const config = SCALPING_CONFIG.filter1;
    const details: Record<string, number | string | boolean> = {};

    // ✅ Spread 데이터 필수 체크
    if (!marketData.spreadData) {
      return {
        passed: false,
        reason: 'No spread data',
        details,
      };
    }

    // Spread 체크
    const spreadPercent = marketData.spreadData.spreadPercent || 0;
    details.spreadPercent = spreadPercent;

    if (spreadPercent > config.maxSpreadPercent) {
      return {
        passed: false,
        reason: `Spread too high: ${(spreadPercent * 100).toFixed(3)}% > ${(config.maxSpreadPercent * 100).toFixed(3)}%`,
        details,
      };
    }

    // Funding Rate 체크 (선택적 - 없으면 0으로 처리)
    const fundingRate = marketData.fundingData?.fundingRate || 0;
    details.fundingRate = fundingRate;
    details.hasFunding = !!marketData.fundingData;

    // 극단적 Funding은 반대 방향만 허용 (나중에 방향 결정 시 사용)
    details.fundingExtreme =
      fundingRate > config.funding.extremeHigh
        ? 'SHORT_ONLY'
        : fundingRate < config.funding.extremeLow
          ? 'LONG_ONLY'
          : 'BOTH';

    return { passed: true, details };
  }

  /**
   * 2차 필터: 15분봉 추세
   */
  private checkFilter2(trendResult: TrendResult, marketData: any): FilterResult {
    const config = SCALPING_CONFIG.filter2;
    const details: Record<string, number | string | boolean> = {};

    details.trendDirection = trendResult.direction;
    details.trendStrength = trendResult.strength;
    details.higherHighs = trendResult.higherHighs;
    details.higherLows = trendResult.higherLows;
    details.lowerHighs = trendResult.lowerHighs;
    details.lowerLows = trendResult.lowerLows;

    // 추세 없음
    if (trendResult.direction === 'NEUTRAL') {
      return {
        passed: false,
        reason: 'No clear trend (NEUTRAL)',
        details,
      };
    }
    // 추세 강도 부족
    if (trendResult.strength < config.minTrendStrength) {
      return {
        passed: false,
        reason: `Trend strength too weak: ${trendResult.strength.toFixed(2)} < ${config.minTrendStrength}`,
        details,
      };
    }

    // OI 방향 확인 (선택적)
    const oiDirection = marketData.oiData?.direction || 'FLAT';
    details.oiDirection = oiDirection;

    // OI 감소 시 추세 신뢰도 감소 (완전 제외하지 않음)
    if (oiDirection === 'DOWN') {
      details.oiWarning = true;
    }

    return { passed: true, details };
  }

  /**
   * 3차 필터: 5분봉 모멘텀 + CVD
   */
  private checkFilter3(
    trendResult: TrendResult,
    momentumResult: MomentumResult,
    cvdResult: any,
    cvdRatio: number,
    marketData: any,
  ): FilterResult {
    const details: Record<string, number | string | boolean> = {};

    details.momentumState = momentumResult.state;
    details.momentumDirection = momentumResult.direction;
    details.momentumStrength = momentumResult.strength;
    details.cvd = cvdResult.cvd;
    details.cvdDirection = cvdResult.direction;
    details.cvdRatio = cvdRatio;

    // 소진 상태면 진입 금지
    if (momentumResult.state === 'EXHAUSTED') {
      return {
        passed: false,
        reason: 'Momentum exhausted',
        details,
      };
    }

    // MOMENTUM 또는 PULLBACK 상태 허용 (NEUTRAL, EXHAUSTED 제외)
    // - PULLBACK: 추세 중 쉬어가는 구간 → 좋은 진입점
    // - MOMENTUM: 추세 진행 중 → 방향 일치 시 진입 허용
    if (momentumResult.state === 'NEUTRAL') {
      return {
        passed: false,
        reason: 'Momentum state is NEUTRAL - no direction',
        details,
      };
    }

    // 추세 방향과 모멘텀 방향 일치 체크
    if (trendResult.direction !== momentumResult.direction) {
      return {
        passed: false,
        reason: `Trend (${trendResult.direction}) and momentum (${momentumResult.direction}) mismatch`,
        details,
      };
    }

    // MOMENTUM 상태일 때 추가 검증: 강한 모멘텀 진입 제한
    if (momentumResult.state === 'MOMENTUM') {
      const config = SCALPING_CONFIG.filter3.bodySizeRatio;
      // 봉 크기 비율이 1.5배 이상이면 진입 금지 (이미 많이 움직인 후)
      if (momentumResult.bodySizeRatio > config.momentumMax) {
        return {
          passed: false,
          reason: `Momentum too strong: bodySizeRatio=${momentumResult.bodySizeRatio.toFixed(2)} > ${config.momentumMax}`,
          details,
        };
      }
    }

    // CVD 방향 체크
    if (trendResult.direction === 'UP' && cvdResult.cvd <= 0) {
      return {
        passed: false,
        reason: 'CVD negative for LONG signal',
        details,
      };
    }

    if (trendResult.direction === 'DOWN' && cvdResult.cvd >= 0) {
      return {
        passed: false,
        reason: 'CVD positive for SHORT signal',
        details,
      };
    }
    // CVD 비율 체크 (체결 우세가 약하면 스킵)
    if (cvdRatio < SCALPING_CONFIG.filter3.minCvdRatio) {
      return {
        passed: false,
        reason: `CVD ratio too low: ${(cvdRatio * 100).toFixed(2)}% < ${(SCALPING_CONFIG.filter3.minCvdRatio * 100).toFixed(2)}%`,
        details,
      };
    }

    // Funding Rate 방향 체크 (Filter1에서 저장한 극단 값 사용)
    const fundingRate = marketData.fundingData?.fundingRate || 0;
    const config = SCALPING_CONFIG.filter1.funding;

    if (
      trendResult.direction === 'UP' &&
      fundingRate > config.maxForLong
    ) {
      return {
        passed: false,
        reason: `Funding too high for LONG: ${(fundingRate * 100).toFixed(3)}% > ${(config.maxForLong * 100).toFixed(3)}%`,
        details,
      };
    }

    if (
      trendResult.direction === 'DOWN' &&
      fundingRate < config.minForShort
    ) {
      return {
        passed: false,
        reason: `Funding too low for SHORT: ${(fundingRate * 100).toFixed(3)}% < ${(config.minForShort * 100).toFixed(3)}%`,
        details,
      };
    }

    return { passed: true, details };
  }

  /**
   * Funding이 유리한지 판단
   */
  private isFundingFavorable(
    fundingRate: number,
    direction: SignalDirection,
  ): boolean {
    const config = SCALPING_CONFIG.filter1.funding;

    if (direction === 'LONG') {
      // 롱: Funding 낮을수록 유리 (숏이 비용 부담)
      return fundingRate < config.maxForLong;
    } else {
      // 숏: Funding 높을수록 유리 (롱이 비용 부담)
      return fundingRate > config.minForShort;
    }
  }

  /**
   * CVD 비율 계산 (|CVD| / 총 거래량)
   */
  private calculateCvdRatio(
    candles: CandleData[],
    cvd: number,
    periods: number,
  ): number {
    if (candles.length < periods) {
      return 0;
    }
    const recentCandles = candles.slice(-periods);
    const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
    if (totalVolume <= 0) {
      return 0;
    }
    return Math.abs(cvd) / totalVolume;
  }

  /**
   * 시그널 강도 계산
   *
   * 각 요소에 가중치를 부여하여 0-100 점수로 변환
   */
  private calculateStrength(factors: {
    trendStrength: number;
    momentumStrength: number;
    cvdStrength: number;
    cvdRatio: number;
    fundingFavorable: boolean;
    oiIncreasing: boolean;
  }): number {
    let score = 0;

    // 추세 강도 (0-30점)
    score += Math.min(factors.trendStrength * 30, 30);

    // 모멘텀 강도 (0-25점)
    score += Math.min(factors.momentumStrength * 25, 25);

    // CVD 강도 (0-20점) - 비율 기반 정규화
    const cvdRatioTarget = SCALPING_CONFIG.filter3.minCvdRatio * 3;
    const cvdScore = Math.min(factors.cvdRatio / cvdRatioTarget, 1) * 20;
    score += cvdScore;

    // Funding 유리 (0-15점)
    score += factors.fundingFavorable ? 15 : 0;

    // OI 증가 (0-10점)
    score += factors.oiIncreasing ? 10 : 0;

    return Math.min(score, 100);
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
   * 마지막 스캔 요약 반환
   */
  getLastScanSummary(): ScanSummary | null {
    return this.lastScanSummary;
  }
}
