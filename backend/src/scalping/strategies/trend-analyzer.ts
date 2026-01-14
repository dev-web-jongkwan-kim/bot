import { Injectable, Logger } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { CandleData } from '../interfaces';

/**
 * 추세 분석 결과
 */
export interface TrendResult {
  /** 추세 방향 */
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  /** 추세 강도 (0-1) */
  strength: number;
  /** Higher Highs 여부 */
  higherHighs: boolean;
  /** Higher Lows 여부 */
  higherLows: boolean;
  /** Lower Highs 여부 */
  lowerHighs: boolean;
  /** Lower Lows 여부 */
  lowerLows: boolean;
  /** 분석에 사용된 봉 수 */
  barsAnalyzed: number;
}

/**
 * 15분봉 추세 분석기
 *
 * 고저점 구조로 추세 판단
 * - Higher Highs + Higher Lows = 상승 추세
 * - Lower Highs + Lower Lows = 하락 추세
 * - Mixed = 중립 (횡보)
 */
@Injectable()
export class TrendAnalyzer {
  private readonly logger = new Logger(TrendAnalyzer.name);

  /**
   * 추세 분석 메인 함수
   *
   * @param candles - 15분봉 캔들 배열 (오래된 것부터)
   * @param symbol - 심볼 (로깅용)
   * @returns TrendResult - 추세 방향과 강도
   */
  analyzeTrend(candles: CandleData[], symbol: string = ''): TrendResult {
    const barsToAnalyze = SCALPING_CONFIG.filter2.trendBars;

    // 데이터 부족 체크
    if (candles.length < barsToAnalyze) {
      if (SCALPING_CONFIG.logging.verbose && symbol) {
        this.logger.debug(
          `[TrendAnalyzer] ${symbol}: Insufficient data (${candles.length}/${barsToAnalyze} bars)`,
        );
      }
      return this.neutralResult(candles.length);
    }

    const recentCandles = candles.slice(-barsToAnalyze);

    // 고점/저점 추출
    const highs = recentCandles.map((c) => c.high);
    const lows = recentCandles.map((c) => c.low);

    // 고저점 패턴 분석
    const higherHighs = this.isHigherHighs(highs);
    const higherLows = this.isHigherLows(lows);
    const lowerHighs = this.isLowerHighs(highs);
    const lowerLows = this.isLowerLows(lows);

    // 추세 판단
    let direction: 'UP' | 'DOWN' | 'NEUTRAL';
    let strength: number;

    if (higherHighs && higherLows) {
      // 명확한 상승 추세
      direction = 'UP';
      strength = this.calculateTrendStrength(recentCandles, 'UP');
    } else if (lowerHighs && lowerLows) {
      // 명확한 하락 추세
      direction = 'DOWN';
      strength = this.calculateTrendStrength(recentCandles, 'DOWN');
    } else if (higherLows && !lowerHighs) {
      // 약한 상승 (저점만 높아짐)
      direction = 'UP';
      strength = 0.5;
    } else if (lowerHighs && !higherLows) {
      // 약한 하락 (고점만 낮아짐)
      direction = 'DOWN';
      strength = 0.5;
    } else {
      // 횡보
      direction = 'NEUTRAL';
      strength = 0;
    }

    const result: TrendResult = {
      direction,
      strength,
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
      barsAnalyzed: barsToAnalyze,
    };

    // 로깅
    if (SCALPING_CONFIG.logging.verbose && symbol) {
      this.logger.debug(
        `[TrendAnalyzer] ${symbol}: Analyzing ${barsToAnalyze} bars...`,
      );
      this.logger.debug(
        `[TrendAnalyzer] ${symbol}: HH=${higherHighs}, HL=${higherLows}, LH=${lowerHighs}, LL=${lowerLows}`,
      );
      this.logger.debug(
        `[TrendAnalyzer] ${symbol}: Direction=${direction}, Strength=${strength.toFixed(2)}`,
      );
    }

    return result;
  }

  /**
   * Higher Highs 체크 (과반수 패턴)
   *
   * 4개 봉 중 3개 이상이 이전보다 높으면 true
   * → 3번 비교 중 2번 이상 일치 (66%)
   */
  private isHigherHighs(highs: number[]): boolean {
    let count = 0;
    const total = highs.length - 1;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] > highs[i - 1]) {
        count++;
      }
    }
    // 4개 봉 → 3번 비교 → 2번 이상 일치 (ceil(3 * 0.5) = 2)
    return count >= Math.ceil(total * 0.5);
  }

  /**
   * Higher Lows 체크 (과반수 패턴)
   */
  private isHigherLows(lows: number[]): boolean {
    let count = 0;
    const total = lows.length - 1;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] > lows[i - 1]) {
        count++;
      }
    }
    return count >= Math.ceil(total * 0.5);
  }

  /**
   * Lower Highs 체크 (과반수 패턴)
   */
  private isLowerHighs(highs: number[]): boolean {
    let count = 0;
    const total = highs.length - 1;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] < highs[i - 1]) {
        count++;
      }
    }
    return count >= Math.ceil(total * 0.5);
  }

  /**
   * Lower Lows 체크 (과반수 패턴)
   */
  private isLowerLows(lows: number[]): boolean {
    let count = 0;
    const total = lows.length - 1;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] < lows[i - 1]) {
        count++;
      }
    }
    return count >= Math.ceil(total * 0.5);
  }

  /**
   * 추세 강도 계산
   *
   * 가격 변화율 기반
   */
  private calculateTrendStrength(
    candles: CandleData[],
    direction: 'UP' | 'DOWN',
  ): number {
    const firstClose = candles[0].close;
    const lastClose = candles[candles.length - 1].close;

    const changePercent = Math.abs((lastClose - firstClose) / firstClose);

    // 0.5% 변화 = 강도 0.5, 1% 변화 = 강도 1.0 (최대)
    return Math.min(changePercent * 100, 1);
  }

  /**
   * 중립 결과 반환
   */
  private neutralResult(barsAnalyzed: number): TrendResult {
    return {
      direction: 'NEUTRAL',
      strength: 0,
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      barsAnalyzed,
    };
  }
}
