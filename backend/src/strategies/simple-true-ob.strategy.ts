/**
 * SimpleTrueOB 전략 - 실시간 매매 버전
 * tb1 프로젝트에서 가져옴
 *
 * *** 백테스트와 100% 동일한 로직 ***
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
 * - v11: 파라미터 최적화 → ❌ 실패 (실전 승률 25%, 청산 급증)
 * - v10 롤백 (2026-01-13): v11 전체 롤백 완료
 *   - slBuffer: 0.5% → 1.0%, tp1Ratio: 0.8R → 1.2R
 *   - 레버리지: 20/15/10 → 15/10/5
 *   - orbAtr: 1.0 → 1.5, orbVol: 1.5 → 2.0
 *   - retryCooldown: 6 → 12, atrFilterMin: 0.4 → 0.5
 * - v17 (2026-01-13): 실전 데이터 분석 기반 필터 강화
 *   - ATR 구간 제한: 0.5~3.0% → 0.5~0.8% (최적 구간)
 *   - OB 크기 필터 추가: 0.5% 초과 OB 제외 (작은 OB가 승률 높음)
 *   - 타임프레임별 OB 수명: 5분봉 12캔들(1시간), 15분봉 8캔들(2시간)
 *   - 미티게이션 체크: OB 영역 이미 터치된 경우 진입 거부
 * - v18 (2026-01-13): 방향 확실성 강화
 *   - MTF EMA 배열 필터: 5분봉 진입 시 15분봉 EMA9>21>50 확인
 *   - 15분봉 강화 필터: ATR 0.6% 이하, OB 크기 0.3% 이하, EMA 배열 필수
 *
 * 현재 버전: v18 (방향 확실성 강화)
 * 최종 성능 (백테스트 2025-10-05 ~ 2026-01-05, 고정마진 $15):
 * - ROI: +1207%, Win Rate: 57.0%, MDD: 22.5%
 */

