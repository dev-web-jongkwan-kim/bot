import { Injectable, Logger } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { CandleData } from '../interfaces';

/**
 * 모멘텀 상태
 */
export type MomentumState = 'MOMENTUM' | 'PULLBACK' | 'EXHAUSTED' | 'NEUTRAL';

/**
 * 모멘텀 분석 결과
 */
export interface MomentumResult {
  /** 모멘텀 상태 */
  state: MomentumState;
  /** 방향 */
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  /** 강도 (0-1) */
  strength: number;
  /** 봉 크기 비율 */
  bodySizeRatio: number;
  /** 거래량 비율 */
  volumeRatio: number;
  /** 분석에 사용된 봉 수 */
  barsAnalyzed: number;
}

/**
 * 5분봉 모멘텀 분석기
 *
 * 모멘텀 상태 판단:
 * - MOMENTUM: 강하게 진행 중 → 진입 대기
 * - PULLBACK: 쉬어가는 중 → 진입 기회!
 * - EXHAUSTED: 소진됨 → 진입 금지
 * - NEUTRAL: 방향 없음 → 스킵
 */
@Injectable()
export class MomentumAnalyzer {
  private readonly logger = new Logger(MomentumAnalyzer.name);

  /**
   * 모멘텀 분석 메인 함수
   *
   * @param candles - 5분봉 캔들 배열 (오래된 것부터)
   * @param symbol - 심볼 (로깅용)
   * @returns MomentumResult - 모멘텀 상태와 방향
   */
  analyzeMomentum(candles: CandleData[], symbol: string = ''): MomentumResult {
    const barsToAnalyze = SCALPING_CONFIG.filter3.momentumBars;

    // 데이터 부족 체크
    if (candles.length < barsToAnalyze) {
      if (SCALPING_CONFIG.logging.verbose && symbol) {
        this.logger.debug(
          `[MomentumAnalyzer] ${symbol}: Insufficient data (${candles.length}/${barsToAnalyze} bars)`,
        );
      }
      return this.neutralResult(candles.length);
    }

    const recentCandles = candles.slice(-barsToAnalyze);

    // 1. 전체 방향 판단 (가격 변화)
    const direction = this.determineDirection(recentCandles);

    if (direction === 'NEUTRAL') {
      if (SCALPING_CONFIG.logging.verbose && symbol) {
        this.logger.debug(
          `[MomentumAnalyzer] ${symbol}: Direction=NEUTRAL → Skip`,
        );
      }
      return this.neutralResult(barsToAnalyze);
    }

    // 2. 봉 크기 비율 계산
    const bodySizeRatio = this.calculateBodySizeRatio(recentCandles);

    // 3. 거래량 비율 계산
    const volumeRatio = this.calculateVolumeRatio(recentCandles);

    // 4. 모멘텀 상태 판단
    const state = this.determineState(
      bodySizeRatio,
      volumeRatio,
      direction,
      recentCandles,
    );

    // 5. 강도 계산
    const strength = this.calculateStrength(bodySizeRatio, volumeRatio);

    const result: MomentumResult = {
      state,
      direction,
      strength,
      bodySizeRatio,
      volumeRatio,
      barsAnalyzed: barsToAnalyze,
    };

    // 로깅
    if (SCALPING_CONFIG.logging.verbose && symbol) {
      this.logger.debug(
        `[MomentumAnalyzer] ${symbol}: bodySizeRatio=${bodySizeRatio.toFixed(2)}, volumeRatio=${volumeRatio.toFixed(2)}`,
      );

      const stateEmoji = {
        MOMENTUM: '🔥',
        PULLBACK: '✅',
        EXHAUSTED: '💤',
        NEUTRAL: '➖',
      };

      this.logger.debug(
        `[MomentumAnalyzer] ${symbol}: State=${stateEmoji[state]} ${state}, Direction=${direction}` +
          (state === 'PULLBACK' ? ' → Ready for entry' : ''),
      );
    }

    return result;
  }

