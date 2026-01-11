import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BinanceService } from './binance.service';

/**
 * Binance Market Data Service
 * Basis (현물-선물 가격 차이) 및 기타 시장 데이터 제공
 */

export interface BasisData {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number; // 절대값 ($)
  basisPercent: number; // 퍼센트 (%)
  fundingRate: number;
  timestamp: number;
}

export interface LongShortRatioData {
  symbol: string;
  longShortRatio: number; // 롱/숏 비율
  longAccount: number; // 롱 포지션 비율 (0-1)
  shortAccount: number; // 숏 포지션 비율 (0-1)
  timestamp: number;
}

@Injectable()
export class BinanceMarketDataService {
  private readonly logger = new Logger(BinanceMarketDataService.name);
  private readonly spotUrl = 'https://api.binance.com';
  private readonly futuresUrl = 'https://fapi.binance.com';

  // 백테스트용 캐시
  private basisCache: Map<string, Map<number, BasisData>> = new Map();
  private longShortCache: Map<string, Map<number, LongShortRatioData>> = new Map();

  constructor(private readonly binanceService: BinanceService) {}

  /**
   * 현재 Basis 계산 (실시간)
   * Basis = 선물 가격 - 현물 가격
   */
  async getCurrentBasis(symbol: string): Promise<BasisData> {
    try {
      // premiumIndex에는 markPrice(선물)와 indexPrice(현물)가 모두 포함
      const response = await axios.get(`${this.futuresUrl}/fapi/v1/premiumIndex`, {
        params: { symbol },
        timeout: 10000,
      });

      const spotPrice = parseFloat(response.data.indexPrice);
      const futuresPrice = parseFloat(response.data.markPrice);
      const fundingRate = parseFloat(response.data.lastFundingRate);

      const basis = futuresPrice - spotPrice;
      const basisPercent = (basis / spotPrice) * 100;

      this.logger.debug(
        `[BASIS] ${symbol}: spot=${spotPrice.toFixed(2)}, futures=${futuresPrice.toFixed(2)}, basis=${basisPercent.toFixed(4)}%`,
      );

      return {
        symbol,
        spotPrice,
        futuresPrice,
        basis,
        basisPercent,
        fundingRate,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get current basis for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Basis 히스토리 계산 (백테스트용)
   * 현물 + 선물 캔들 데이터 조합
   */
  async getBasisHistory(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<BasisData[]> {
    try {
      // 현물 가격은 binanceService의 getKlines로 가져올 수 있음 (futures만 지원)
      // premiumIndex 히스토리는 별도 API 없음
      // 대안: 현물 ticker/price와 선물 markPrice를 시간대별로 조합

      // 이 방법은 복잡하므로, 실시간 조회만 지원하고
      // 백테스트에서는 현재 가격 기반 추정 사용
      this.logger.warn(
        `[BASIS HISTORY] Binance does not provide historical basis data directly. Using estimation.`,
      );

      return [];
    } catch (error: any) {
      this.logger.error(`Failed to get basis history for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Long/Short Ratio 조회 (실시간)
   * Top Trader Long/Short Ratio
   */
  async getCurrentLongShortRatio(symbol: string): Promise<LongShortRatioData> {
    try {
      const response = await axios.get(
        `${this.futuresUrl}/futures/data/topLongShortPositionRatio`,
        {
          params: { symbol, period: '5m', limit: 1 },
          timeout: 10000,
        },
      );

      if (response.data.length === 0) {
        throw new Error(`No long/short ratio data for ${symbol}`);
      }

      const latest = response.data[0];

      const data: LongShortRatioData = {
        symbol: latest.symbol,
        longShortRatio: parseFloat(latest.longShortRatio),
        longAccount: parseFloat(latest.longAccount),
        shortAccount: parseFloat(latest.shortAccount),
        timestamp: latest.timestamp,
      };

      this.logger.debug(
        `[LONG/SHORT] ${symbol}: ratio=${data.longShortRatio.toFixed(2)}, long=${(data.longAccount * 100).toFixed(1)}%, short=${(data.shortAccount * 100).toFixed(1)}%`,
      );

      return data;
    } catch (error: any) {
      this.logger.error(`Failed to get long/short ratio for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Long/Short Ratio 히스토리 조회 (백테스트용)
   */
  async getLongShortRatioHistory(
    symbol: string,
    period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' = '1h',
    startTime?: number,
    endTime?: number,
    limit: number = 500,
  ): Promise<LongShortRatioData[]> {
    try {
      const params: any = { symbol, period, limit };
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const response = await axios.get(
        `${this.futuresUrl}/futures/data/topLongShortPositionRatio`,
        { params, timeout: 15000 },
      );

      const data: LongShortRatioData[] = response.data.map((item: any) => ({
        symbol: item.symbol,
        longShortRatio: parseFloat(item.longShortRatio),
        longAccount: parseFloat(item.longAccount),
        shortAccount: parseFloat(item.shortAccount),
        timestamp: item.timestamp,
      }));

      this.logger.log(`[LONG/SHORT HISTORY] ${symbol}: ${data.length} records`);

      return data;
    } catch (error: any) {
      this.logger.error(`Failed to get long/short ratio history for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * 백테스트용: Long/Short Ratio 데이터 미리 로드
   */
  async loadLongShortHistoryForBacktest(
    symbol: string,
    startTime: number,
    endTime: number,
    period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' = '1h',
  ): Promise<void> {
    this.logger.log(
      `[BACKTEST CACHE] Loading long/short ratio for ${symbol} (period: ${period})`,
    );

    const allData: LongShortRatioData[] = [];
    let currentStart = startTime;

    while (currentStart < endTime) {
      const batch = await this.getLongShortRatioHistory(
        symbol,
        period,
        currentStart,
        endTime,
        500,
      );

      if (batch.length === 0) break;

      allData.push(...batch);
      currentStart = batch[batch.length - 1].timestamp + 1;

      await this.sleep(100);
    }

    const cache = new Map<number, LongShortRatioData>();
    allData.forEach((data) => {
      cache.set(data.timestamp, data);
    });

    this.longShortCache.set(symbol, cache);

    this.logger.log(`[BACKTEST CACHE] ${symbol}: ${allData.length} long/short records loaded`);
  }

  /**
   * 백테스트용: 특정 시간의 Long/Short Ratio 조회 (캐시에서)
   */
  getLongShortRatioAtTime(symbol: string, timestamp: number): LongShortRatioData | null {
    const cache = this.longShortCache.get(symbol);
    if (!cache) {
      this.logger.warn(`[BACKTEST] No cached long/short data for ${symbol}`);
      return null;
    }

    if (cache.has(timestamp)) {
      return cache.get(timestamp)!;
    }

    // 가장 가까운 과거 데이터
    const timestamps = Array.from(cache.keys()).sort((a, b) => a - b);
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (timestamps[i] <= timestamp) {
        return cache.get(timestamps[i])!;
      }
    }

    return null;
  }

  /**
   * Basis 캔들 기반 추정 (백테스트용)
   * 실제 Basis 히스토리가 없으므로 펀딩 레이트와 가격 추세로 추정
   */
  estimateBasisFromCandles(
    candles: any[],
    fundingRate: number,
  ): number {
    // Basis는 펀딩 레이트와 상관관계 있음
    // Funding Rate가 높으면 → Basis도 높음 (Contango)
    // Funding Rate가 낮으면 → Basis도 낮음 (Backwardation)

    const recentCandles = candles.slice(-10);
    const priceChange =
      (parseFloat(recentCandles[recentCandles.length - 1].close) -
        parseFloat(recentCandles[0].close)) /
      parseFloat(recentCandles[0].close);

    // Basis (%) ≈ Funding Rate * 3 (8시간 펀딩 * 3 = 24시간)
    // + 가격 추세 영향
    const basisFromFunding = fundingRate * 10; // 약 10배 (경험적)
    const basisFromTrend = priceChange * 0.3;

    return basisFromFunding + basisFromTrend;
  }

  /**
   * 캐시 초기화
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.basisCache.delete(symbol);
      this.longShortCache.delete(symbol);
      this.logger.log(`[CACHE] Cleared market data cache for ${symbol}`);
    } else {
      this.basisCache.clear();
      this.longShortCache.clear();
      this.logger.log('[CACHE] Cleared all market data cache');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
