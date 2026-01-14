import { Injectable, Logger } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { MomentumState, TrendDirection } from '../interfaces/signal.interface';

export interface MomentumResult {
  state: MomentumState;
  direction: TrendDirection;
  strength: number; // 0-1
  bodySizeRatio: number;
  volumeRatio: number;
  details: string;
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
   * @param candles - 5분봉 캔들 배열 (최소 5개)
   * @param symbol - 심볼명 (로깅용)
   * @returns MomentumResult - 모멘텀 상태와 방향
   */
  analyzeMomentum(candles: any[], symbol: string = ''): MomentumResult {
    const barsToAnalyze = SCALPING_CONFIG.filter3.momentumBars;
    const prefix = symbol ? `[${symbol}]` : '';

    this.logger.debug(
      `${prefix} [MOMENTUM] ──────────────────────────────────────`,
    );
    this.logger.debug(
      `${prefix} [MOMENTUM] 분석 시작 | 캔들 수: ${candles.length}, 필요: ${barsToAnalyze}`,
    );

    if (candles.length < barsToAnalyze) {
      this.logger.warn(
        `${prefix} [MOMENTUM] ❌ 데이터 부족 (${candles.length}/${barsToAnalyze})`,
      );
      return this.neutralResult('데이터 부족');
    }

    const recentCandles = candles.slice(-barsToAnalyze);

    // 1. 전체 방향 판단 (가격 변화)
    const direction = this.determineDirection(recentCandles);
    this.logger.debug(`${prefix} [MOMENTUM] 방향: ${direction}`);

    if (direction === 'NEUTRAL') {
      this.logger.debug(`${prefix} [MOMENTUM] ⏸️ 방향 없음 = NEUTRAL`);
      return this.neutralResult('방향 없음');
    }

    // 2. 봉 크기 비율 계산
    const bodySizeRatio = this.calculateBodySizeRatio(recentCandles);
    this.logger.debug(
      `${prefix} [MOMENTUM] 봉 크기 비율: ${bodySizeRatio.toFixed(3)} (마지막봉/평균)`,
    );

    // 3. 거래량 비율 계산
    const volumeRatio = this.calculateVolumeRatio(recentCandles);
    this.logger.debug(
      `${prefix} [MOMENTUM] 거래량 비율: ${volumeRatio.toFixed(3)} (마지막봉/평균)`,
    );

    // 4. 모멘텀 상태 판단
    const { state, details } = this.determineState(
      bodySizeRatio,
      volumeRatio,
      direction,
      recentCandles,
    );

    // 5. 강도 계산
    const strength = this.calculateStrength(bodySizeRatio, volumeRatio);

    // 상태별 로깅
    if (state === 'PULLBACK') {
      this.logger.log(
        `${prefix} [MOMENTUM] ✅ PULLBACK | ${details} | 강도: ${(strength * 100).toFixed(1)}%`,
      );
    } else if (state === 'MOMENTUM') {
      this.logger.debug(
        `${prefix} [MOMENTUM] ⚡ MOMENTUM | ${details} | 대기 필요`,
      );
    } else if (state === 'EXHAUSTED') {
      this.logger.debug(`${prefix} [MOMENTUM] 💤 EXHAUSTED | ${details}`);
    } else {
      this.logger.debug(`${prefix} [MOMENTUM] ⏸️ NEUTRAL | ${details}`);
    }

    this.logger.debug(
      `${prefix} [MOMENTUM] ──────────────────────────────────────`,
    );

    return {
      state,
      direction,
      strength,
      bodySizeRatio,
      volumeRatio,
      details,
    };
  }