  /**
   * 방향 판단
   *
   * 최근 캔들들의 전체 가격 변화로 방향 결정
   */
  private determineDirection(candles: CandleData[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    const firstOpen = candles[0].open;
    const lastClose = candles[candles.length - 1].close;

    const changePercent = (lastClose - firstOpen) / firstOpen;

    // 0.1% 이상 변화가 있어야 방향으로 인정
    if (changePercent > 0.001) {
      return 'UP';
    } else if (changePercent < -0.001) {
      return 'DOWN';
    }
    return 'NEUTRAL';
  }

  /**
   * 봉 크기 비율 계산
   *
   * 마지막 봉 크기 / 이전 봉들 평균 크기
   * - < 0.5: 소진
   * - 0.5-0.8: 풀백
   * - > 0.8: 모멘텀 진행
   */
  private calculateBodySizeRatio(candles: CandleData[]): number {
    const bodySizes = candles.map((c) => Math.abs(c.close - c.open));

    const lastBodySize = bodySizes[bodySizes.length - 1];
    const avgBodySize =
      bodySizes.slice(0, -1).reduce((a, b) => a + b, 0) / (bodySizes.length - 1);

    return avgBodySize > 0 ? lastBodySize / avgBodySize : 0;
  }

  /**
   * 거래량 비율 계산
   *
   * 마지막 봉 거래량 / 이전 봉들 평균 거래량
   */
  private calculateVolumeRatio(candles: CandleData[]): number {
    const volumes = candles.map((c) => c.volume);

    const lastVolume = volumes[volumes.length - 1];
    const avgVolume =
      volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);

    return avgVolume > 0 ? lastVolume / avgVolume : 0;
  }

  /**
   * 모멘텀 상태 판단
   *
   * 봉 크기와 거래량을 종합하여 상태 결정
   */
  private determineState(
    bodySizeRatio: number,
    volumeRatio: number,
    direction: 'UP' | 'DOWN',
    candles: CandleData[],
  ): MomentumState {
    const config = SCALPING_CONFIG.filter3;

    // 1. 소진 체크 (봉 작아지고 + 거래량 감소)
    if (
      bodySizeRatio < config.bodySizeRatio.exhausted &&
      volumeRatio < config.volumeDecreaseRatio
    ) {
      return 'EXHAUSTED';
    }

    // 2. 강한 모멘텀 체크 (봉 크고 + 거래량 유지/증가)
    if (
      bodySizeRatio > config.bodySizeRatio.momentum &&
      volumeRatio >= config.volumeDecreaseRatio
    ) {
      return 'MOMENTUM';
    }

    // 3. 풀백 체크 (마지막 봉이 반대 방향이거나 작음)
    const lastCandle = candles[candles.length - 1];
    const lastDirection = lastCandle.close > lastCandle.open ? 'UP' : 'DOWN';

    // 마지막 봉이 반대 방향이거나 몸통이 작으면 풀백
    if (
      lastDirection !== direction ||
      bodySizeRatio < config.bodySizeRatio.momentum
    ) {
      // 추가 검증: 풀백이 너무 깊지 않은지
      if (this.isPullbackValid(candles, direction)) {
        return 'PULLBACK';
      }
    }

    return 'NEUTRAL';
  }

  /**
   * 풀백 유효성 검증
   *
   * 너무 깊은 되돌림은 추세 반전일 수 있음
   * - 상승 추세: 최근 저점이 이전 저점보다 높아야 함
   * - 하락 추세: 최근 고점이 이전 고점보다 낮아야 함
   */
  private isPullbackValid(candles: CandleData[], direction: 'UP' | 'DOWN'): boolean {
    const prevCandles = candles.slice(0, -1);
    const lastCandle = candles[candles.length - 1];

    if (direction === 'UP') {
      // 상승 추세: 현재 저점이 이전 봉들의 최저점보다 높아야 함
      const prevLow = Math.min(...prevCandles.map((c) => c.low));
      const currentLow = lastCandle.low;
      return currentLow > prevLow * 0.995; // 0.5% 여유
    } else {
      // 하락 추세: 현재 고점이 이전 봉들의 최고점보다 낮아야 함
      const prevHigh = Math.max(...prevCandles.map((c) => c.high));
      const currentHigh = lastCandle.high;
      return currentHigh < prevHigh * 1.005; // 0.5% 여유
    }
  }

  /**
   * 강도 계산
   *
   * 봉 크기와 거래량 비율을 종합
   */
  private calculateStrength(bodySizeRatio: number, volumeRatio: number): number {
    // 봉 크기 비율 50% + 거래량 비율 50%
    const bodyScore = Math.min(bodySizeRatio, 2) / 2; // 0-1 정규화
    const volScore = Math.min(volumeRatio, 2) / 2; // 0-1 정규화

    return (bodyScore + volScore) / 2;
  }

  /**
   * 중립 결과 반환
   */
  private neutralResult(barsAnalyzed: number): MomentumResult {
    return {
      state: 'NEUTRAL',
      direction: 'NEUTRAL',
      strength: 0,
      bodySizeRatio: 0,
      volumeRatio: 0,
      barsAnalyzed,
    };
  }
}
