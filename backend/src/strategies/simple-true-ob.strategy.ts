/**
 * SimpleTrueOB 전략 - 실시간 매매 버전 (리버스 최적화)
 * tb1 프로젝트에서 가져옴
 *
 * *** 시장 레짐 기반 자동 스위칭 로직 ***
 *
 * 최적화 이력 (2026-01-08~09):
 * - Phase 1: orbAtr, orbVol, rrRatio, obMaxBars, minBodyRatio
 * - Phase 2: tp1Ratio, tp1Percent, minAwayMult(3종), slBuffer
 * - v4: rrRatio 4.0, tp1Ratio 1.2, tp1Percent 100%, minAwayMultRangebound 0.2
 * - v5: leverage 15x, maxHoldingBars 48 (4시간)
 * - v6: maxPriceDeviation 2%, orderValidityBars 15 (백테스트와 동기화)
 * - v7: ATR% 기반 동적 레버리지 (< 1.5% → 15x, 1.5-3% → 10x, > 3% → 5x)
 * - v8: 재진입 쿨다운 12캔들 (5분봉 1시간, 15분봉 3시간)
 * - v9: tp1Ratio 1.0 (승률 57%, MDD 22.5%, ROI +1207%)
 * - v10: ATR + CVD 필터 추가 (승률 58.8% → 62.5%, +3.7%p)
 * - v10 롤백 (2026-01-13): v11 전체 롤백 완료
 *
 * v11 (2026-01-22): 리버스 전략 최적화
 *   - orbVol: 2.0 → 2.5 (클라이맥스 거래량에서만 진입)
 *   - orbAtr: 1.5 → 1.8 (확실한 변동성 구간 선택)
 *   - 시장 레짐 기반 자동 스위칭 (ADX + RSI + EMA 이격도)
 *   - 리버스 모드 TP 비율: 2.0R, 쿨다운: 48캔들 (4시간)
 *
 * v12 (2026-01-23): 소액 자산 최적화 + 필터 강화
 *   - capitalUsage: 0.1 → 0.2 (소액 복리 모드)
 *   - 동적 레버리지: 10x~20x (ATR 기반)
 *   - orderValidityBars: 3 → 1 (리버스 즉각 반응)
 *   - 유동성 스윕(Liquidity Sweep) 필터 추가 (가중치 방식)
 *   - BTC 세이프티 가드 (1분 내 0.5%+ 변동 or ADX>40 시 1분 대기)
 *   - OI 다이버전스 필터 (조건부 승인)
 *
 * v14 (2026-01-24): REVERSAL 최적화 + 고정 마진/레버리지
 *   - 마진 $10 고정, 레버리지 15x 고정 (동적 레버리지 비활성화)
 *   - REVERSAL 조건 강화: 2개 이상 조건 충족 시에만 발동
 *   - REVERSAL TP: 2.0R → 1.3R (빠른 익절)
 *   - SL Buffer 레짐별 분리: TREND 0.8%, REVERSAL 0.6%
 *   - OB age 레짐별 분리: TREND 60 bars, REVERSAL 30 bars
 *
 * v15 (2026-01-25): 승률/RR 개선
 *   - REVERSAL 모드 비활성화 (TREND_FOLLOWING만 사용)
 *   - TP Ratio: 1.5R → 2.0R (RR 개선)
 *   - SL Buffer: 0.8% → 0.6% (손실 축소)
 *   - ADX 최소값 필터: ADX > 25 (횡보장 제외)
 *   - RSI 필터: LONG < 70, SHORT > 30 (극단 진입 방지)
 *   - 마진 $20, 레버리지 20x (포지션 확대)
 *
 * v15.1 (2026-01-25): 체결률 개선
 *   - 진입가 변경: OB 경계선 → 현재 종가 (즉시 체결)
 *   - SL/TP는 기존대로 OB 기준 유지
 *   - 기존 체결률 0% → 90%+ 예상
 *
 * v15.2 (2026-01-25): 진입가 최적화
 *   - 진입가: OB 경계와 현재가의 50% 중간 지점
 *   - 체결 가능성 유지 + 진입가 개선
 *   - entryRatio = 0.5 (조정 가능)
 *
 * v16 (2026-01-25): RR 개선 패키지
 *   - 진입비율: 0.5 → 0.3 (OB에 더 가깝게)
 *   - ATR 기반 SL: 고정 0.6% → 1.5x ATR (7기간)
 *   - 부분 익절: TP1(1R) 70%, TP2(2R) 30%
 *   - 트레일링 스탑: 1R 도달 시 SL → 진입가 (PositionSync에서 처리)
 *   - 시간 청산: 6봉(30분) 후 수익 없으면 청산 (PositionSync에서 처리)
 *
 * 현재 버전: v16 (RR 개선 패키지)
 * 목표: RR 0.94:1 → 1.5:1+ 개선
 */

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { ATR, SMA, RSI, ADX } from 'technicalindicators';
import { IStrategy, StrategySignal, STRATEGY_NAMES } from './strategy.interface';
import { CandleData } from '../websocket/candle-aggregator.service';
import {
  OHLCV,
  OrderBlock,
  EntrySignal,
  Position,
} from './simple-true-ob.interface';
import { OiDivergenceService } from './oi-divergence.service';

// v11: 시장 레짐 타입 정의
type MarketRegime = 'REVERSAL' | 'TREND_FOLLOWING';

// 백테스트와 동일한 설정
interface Config {
  lookback: number;
  minBodyRatio: number;
  minVolume: number;
  maxAtrMult: number;
  useBodyOnly: boolean;
  minAwayMult: number;
  requireReversal: boolean;
  sweepWickMin: number;
  sweepPenMin: number;
  sweepPenMax: number;
  orbAtr: number;
  orbVol: number;
  londonHour: number;
  nyHour: number;
  rrRatio: number;
  obMaxBars: number;
  makerFee: number;
  takerFee: number;
  leverage: number;
  capitalUsage: number;
  slippage: number;
  maxHoldingBars: number;
  preventSameCandleExit: boolean;
  // 동적 minAwayMult 설정 (변동성 기반)
  minAwayMultRangebound: number;
  minAwayMultNormal: number;
  minAwayMultTrending: number;
  // 백테스트와 동일한 필터 (v6 추가)
  maxPriceDeviation: number;      // 진입가 편차 체크 (2% = 0.02)
  orderValidityBars5m: number;    // 5분봉 주문 유효시간 (캔들 수)
  orderValidityBars15m: number;   // 15분봉 주문 유효시간 (캔들 수)
  // v7: ATR% 기반 동적 레버리지
  useDynamicLeverage: boolean;    // 동적 레버리지 사용 여부
  // v10: ATR + CVD 방향 필터
  useATRCVDFilter: boolean;       // ATR + CVD 필터 사용 여부
  atrFilterMin: number;           // ATR% 최소값 (0.5%)
  atrFilterMax: number;           // ATR% 최대값 (3.0%)
  cvdLookback: number;            // CVD 계산 기간 (20캔들)
  // v11: 리버스 전략 최적화
  useMarketRegime: boolean;       // 시장 레짐 기반 자동 스위칭 사용 여부
  adxPeriod: number;              // ADX 계산 기간
  rsiPeriod: number;              // RSI 계산 기간
  adxTrendThreshold: number;      // ADX 추세 임계값 (35 이상 = 강한 추세)
  adxChopThreshold: number;       // ADX 횡보 임계값 (25 미만 = 횡보)
  rsiOverbought: number;          // RSI 과매수 (75 이상)
  rsiOversold: number;            // RSI 과매도 (25 이하)
  emaDistanceThreshold: number;   // EMA 이격도 임계값 (3% = 0.03)
  reverseTpRatio: number;         // 리버스 모드 TP 비율 (1.5R)
  reverseCooldownBars: number;    // 리버스 모드 쿨다운 (48캔들 = 4시간)
  // v12: 소액 자산 최적화 + 필터 강화
  useLiquiditySweepFilter: boolean;  // 유동성 스윕 필터 사용 여부
  liquiditySweepLookback: number;    // 스윕 체크 캔들 수 (10)
  liquiditySweepThreshold: number;   // 스윕 임계값 (0.05% = 0.0005)
  useBtcSafetyGuard: boolean;        // BTC 세이프티 가드 사용 여부
  btcVolatilityThreshold: number;    // BTC 변동성 임계값 (0.5% = 0.005)
  btcAdxThreshold: number;           // BTC ADX 임계값 (40)
  useOiDivergenceFilter: boolean;    // OI 다이버전스 필터 사용 여부
  // v14: 고정 마진/레버리지 + 레짐별 파라미터
  useFixedMargin: boolean;           // 고정 마진 사용 여부
  fixedMarginUsdt: number;           // 고정 마진 금액 (USDT)
  slBufferTrend: number;             // TREND_FOLLOWING SL 버퍼 (0.8%)
  slBufferReversal: number;          // REVERSAL SL 버퍼 (0.6%)
  obMaxBarsTrend: number;            // TREND_FOLLOWING OB 유효기간 (60 bars)
  obMaxBarsReversal: number;         // REVERSAL OB 유효기간 (30 bars)
}

