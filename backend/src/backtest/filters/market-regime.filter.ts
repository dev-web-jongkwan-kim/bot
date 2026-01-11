/**
 * Market Regime Filter
 *
 * Detects market conditions using multiple indicators:
 * - ADX: Trend strength (< 25 = ranging, > 25 = trending, > 50 = strong trend)
 * - ATR: Volatility measurement
 * - BB Width: Bollinger Band width as volatility indicator
 *
 * Uses a composite score to classify market regime with confidence level.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

export type MarketRegimeType = 'RANGING' | 'TRENDING' | 'VOLATILE';

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketRegime {
  regime: MarketRegimeType;
  confidence: number; // 0-100
  adxValue: number;
  atrPercentile: number; // ATR as % of price
  bbWidthPercentile: number; // BB width as % of price
  timestamp: number;
}

export interface RegimeScores {
  ranging: number;
  trending: number;
  volatile: number;
}

@Injectable()
export class MarketRegimeFilter {
  private readonly CACHE_TTL = 900; // 15 minutes
  private readonly CACHE_PREFIX = 'market_regime:';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Analyze market regime for a given symbol and candle data
   */
  async analyzeRegime(symbol: string, candles: Candle[]): Promise<MarketRegime> {
    // Check cache first
    const cached = await this.getCachedRegime(symbol);
    if (cached) {
      return cached;
    }

    // Calculate indicators
    const adx = this.calculateADX(candles, 14);
    const atr = this.calculateATR(candles, 14);
    const bbWidth = this.calculateBBWidth(candles, 20, 2.0);

    const currentPrice = candles[candles.length - 1].close;

    // Calculate percentiles
    const atrPercentile = (atr / currentPrice) * 100;
    const bbWidthPercentile = (bbWidth / currentPrice) * 100;

    // Calculate regime scores
    const scores = this.calculateRegimeScores(adx, atrPercentile, bbWidthPercentile);

    // Determine regime based on highest score
    const regime = this.determineRegime(scores);
    const confidence = this.calculateConfidence(scores, regime);

    const result: MarketRegime = {
      regime,
      confidence,
      adxValue: adx,
      atrPercentile,
      bbWidthPercentile,
      timestamp: Date.now(),
    };

    // Cache the result
    await this.cacheRegime(symbol, result);

    return result;
  }

  /**
   * Calculate regime scores based on indicator values
   */
  private calculateRegimeScores(
    adx: number,
    atrPercentile: number,
    bbWidthPercentile: number,
  ): RegimeScores {
    const scores: RegimeScores = {
      ranging: 0,
      trending: 0,
      volatile: 0,
    };

    // ADX scoring (weight: 40%)
    if (adx < 20) {
      scores.ranging += 40;
    } else if (adx < 25) {
      scores.ranging += 30;
      scores.trending += 10;
    } else if (adx < 35) {
      scores.trending += 40;
    } else if (adx < 50) {
      scores.trending += 30;
      scores.volatile += 10;
    } else {
      scores.volatile += 40;
    }

    // ATR Percentile scoring (weight: 30%)
    if (atrPercentile < 1.0) {
      scores.ranging += 30;
    } else if (atrPercentile < 2.0) {
      scores.ranging += 15;
      scores.trending += 15;
    } else if (atrPercentile < 3.5) {
      scores.trending += 30;
    } else if (atrPercentile < 5.0) {
      scores.trending += 15;
      scores.volatile += 15;
    } else {
      scores.volatile += 30;
    }

    // BB Width Percentile scoring (weight: 30%)
    if (bbWidthPercentile < 2.0) {
      scores.ranging += 30;
    } else if (bbWidthPercentile < 4.0) {
      scores.ranging += 15;
      scores.trending += 15;
    } else if (bbWidthPercentile < 6.0) {
      scores.trending += 30;
    } else if (bbWidthPercentile < 8.0) {
      scores.trending += 15;
      scores.volatile += 15;
    } else {
      scores.volatile += 30;
    }

    return scores;
  }

  /**
   * Determine regime based on highest score
   */
  private determineRegime(scores: RegimeScores): MarketRegimeType {
    const max = Math.max(scores.ranging, scores.trending, scores.volatile);

    if (scores.ranging === max) return 'RANGING';
    if (scores.trending === max) return 'TRENDING';
    return 'VOLATILE';
  }

  /**
   * Calculate confidence level (0-100) based on score separation
   */
  private calculateConfidence(scores: RegimeScores, regime: MarketRegimeType): number {
    const regimeScore = scores[regime.toLowerCase() as keyof RegimeScores];
    const maxScore = 100; // Maximum possible score

    // Confidence is based on how dominant the winning score is
    const confidence = (regimeScore / maxScore) * 100;

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Calculate ADX (Average Directional Index)
   */
  private calculateADX(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    // Calculate TR, +DM, -DM
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      );

      const plusDM = current.high - previous.high;
      const minusDM = previous.low - current.low;

      trueRanges.push(tr);
      plusDMs.push(plusDM > 0 && plusDM > minusDM ? plusDM : 0);
      minusDMs.push(minusDM > 0 && minusDM > plusDM ? minusDM : 0);
    }

    if (trueRanges.length < period) return 0;

    // Calculate smoothed TR, +DM, -DM
    const smoothedTR = this.smoothATR(trueRanges, period);
    const smoothedPlusDM = this.smoothATR(plusDMs, period);
    const smoothedMinusDM = this.smoothATR(minusDMs, period);

    // Calculate +DI and -DI
    const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    // Calculate DX
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

    // ADX is the smoothed DX (simplified - using last DX value)
    return dx;
  }

  /**
   * Calculate ATR (Average True Range)
   */
  private calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      );

      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return 0;

    return this.smoothATR(trueRanges, period);
  }

  /**
   * Smooth ATR using Wilder's smoothing method
   */
  private smoothATR(values: number[], period: number): number {
    if (values.length < period) return 0;

    // First ATR is simple average
    let atr = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    // Subsequent values use Wilder's smoothing
    for (let i = period; i < values.length; i++) {
      atr = (atr * (period - 1) + values[i]) / period;
    }

    return atr;
  }

  /**
   * Calculate Bollinger Band Width
   */
  private calculateBBWidth(
    candles: Candle[],
    period: number = 20,
    stdDev: number = 2.0,
  ): number {
    if (candles.length < period) return 0;

    const closes = candles.slice(-period).map((c) => c.close);
    const sma = closes.reduce((sum, val) => sum + val, 0) / period;

    const variance =
      closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    const upperBand = sma + stdDev * std;
    const lowerBand = sma - stdDev * std;

    return upperBand - lowerBand;
  }

  /**
   * Check if market is suitable for a specific strategy type
   */
  async isSuitableForStrategy(
    symbol: string,
    candles: Candle[],
    strategyType: 'trend' | 'reversal' | 'breakout',
  ): Promise<boolean> {
    const regime = await this.analyzeRegime(symbol, candles);

    switch (strategyType) {
      case 'trend':
        // Trend strategies work best in trending markets
        return regime.regime === 'TRENDING' && regime.confidence > 50;

      case 'reversal':
        // Reversal strategies work best in ranging markets
        return regime.regime === 'RANGING' && regime.confidence > 50;

      case 'breakout':
        // Breakout strategies can work in ranging or trending markets
        // but need moderate confidence
        return regime.confidence > 40;

      default:
        return true;
    }
  }

  /**
   * Get cached regime
   */
  private async getCachedRegime(symbol: string): Promise<MarketRegime | null> {
    try {
      const cached = await this.redis.get(`${this.CACHE_PREFIX}${symbol}`);
      if (!cached) return null;

      const regime = JSON.parse(cached) as MarketRegime;

      // Check if cache is still valid (not older than TTL)
      const age = Date.now() - regime.timestamp;
      if (age > this.CACHE_TTL * 1000) {
        return null;
      }

      return regime;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache regime
   */
  private async cacheRegime(symbol: string, regime: MarketRegime): Promise<void> {
    try {
      await this.redis.set(
        `${this.CACHE_PREFIX}${symbol}`,
        JSON.stringify(regime),
        'EX',
        this.CACHE_TTL,
      );
    } catch (error) {
      // Silently fail - caching is not critical
    }
  }

  /**
   * Clear cache for a symbol
   */
  async clearCache(symbol?: string): Promise<void> {
    if (symbol) {
      await this.redis.del(`${this.CACHE_PREFIX}${symbol}`);
    } else {
      // Clear all regime caches
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