  /**
   * 방향 판단
   * 최근 캔들들의 전체 가격 변화로 방향 결정
   */
  private determineDirection(candles: any[]): TrendDirection {
    const firstOpen = parseFloat(candles[0][1]); // index 1 = open
    const lastClose = parseFloat(candles[candles.length - 1][4]); // index 4 = close

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
  private calculateBodySizeRatio(candles: any[]): number {
    const bodySizes = candles.map((c) => {
      const open = parseFloat(c[1]);
      const close = parseFloat(c[4]);
      return Math.abs(close - open);
    });

    const lastBodySize = bodySizes[bodySizes.length - 1];
    const prevBodySizes = bodySizes.slice(0, -1);
    const avgBodySize =
      prevBodySizes.reduce((a, b) => a + b, 0) / prevBodySizes.length;

    return avgBodySize > 0 ? lastBodySize / avgBodySize : 0;
  }

  /**
   * 거래량 비율 계산
   *
   * 마지막 봉 거래량 / 이전 봉들 평균 거래량
   */
  private calculateVolumeRatio(candles: any[]): number {
    const volumes = candles.map((c) => parseFloat(c[5])); // index 5 = volume

    const lastVolume = volumes[volumes.length - 1];
    const prevVolumes = volumes.slice(0, -1);
    const avgVolume =
      prevVolumes.reduce((a, b) => a + b, 0) / prevVolumes.length;

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
    direction: TrendDirection,
    candles: any[],
  ): { state: MomentumState; details: string } {
    const config = SCALPING_CONFIG.filter3;

    // 1. 소진 체크 (봉 작아지고 + 거래량 감소)
    if (
      bodySizeRatio < config.bodySizeRatio.exhausted &&
      volumeRatio < config.volumeDecreaseRatio
    ) {
      return {
        state: 'EXHAUSTED',
        details: `봉 크기 ${(bodySizeRatio * 100).toFixed(0)}% + 거래량 ${(volumeRatio * 100).toFixed(0)}% = 소진`,
      };
    }

    // 2. 강한 모멘텀 체크 (봉 크고 + 거래량 유지/증가)
    if (
      bodySizeRatio > config.bodySizeRatio.momentum &&
      volumeRatio >= config.volumeDecreaseRatio
    ) {
      return {
        state: 'MOMENTUM',
        details: `봉 크기 ${(bodySizeRatio * 100).toFixed(0)}% + 거래량 ${(volumeRatio * 100).toFixed(0)}% = 모멘텀 진행`,
      };
    }

    // 3. 풀백 체크 (마지막 봉이 반대 방향이거나 작음)
    const lastCandle = candles[candles.length - 1];
    const lastOpen = parseFloat(lastCandle[1]);
    const lastClose = parseFloat(lastCandle[4]);
    const lastDirection = lastClose > lastOpen ? 'UP' : 'DOWN';

    // 마지막 봉이 반대 방향이거나 몸통이 작으면 풀백
    if (
      lastDirection !== direction ||
      bodySizeRatio < config.bodySizeRatio.momentum
    ) {
      // 추가 검증: 풀백이 너무 깊지 않은지
      if (this.isPullbackValid(candles, direction)) {
        return {
          state: 'PULLBACK',
          details: `마지막봉 ${lastDirection} (추세 ${direction}) + 봉크기 ${(bodySizeRatio * 100).toFixed(0)}% = 풀백`,
        };
      }
    }

    return {
      state: 'NEUTRAL',
      details: '조건 불충족',
    };
  }

  /**
   * 풀백 유효성 검증
   *
   * 너무 깊은 되돌림은 추세 반전일 수 있음
   * - 상승 추세: 최근 저점이 이전 저점보다 높아야 함
   * - 하락 추세: 최근 고점이 이전 고점보다 낮아야 함
   */
  private isPullbackValid(candles: any[], direction: TrendDirection): boolean {
    const prevCandles = candles.slice(0, -1);
    const lastCandle = candles[candles.length - 1];

    if (direction === 'UP') {
      // 상승 추세: 현재 저점이 이전 봉들의 최저점보다 높아야 함
      const prevLow = Math.min(...prevCandles.map((c) => parseFloat(c[3])));
      const currentLow = parseFloat(lastCandle[3]);
      const valid = currentLow > prevLow * 0.995; // 0.5% 여유
      this.logger.debug(
        `[PULLBACK 검증] 상승 | 현재 저점: ${currentLow.toFixed(6)}, 이전 최저: ${prevLow.toFixed(6)}, 유효: ${valid}`,
      );
      return valid;
    } else {
      // 하락 추세: 현재 고점이 이전 봉들의 최고점보다 낮아야 함
      const prevHigh = Math.max(...prevCandles.map((c) => parseFloat(c[2])));
      const currentHigh = parseFloat(lastCandle[2]);
      const valid = currentHigh < prevHigh * 1.005; // 0.5% 여유
      this.logger.debug(
        `[PULLBACK 검증] 하락 | 현재 고점: ${currentHigh.toFixed(6)}, 이전 최고: ${prevHigh.toFixed(6)}, 유효: ${valid}`,
      );
      return valid;
    }
  }

  /**
   * 강도 계산
   *
   * 봉 크기와 거래량 비율을 종합
   */
  private calculateStrength(
    bodySizeRatio: number,
    volumeRatio: number,
  ): number {
    // 봉 크기 비율 50% + 거래량 비율 50%
    const bodyScore = Math.min(bodySizeRatio, 2) / 2; // 0-1 정규화
    const volScore = Math.min(volumeRatio, 2) / 2; // 0-1 정규화

    return (bodyScore + volScore) / 2;
  }

  private neutralResult(reason: string): MomentumResult {
    return {
      state: 'NEUTRAL',
      direction: 'NEUTRAL',
      strength: 0,
      bodySizeRatio: 0,
      volumeRatio: 0,
      details: reason,
    };
  }
}