@Injectable()
export class SimpleTrueOBStrategy implements IStrategy {
  readonly name = STRATEGY_NAMES.SIMPLE_TRUE_OB;
  private readonly logger = new Logger(SimpleTrueOBStrategy.name);
  private config: Config;

  // 심볼+타임프레임별 상태 관리
  private activeOBMap: Map<string, OrderBlock | null> = new Map();
  private failedOBsMap: Map<string, Array<{ price: number; barIndex: number }>> = new Map();
  private candleCountMap: Map<string, number> = new Map();
  private candleBufferMap: Map<string, OHLCV[]> = new Map();

  // 리스크 관리: 심볼+타임프레임별 연속 손실/수익 관리
  private consecutiveLossesMap: Map<string, number> = new Map();
  private consecutiveWinsMap: Map<string, number> = new Map();
  private positionSizeMultiplierMap: Map<string, number> = new Map();

  // 자본 관리 (심볼별)
  private capitalMap: Map<string, number> = new Map();
  private readonly DEFAULT_CAPITAL = 10000;

  // 중복 호출 방지
  private lastProcessedCandleTimestamp: Map<string, number> = new Map();

  // ✅ 실시간 모드 플래그 (과거 데이터 로딩 중에는 false)
  private isLiveMode = false;

  // v12.2: 재진입 쿨다운 단축 (빠른 회전)
  private readonly REENTRY_COOLDOWN_BARS = 8;  // 5분봉 40분, 15분봉 2시간 (정방향)
  private lastExitCandleIndexMap: Map<string, number> = new Map();
  // v11: 리버스 모드 쿨다운 추적
  private lastTradeWasReversedMap: Map<string, boolean> = new Map();

  // v12: OI Divergence 서비스 (Optional)
  private oiDivergenceService: OiDivergenceService | null = null;

  constructor(
    @Optional() @Inject(forwardRef(() => OiDivergenceService))
    oiDivergenceService?: OiDivergenceService,
  ) {
    this.oiDivergenceService = oiDivergenceService || null;
    // *** 최적화된 설정값 (2026-01-08 Phase 1 + Phase 2) ***
    this.config = {
      lookback: 2,              // 백테스트와 동일 (5→2)
      minBodyRatio: 0.5,        // 최적화: 0.65 → 0.5
      minVolume: 2.0,
      maxAtrMult: 2.0,
      useBodyOnly: true,
      minAwayMult: 1.5,         // 기본값 (동적 조정으로 대체됨)
      requireReversal: true,
      sweepWickMin: 0.6,
      sweepPenMin: 0.1,
      sweepPenMax: 1.0,
      orbAtr: 1.6,              // v12.2: 1.8 → 1.6 (신호 빈도 +20%)
      orbVol: 2.2,              // v12.2: 2.5 → 2.2 (신호 빈도 +25%)
      londonHour: 7,
      nyHour: 14,
      rrRatio: 4.0,             // v4 최적화: 3.0 → 4.0
      obMaxBars: 60,            // 기본값 (레짐별 분리로 대체됨)
      makerFee: 0.0004,         // 0.04%
      takerFee: 0.00075,        // 0.075%
      leverage: 20,             // v15: 20x 고정
      capitalUsage: 0.2,        // v12: 20% (소액 복리 모드) - useFixedMargin으로 대체
      slippage: 0.0002,         // 0.02% - 백테스트와 동일하게 추가
      maxHoldingBars: 48,       // v5 최적화: 72 → 48 (4시간)
      preventSameCandleExit: true,
      // 동적 minAwayMult 설정 (v4 최적화: 2026-01-08)
      minAwayMultRangebound: 0.2,   // v4 최적화: 0.3 → 0.2 (횡보장)
      minAwayMultNormal: 0.8,       // (동일)
      minAwayMultTrending: 2.0,     // (동일)
      // v6: 백테스트와 동일한 필터 추가
      maxPriceDeviation: 0.02,      // 2% - 현재가가 OB 중간가에서 2% 이상 벗어나면 진입 스킵
      orderValidityBars5m: 3,       // v12.2: 5분봉 15분 (3 × 5분) - 진입 기회 +50%
      orderValidityBars15m: 3,      // v12.2: 15분봉 45분 (3 × 15분) - 진입 기회 +50%
      // v15: 고정 레버리지 20x (동적 레버리지 비활성화)
      useDynamicLeverage: false,    // v15: 동적 레버리지 비활성화 → 20x 고정
      // v10: ATR + CVD 방향 필터
      useATRCVDFilter: true,        // 활성화
      atrFilterMin: 0.5,            // v10 원복 (0.4 → 0.5)
      atrFilterMax: 3.0,            // ATR% 최대 3.0%
      cvdLookback: 20,              // CVD 20캔들 기준
      // v15: REVERSAL 모드 비활성화 (TREND_FOLLOWING만 사용)
      useMarketRegime: false,       // v15: REVERSAL 비활성화 → TREND만 사용
      adxPeriod: 14,                // ADX 계산 기간
      rsiPeriod: 14,                // RSI 계산 기간
      adxTrendThreshold: 35,        // ADX > 35 = 강한 추세 (리버스 금지)
      adxChopThreshold: 25,         // ADX < 25 = 횡보 (리버스 적극 활용)
      rsiOverbought: 75,            // RSI > 75 = 과매수 (리버스 활성화)
      rsiOversold: 25,              // RSI < 25 = 과매도 (리버스 활성화)
      emaDistanceThreshold: 0.03,   // 이격도 3% 이상일 때만 리버스 고려
      reverseTpRatio: 1.3,          // v14: 2.0 → 1.3 (리버스 빠른 익절)
      reverseCooldownBars: 24,      // v12.2: 48 → 24 (리버스 쿨다운 2시간으로 단축)
      // v12: 소액 자산 최적화 + 필터 강화
      useLiquiditySweepFilter: true,   // 유동성 스윕 필터 활성화
      liquiditySweepLookback: 10,      // OB 형성 직전 10캔들
      liquiditySweepThreshold: 0.0005, // 0.05% 이상 돌파
      useBtcSafetyGuard: true,         // BTC 세이프티 가드 활성화
      btcVolatilityThreshold: 0.005,   // BTC 1분 내 0.5% 이상 변동
      btcAdxThreshold: 40,             // BTC ADX 40 이상 시 대기
      useOiDivergenceFilter: true,     // OI 다이버전스 필터 활성화
      // v15: 고정 마진/레버리지 + SL 버퍼 축소
      useFixedMargin: true,            // v15: 고정 마진 사용
      fixedMarginUsdt: 20,             // v15: 마진 $20 고정
      slBufferTrend: 0.006,            // v15: TREND SL 버퍼 0.6% (0.8% → 0.6%)
      slBufferReversal: 0.004,         // v15: REVERSAL SL 버퍼 0.4% (사용 안함)
      obMaxBarsTrend: 60,              // v14: TREND OB 유효기간 60 bars
      obMaxBarsReversal: 30,           // v14: REVERSAL OB 유효기간 30 bars
    };
  }

  /**
   * v12: ATR% 기반 동적 레버리지 계산 (10x~20x)
   * 소액 자산 최적화: 최소 10x, 최대 20x
   */
  private getDynamicLeverage(atrPercent: number): number {
    if (atrPercent < 1.5) return 20;      // 낮은 변동성 → 최대 레버리지
    if (atrPercent <= 3.0) return 15;     // 보통 변동성 → 중간 레버리지
    return 10;                             // 높은 변동성 → 최소 레버리지 (10x)
  }

  /**
   * v10: ATR 변동성 필터 - 적정 변동성 범위 확인 (0.5% ~ 3.0%)
   */
  private checkATRVolatilityFilter(candles: OHLCV[], currentIndex: number): boolean {
    if (currentIndex < 100) return true;  // 데이터 부족시 통과

    const slice = candles.slice(Math.max(0, currentIndex - 100), currentIndex + 1);

    // ATR 계산
    const atrValues = ATR.calculate({
      high: slice.map(c => c.high),
      low: slice.map(c => c.low),
      close: slice.map(c => c.close),
      period: 14,
    });

    if (atrValues.length === 0) return true;

    const currentATR = atrValues[atrValues.length - 1];
    const currentPrice = slice[slice.length - 1].close;
    const atrPercent = (currentATR / currentPrice) * 100;

    // 적정 변동성 범위: 0.5% ~ 3.0%
    return atrPercent >= this.config.atrFilterMin && atrPercent <= this.config.atrFilterMax;
  }

