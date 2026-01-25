/**
 * OI Divergence Service
 * v12.1: Open Interest와 가격 간의 다이버전스를 감지하여 필터로 사용
 *
 * OI Divergence 개념:
 * - Bullish Divergence: 가격은 하락하지만 OI는 상승 → 매집 신호 (롱에 유리)
 * - Bearish Divergence: 가격은 상승하지만 OI는 하락 → 분산 신호 (숏에 유리)
 *
 * 사용 방식:
 * - 조건부 승인 (가중치 방식): divergence score 0-100 반환
 * - LONG 진입 시 bullish divergence 점수 부여
 * - SHORT 진입 시 bearish divergence 점수 부여
 *
 * v12.1 변경:
 * - WebSocket 실시간 OI 데이터 지원 (onOiUpdate 메서드)
 * - REST API fallback: 1분 간격 (기존 5분 → 1분)
 * - WebSocket 데이터 우선 사용
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface OiDataPoint {
  timestamp: Date;
  openInterest: number;
  price: number;
}

interface DivergenceResult {
  hasDivergence: boolean;
  type: 'BULLISH' | 'BEARISH' | 'NONE';
  score: number;  // 0-100
  priceChange: number;  // %
  oiChange: number;  // %
  reason: string;
}

@Injectable()
export class OiDivergenceService implements OnModuleInit {
  private readonly logger = new Logger(OiDivergenceService.name);

  // OI 데이터 캐시 (심볼별 최근 데이터)
  private oiCache: Map<string, OiDataPoint[]> = new Map();
  private readonly MAX_CACHE_SIZE = 30;  // 최근 30개 데이터 포인트
  private readonly OKX_BASE_URL = 'https://www.okx.com';

  // 설정
  private readonly config = {
    lookbackPeriod: 5,  // 최근 5개 데이터 포인트로 divergence 계산
    minPriceChange: 0.5,  // 최소 0.5% 가격 변동 필요
    minOiChange: 1.0,  // 최소 1% OI 변동 필요
    divergenceThreshold: 0.3,  // 변화 비율 차이가 0.3 이상이면 divergence
  };

  // v12.1: REST API fallback 업데이트 간격 (1분으로 단축)
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL_MS = 60 * 1000;  // 1분

  // 구독 중인 심볼들
  private subscribedSymbols: Set<string> = new Set();

  // v12.1: WebSocket 데이터 수신 여부 추적
  private wsDataReceived: Map<string, Date> = new Map();
  private readonly WS_DATA_TIMEOUT_MS = 30 * 1000;  // 30초 내 WS 데이터 없으면 REST 사용

  async onModuleInit() {
    this.logger.log('OI Divergence Service v12.1 initialized (WebSocket + REST fallback)');
  }

  /**
   * v12.1: WebSocket에서 실시간 OI 데이터 수신
   * OkxWebSocketService에서 호출됨
   */
  onOiUpdate(instId: string, oi: number, ts: number): void {
    const symbol = this.fromOkxInstId(instId);

    // 구독 중인 심볼만 처리
    if (!this.subscribedSymbols.has(symbol)) {
      return;
    }

    // WebSocket 데이터 수신 시간 기록
    this.wsDataReceived.set(symbol, new Date());

    // 현재 가격 캐시에서 가져오기 (없으면 REST로 조회)
    const cache = this.oiCache.get(symbol);
    const lastPrice = cache && cache.length > 0
      ? cache[cache.length - 1].price
      : 0;

    if (lastPrice > 0) {
      this.addOiDataPoint(symbol, {
        timestamp: new Date(ts),
        openInterest: oi,
        price: lastPrice,
      });
    }
  }

  /**
   * 심볼 구독 시작
   */
  subscribeSymbols(symbols: string[]): void {
    symbols.forEach(s => this.subscribedSymbols.add(s));
    this.logger.log(`[OI] Subscribed to ${symbols.length} symbols for OI tracking`);

    // 초기 데이터 로드
    this.updateAllOiData();

    // v12.1: REST API fallback (1분 간격)
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.updateStaleSymbols();
      }, this.UPDATE_INTERVAL_MS);
      this.logger.log(`[OI] Started REST fallback updates (every ${this.UPDATE_INTERVAL_MS / 1000}s for stale symbols)`);
    }
  }

  /**
   * v12.1: WebSocket 데이터가 오래된 심볼만 REST로 업데이트
   */
  private async updateStaleSymbols(): Promise<void> {
    const now = Date.now();
    const staleSymbols: string[] = [];

    for (const symbol of this.subscribedSymbols) {
      const lastWsData = this.wsDataReceived.get(symbol);
      if (!lastWsData || (now - lastWsData.getTime()) > this.WS_DATA_TIMEOUT_MS) {
        staleSymbols.push(symbol);
      }
    }

    if (staleSymbols.length > 0) {
      this.logger.debug(`[OI] Updating ${staleSymbols.length} stale symbols via REST`);
      for (const symbol of staleSymbols) {
        try {
          await this.fetchOiData(symbol);
          await this.sleep(50);  // Rate limit 방지
        } catch (error: any) {
          this.logger.debug(`[OI] Failed to fetch OI for ${symbol}: ${error.message}`);
        }
      }
    }
  }

  /**
   * OKX instId를 Binance 심볼로 변환
   */
  private fromOkxInstId(instId: string): string {
    const parts = instId.split('-');
    return `${parts[0]}USDT`;
  }

  /**
   * 모든 구독 심볼의 OI 데이터 업데이트
   */
  private async updateAllOiData(): Promise<void> {
    const symbols = Array.from(this.subscribedSymbols);

    for (const symbol of symbols) {
      try {
        await this.fetchOiData(symbol);
        // API rate limit 방지
        await this.sleep(100);
      } catch (error: any) {
        this.logger.debug(`[OI] Failed to fetch OI for ${symbol}: ${error.message}`);
      }
    }
  }

  /**
   * OKX에서 OI 데이터 가져오기
   */
  private async fetchOiData(symbol: string): Promise<void> {
    const instId = this.toOkxInstId(symbol);

    // OI 데이터 가져오기
    const oiUrl = `${this.OKX_BASE_URL}/api/v5/public/open-interest?instType=SWAP&instId=${instId}`;
    const oiResponse = await fetch(oiUrl);
    const oiData = await oiResponse.json();

    if (oiData.code !== '0' || !oiData.data?.[0]) {
      throw new Error(`OKX OI API error: ${oiData.msg || 'No data'}`);
    }

    // 가격 데이터 가져오기
    const priceUrl = `${this.OKX_BASE_URL}/api/v5/market/ticker?instId=${instId}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();

    if (priceData.code !== '0' || !priceData.data?.[0]) {
      throw new Error(`OKX Price API error: ${priceData.msg || 'No data'}`);
    }

    const oi = parseFloat(oiData.data[0].oi);  // Open Interest in contracts
    const price = parseFloat(priceData.data[0].last);

    // 캐시에 추가
    this.addOiDataPoint(symbol, {
      timestamp: new Date(),
      openInterest: oi,
      price: price,
    });
  }

  /**
   * OI 데이터 포인트 캐시에 추가
   */
  private addOiDataPoint(symbol: string, data: OiDataPoint): void {
    if (!this.oiCache.has(symbol)) {
      this.oiCache.set(symbol, []);
    }

    const cache = this.oiCache.get(symbol)!;
    cache.push(data);

    // 최대 크기 유지
    while (cache.length > this.MAX_CACHE_SIZE) {
      cache.shift();
    }
  }

  /**
   * OI Divergence 확인
   *
   * @param symbol 심볼 (예: BTCUSDT)
   * @param entryDirection 진입 방향 (LONG/SHORT)
   * @returns DivergenceResult
   */
  checkDivergence(symbol: string, entryDirection: 'LONG' | 'SHORT'): DivergenceResult {
    const cache = this.oiCache.get(symbol);

    if (!cache || cache.length < this.config.lookbackPeriod) {
      return {
        hasDivergence: false,
        type: 'NONE',
        score: 50,  // 데이터 부족 시 중립 점수
        priceChange: 0,
        oiChange: 0,
        reason: `Insufficient OI data (${cache?.length || 0}/${this.config.lookbackPeriod})`,
      };
    }

    // 최근 데이터로 변화율 계산
    const recentData = cache.slice(-this.config.lookbackPeriod);
    const oldestPoint = recentData[0];
    const newestPoint = recentData[recentData.length - 1];

    const priceChange = ((newestPoint.price - oldestPoint.price) / oldestPoint.price) * 100;
    const oiChange = ((newestPoint.openInterest - oldestPoint.openInterest) / oldestPoint.openInterest) * 100;

    // Divergence 감지
    let hasDivergence = false;
    let type: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
    let score = 50;  // 기본 중립 점수

    // Bullish Divergence: 가격 하락 + OI 상승 (매집)
    if (priceChange < -this.config.minPriceChange && oiChange > this.config.minOiChange) {
      hasDivergence = true;
      type = 'BULLISH';
      // 점수 계산: OI 상승폭이 클수록 + 가격 하락폭이 작을수록 높은 점수
      const divergenceStrength = Math.abs(oiChange - priceChange);
      score = Math.min(100, 50 + divergenceStrength * 10);
    }
    // Bearish Divergence: 가격 상승 + OI 하락 (분산)
    else if (priceChange > this.config.minPriceChange && oiChange < -this.config.minOiChange) {
      hasDivergence = true;
      type = 'BEARISH';
      // 점수 계산
      const divergenceStrength = Math.abs(priceChange - oiChange);
      score = Math.min(100, 50 + divergenceStrength * 10);
    }
    // Confirmation: 가격 상승 + OI 상승 (트렌드 확인)
    else if (priceChange > this.config.minPriceChange && oiChange > this.config.minOiChange) {
      // 트렌드 확인 - LONG에 유리
      if (entryDirection === 'LONG') {
        score = 60 + Math.min(20, oiChange * 2);
      } else {
        score = 40 - Math.min(20, oiChange * 2);
      }
    }
    // Confirmation: 가격 하락 + OI 하락 (청산)
    else if (priceChange < -this.config.minPriceChange && oiChange < -this.config.minOiChange) {
      // 청산 진행 중 - SHORT에 유리
      if (entryDirection === 'SHORT') {
        score = 60 + Math.min(20, Math.abs(oiChange) * 2);
      } else {
        score = 40 - Math.min(20, Math.abs(oiChange) * 2);
      }
    }

    // 진입 방향에 따른 최종 점수 조정
    if (hasDivergence) {
      if (type === 'BULLISH' && entryDirection === 'LONG') {
        // Bullish divergence + LONG 진입 = 좋음
        score = Math.min(100, score + 20);
      } else if (type === 'BULLISH' && entryDirection === 'SHORT') {
        // Bullish divergence + SHORT 진입 = 주의
        score = Math.max(0, score - 20);
      } else if (type === 'BEARISH' && entryDirection === 'SHORT') {
        // Bearish divergence + SHORT 진입 = 좋음
        score = Math.min(100, score + 20);
      } else if (type === 'BEARISH' && entryDirection === 'LONG') {
        // Bearish divergence + LONG 진입 = 주의
        score = Math.max(0, score - 20);
      }
    }

    const reason = hasDivergence
      ? `${type} divergence: Price ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%, OI ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(2)}%`
      : `No divergence: Price ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%, OI ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(2)}%`;

    return {
      hasDivergence,
      type,
      score: Math.round(score),
      priceChange: parseFloat(priceChange.toFixed(2)),
      oiChange: parseFloat(oiChange.toFixed(2)),
      reason,
    };
  }

  /**
   * 현재 OI 상태 조회
   */
  getOiStatus(symbol: string): {
    hasData: boolean;
    dataPoints: number;
    latestOi?: number;
    latestPrice?: number;
    lastUpdate?: Date;
  } {
    const cache = this.oiCache.get(symbol);

    if (!cache || cache.length === 0) {
      return { hasData: false, dataPoints: 0 };
    }

    const latest = cache[cache.length - 1];
    return {
      hasData: true,
      dataPoints: cache.length,
      latestOi: latest.openInterest,
      latestPrice: latest.price,
      lastUpdate: latest.timestamp,
    };
  }

  /**
   * 전체 상태 조회
   */
  getAllStatus(): Map<string, ReturnType<typeof this.getOiStatus>> {
    const result = new Map<string, ReturnType<typeof this.getOiStatus>>();

    for (const symbol of this.subscribedSymbols) {
      result.set(symbol, this.getOiStatus(symbol));
    }

    return result;
  }

  /**
   * 외부에서 OI 데이터 수동 추가 (WebSocket 등에서 호출)
   */
  addExternalOiData(symbol: string, oi: number, price: number): void {
    this.addOiDataPoint(symbol, {
      timestamp: new Date(),
      openInterest: oi,
      price: price,
    });
  }

  /**
   * Binance 심볼을 OKX instId로 변환
   */
  private toOkxInstId(symbol: string): string {
    const base = symbol.replace('USDT', '');
    return `${base}-USDT-SWAP`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 정리
   */
  onModuleDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.oiCache.clear();
    this.subscribedSymbols.clear();
    this.logger.log('OI Divergence Service destroyed');
  }
}
