import { Injectable, Logger, Inject } from '@nestjs/common';
import { OkxService } from '../okx/okx.service';
import Redis from 'ioredis';

export interface SelectedSymbol {
  symbol: string;
  rank: number;
  volume24h: number;
  volumeRank: number;
  priceChange24h: number;
  lastPrice: number;
  lastUpdated: Date;
}

@Injectable()
export class SymbolSelectionService {
  private readonly logger = new Logger(SymbolSelectionService.name);
  private selectedSymbols: string[] = [];
  private readonly MIN_VOLUME_USDT = 1000000; // $1M
  private readonly CACHE_KEY = 'selected_symbols';
  private readonly CACHE_TTL = 86400; // 24 hours

  constructor(
    private okxService: OkxService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  /**
   * 거래량 기준 상위 N개 종목 선택
   */
  async selectTopSymbols(count: number = 80): Promise<string[]> {
    this.logger.log(`Selecting top ${count} symbols by 24h volume...`);

    try {
      // 1. Get all perpetual USDT futures
      const allSymbols = await this.getAllPerpetualSymbols();
      this.logger.log(`Found ${allSymbols.length} perpetual USDT symbols`);

      // 2. Get 24h volume data for all symbols
      const tickers = await this.getAll24hTickers();
      this.logger.log(`Fetched 24h stats for ${tickers.length} symbols`);

      // 3. Filter and combine data
      const filtered = this.filterAndCombine(allSymbols, tickers);
      this.logger.log(`${filtered.length} symbols passed minimum volume filter ($${this.MIN_VOLUME_USDT.toLocaleString()})`);

      // 4. Sort by volume (descending)
      const sorted = this.sortByVolume(filtered);

      // 5. Select top N
      const selected = sorted.slice(0, count);

      // 6. Cache selected symbols
      await this.cacheSelectedSymbols(selected);

      this.selectedSymbols = selected.map(s => s.symbol);

      // 7. Log top 10
      this.logger.log('\n' + '='.repeat(80));
      this.logger.log(`TOP 10 SYMBOLS BY 24H VOLUME:`);
      this.logger.log('='.repeat(80));
      selected.slice(0, 10).forEach((s, i) => {
        this.logger.log(
          `${i + 1}. ${s.symbol.padEnd(12)} ` +
          `Volume: $${(s.volume24h / 1000000).toFixed(1)}M  ` +
          `Change: ${s.priceChange24h > 0 ? '+' : ''}${s.priceChange24h.toFixed(2)}%`
        );
      });
      this.logger.log('='.repeat(80) + '\n');

      return this.selectedSymbols;

    } catch (error) {
      this.logger.error('Symbol selection failed:', error);

      // Fallback: Try to load from cache
      const cached = await this.loadFromCache();
      if (cached && cached.length > 0) {
        this.logger.warn(`Using cached symbols (${cached.length} symbols)`);
        this.selectedSymbols = cached;
        return this.selectedSymbols;
      }

      // Last resort: Return default symbols
      this.logger.error('No cached symbols available, using defaults');
      const defaults = this.getDefaultSymbols();
      this.selectedSymbols = defaults;
      return defaults;
    }
  }

  /**
   * 모든 영구 USDT 선물 종목 가져오기
   */
  private async getAllPerpetualSymbols(): Promise<any[]> {
    const exchangeInfo = await this.okxService.getExchangeInfo();

    return (exchangeInfo.symbols as any[]).filter((s: any) =>
      s.contractType === 'PERPETUAL' &&
      s.quoteAsset === 'USDT' &&
      s.status === 'TRADING'
    );
  }

  /**
   * 모든 종목의 24시간 통계 가져오기
   */
  private async getAll24hTickers(): Promise<any[]> {
    const result = await this.okxService.getAll24hTickers();
    // Ensure we always return an array
    return Array.isArray(result) ? result : [result];
  }

  /**
   * 종목 필터링 및 데이터 결합
   */
  private filterAndCombine(symbols: any[], tickers: any[]): SelectedSymbol[] {
    const tickerMap = new Map(tickers.map(t => [t.symbol, t]));

    return symbols
      .map(s => {
        const ticker = tickerMap.get(s.symbol);
        if (!ticker) return null;

        const volume24h = parseFloat(ticker.quoteVolume);
        const priceChange24h = parseFloat(ticker.priceChangePercent);
        const lastPrice = parseFloat(ticker.lastPrice);

        // Filter by minimum volume
        if (volume24h < this.MIN_VOLUME_USDT) return null;

        // Filter out stablecoins and index tokens
        if (s.symbol.includes('USD') && !s.symbol.includes('USDT')) return null;
        if (s.symbol.endsWith('DOWN') || s.symbol.endsWith('UP')) return null;

        return {
          symbol: s.symbol,
          rank: 0, // Will be set after sorting
          volume24h,
          volumeRank: 0,
          priceChange24h,
          lastPrice,
          lastUpdated: new Date(),
        };
      })
      .filter((s): s is SelectedSymbol => s !== null);
  }

  /**
   * 거래량 순으로 정렬
   */
  private sortByVolume(symbols: SelectedSymbol[]): SelectedSymbol[] {
    return symbols
      .sort((a, b) => b.volume24h - a.volume24h)
      .map((s, i) => ({
        ...s,
        rank: i + 1,
        volumeRank: i + 1,
      }));
  }

  /**
   * 선택된 종목을 Redis에 캐시
   */
  private async cacheSelectedSymbols(symbols: SelectedSymbol[]) {
    try {
      await this.redis.set(
        this.CACHE_KEY,
        JSON.stringify(symbols),
        'EX',
        this.CACHE_TTL
      );
      this.logger.log(`Cached ${symbols.length} selected symbols (TTL: 24h)`);
    } catch (error) {
      this.logger.error('Failed to cache symbols:', error);
    }
  }

  /**
   * 캐시에서 종목 로드
   */
  private async loadFromCache(): Promise<string[]> {
    try {
      const cached = await this.redis.get(this.CACHE_KEY);
      if (!cached) return [];

      const symbols: SelectedSymbol[] = JSON.parse(cached);
      return symbols.map(s => s.symbol);
    } catch (error) {
      this.logger.error('Failed to load from cache:', error);
      return [];
    }
  }

  /**
   * 기본 종목 (fallback)
   */
  private getDefaultSymbols(): string[] {
    return [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'POLUSDT', 'AVAXUSDT',  // MATIC → POL (OKX)
      'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT',
      'FILUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'NEARUSDT',
    ];
  }

  /**
   * 현재 선택된 종목 반환
   */
  getSelectedSymbols(): string[] {
    return this.selectedSymbols;
  }

  /**
   * 선택된 종목의 상세 정보 반환
   */
  async getSelectedSymbolsDetails(): Promise<SelectedSymbol[]> {
    try {
      const cached = await this.redis.get(this.CACHE_KEY);
      if (!cached) return [];

      return JSON.parse(cached);
    } catch (error) {
      this.logger.error('Failed to get symbol details:', error);
      return [];
    }
  }

  /**
   * 하이브리드 선택: 코어 + 동적
   * Top 5는 항상 포함, 나머지는 거래량 순
   */
  async selectHybridSymbols(totalCount: number = 80): Promise<string[]> {
    const CORE_SYMBOLS = [
      'BTCUSDT',
      'ETHUSDT',
      'BNBUSDT',
      'SOLUSDT',
      'XRPUSDT',
    ];

    this.logger.log('Hybrid selection: Core 5 + Dynamic 75');

    // 모든 종목 선택
    const allSelected = await this.selectTopSymbols(totalCount + 10);

    // 코어 종목 제외하고 나머지 선택
    const dynamicCount = totalCount - CORE_SYMBOLS.length;
    const dynamic = allSelected
      .filter(s => !CORE_SYMBOLS.includes(s))
      .slice(0, dynamicCount);

    const hybrid = [...CORE_SYMBOLS, ...dynamic];

    this.logger.log(`Hybrid selection complete: ${CORE_SYMBOLS.length} core + ${dynamic.length} dynamic = ${hybrid.length} total`);

    this.selectedSymbols = hybrid;
    return hybrid;
  }
}