  /**
   * v10: CVD (Cumulative Volume Delta) 필터 - 매수/매도 압력 분석
   */
  private checkCVDFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', currentIndex: number): boolean {
    if (currentIndex < 50) return true;  // 데이터 부족시 통과

    const lookback = this.config.cvdLookback;  // 20캔들
    const slice = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);

    if (slice.length < lookback) return true;

    // Delta 계산 (캔들 기반 근사치)
    // Buy Volume: (Close - Low) / (High - Low) * Volume
    // Sell Volume: (High - Close) / (High - Low) * Volume
    // Delta = Buy Volume - Sell Volume
    const deltas: number[] = [];

    for (const candle of slice) {
      const range = candle.high - candle.low;
      if (range === 0) {
        deltas.push(0);
        continue;
      }

      const buyRatio = (candle.close - candle.low) / range;
      const sellRatio = (candle.high - candle.close) / range;
      const delta = candle.volume * (buyRatio - sellRatio);
      deltas.push(delta);
    }

    // CVD 계산 (누적 델타)
    let cvd = 0;
    const cvdValues: number[] = [];
    for (const delta of deltas) {
      cvd += delta;
      cvdValues.push(cvd);
    }

    // CVD 추세 판단 (최근 10개 캔들)
    const recentCVD = cvdValues.slice(-10);
    const cvdStart = recentCVD[0];
    const cvdEnd = recentCVD[recentCVD.length - 1];
    const cvdTrend = cvdEnd - cvdStart;

    // LONG: CVD 상승 (매수 압력 증가)
    // SHORT: CVD 하락 (매도 압력 증가)
    if (obType === 'LONG') {
      return cvdTrend > 0;  // 매수 압력 있음
    } else {
      return cvdTrend < 0;  // 매도 압력 있음
    }
  }

  /**
   * v12: 유동성 스윕(Liquidity Sweep) 필터
   * OB 형성 직전 10캔들 내에 최근 20캔들의 고점/저점을 돌파(Sweep)했는지 체크
   * 조건 충족 시 가중치 부여 (조건부 승인 방식)
   *
   * @returns { hasSweep: boolean, sweepScore: number } - 스윕 발생 여부 및 점수 (0~100)
   */
  private checkLiquiditySweep(candles: OHLCV[], obIndex: number, obType: 'LONG' | 'SHORT'): { hasSweep: boolean; sweepScore: number } {
    if (obIndex < 30) return { hasSweep: false, sweepScore: 0 };  // 데이터 부족

    const lookback = this.config.liquiditySweepLookback;  // 10캔들
    const threshold = this.config.liquiditySweepThreshold;  // 0.05%

    // 최근 20캔들의 고점/저점 계산 (OB 직전 기준)
    const range20 = candles.slice(Math.max(0, obIndex - 20), obIndex);
    if (range20.length < 10) return { hasSweep: false, sweepScore: 0 };

    const high20 = Math.max(...range20.map(c => c.high));
    const low20 = Math.min(...range20.map(c => c.low));

    // OB 형성 직전 10캔들에서 스윕 체크
    const checkRange = candles.slice(Math.max(0, obIndex - lookback), obIndex);

    let hasSweep = false;
    let sweepScore = 0;

    for (const candle of checkRange) {
      if (obType === 'LONG') {
        // Bullish OB 형성 전: 저점을 스윕(돌파) 후 반등
        const sweepAmount = (low20 - candle.low) / low20;
        if (sweepAmount >= threshold) {
          hasSweep = true;
          // 스윕 깊이에 따른 점수 (최대 100점)
          sweepScore = Math.min(100, Math.round(sweepAmount * 10000));
          break;
        }
      } else {
        // Bearish OB 형성 전: 고점을 스윕(돌파) 후 반락
        const sweepAmount = (candle.high - high20) / high20;
        if (sweepAmount >= threshold) {
          hasSweep = true;
          sweepScore = Math.min(100, Math.round(sweepAmount * 10000));
          break;
        }
      }
    }

    return { hasSweep, sweepScore };
  }

  /**
   * v10: ATR + CVD 조합 필터 (로깅 포함)
   */
  private checkATRCVDFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', currentIndex: number, symbol?: string, timeframe?: string): { passed: boolean; reason?: string } {
    const atrPassed = this.checkATRVolatilityFilter(candles, currentIndex);
    const cvdPassed = this.checkCVDFilter(candles, obType, currentIndex);

    if (!atrPassed) {
      return { passed: false, reason: 'ATR volatility out of range (0.5%~3.0%)' };
    }
    if (!cvdPassed) {
      return { passed: false, reason: `CVD divergence (${obType} needs ${obType === 'LONG' ? 'buying' : 'selling'} pressure)` };
    }
    return { passed: true };
  }

  /**
   * v11: ADX (Average Directional Index) 계산 - 추세 강도 측정
   */
  private calculateADX(candles: OHLCV[]): number {
    if (candles.length < this.config.adxPeriod + 10) return 0;

    const adxResult = ADX.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period: this.config.adxPeriod,
    });

    if (adxResult.length === 0) return 0;
    return adxResult[adxResult.length - 1].adx;
  }

  /**
   * v11: RSI (Relative Strength Index) 계산 - 과매수/과매도 판단
   */
  private calculateRSI(candles: OHLCV[]): number {
    if (candles.length < this.config.rsiPeriod + 10) return 50;

    const rsiResult = RSI.calculate({
      values: candles.map(c => c.close),
      period: this.config.rsiPeriod,
    });

    if (rsiResult.length === 0) return 50;
    return rsiResult[rsiResult.length - 1];
  }

  /**
   * v16: 7기간 ATR 계산 (SL용)
   * 리서치: 5분봉 스캘핑에서 7기간 ATR이 더 민감하게 반응
   */
  private calculateATR7(candles: OHLCV[], currentIndex: number): number {
    if (currentIndex < 10) return 0;

    const slice = candles.slice(Math.max(0, currentIndex - 20), currentIndex + 1);

    const atrValues = ATR.calculate({
      high: slice.map(c => c.high),
      low: slice.map(c => c.low),
      close: slice.map(c => c.close),
      period: 7,  // v16: 7기간 (기존 14기간보다 민감)
    });

    if (atrValues.length === 0) return 0;
    return atrValues[atrValues.length - 1];
  }

  /**
   * v11: EMA50 계산 및 이격도 측정
   */
  private calculateEMADistance(candles: OHLCV[]): { ema50: number; distance: number } {
    if (candles.length < 50) return { ema50: 0, distance: 0 };

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // 간단한 EMA50 계산 (SMA로 근사)
    const ema50Values = SMA.calculate({
      period: 50,
      values: closes,
    });

    if (ema50Values.length === 0) return { ema50: 0, distance: 0 };

    const ema50 = ema50Values[ema50Values.length - 1];
    const distance = Math.abs(currentPrice - ema50) / ema50;

    return { ema50, distance };
  }

  /**
   * v14: 시장 레짐 결정 함수 (2조건 이상 충족 시 REVERSAL)
   *
   * REVERSAL: 2개 이상 조건 충족 시에만 활성화
   * TREND_FOLLOWING: 그 외 모든 경우
   *
   * v14 변경사항:
   * - 점수 기반 판정: ADX<25, RSI 극단, EMA 이격도 각각 +1점
   * - 2점 이상일 때만 REVERSAL 발동 (기존: 1조건만 충족해도 발동)
   * - REVERSAL 남발 방지로 역추세 손절 급감 기대
   */
  private getMarketRegime(candles: OHLCV[], symbol: string, timeframe: string): { regime: MarketRegime; reason: string } {
    if (!this.config.useMarketRegime) {
      return { regime: 'TREND_FOLLOWING', reason: 'Market regime switching disabled' };
    }

    const adx = this.calculateADX(candles);
    const rsi = this.calculateRSI(candles);
    const { ema50, distance } = this.calculateEMADistance(candles);

    // v14: 점수 기반 REVERSAL 판정
    let reversalScore = 0;
    const reasons: string[] = [];

    // 조건 1: 횡보장 (ADX < 25)
    if (adx < this.config.adxChopThreshold) {
      reversalScore++;
      reasons.push(`ADX<${this.config.adxChopThreshold}`);
    }

    // 조건 2: RSI 극단 (> 75 or < 25)
    if (rsi > this.config.rsiOverbought || rsi < this.config.rsiOversold) {
      reversalScore++;
      reasons.push(`RSI=${rsi.toFixed(0)}`);
    }

    // 조건 3: EMA 이격도 (> 3%)
    if (distance > this.config.emaDistanceThreshold) {
      reversalScore++;
      reasons.push(`EMA=${(distance * 100).toFixed(1)}%`);
    }

    // 로깅
    if (this.isLiveMode) {
      this.logger.debug(
        `[${symbol}/${timeframe}] Regime Check - ADX: ${adx.toFixed(1)}, RSI: ${rsi.toFixed(1)}, ` +
        `EMA Distance: ${(distance * 100).toFixed(2)}% | Score: ${reversalScore}/3`
      );
    }

    // v14: 2개 이상 조건 충족 시에만 REVERSAL
    if (reversalScore >= 2) {
      return {
        regime: 'REVERSAL',
        reason: `REVERSAL (${reversalScore}/3): ${reasons.join(', ')}`
      };
    }

    // 그 외: TREND_FOLLOWING
    return {
      regime: 'TREND_FOLLOWING',
      reason: `TREND (${reversalScore}/3) ADX=${adx.toFixed(0)}, RSI=${rsi.toFixed(0)}`
    };
  }

  private getStateKey(symbol: string, timeframe: string): string {
    return `${symbol}_${timeframe}`;
  }

  private getActiveOB(key: string): OrderBlock | null {
    return this.activeOBMap.get(key) || null;
  }

  private setActiveOB(key: string, ob: OrderBlock | null): void {
    this.activeOBMap.set(key, ob);
  }

  private getFailedOBs(key: string): Array<{ price: number; barIndex: number }> {
    return this.failedOBsMap.get(key) || [];
  }

  private addFailedOB(key: string, failedOB: { price: number; barIndex: number }): void {
    const failedOBs = this.getFailedOBs(key);
    failedOBs.push(failedOB);
    this.failedOBsMap.set(key, failedOBs);
  }

  private getCandleCount(key: string): number {
    return this.candleCountMap.get(key) || 0;
  }

  private setCandleCount(key: string, count: number): void {
    this.candleCountMap.set(key, count);
  }

  private getCandleBuffer(key: string): OHLCV[] {
    return this.candleBufferMap.get(key) || [];
  }

  private addCandleToBuffer(key: string, candle: OHLCV): void {
    const buffer = this.getCandleBuffer(key);
    buffer.push(candle);
    // SMA50(1시간봉=600개 5분봉) 계산을 위해 최대 1000개 유지
    if (buffer.length > 1000) {
      buffer.shift();
    }
    this.candleBufferMap.set(key, buffer);
  }

  /**
   * SMA50 값 배열 반환 (트렌드 체크용)
   * 백테스트와 동일하게 600개 SMA 사용
   */
  private getSMA50Values(key: string): number[] {
    const buffer = this.getCandleBuffer(key);
    if (buffer.length < 600) return [];

    const closes = buffer.map(c => c.close);
    const smaValues = SMA.calculate({
      period: 600,
      values: closes,
    });

    // 패딩 추가하여 인덱스 맞춤
    const padding = new Array(600 - 1).fill(0);
    return [...padding, ...smaValues];
  }

  private getCapital(symbol: string): number {
    return this.capitalMap.get(symbol) || this.DEFAULT_CAPITAL;
  }

  private setCapital(symbol: string, capital: number): void {
    this.capitalMap.set(symbol, capital);
  }

  private getPositionSizeMultiplier(key: string): number {
    return this.positionSizeMultiplierMap.get(key) || 1.0;
  }

  private setPositionSizeMultiplier(key: string, multiplier: number): void {
    this.positionSizeMultiplierMap.set(key, multiplier);
  }

  private getConsecutiveLosses(key: string): number {
    return this.consecutiveLossesMap.get(key) || 0;
  }

  private setConsecutiveLosses(key: string, count: number): void {
    this.consecutiveLossesMap.set(key, count);
  }

  private getConsecutiveWins(key: string): number {
    return this.consecutiveWinsMap.get(key) || 0;
  }

  private setConsecutiveWins(key: string, count: number): void {
    this.consecutiveWinsMap.set(key, count);
  }

  /**
   * v8: 포지션 종료 시 호출 (재진입 쿨다운용)
   * PositionSyncService에서 호출
   * v11: wasReversed 파라미터 추가 - 리버스 모드 쿨다운 추적
   */
  public onPositionClosed(symbol: string, timeframe: string, wasReversed: boolean = false): void {
    const stateKey = this.getStateKey(symbol, timeframe);
    const currentCandleIndex = this.getCandleCount(stateKey);
    this.lastExitCandleIndexMap.set(stateKey, currentCandleIndex);
    this.lastTradeWasReversedMap.set(stateKey, wasReversed);

    const cooldownBars = wasReversed ? this.config.reverseCooldownBars : this.REENTRY_COOLDOWN_BARS;
    this.logger.log(`[v11] Position closed: ${symbol}/${timeframe} - ${wasReversed ? 'REVERSAL' : 'TREND'} mode, Cooldown ${cooldownBars} bars started at candle ${currentCandleIndex}`);
  }

  /**
   * v8: 재진입 쿨다운 체크
   * v11: 리버스 모드였다면 더 긴 쿨다운 (48캔들 = 4시간)
   */
  private isInCooldown(stateKey: string): boolean {
    const lastExitIndex = this.lastExitCandleIndexMap.get(stateKey);
    if (lastExitIndex === undefined) return false;  // 이전 종료 기록 없음

    const currentIndex = this.getCandleCount(stateKey);
    const barsSinceExit = currentIndex - lastExitIndex;

    // v11: 리버스 모드였다면 더 긴 쿨다운 적용
    const wasReversed = this.lastTradeWasReversedMap.get(stateKey) || false;
    const cooldownBars = wasReversed ? this.config.reverseCooldownBars : this.REENTRY_COOLDOWN_BARS;

    if (barsSinceExit < cooldownBars) {
      return true;  // 쿨다운 중
    }
    return false;
  }

  /**
   * 5분봉 종가 이벤트
   */
  async on5minCandleClose(symbol: string, candle: CandleData): Promise<StrategySignal | null> {
    return this.processCandle(symbol, '5m', candle);
  }

  /**
   * 15분봉 종가 이벤트
   */
  async on15minCandleClose(symbol: string, candle: CandleData): Promise<StrategySignal | null> {
    return this.processCandle(symbol, '15m', candle);
  }

  /**
   * 캔들 처리
   */
  private async processCandle(symbol: string, timeframe: string, candle: CandleData): Promise<StrategySignal | null> {
    const stateKey = this.getStateKey(symbol, timeframe);

    // OHLCV로 변환
    const ohlcv: OHLCV = {
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    };

    // 캔들 버퍼에 추가
    this.addCandleToBuffer(stateKey, ohlcv);
    const candles = this.getCandleBuffer(stateKey);

    // 캔들 카운트 증가
    const candleCount = this.getCandleCount(stateKey) + 1;
    this.setCandleCount(stateKey, candleCount);

    // 최소 데이터 요구: 700개 (SMA50 = 600개 + 여유 100개)
    const MIN_CANDLES = 700;
    if (candles.length < MIN_CANDLES) {
      if (candles.length % 100 === 0) {
        this.logger.debug(`[${symbol}/${timeframe}] Collecting candles: ${candles.length}/${MIN_CANDLES}`);
      }
      return null;
    }

    // 첫 준비 완료 알림
    if (candles.length === MIN_CANDLES) {
      this.logger.log(`[${symbol}/${timeframe}] Ready for signal detection (${MIN_CANDLES} candles)`);
    }

    // 중복 체크
    const currentTimestamp = candle.timestamp.getTime();
    const lastProcessed = this.lastProcessedCandleTimestamp.get(stateKey);
    if (lastProcessed === currentTimestamp) {
      return null;
    }
    this.lastProcessedCandleTimestamp.set(stateKey, currentTimestamp);

    // 오래된 실패 OB 정리 (50캔들 이상)
    const failedOBs = this.getFailedOBs(stateKey).filter(
      failed => candleCount - failed.barIndex < 50
    );
    this.failedOBsMap.set(stateKey, failedOBs);

    // 신호 체크
    const signal = await this.checkEntry(candles, symbol, timeframe, stateKey);

    if (signal) {
      // ✅ 과거 데이터 로드 중에는 신호 생성 차단 (v9 버그 수정)
      if (!this.isLiveMode) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal discarded (not in live mode)`);
        return null;
      }

      // StrategySignal 형식으로 변환
      // v16: 분할 익절 70/30
      return {
        strategy: this.name,
        symbol,
        timeframe,  // 타임프레임 추가
        side: signal.direction,
        entryPrice: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
        tp1Percent: 70,           // v16: TP1 70% (1R)
        tp2Percent: 30,           // v16: TP2 30% (2R)
        leverage: signal.leverage,  // v7: 동적 레버리지 사용 (this.config.leverage → signal.leverage)
        score: 80,  // 85 미만 → Limit 주문 사용 (백테스트와 동일)
        timestamp: candle.timestamp,
        metadata: {
          method: signal.method,
          obBottom: signal.obBottom,
          obTop: signal.obTop,
          positionSize: signal.positionSize,
          margin: signal.margin,
          positionValue: signal.positionValue,
          atrPercent: signal.metadata?.atrPercent,  // v7: ATR% 추적용
          atr7: signal.metadata?.atr7,              // v16: ATR7 값
        },
      };
    }

    return null;
  }

  /**
   * 진입 신호 체크 (백테스트와 100% 동일 로직)
   */
  private async checkEntry(
    candles: OHLCV[],
    symbol: string,
    timeframe: string,
    stateKey: string
  ): Promise<EntrySignal | null> {
    // v8: 재진입 쿨다운 체크 (백테스트와 동일)
    if (this.isInCooldown(stateKey)) {
      const lastExitIndex = this.lastExitCandleIndexMap.get(stateKey) || 0;
      const currentIndex = this.getCandleCount(stateKey);
      const barsRemaining = this.REENTRY_COOLDOWN_BARS - (currentIndex - lastExitIndex);
      // 10캔들마다 쿨다운 상태 로깅 (스팸 방지)
      if ((currentIndex - lastExitIndex) % 10 === 0) {
        this.logger.debug(`[${symbol}/${timeframe}] In cooldown: ${barsRemaining} bars remaining`);
      }
      return null;
    }

    const i = candles.length - 1;
    const currentCandle = candles[i];

    // ATR(14) 계산
    const atrValues = ATR.calculate({
      period: 14,
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close)
    });
    const atr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;

    if (atr === 0) return null;

    // SMA 50 (1시간봉 기준) = 600개 5분봉
    const sma50Values = SMA.calculate({
      period: 600,
      values: candles.map(c => c.close)
    });
    const sma50 = sma50Values.length > 0 ? sma50Values[sma50Values.length - 1] : 0;

    if (sma50 === 0) {
      this.logger.debug(`[${symbol}/${timeframe}] SMA50 not ready yet`);
      return null;
    }

    // 볼륨 평균 (50기간)
    const volAvg50Values = SMA.calculate({
      period: 50,
      values: candles.map(c => c.volume)
    });
    const volAvg50 = volAvg50Values.length > 0 ? volAvg50Values[volAvg50Values.length - 1] : 0;

    let activeOB = this.getActiveOB(stateKey);

    // OB 에이징 및 무효화 체크 (먼저)
    if (activeOB) {
      activeOB.age = i - activeOB.barIndex;

      if (activeOB.age > this.config.obMaxBars) {
        this.logger.debug(`[${symbol}/${timeframe}] OB expired (age: ${activeOB.age})`);
        activeOB = null;
      }
      else if (activeOB.type === 'LONG' && currentCandle.low < activeOB.bottom) {
        this.logger.debug(`[${symbol}/${timeframe}] LONG OB invalidated (price broke bottom)`);
        activeOB = null;
      }
      else if (activeOB.type === 'SHORT' && currentCandle.high > activeOB.top) {
        this.logger.debug(`[${symbol}/${timeframe}] SHORT OB invalidated (price broke top)`);
        activeOB = null;
      }
    }

    // Order Block 감지 (ORB만) - 개선: 더 강한 OB가 나오면 교체
    const newOB = this.detectORB(candles, i, atr, volAvg50);

    if (newOB) {
      // 기존 OB가 없거나, 새 OB가 더 강하면 교체
      let shouldReplace = !activeOB;

      if (activeOB && !shouldReplace) {
        // 새 OB의 강도 비교 (볼륨 비율 기준)
        const oldOBCandle = candles[activeOB.barIndex];
        const newOBCandle = candles[newOB.barIndex];
        const oldVolRatio = oldOBCandle ? oldOBCandle.volume / volAvg50 : 0;
        const newVolRatio = newOBCandle.volume / volAvg50;

        // 새 OB의 볼륨이 기존 OB보다 1.5배 이상 크면 교체
        if (newVolRatio > oldVolRatio * 1.5) {
          this.logger.log(`[${symbol}/${timeframe}] Replacing OB: new vol ratio ${newVolRatio.toFixed(2)} > old ${oldVolRatio.toFixed(2)} × 1.5`);
          shouldReplace = true;
        }
      }

      if (shouldReplace) {
        activeOB = newOB;

        // OB 필터 적용
        const obSize = activeOB.top - activeOB.bottom;
        const obMidpoint = (activeOB.top + activeOB.bottom) / 2;
        let shouldReject = false;
        let rejectReason = '';

        // v13 필터 1: OB 최소 크기 강화 (ATR의 80% 이상)
        if (obSize < atr * 0.8) {
          shouldReject = true;
          rejectReason = `OB too small (${(obSize / atr * 100).toFixed(0)}% of ATR, need 80%+)`;
        }

        // v13 필터 2: OB 최대 크기 (ATR의 300% 이하) - 너무 큰 OB는 신뢰도 낮음
        if (!shouldReject && obSize > atr * 3.0) {
          shouldReject = true;
          rejectReason = `OB too large (${(obSize / atr * 100).toFixed(0)}% of ATR, max 300%)`;
        }

        // 필터 2: SMA 필터 (백테스트와 100% 동일 - 강화된 트렌드 필터)
        if (!shouldReject) {
          const distanceFromSMA = Math.abs(currentCandle.close - sma50) / sma50;
          const minDistanceFromSMA = 0.02;  // 2%

          // 마켓 레짐 계산 (백테스트와 동일)
          let marketRegime = 'SIDEWAYS';
          const sma50Values = this.getSMA50Values(stateKey);
          if (sma50Values.length >= 20) {
            const currentSMA = sma50Values[sma50Values.length - 1];
            const sma20BarsAgo = sma50Values[sma50Values.length - 20];
            if (currentSMA && sma20BarsAgo) {
              const smaSlope = (currentSMA - sma20BarsAgo) / sma20BarsAgo;
              if (smaSlope > 0.02) {
                marketRegime = 'UPTREND';
              } else if (smaSlope < -0.02) {
                marketRegime = 'DOWNTREND';
              }
            }
          }

          if (activeOB.type === 'LONG') {
            // LONG 조건 (백테스트와 동일)
            if (currentCandle.close < sma50) {
              shouldReject = true;
              rejectReason = 'LONG: price below SMA50';
            }
            else if (distanceFromSMA < minDistanceFromSMA) {
              shouldReject = true;
              rejectReason = 'LONG: too close to SMA50';
            }
            else if (marketRegime === 'DOWNTREND') {
              shouldReject = true;
              rejectReason = 'LONG: market in DOWNTREND';
            }
            else {
              // barsAboveSMA 체크 (백테스트와 동일)
              let barsAboveSMA = 0;
              const buffer = this.getCandleBuffer(stateKey);
              const smaVals = this.getSMA50Values(stateKey);
              for (let j = buffer.length - 1; j >= Math.max(0, buffer.length - 20); j--) {
                const candleClose = buffer[j]?.close;
                const smaValue = smaVals[j];
                if (candleClose && smaValue && candleClose > smaValue) {
                  barsAboveSMA++;
                } else {
                  break;
                }
              }
              if (barsAboveSMA < 10) {
                shouldReject = true;
                rejectReason = `LONG: only ${barsAboveSMA} bars above SMA (need 10+)`;
              }
            }
          } else if (activeOB.type === 'SHORT') {
            // SHORT 조건 (백테스트와 동일)
            if (currentCandle.close > sma50) {
              shouldReject = true;
              rejectReason = 'SHORT: price above SMA50';
            }
            else if (distanceFromSMA < minDistanceFromSMA) {
              shouldReject = true;
              rejectReason = 'SHORT: too close to SMA50';
            }
            else if (marketRegime === 'UPTREND') {
              shouldReject = true;
              rejectReason = 'SHORT: market in UPTREND';
            }
            else {
              // barsBelowSMA 체크 (백테스트와 동일)
              let barsBelowSMA = 0;
              const buffer = this.getCandleBuffer(stateKey);
              const smaVals = this.getSMA50Values(stateKey);
              for (let j = buffer.length - 1; j >= Math.max(0, buffer.length - 20); j--) {
                const candleClose = buffer[j]?.close;
                const smaValue = smaVals[j];
                if (candleClose && smaValue && candleClose < smaValue) {
                  barsBelowSMA++;
                } else {
                  break;
                }
              }
              if (barsBelowSMA < 10) {
                shouldReject = true;
                rejectReason = `SHORT: only ${barsBelowSMA} bars below SMA (need 10+)`;
              }
            }
          }
        }

        // 필터 3: 실패한 OB 재진입 방지
        if (!shouldReject) {
          const failedOBs = this.getFailedOBs(stateKey);
          const recentFailedOB = failedOBs.find(
            failed => Math.abs(failed.price - obMidpoint) < obSize * 0.5 && i - failed.barIndex < 20
          );
          if (recentFailedOB) {
            shouldReject = true;
            rejectReason = `Failed OB retry (${i - recentFailedOB.barIndex} bars ago)`;
          }
        }

        if (shouldReject) {
          this.logger.debug(`[${symbol}/${timeframe}] OB rejected: ${rejectReason}`);
          activeOB = null;
        } else {
          this.logger.log(`[${symbol}/${timeframe}] OB Detected: ${activeOB.type} ${activeOB.method}`);
          this.logger.log(`  Zone: ${activeOB.bottom.toFixed(6)} - ${activeOB.top.toFixed(6)}`);
        }
      }
    }

    this.setActiveOB(stateKey, activeOB);

    if (!activeOB) {
      return null;
    }

    // 가격이 OB에서 충분히 떨어져 나갔는지 체크 (동적 minAwayMult)
    if (!activeOB.pricedMovedAway) {
      const obMid = (activeOB.top + activeOB.bottom) / 2;
      const obSize = activeOB.top - activeOB.bottom;

      // 동적 minAwayMult 계산 (백테스트와 동일)
      const atrPercent = (atr / currentCandle.close) * 100;
      let adjustedMinAwayMult: number;

      if (atrPercent < 1.0) {
        adjustedMinAwayMult = this.config.minAwayMultRangebound;  // 0.5
      } else if (atrPercent >= 1.0 && atrPercent <= 2.0) {
        adjustedMinAwayMult = this.config.minAwayMultNormal;      // 1.0
      } else {
        adjustedMinAwayMult = this.config.minAwayMultTrending;   // 1.5
      }

      const minDist = obSize * adjustedMinAwayMult;
      let movedAway = false;

      if (activeOB.type === 'LONG') {
        movedAway = currentCandle.close > obMid + minDist;
      } else {
        movedAway = currentCandle.close < obMid - minDist;
      }

      if (movedAway) {
        activeOB.pricedMovedAway = true;
        this.setActiveOB(stateKey, activeOB);
        this.logger.log(`[${symbol}/${timeframe}] Price moved away (ATR%: ${atrPercent.toFixed(2)}%, mult: ${adjustedMinAwayMult})`);
      }
    }

    if (!activeOB.pricedMovedAway) {
      return null;
    }

    // v13: 미터링(Mitigation) 체크 - 최소 50% 되돌림 확인
    // OB에서 멀어진 후 다시 돌아올 때, 충분히 돌아왔는지 확인
    const obSize = activeOB.top - activeOB.bottom;
    const obMid = (activeOB.top + activeOB.bottom) / 2;

    if (activeOB.type === 'LONG') {
      // LONG: 가격이 OB 위로 갔다가 아래로 내려와야 함
      // 현재가가 OB 상단 + 50% 범위 안에 있어야 함
      const maxEntryLevel = activeOB.top + (obSize * 0.5);
      if (currentCandle.close > maxEntryLevel) {
        this.logger.debug(`[${symbol}/${timeframe}] LONG: Price not retraced enough (${currentCandle.close.toFixed(6)} > ${maxEntryLevel.toFixed(6)})`);
        return null;
      }
    } else {
      // SHORT: 가격이 OB 아래로 갔다가 위로 올라와야 함
      const minEntryLevel = activeOB.bottom - (obSize * 0.5);
      if (currentCandle.close < minEntryLevel) {
        this.logger.debug(`[${symbol}/${timeframe}] SHORT: Price not retraced enough (${currentCandle.close.toFixed(6)} < ${minEntryLevel.toFixed(6)})`);
        return null;
      }
    }

    // v6: OB 영역 이탈 체크 (백테스트와 동일)
    // 가격이 OB 영역에서 50% 버퍼 이상 벗어나면 OB 무효화
    const obZoneBuffer = obSize * 0.5;
    const isOutOfOBZone = activeOB.type === 'LONG'
      ? currentCandle.close < activeOB.bottom - obZoneBuffer
      : currentCandle.close > activeOB.top + obZoneBuffer;

    if (isOutOfOBZone) {
      this.logger.debug(`[${symbol}/${timeframe}] Price exited OB zone (50% buffer)`);
      this.addFailedOB(stateKey, { price: (activeOB.top + activeOB.bottom) / 2, barIndex: i });
      this.setActiveOB(stateKey, null);
      return null;
    }

    // v13: 경계선 진입으로 변경 (중간가 → 경계선)
    // LONG: OB 바닥 근처에서 진입, SHORT: OB 꼭대기 근처에서 진입
    const obMidpoint = (activeOB.top + activeOB.bottom) / 2;  // 후속 코드에서 사용

    // 경계선 터치 체크 (OB 크기의 20% 버퍼 허용)
    const entryBuffer = obSize * 0.2;
    let priceHitBoundary = false;

    if (activeOB.type === 'LONG') {
      // LONG: 가격이 OB 바닥 근처(+20% 버퍼)에 도달
      const entryZoneTop = activeOB.bottom + entryBuffer;
      priceHitBoundary = currentCandle.low <= entryZoneTop;
    } else {
      // SHORT: 가격이 OB 꼭대기 근처(-20% 버퍼)에 도달
      const entryZoneBottom = activeOB.top - entryBuffer;
      priceHitBoundary = currentCandle.high >= entryZoneBottom;
    }

    if (!priceHitBoundary) {
      return null;
    }

    // requireReversal 체크 (백테스트와 동일하게 추가)
    if (this.config.requireReversal) {
      if (activeOB.type === 'LONG') {
        if (currentCandle.close <= currentCandle.open) {
          return null;  // 양봉이 아님
        }
      } else {
        if (currentCandle.close >= currentCandle.open) {
          return null;  // 음봉이 아님
        }
      }
    }

    // v6: 주문 유효시간 체크 (백테스트와 동일)
    const orderValidityBars = timeframe === '5m'
      ? this.config.orderValidityBars5m
      : this.config.orderValidityBars15m;
    const obAge = i - activeOB.barIndex;
    if (obAge > orderValidityBars) {
      this.logger.debug(`[${symbol}/${timeframe}] OB order expired (age: ${obAge} > ${orderValidityBars})`);
      this.setActiveOB(stateKey, null);
      return null;
    }

    // v6: 가격 편차 체크 (백테스트와 동일)
    const deviation = Math.abs(currentCandle.close - obMidpoint) / obMidpoint;
    if (deviation > this.config.maxPriceDeviation) {
      this.logger.debug(`[${symbol}/${timeframe}] Price deviation too high: ${(deviation * 100).toFixed(2)}% > ${(this.config.maxPriceDeviation * 100).toFixed(2)}%`);
      return null;  // OB는 유지하되 이번 캔들에서는 진입 안함
    }

    // ✅ 핵심 수정: 신호 생성 시점에 트렌드 재검증 (백테스트와 동일)
    // OB 감지 후 트렌드가 반전되었을 수 있으므로 진입 직전에 다시 체크
    const distanceFromSMA = Math.abs(currentCandle.close - sma50) / sma50;
    if (activeOB.type === 'LONG') {
      if (currentCandle.close < sma50) {
        this.logger.warn(`[${symbol}/${timeframe}] Signal rejected: LONG but price below SMA50 (trend reversed)`);
        this.setActiveOB(stateKey, null);
        return null;
      }
      if (distanceFromSMA < 0.02) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: LONG too close to SMA50`);
        return null;  // OB 유지, 다음 캔들에서 재시도
      }
    } else {
      if (currentCandle.close > sma50) {
        this.logger.warn(`[${symbol}/${timeframe}] Signal rejected: SHORT but price above SMA50 (trend reversed)`);
        this.setActiveOB(stateKey, null);
        return null;
      }
      if (distanceFromSMA < 0.02) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: SHORT too close to SMA50`);
        return null;  // OB 유지, 다음 캔들에서 재시도
      }
    }

    // v10: ATR + CVD 방향 필터 체크
    if (this.config.useATRCVDFilter) {
      const currentIndex = candles.length - 1;
      const atrPassed = this.checkATRVolatilityFilter(candles, currentIndex);
      const cvdPassed = this.checkCVDFilter(candles, activeOB.type, currentIndex);

      if (!atrPassed) {
        // ATR% 계산하여 로그
        const atrValues = ATR.calculate({
          high: candles.slice(-100).map(c => c.high),
          low: candles.slice(-100).map(c => c.low),
          close: candles.slice(-100).map(c => c.close),
          period: 14,
        });
        const currentATR = atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
        const atrPct = (currentATR / currentCandle.close) * 100;
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: ATR filter (${atrPct.toFixed(2)}% not in ${this.config.atrFilterMin}-${this.config.atrFilterMax}%)`);
        return null;  // OB 유지, 다음 캔들에서 재시도
      }

      if (!cvdPassed) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: CVD filter (no ${activeOB.type === 'LONG' ? 'buy' : 'sell'} pressure)`);
        return null;  // OB 유지, 다음 캔들에서 재시도
      }

      if (this.isLiveMode) {
        this.logger.log(`[${symbol}/${timeframe}] ✅ ATR+CVD filter passed`);
      }
    }

    // v15: ADX 최소값 필터 (ADX > 25 - 횡보장 제외)
    const adxValue = this.calculateADX(candles);
    if (adxValue < 25) {
      if (this.isLiveMode) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: ADX too low (${adxValue.toFixed(1)} < 25)`);
      }
      return null;
    }

    // v15: RSI 필터 (LONG < 70, SHORT > 30 - 극단 진입 방지)
    const rsiValue = this.calculateRSI(candles);
    if (activeOB.type === 'LONG' && rsiValue > 70) {
      if (this.isLiveMode) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: RSI too high for LONG (${rsiValue.toFixed(1)} > 70)`);
      }
      return null;
    }
    if (activeOB.type === 'SHORT' && rsiValue < 30) {
      if (this.isLiveMode) {
        this.logger.debug(`[${symbol}/${timeframe}] Signal rejected: RSI too low for SHORT (${rsiValue.toFixed(1)} < 30)`);
      }
      return null;
    }

    if (this.isLiveMode) {
      this.logger.log(`[${symbol}/${timeframe}] ✅ ADX(${adxValue.toFixed(0)}) + RSI(${rsiValue.toFixed(0)}) filter passed`);
    }

    // v12: 유동성 스윕 필터 (가중치 방식 - 조건부 승인)
    let liquiditySweepScore = 0;
    if (this.config.useLiquiditySweepFilter) {
      const sweepResult = this.checkLiquiditySweep(candles, activeOB.barIndex, activeOB.type);
      liquiditySweepScore = sweepResult.sweepScore;

      if (sweepResult.hasSweep && this.isLiveMode) {
        this.logger.log(`[${symbol}/${timeframe}] 💧 Liquidity Sweep detected! Score: ${sweepResult.sweepScore}`);
      }
    }

    // v11: 시장 레짐 확인 및 방향 결정
    const { regime, reason: regimeReason } = this.getMarketRegime(candles, symbol, timeframe);

    // v14: 레짐별 OB 유효기간 체크
    const maxOBAge = regime === 'REVERSAL'
      ? this.config.obMaxBarsReversal   // REVERSAL: 30 bars
      : this.config.obMaxBarsTrend;     // TREND: 60 bars

    if (activeOB.age > maxOBAge) {
      if (this.isLiveMode) {
        this.logger.log(
          `[${symbol}/${timeframe}] ⏰ OB too old for ${regime} mode ` +
          `(age: ${activeOB.age} > max: ${maxOBAge}) - skipping`
        );
      }
      return null;  // OB가 해당 레짐에 너무 오래됨 - 진입 스킵
    }

    // 최종 진입 방향 결정
    let finalDirection: 'LONG' | 'SHORT';
    let isReversed = false;

    if (regime === 'REVERSAL') {
      // 리버스 모드: OB 방향 반대로 진입
      // Bullish OB → SHORT, Bearish OB → LONG
      finalDirection = activeOB.type === 'LONG' ? 'SHORT' : 'LONG';
      isReversed = true;

      if (this.isLiveMode) {
        this.logger.log(`[${symbol}/${timeframe}] 🔄 REVERSAL MODE: ${activeOB.type} OB → ${finalDirection} entry (${regimeReason})`);
      }
    } else {
      // TREND_FOLLOWING 모드: OB 방향대로 진입 (또는 Pass)
      finalDirection = activeOB.type;
      isReversed = false;

      if (this.isLiveMode) {
        this.logger.log(`[${symbol}/${timeframe}] 📈 TREND_FOLLOWING MODE: ${activeOB.type} OB → ${finalDirection} entry (${regimeReason})`);
      }
    }

    // v12: OI Divergence 필터 (가중치 방식 - 조건부 승인)
    let oiDivergenceScore = 50;  // 기본값: 중립
    if (this.config.useOiDivergenceFilter && this.oiDivergenceService) {
      const oiResult = this.oiDivergenceService.checkDivergence(symbol, finalDirection);
      oiDivergenceScore = oiResult.score;

      if (this.isLiveMode) {
        if (oiResult.hasDivergence) {
          this.logger.log(`[${symbol}/${timeframe}] 📊 OI Divergence: ${oiResult.type} | Score: ${oiResult.score} | ${oiResult.reason}`);
        } else {
          this.logger.debug(`[${symbol}/${timeframe}] 📊 OI Check: Score: ${oiResult.score} | ${oiResult.reason}`);
        }
      }
    }

    // v16: OB 경계에 더 가깝게 진입 (체결률 + 진입가 균형)
    // v15.2: 중간 (50%) → 체결 가능 + 진입가 개선
    // v16: 30% → OB에 더 가깝게 (체결률 약간 희생, 진입가 개선)
    const obBoundary = finalDirection === 'LONG' ? activeOB.bottom : activeOB.top;
    const entryRatio = 0.3;  // 0 = OB 경계, 1 = 현재가, 0.3 = OB에 가깝게
    const entry = obBoundary + (currentCandle.close - obBoundary) * entryRatio;

    // v16: ATR 기반 SL (7기간 ATR × 1.5)
    // 리서치: 스캘핑/5분봉에서 1.5x ATR이 최적
    const atr7 = this.calculateATR7(candles, i);
    const atrSlDistance = atr7 * 1.5;  // 1.5x ATR

    let stopLoss: number;
    let takeProfit1: number;
    let takeProfit2: number;

    // v16: TP1 = 1R (70%), TP2 = 2R (30%)
    const tp1Ratio = 1.0;  // TP1 = 1R
    const tp2Ratio = 2.0;  // TP2 = 2R

    if (finalDirection === 'LONG') {
      // v16: LONG 진입 - ATR 기반 SL
      stopLoss = entry - atrSlDistance;
      const risk = entry - stopLoss;
      takeProfit1 = entry + (risk * tp1Ratio);  // 1R
      takeProfit2 = entry + (risk * tp2Ratio);  // 2R

      if (this.isLiveMode) {
        this.logger.log(`  [v16] Entry: ${entry.toFixed(6)} (30% OB 가까이) | OB: ${obBoundary.toFixed(6)} | 현재가: ${currentCandle.close.toFixed(6)}`);
        this.logger.log(`  [v16] SL: ${stopLoss.toFixed(6)} (ATR7×1.5=${atrSlDistance.toFixed(6)}) | Risk: ${(risk / entry * 100).toFixed(2)}%`);
        this.logger.log(`  [v16] TP1: ${takeProfit1.toFixed(6)} (1R, 70%) | TP2: ${takeProfit2.toFixed(6)} (2R, 30%)`);
      }
    } else {
      // v16: SHORT 진입 - ATR 기반 SL
      stopLoss = entry + atrSlDistance;
      const risk = stopLoss - entry;
      takeProfit1 = entry - (risk * tp1Ratio);  // 1R
      takeProfit2 = entry - (risk * tp2Ratio);  // 2R

      if (this.isLiveMode) {
        this.logger.log(`  [v16] Entry: ${entry.toFixed(6)} (30% OB 가까이) | OB: ${obBoundary.toFixed(6)} | 현재가: ${currentCandle.close.toFixed(6)}`);
        this.logger.log(`  [v16] SL: ${stopLoss.toFixed(6)} (ATR7×1.5=${atrSlDistance.toFixed(6)}) | Risk: ${(risk / entry * 100).toFixed(2)}%`);
        this.logger.log(`  [v16] TP1: ${takeProfit1.toFixed(6)} (1R, 70%) | TP2: ${takeProfit2.toFixed(6)} (2R, 30%)`);
      }
    }

    // v14: 고정 레버리지 15x (동적 레버리지 비활성화)
    const atrPercent = (atr / currentCandle.close) * 100;
    const leverage = this.config.useDynamicLeverage
      ? this.getDynamicLeverage(atrPercent)
      : this.config.leverage;  // v14: 15x 고정

    // v14: 고정 마진 $10 사용
    let margin: number = this.config.useFixedMargin
      ? this.config.fixedMarginUsdt  // v14: $10 고정
      : 20;  // fallback

    // 리스크 관리 적용 (연속 손실 시 축소)
    const positionSizeMultiplier = this.getPositionSizeMultiplier(stateKey);
    margin = margin * positionSizeMultiplier;
    if (margin < 5) {
      margin = 5;  // v14: 최소 마진 $5
    }

    const positionValue = margin * leverage;
    const positionSize = positionValue / entry;

    // ✅ 실시간 모드에서만 신호 로깅 (과거 데이터 로딩 중에는 억제)
    if (this.isLiveMode) {
      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`[${symbol}/${timeframe}] ENTRY SIGNAL: ${finalDirection} (OB: ${activeOB.type} ${activeOB.method})`);
      this.logger.log(`  Mode: ${isReversed ? '🔄 REVERSAL' : '📈 TREND_FOLLOWING'} (${regimeReason})`);
      this.logger.log(`  Entry: ${entry.toFixed(6)} (with ${this.config.slippage * 100}% slippage)`);
      this.logger.log(`  SL: ${stopLoss.toFixed(6)} (ATR7×1.5), TP1: ${takeProfit1.toFixed(6)} (1R), TP2: ${takeProfit2.toFixed(6)} (2R)`);
      this.logger.log(`  OB age: ${activeOB.age} bars (max: ${maxOBAge})`);
      this.logger.log(`  Position: ${positionSize.toFixed(4)} @ $${margin.toFixed(2)} margin (${leverage}x)`);
      this.logger.log(`${'='.repeat(60)}\n`);
    }

    // OB 사용 완료
    this.setActiveOB(stateKey, null);

    return {
      symbol,
      timeframe,
      direction: finalDirection,  // v11: 시장 레짐에 따른 최종 방향
      entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfits: [
        { price: takeProfit1, percentage: 70, label: 'TP1' },  // v16: 70% at 1R
        { price: takeProfit2, percentage: 30, label: 'TP2' },  // v16: 30% at 2R
      ],
      method: activeOB.method,
      obBottom: activeOB.bottom,
      obTop: activeOB.top,
      positionSize,
      margin,
      positionValue,
      leverage,
      tier: 'STANDARD',
      score: 80,  // 85 미만 → Limit 주문 사용 (백테스트와 동일)
      metadata: {
        orderBlock: {
          top: activeOB.top,
          bottom: activeOB.bottom,
          midpoint: obMidpoint,
          method: activeOB.method,
        },
        atrPercent,  // v7: 디버깅용
        // v11: 시장 레짐 정보
        marketRegime: regime,
        isReversed,
        originalOBType: activeOB.type,
        // v16: 분할 TP 정보
        tp1Ratio: 1.0,   // TP1 = 1R
        tp2Ratio: 2.0,   // TP2 = 2R
        tp1Percent: 70,  // TP1 70%
        tp2Percent: 30,  // TP2 30%
        atr7: atr7,      // ATR7 값 (SL 계산용)
        // v12: 필터 점수들
        liquiditySweepScore,
        oiDivergenceScore,
      },
    };
  }

  /**
   * ORB (Opening Range Breakout) 감지 - 백테스트와 동일
   */
  private detectORB(candles: OHLCV[], i: number, atr: number, volAvg50: number): OrderBlock | null {
    // 백테스트와 동일: atr=0 또는 volAvg50=0이면 감지 불가
    if (i < 1 || atr === 0 || volAvg50 === 0) return null;

    const currentCandle = candles[i];

    const candleRange = currentCandle.high - currentCandle.low;
    const body = Math.abs(currentCandle.close - currentCandle.open);
    const bodyRatio = candleRange > 0 ? body / candleRange : 0;
    const volRatio = currentCandle.volume / volAvg50;

    // Bullish ORB
    if (
      currentCandle.close > currentCandle.open &&
      candleRange > atr * this.config.orbAtr &&
      volRatio > this.config.orbVol &&
      bodyRatio > this.config.minBodyRatio
    ) {
      return {
        top: this.config.useBodyOnly ? currentCandle.close : currentCandle.high,
        bottom: this.config.useBodyOnly ? currentCandle.open : currentCandle.low,
        type: 'LONG',
        method: 'ORB',
        barIndex: i,
        age: 0,
        pricedMovedAway: false,
      };
    }

    // Bearish ORB
    if (
      currentCandle.close < currentCandle.open &&
      candleRange > atr * this.config.orbAtr &&
      volRatio > this.config.orbVol &&
      bodyRatio > this.config.minBodyRatio
    ) {
      return {
        top: this.config.useBodyOnly ? currentCandle.open : currentCandle.high,
        bottom: this.config.useBodyOnly ? currentCandle.close : currentCandle.low,
        type: 'SHORT',
        method: 'ORB',
        barIndex: i,
        age: 0,
        pricedMovedAway: false,
      };
    }

    return null;
  }

  /**
   * 거래 결과 업데이트 (리스크 관리용)
   */
  updateTradeResult(symbol: string, timeframe: string, isWin: boolean, pnl: number): void {
    const stateKey = this.getStateKey(symbol, timeframe);

    // 자본 업데이트
    const currentCapital = this.getCapital(symbol);
    this.setCapital(symbol, currentCapital + pnl);

    // 연속 손실/수익 관리
    if (isWin) {
      const wins = this.getConsecutiveWins(stateKey) + 1;
      this.setConsecutiveWins(stateKey, wins);
      this.setConsecutiveLosses(stateKey, 0);

      if (wins >= 3) {
        this.setPositionSizeMultiplier(stateKey, 1.0);
        this.logger.log(`[${symbol}/${timeframe}] Risk multiplier restored to 1.0 (3 consecutive wins)`);
      }
    } else {
      const losses = this.getConsecutiveLosses(stateKey) + 1;
      this.setConsecutiveLosses(stateKey, losses);
      this.setConsecutiveWins(stateKey, 0);

      if (losses >= 10) {
        this.setPositionSizeMultiplier(stateKey, 0.25);
        this.logger.warn(`[${symbol}/${timeframe}] Risk multiplier reduced to 0.25 (10 consecutive losses)`);
      } else if (losses >= 5) {
        this.setPositionSizeMultiplier(stateKey, 0.5);
        this.logger.warn(`[${symbol}/${timeframe}] Risk multiplier reduced to 0.5 (5 consecutive losses)`);
      }
    }
  }

  /**
   * 자본 설정 (초기화용)
   */
  initializeCapital(symbol: string, capital: number): void {
    this.setCapital(symbol, capital);
    this.logger.log(`[${symbol}] Capital initialized: $${capital}`);
  }

  /**
   * 초기화
   */
  reset(): void {
    this.activeOBMap.clear();
    this.failedOBsMap.clear();
    this.candleCountMap.clear();
    this.candleBufferMap.clear();
    this.consecutiveLossesMap.clear();
    this.consecutiveWinsMap.clear();
    this.positionSizeMultiplierMap.clear();
    this.capitalMap.clear();
    this.lastProcessedCandleTimestamp.clear();
    this.lastExitCandleIndexMap.clear();
    this.lastTradeWasReversedMap.clear();  // v11: 리버스 모드 추적 초기화
    this.isLiveMode = false;  // 리셋 시 라이브 모드 비활성화
  }

  /**
   * ✅ 실시간 모드 활성화 (과거 데이터 로딩 완료 후 호출)
   */
  enableLiveMode(): void {
    this.isLiveMode = true;
    this.logger.log('🟢 Live mode ENABLED - signals will now be logged and executed');
  }

  /**
   * v12: OI 추적을 위한 심볼 구독 시작
   */
  initializeOiTracking(symbols: string[]): void {
    if (this.config.useOiDivergenceFilter && this.oiDivergenceService) {
      this.oiDivergenceService.subscribeSymbols(symbols);
      this.logger.log(`[OI] Initialized OI tracking for ${symbols.length} symbols`);
    }
  }

  /**
   * ✅ 실시간 모드 비활성화 (Stop 시 호출)
   */
  disableLiveMode(): void {
    this.isLiveMode = false;
    this.logger.log('🔴 Live mode DISABLED - signals will not be generated');
  }

  /**
   * ✅ 실시간 모드 확인
   */
  isInLiveMode(): boolean {
    return this.isLiveMode;
  }

  /**
   * 상태 조회
   */
  getStatus() {
    const symbolStats = Array.from(this.candleBufferMap.entries()).map(([key, candles]) => ({
      key,
      candleCount: candles.length,
      ready: candles.length >= 700,
      capital: this.capitalMap.get(key.split('_')[0]) || this.DEFAULT_CAPITAL,
      riskMultiplier: this.positionSizeMultiplierMap.get(key) || 1.0,
    }));

    return {
      totalSymbols: this.candleBufferMap.size,
      readySymbols: symbolStats.filter(s => s.ready).length,
      symbolStats,
      config: {
        lookback: this.config.lookback,
        orbAtr: this.config.orbAtr,
        orbVol: this.config.orbVol,
        leverage: this.config.leverage,
        capitalUsage: this.config.capitalUsage,
        minAwayMult: {
          rangebound: this.config.minAwayMultRangebound,
          normal: this.config.minAwayMultNormal,
          trending: this.config.minAwayMultTrending,
        },
        // v11: 리버스 전략 설정
        marketRegime: {
          enabled: this.config.useMarketRegime,
          adxTrendThreshold: this.config.adxTrendThreshold,
          adxChopThreshold: this.config.adxChopThreshold,
          rsiOverbought: this.config.rsiOverbought,
          rsiOversold: this.config.rsiOversold,
          emaDistanceThreshold: this.config.emaDistanceThreshold,
          reverseTpRatio: this.config.reverseTpRatio,
          reverseCooldownBars: this.config.reverseCooldownBars,
        },
      },
    };
  }
}
