import { Injectable, Logger } from '@nestjs/common';

/**
 * 캔들 인터페이스
 */
export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 레벨 인터페이스
 */
export interface PriceLevel {
  price: number;
  source: 'volume_profile' | 'swing';
  touches?: number;
  lastTouch?: Date;
  volume?: number;
  score: number;
  type?: 'resistance' | 'support';
}

/**
 * 레벨 계산 결과
 */
export interface LevelCalculationResult {
  resistances: PriceLevel[];
  supports: PriceLevel[];
  currentPrice: number;
  calculatedAt: Date;
}

/**
 * Level Calculator Service
 *
 * strategies.md의 Volume Profile + Swing Points + 점수화 방법론 구현
 */
@Injectable()
export class BinanceLevelCalculatorService {
  private readonly logger = new Logger(BinanceLevelCalculatorService.name);

  // 레벨 캐시 (심볼별)
  private levelCache: Map<string, { levels: LevelCalculationResult; timestamp: number }> = new Map();

  /**
   * 주요 레벨 계산 (strategies.md 방법론)
   */
  calculateMajorLevels(
    symbol: string,
    candles: Candle[],
    lookbackDays: number = 30,
    minTouches: number = 2,
    minScore: number = 70,
    maxLevelsPerSide: number = 5,
  ): LevelCalculationResult {
    if (candles.length < 20) {
      this.logger.warn(`[LEVEL] Not enough candles for ${symbol}: ${candles.length}`);
      return {
        resistances: [],
        supports: [],
        currentPrice: candles[candles.length - 1]?.close || 0,
        calculatedAt: new Date(),
      };
    }

    const currentPrice = candles[candles.length - 1].close;

    // ========== STEP 1: Volume Profile ==========
    const volumeLevels = this.calculateVolumeProfile(candles);

    // ========== STEP 2: Swing Points ==========
    const swingHighs = this.findSwingHighs(candles, minTouches);
    const swingLows = this.findSwingLows(candles, minTouches);

    // ========== STEP 3: 통합 및 점수화 ==========
    const allLevels: PriceLevel[] = [];

    // Volume Profile 레벨 추가
    for (const vLevel of volumeLevels) {
      allLevels.push({
        price: vLevel.price,
        source: 'volume_profile',
        volume: vLevel.volume,
        score: 0,
      });
    }

    // Swing 레벨 추가
    for (const swing of [...swingHighs, ...swingLows]) {
      allLevels.push({
        price: swing.price,
        source: 'swing',
        touches: swing.touches,
        lastTouch: swing.lastTouch,
        volume: swing.volume,
        score: 0,
      });
    }

    // ========== STEP 4: 점수 계산 ==========
    const scoredLevels = this.calculateScores(allLevels, candles, currentPrice);

    // ========== STEP 5: 레벨 병합 (너무 가까운 레벨 제거) ==========
    const mergedLevels = this.mergeLevels(scoredLevels, currentPrice, 0.015); // 1.5% 최소 간격

    // ========== STEP 6: 최종 선택 및 분류 ==========
    const resistances = mergedLevels
      .filter(l => l.price > currentPrice && l.score >= minScore)
      .sort((a, b) => a.price - b.price)
      .slice(0, maxLevelsPerSide)
      .map(l => ({ ...l, type: 'resistance' as const }));

    const supports = mergedLevels
      .filter(l => l.price < currentPrice && l.score >= minScore)
      .sort((a, b) => b.price - a.price)
      .slice(0, maxLevelsPerSide)
      .map(l => ({ ...l, type: 'support' as const }));

    const result = {
      resistances,
      supports,
      currentPrice,
      calculatedAt: new Date(),
    };

    // 캐시 저장
    this.levelCache.set(symbol, {
      levels: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Volume Profile 계산
   */
  private calculateVolumeProfile(candles: Candle[]): { price: number; volume: number }[] {
    const priceMin = Math.min(...candles.map(c => c.low));
    const priceMax = Math.max(...candles.map(c => c.high));
    const bucketSize = (priceMax - priceMin) * 0.005; // 0.5% 간격

    const volumeProfile: Map<number, number> = new Map();

    for (const candle of candles) {
      const bucket = Math.floor(candle.close / bucketSize) * bucketSize;
      volumeProfile.set(bucket, (volumeProfile.get(bucket) || 0) + candle.volume);
    }

    // 상위 20% 거래량 구간
    const sorted = Array.from(volumeProfile.entries())
      .sort((a, b) => b[1] - a[1]);

    const top20Percent = sorted.slice(0, Math.ceil(sorted.length * 0.2));

    return top20Percent.map(([price, volume]) => ({ price, volume }));
  }

  /**
   * Swing Highs 찾기
   */
  private findSwingHighs(candles: Candle[], minTouches: number): any[] {
    const swings: any[] = [];
    const lookback = 10;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const isSwingHigh = candles.slice(i - lookback, i + lookback + 1)
        .filter((_, idx) => idx !== lookback)
        .every(c => c.high < candles[i].high);

      if (isSwingHigh) {
        const touches = this.countTouches(candles, candles[i].high, 0.003);
        if (touches >= minTouches) {
          const lastTouch = this.findLastTouch(candles, candles[i].high);
          const volumeNear = this.getVolumeNear(candles, candles[i].high);

          swings.push({
            price: candles[i].high,
            touches,
            lastTouch,
            volume: volumeNear,
          });
        }
      }
    }

    return swings;
  }

  /**
   * Swing Lows 찾기
   */
  private findSwingLows(candles: Candle[], minTouches: number): any[] {
    const swings: any[] = [];
    const lookback = 10;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const isSwingLow = candles.slice(i - lookback, i + lookback + 1)
        .filter((_, idx) => idx !== lookback)
        .every(c => c.low > candles[i].low);

      if (isSwingLow) {
        const touches = this.countTouches(candles, candles[i].low, 0.003);
        if (touches >= minTouches) {
          const lastTouch = this.findLastTouch(candles, candles[i].low);
          const volumeNear = this.getVolumeNear(candles, candles[i].low);

          swings.push({
            price: candles[i].low,
            touches,
            lastTouch,
            volume: volumeNear,
          });
        }
      }
    }

    return swings;
  }

  /**
   * 특정 가격 레벨 터치 횟수 계산
   */
  private countTouches(candles: Candle[], price: number, threshold: number): number {
    let count = 0;
    for (const candle of candles) {
      const priceDiff = Math.abs(candle.high - price) / price;
      const priceDiffLow = Math.abs(candle.low - price) / price;

      if (priceDiff <= threshold || priceDiffLow <= threshold) {
        count++;
      }
    }
    return count;
  }

  /**
   * 마지막 터치 시점 찾기
   */
  private findLastTouch(candles: Candle[], price: number): Date {
    for (let i = candles.length - 1; i >= 0; i--) {
      const priceDiff = Math.abs(candles[i].high - price) / price;
      const priceDiffLow = Math.abs(candles[i].low - price) / price;

      if (priceDiff <= 0.003 || priceDiffLow <= 0.003) {
        return candles[i].timestamp;
      }
    }
    return candles[0].timestamp;
  }

  /**
   * 특정 가격 근처의 거래량 계산
   */
  private getVolumeNear(candles: Candle[], price: number): number {
    let totalVolume = 0;
    for (const candle of candles) {
      const priceDiff = Math.abs(candle.close - price) / price;
      if (priceDiff <= 0.005) { // 0.5% 범위
        totalVolume += candle.volume;
      }
    }
    return totalVolume;
  }

  /**
   * 레벨 점수 계산 (strategies.md 방법론)
   */
  private calculateScores(levels: PriceLevel[], candles: Candle[], currentPrice: number): PriceLevel[] {
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const now = new Date();

    for (const level of levels) {
      let score = 0;

      // 4-1. 거래량 점수 (40점 만점)
      if (level.source === 'volume_profile' && level.volume) {
        const volumeRatio = level.volume / avgVolume;
        score += Math.min(volumeRatio * 10, 40);
      } else if (level.volume) {
        const volumeRatio = level.volume / avgVolume;
        score += Math.min(volumeRatio * 10, 40);
      }

      // 4-2. 터치 횟수 점수 (30점 만점)
      if (level.touches) {
        score += Math.min(level.touches * 10, 30);
      }

      // 4-3. 최근성 점수 (20점 만점)
      if (level.lastTouch) {
        const daysAgo = (now.getTime() - level.lastTouch.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(20 - daysAgo * 2, 0);
        score += recencyScore;
      }

      // 4-4. 현재가 근접도 (10점 만점)
      const distance = Math.abs(level.price - currentPrice) / currentPrice;
      if (distance < 0.05) { // 5% 이내
        const proximityScore = (1 - distance / 0.05) * 10;
        score += proximityScore;
      }

      level.score = score;
    }

    return levels;
  }

  /**
   * 가까운 레벨 병합
   */
  private mergeLevels(levels: PriceLevel[], currentPrice: number, minDistancePct: number): PriceLevel[] {
    // 점수순 정렬
    const sorted = levels.sort((a, b) => b.score - a.score);

    const merged: PriceLevel[] = [];

    for (const level of sorted) {
      let tooClose = false;

      for (const existing of merged) {
        const distance = Math.abs(level.price - existing.price) / currentPrice;
        if (distance < minDistancePct) {
          tooClose = true;
          // 점수가 더 높으면 교체
          if (level.score > existing.score) {
            merged.splice(merged.indexOf(existing), 1);
            tooClose = false;
          }
          break;
        }
      }

      if (!tooClose) {
        merged.push(level);
      }
    }

    return merged;
  }

  /**
   * 캐시된 레벨 조회
   */
  getCachedLevels(symbol: string): LevelCalculationResult | null {
    const cached = this.levelCache.get(symbol);
    if (!cached) {
      return null;
    }

    // 15분 이상 지난 데이터는 무효
    const now = Date.now();
    if (now - cached.timestamp > 15 * 60 * 1000) {
      return null;
    }

    return cached.levels;
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.levelCache.clear();
    this.logger.log('[LEVEL] Cache cleared');
  }
}
