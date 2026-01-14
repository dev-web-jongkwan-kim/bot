import { Injectable, Logger } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { TrendDirection } from '../interfaces/signal.interface';

export interface TrendResult {
  direction: TrendDirection;
  strength: number; // 0-1
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  priceChange: number; // 가격 변화율
  details: string; // 상세 설명
}

/**
 * 15분봉 추세 분석기
 *
 * 고저점 구조로 추세 판단:
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
   * @param candles - 15분봉 캔들 배열 (최소 4개)
   * @param symbol - 심볼명 (로깅용)
   * @returns TrendResult - 추세 방향과 강도
   */
  analyzeTrend(candles: any[], symbol: string = ''): TrendResult {
    const barsToAnalyze = SCALPING_CONFIG.filter2.trendBars;
    const prefix = symbol ? `[${symbol}]` : '';

    this.logger.debug(
      `${prefix} [TREND] ──────────────────────────────────────`,
    );
    this.logger.debug(
      `${prefix} [TREND] 분석 시작 | 캔들 수: ${candles.length}, 필요: ${barsToAnalyze}`,
    );

    if (candles.length < barsToAnalyze) {
      this.logger.warn(
        `${prefix} [TREND] ❌ 데이터 부족 (${candles.length}/${barsToAnalyze})`,
      );
      return this.neutralResult('데이터 부족');
    }

    const recentCandles = candles.slice(-barsToAnalyze);

    // 고점/저점 추출
    const highs = recentCandles.map((c) => parseFloat(c[2])); // index 2 = high
    const lows = recentCandles.map((c) => parseFloat(c[3])); // index 3 = low
    const closes = recentCandles.map((c) => parseFloat(c[4])); // index 4 = close

    this.logger.debug(
      `${prefix} [TREND] 고점: [${highs.map((h) => h.toFixed(6)).join(', ')}]`,
    );
    this.logger.debug(
      `${prefix} [TREND] 저점: [${lows.map((l) => l.toFixed(6)).join(', ')}]`,
    );

    // 고저점 패턴 분석
    const higherHighs = this.isHigherHighs(highs);
    const higherLows = this.isHigherLows(lows);
    const lowerHighs = this.isLowerHighs(highs);
    const lowerLows = this.isLowerLows(lows);

    this.logger.debug(
      `${prefix} [TREND] 패턴 분석 | HH: ${higherHighs}, HL: ${higherLows}, LH: ${lowerHighs}, LL: ${lowerLows}`,
    );

    // 가격 변화율 계산
    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    const priceChange = (lastClose - firstClose) / firstClose;

    // 추세 판단
    let direction: TrendDirection;
    let strength: number;
    let details: string;

    if (higherHighs && higherLows) {
      // 명확한 상승 추세
      direction = 'UP';
      strength = this.calculateTrendStrength(candles, 'UP');
      details = 'Higher Highs + Higher Lows = 명확한 상승추세';
      this.logger.log(
        `${prefix} [TREND] ✅ UP | ${details} | 강도: ${(strength * 100).toFixed(1)}%`,
      );
    } else if (lowerHighs && lowerLows) {
      // 명확한 하락 추세
      direction = 'DOWN';
      strength = this.calculateTrendStrength(candles, 'DOWN');
      details = 'Lower Highs + Lower Lows = 명확한 하락추세';
      this.logger.log(
        `${prefix} [TREND] ✅ DOWN | ${details} | 강도: ${(strength * 100).toFixed(1)}%`,
      );
    } else if (higherLows && !lowerHighs) {
      // 약한 상승 (저점만 높아짐)
      direction = 'UP';
      strength = 0.5;
      details = 'Higher Lows (저점 상승) = 약한 상승추세';
      this.logger.log(
        `${prefix} [TREND] ⚡ WEAK UP | ${details} | 강도: 50%`,
      );
    } else if (lowerHighs && !higherLows) {
      // 약한 하락 (고점만 낮아짐)
      direction = 'DOWN';
      strength = 0.5;
      details = 'Lower Highs (고점 하락) = 약한 하락추세';
      this.logger.log(
        `${prefix} [TREND] ⚡ WEAK DOWN | ${details} | 강도: 50%`,
      );
    } else {
      // 횡보
      direction = 'NEUTRAL';
      strength = 0;
      details = '혼합 패턴 = 횡보/중립';
      this.logger.debug(`${prefix} [TREND] ⏸️ NEUTRAL | ${details}`);
    }

    this.logger.debug(
      `${prefix} [TREND] 가격 변화: ${(priceChange * 100).toFixed(3)}%`,
    );
    this.logger.debug(
      `${prefix} [TREND] ──────────────────────────────────────`,
    );

    return {
      direction,
      strength,
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
      priceChange,
      details,
    };
  }

  /**
   * Higher Highs 체크
   * 연속적으로 고점이 높아지는지 확인
   */
  private isHigherHighs(highs: number[]): boolean {
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] <= highs[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Higher Lows 체크
   */
  private isHigherLows(lows: number[]): boolean {
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] <= lows[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Lower Highs 체크
   */
  private isLowerHighs(highs: number[]): boolean {
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] >= highs[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Lower Lows 체크
   */
  private isLowerLows(lows: number[]): boolean {
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] >= lows[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 추세 강도 계산
   * 가격 변화율 기반
   */
  private calculateTrendStrength(
    candles: any[],
    direction: 'UP' | 'DOWN',
  ): number {
    const firstClose = parseFloat(candles[0][4]);
    const lastClose = parseFloat(candles[candles.length - 1][4]);

    const changePercent = Math.abs((lastClose - firstClose) / firstClose);

    // 0.5% 변화 = 강도 0.5, 1% 변화 = 강도 1.0 (최대)
    return Math.min(changePercent * 100, 1);
  }

  private neutralResult(reason: string): TrendResult {
    return {
      direction: 'NEUTRAL',
      strength: 0,
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      priceChange: 0,
      details: reason,
    };
  }
}