import { Injectable, Logger } from '@nestjs/common';
import { ATR, SMA, EMA } from 'technicalindicators';
import { IStrategy, StrategySignal, STRATEGY_NAMES } from './strategy.interface';
import { CandleData } from '../websocket/candle-aggregator.service';
import {
  OHLCV,
  OrderBlock,
  EntrySignal,
  Position,
} from './simple-true-ob.interface';

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
  obMaxBars: number;           // deprecated: 타임프레임별 설정 사용
  obMaxBars5m: number;         // v17: 5분봉 OB 최대 수명 (캔들)
  obMaxBars15m: number;        // v17: 15분봉 OB 최대 수명 (캔들)
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
  atrFilterMax: number;           // ATR% 최대값 (0.8%)
  cvdLookback: number;            // CVD 계산 기간 (20캔들)
  maxOBSizePercent: number;       // v17: OB 최대 크기 (0.5%)
  // v18: MTF EMA 배열 필터
  useMTFFilter: boolean;          // MTF 필터 사용 여부
  emaFastPeriod: number;          // EMA 단기 (9)
  emaMidPeriod: number;           // EMA 중기 (21)
  emaSlowPeriod: number;          // EMA 장기 (50)
  // v18: 15분봉 강화 필터
  use15mStrictFilter: boolean;    // 15분봉 강화 필터 사용 여부
  strict15mAtrMax: number;        // 15분봉 ATR% 최대값 (더 엄격)
  strict15mOBSizeMax: number;     // 15분봉 OB 크기 최대값 (더 엄격)
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

  // v18: MTF용 15분봉 캔들 버퍼 (심볼별, 5분봉 진입 시 참조)
  private candle15mBufferMap: Map<string, OHLCV[]> = new Map();

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

  // v8: 재진입 쿨다운 (v10 원복)
  private readonly REENTRY_COOLDOWN_BARS = 12;  // 5분봉 1시간, 15분봉 3시간
  private lastExitCandleIndexMap: Map<string, number> = new Map();

  constructor() {
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
      orbAtr: 1.5,              // v10 원복 (1.0 → 1.5)
      orbVol: 2.0,              // v10 원복 (1.5 → 2.0)
      londonHour: 7,
      nyHour: 14,
      rrRatio: 4.0,             // v4 최적화: 3.0 → 4.0
      obMaxBars: 60,            // deprecated: 타임프레임별 설정 사용
      obMaxBars5m: 12,          // v17: 5분봉 OB 최대 수명 12캔들 (1시간)
      obMaxBars15m: 8,          // v17: 15분봉 OB 최대 수명 8캔들 (2시간)
      makerFee: 0.0004,         // 0.04%
      takerFee: 0.00075,        // 0.075%
      leverage: 10,             // v19: 10x 고정
      capitalUsage: 0.1,        // 10%
      slippage: 0.0002,         // 0.02% - 백테스트와 동일하게 추가
      maxHoldingBars: 48,       // v5 최적화: 72 → 48 (4시간)
      preventSameCandleExit: true,
      // 동적 minAwayMult 설정 (v4 최적화: 2026-01-08)
      minAwayMultRangebound: 0.2,   // v4 최적화: 0.3 → 0.2 (횡보장)
      minAwayMultNormal: 0.8,       // (동일)
      minAwayMultTrending: 2.0,     // (동일)
      // v6: 백테스트와 동일한 필터 추가
      maxPriceDeviation: 0.02,      // 2% - 현재가가 OB 중간가에서 2% 이상 벗어나면 진입 스킵
      orderValidityBars5m: 3,       // 5분봉 15분 (3 × 5분) - 백테스트 REALISTIC_CONFIG와 동일
      orderValidityBars15m: 3,      // 15분봉 45분 (3 × 15분) - 백테스트 REALISTIC_CONFIG와 동일
      // v7: ATR% 기반 동적 레버리지
      useDynamicLeverage: false,    // v19: 비활성화 (10x 고정)
      // v10: ATR + CVD 방향 필터
      useATRCVDFilter: true,        // 활성화
      atrFilterMin: 0.5,            // v10 원복 (0.4 → 0.5)
      atrFilterMax: 0.8,            // v17: ATR% 최대 0.8% (실전 분석: 0.5~0.8% 최고 승률)
      cvdLookback: 20,              // CVD 20캔들 기준
      maxOBSizePercent: 1.5,        // v19: OB 최대 크기 1.5% (0.5% → 1.5% 완화)
      // v18: MTF EMA 배열 필터
      useMTFFilter: false,          // v19: 비활성화 (데이터 수집 후 개선 예정)
      emaFastPeriod: 9,             // EMA 단기
      emaMidPeriod: 21,             // EMA 중기
      emaSlowPeriod: 50,            // EMA 장기
      // v18: 15분봉 강화 필터
      use15mStrictFilter: true,     // 15분봉에 더 엄격한 필터 적용
      strict15mAtrMax: 0.6,         // 15분봉 ATR% 최대 0.6% (5분봉 0.8%보다 엄격)
      strict15mOBSizeMax: 1.2,      // v19: 15분봉 OB 크기 최대 1.2% (0.3% → 1.2% 완화)
    };
  }

  /**
   * ATR% 기반 동적 레버리지 계산 (롤백: 20/15/10 → 15/10/5)
   */
  private getDynamicLeverage(atrPercent: number): number {
    if (atrPercent < 1.5) return 15;      // 낮은 변동성 → 롤백: 20→15
    if (atrPercent <= 3.0) return 10;     // 보통 변동성 → 롤백: 15→10
    return 5;                              // 높은 변동성 → 롤백: 10→5
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
   * v10: ATR + CVD 조합 필터
   */
  private checkATRCVDFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', currentIndex: number): boolean {
    const atrPassed = this.checkATRVolatilityFilter(candles, currentIndex);
    const cvdPassed = this.checkCVDFilter(candles, obType, currentIndex);
    return atrPassed && cvdPassed;
  }

  /**
   * v18: MTF EMA 배열 체크 - 15분봉 EMA 배열로 방향 확인
   * LONG: EMA9 > EMA21 > EMA50 (상승 추세)
   * SHORT: EMA9 < EMA21 < EMA50 (하락 추세)
   */
  private checkMTFEMAAlignment(symbol: string, obType: 'LONG' | 'SHORT'): boolean {
    const candles15m = this.candle15mBufferMap.get(symbol);

    if (!candles15m || candles15m.length < this.config.emaSlowPeriod + 10) {
      // 15분봉 데이터 부족 시 통과 (초기에는 필터 적용 안함)
      return true;
    }

    const closes = candles15m.map(c => c.close);

    // EMA 계산
    const ema9Values = EMA.calculate({
      period: this.config.emaFastPeriod,
      values: closes,
    });
    const ema21Values = EMA.calculate({
      period: this.config.emaMidPeriod,
      values: closes,
    });
    const ema50Values = EMA.calculate({
      period: this.config.emaSlowPeriod,
      values: closes,
    });

    if (ema9Values.length === 0 || ema21Values.length === 0 || ema50Values.length === 0) {
      return true;  // 계산 불가 시 통과
    }

    // 최신 EMA 값
    const ema9 = ema9Values[ema9Values.length - 1];
    const ema21 = ema21Values[ema21Values.length - 1];
    const ema50 = ema50Values[ema50Values.length - 1];

    if (obType === 'LONG') {
      // 상승 추세: EMA9 > EMA21 > EMA50
      const aligned = ema9 > ema21 && ema21 > ema50;
      if (!aligned && this.isLiveMode) {
        this.logger.debug(
          `[${symbol}] MTF EMA not aligned for LONG: EMA9=${ema9.toFixed(2)}, EMA21=${ema21.toFixed(2)}, EMA50=${ema50.toFixed(2)}`
        );
      }
      return aligned;
    } else {
      // 하락 추세: EMA9 < EMA21 < EMA50
      const aligned = ema9 < ema21 && ema21 < ema50;
      if (!aligned && this.isLiveMode) {
        this.logger.debug(
          `[${symbol}] MTF EMA not aligned for SHORT: EMA9=${ema9.toFixed(2)}, EMA21=${ema21.toFixed(2)}, EMA50=${ema50.toFixed(2)}`
        );
      }
      return aligned;
    }
  }

  /**
   * v18: 15분봉 캔들 버퍼에 추가 (MTF용)
   */
  private add15mCandleToBuffer(symbol: string, candle: OHLCV): void {
    let buffer = this.candle15mBufferMap.get(symbol);
    if (!buffer) {
      buffer = [];
      this.candle15mBufferMap.set(symbol, buffer);
    }
    buffer.push(candle);
    // 최대 200개 유지 (EMA50 계산 + 여유)
    if (buffer.length > 200) {
      buffer.shift();
    }
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
   */
  public onPositionClosed(symbol: string, timeframe: string): void {
    const stateKey = this.getStateKey(symbol, timeframe);
    const currentCandleIndex = this.getCandleCount(stateKey);
    this.lastExitCandleIndexMap.set(stateKey, currentCandleIndex);
    this.logger.log(`[v8] Position closed: ${symbol}/${timeframe} - Cooldown started at candle ${currentCandleIndex}`);
  }

  /**
   * v8: 재진입 쿨다운 체크
   */
  private isInCooldown(stateKey: string): boolean {
    const lastExitIndex = this.lastExitCandleIndexMap.get(stateKey);
    if (lastExitIndex === undefined) return false;  // 이전 종료 기록 없음

    const currentIndex = this.getCandleCount(stateKey);
    const barsSinceExit = currentIndex - lastExitIndex;

    if (barsSinceExit < this.REENTRY_COOLDOWN_BARS) {
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
    // v18: MTF용 15분봉 캔들 저장 (5분봉 진입 시 EMA 배열 체크에 사용)
    const ohlcv: OHLCV = {
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    };
    this.add15mCandleToBuffer(symbol, ohlcv);

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
      return {
        strategy: this.name,
        symbol,
        timeframe,  // 타임프레임 추가
        side: signal.direction,
        entryPrice: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
        tp1Percent: 100,          // v4 최적화: 100% (단일 TP)
        tp2Percent: 0,            // v4 최적화: 0% (TP2 미사용)
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
    // v17: 타임프레임별 OB 수명 적용
    const obMaxBars = timeframe === '5m'
      ? this.config.obMaxBars5m   // 12캔들 (1시간)
      : this.config.obMaxBars15m; // 8캔들 (2시간)

    if (activeOB) {
      activeOB.age = i - activeOB.barIndex;

      if (activeOB.age > obMaxBars) {
        this.logger.debug(`[${symbol}/${timeframe}] OB expired (age: ${activeOB.age} > ${obMaxBars})`);
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
      // v17: 미티게이션 체크 - 가격이 이미 OB 영역에 진입했는지 확인
      // OB 형성 후 가격이 OB 영역에 이미 닿았으면 미티게이션됨 (무효)
      else if (!activeOB.mitigated && activeOB.pricedMovedAway) {
        // 가격이 충분히 벗어난 후에만 미티게이션 체크 (첫 번째 터치는 허용)
        let wasMitigated = false;

        if (activeOB.type === 'LONG') {
          // LONG OB: 가격이 OB 영역으로 내려왔는지 (현재 캔들에서 터치)
          // low <= top 이면 OB 영역에 진입
          if (currentCandle.low <= activeOB.top) {
            wasMitigated = true;
          }
        } else {
          // SHORT OB: 가격이 OB 영역으로 올라왔는지 (현재 캔들에서 터치)
          // high >= bottom 이면 OB 영역에 진입
          if (currentCandle.high >= activeOB.bottom) {
            wasMitigated = true;
          }
        }

        if (wasMitigated) {
          activeOB.mitigated = true;
          this.setActiveOB(stateKey, activeOB);
          // 미티게이션되면 다음 진입에서 체크됨
        }
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

        // 필터 1: OB 크기 (ATR의 50% 이상)
        if (obSize < atr * 0.5) {
          shouldReject = true;
          rejectReason = 'OB too small';
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

    // v6: OB 영역 이탈 체크 (백테스트와 동일)
    // 가격이 OB 영역에서 50% 버퍼 이상 벗어나면 OB 무효화
    const obSize = activeOB.top - activeOB.bottom;
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

    // Retest 체크: 가격이 OB 중간가에 도달했는지 (백테스트와 동일)
    const obMidpoint = (activeOB.top + activeOB.bottom) / 2;
    const priceHitMidpoint = currentCandle.low <= obMidpoint && obMidpoint <= currentCandle.high;

    if (!priceHitMidpoint) {
      return null;
    }

    // v19: 미티게이션 체크 제거 - 두 번째 터치도 허용
    // (기존 v17 미티게이션 체크 비활성화)

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

    // v18: MTF EMA 배열 필터 (5분봉 진입 시 15분봉 EMA 배열 확인)
    if (this.config.useMTFFilter && timeframe === '5m') {
      const mtfPassed = this.checkMTFEMAAlignment(symbol, activeOB.type);
      if (!mtfPassed) {
        if (this.isLiveMode) {
          this.logger.log(
            `[${symbol}/${timeframe}] ❌ MTF EMA filter rejected: 15m EMA not aligned for ${activeOB.type}`
          );
        }
        return null;  // OB 유지, 다음 캔들에서 재시도
      }
      if (this.isLiveMode) {
        this.logger.log(`[${symbol}/${timeframe}] ✅ MTF EMA aligned for ${activeOB.type}`);
      }
    }

    // v18: 15분봉 강화 필터 (더 엄격한 조건)
    if (this.config.use15mStrictFilter && timeframe === '15m') {
      // 15분봉용 더 엄격한 ATR% 체크
      const atrValues = ATR.calculate({
        high: candles.slice(-100).map(c => c.high),
        low: candles.slice(-100).map(c => c.low),
        close: candles.slice(-100).map(c => c.close),
        period: 14,
      });
      const currentATR = atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
      const atrPct = (currentATR / currentCandle.close) * 100;

      if (atrPct > this.config.strict15mAtrMax) {
        if (this.isLiveMode) {
          this.logger.log(
            `[${symbol}/${timeframe}] ❌ 15m strict ATR filter: ${atrPct.toFixed(2)}% > ${this.config.strict15mAtrMax}%`
          );
        }
        return null;
      }

      // 15분봉용 더 엄격한 OB 크기 체크
      const obSizePct = ((activeOB.top - activeOB.bottom) / obMidpoint) * 100;
      if (obSizePct > this.config.strict15mOBSizeMax) {
        if (this.isLiveMode) {
          this.logger.log(
            `[${symbol}/${timeframe}] ❌ 15m strict OB size filter: ${obSizePct.toFixed(3)}% > ${this.config.strict15mOBSizeMax}%`
          );
        }
        this.setActiveOB(stateKey, null);
        return null;
      }

      // 15분봉은 EMA 배열도 필수 (자체 타임프레임)
      const mtfPassed = this.checkMTFEMAAlignment(symbol, activeOB.type);
      if (!mtfPassed) {
        if (this.isLiveMode) {
          this.logger.log(
            `[${symbol}/${timeframe}] ❌ 15m EMA alignment required but not met`
          );
        }
        return null;
      }

      if (this.isLiveMode) {
        this.logger.log(`[${symbol}/${timeframe}] ✅ 15m strict filters passed`);
      }
    }

    // v17: OB 크기 필터 (작은 OB가 승률 높음) - 5분봉용
    // obMidpoint는 이미 Retest 체크에서 계산됨
    const obSizePercent = ((activeOB.top - activeOB.bottom) / obMidpoint) * 100;
    // 15분봉은 위에서 이미 체크했으므로 5분봉만 체크
    if (timeframe === '5m' && obSizePercent > this.config.maxOBSizePercent) {
      if (this.isLiveMode) {
        this.logger.log(
          `[${symbol}/${timeframe}] ❌ OB size filter rejected: ${obSizePercent.toFixed(3)}% > ${this.config.maxOBSizePercent}%`
        );
      }
      // OB 무효화 - 너무 큰 OB는 신뢰도 낮음
      this.setActiveOB(stateKey, null);
      return null;
    }

    if (this.isLiveMode) {
      this.logger.log(`[${symbol}/${timeframe}] ✅ OB size OK: ${obSizePercent.toFixed(3)}%`);
    }

    // 진입 시그널 생성 (OB 중간가 사용)
    const slBuffer = 0.01;  // 롤백: 0.5% → 1.0% (0.5%는 너무 타이트함)

    // 슬리피지 적용 (백테스트와 동일)
    const slippageFactor = activeOB.type === 'LONG'
      ? (1 + this.config.slippage)
      : (1 - this.config.slippage);
    const entry = obMidpoint * slippageFactor;

    let stopLoss: number;
    let takeProfit1: number;
    let takeProfit2: number;

    if (activeOB.type === 'LONG') {
      stopLoss = activeOB.bottom * (1 - slBuffer);
      const risk = entry - stopLoss;
      takeProfit1 = entry + (risk * 1.2);  // 롤백: 0.8R → 1.2R
      takeProfit2 = entry + (risk * this.config.rrRatio);  // rrRatio = 4.0
    } else {
      stopLoss = activeOB.top * (1 + slBuffer);
      const risk = stopLoss - entry;
      takeProfit1 = entry - (risk * 1.2);  // 롤백: 0.8R → 1.2R
      takeProfit2 = entry - (risk * this.config.rrRatio);  // rrRatio = 4.0
    }

    // v7: ATR% 기반 동적 레버리지 계산
    const atrPercent = (atr / currentCandle.close) * 100;
    const leverage = this.config.useDynamicLeverage
      ? this.getDynamicLeverage(atrPercent)
      : this.config.leverage;

    // 포지션 크기 계산 (백테스트와 동일 - 자본 기반 동적)
    // v18: 마진 범위 제한 ($15 ~ $30)
    const MIN_MARGIN = 15;
    const MAX_MARGIN = 30;
    const capital = this.getCapital(symbol);
    let margin: number;

    if (capital < 1000) {
      margin = MIN_MARGIN;  // 최소 마진
    } else {
      margin = capital * this.config.capitalUsage;
    }

    // 리스크 관리 적용
    const positionSizeMultiplier = this.getPositionSizeMultiplier(stateKey);
    margin = margin * positionSizeMultiplier;

    // v18: 마진 범위 제한 적용
    if (margin < MIN_MARGIN) {
      margin = MIN_MARGIN;
    } else if (margin > MAX_MARGIN) {
      margin = MAX_MARGIN;
    }

    const positionValue = margin * leverage;
    const positionSize = positionValue / entry;

    // ✅ 실시간 모드에서만 신호 로깅 (과거 데이터 로딩 중에는 억제)
    if (this.isLiveMode) {
      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`[${symbol}/${timeframe}] ENTRY SIGNAL: ${activeOB.type} ${activeOB.method}`);
      this.logger.log(`  Entry: ${entry.toFixed(6)} (with ${this.config.slippage * 100}% slippage)`);
      this.logger.log(`  SL: ${stopLoss.toFixed(6)}, TP1: ${takeProfit1.toFixed(6)}, TP2: ${takeProfit2.toFixed(6)}`);
      this.logger.log(`  Position: ${positionSize.toFixed(4)} @ $${margin.toFixed(2)} margin (${leverage}x)`);
      this.logger.log(`  ATR%: ${atrPercent.toFixed(2)}% → Leverage: ${leverage}x`);
      this.logger.log(`  Risk Multiplier: ${positionSizeMultiplier.toFixed(2)}`);
      this.logger.log(`${'='.repeat(60)}\n`);
    }

    // OB 사용 완료
    this.setActiveOB(stateKey, null);

    return {
      symbol,
      timeframe,
      direction: activeOB.type,
      entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfits: [
        { price: takeProfit1, percentage: 100, label: 'TP1' },  // v4 최적화: 100% (단일 TP)
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
    this.candle15mBufferMap.clear();  // v18: MTF용 15분봉 버퍼도 초기화
    this.consecutiveLossesMap.clear();
    this.consecutiveWinsMap.clear();
    this.positionSizeMultiplierMap.clear();
    this.capitalMap.clear();
    this.lastProcessedCandleTimestamp.clear();
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
      },
    };
  }
}
