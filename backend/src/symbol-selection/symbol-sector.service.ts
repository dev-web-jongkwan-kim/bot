import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../binance/binance.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 바이낸스 공식 섹터 분류 (underlyingSubType 기반)
 */
export type Sector =
  | 'Layer-1'       // ETH, SOL, AVAX, ADA, DOT, etc.
  | 'Layer-2'       // ARB, OP, MATIC, SKL, etc.
  | 'DeFi'          // UNI, AAVE, COMP, CRV, etc.
  | 'AI'            // FET, RNDR, THETA, GRT, etc.
  | 'Meme'          // DOGE, SHIB, PEPE, WIF, etc.
  | 'Gaming'        // ENJ, GALA, etc.
  | 'Metaverse'     // AXS, SAND, MANA, etc.
  | 'Infrastructure'// LINK, BAT, TRB, etc.
  | 'Storage'       // FIL, AR, STORJ, etc.
  | 'NFT'           // CHZ, IMX, GMT, etc.
  | 'PoW'           // BTC, ETC, XMR, etc.
  | 'Payment'       // XRP, LTC, BCH, etc.
  | 'Alpha'         // 신규/이머징 토큰
  | 'Unknown';      // 분류 없음

interface SymbolSectorData {
  symbol: string;
  sector: Sector;
  baseAsset: string;
  updatedAt: string;
}

interface SectorConfig {
  maxPositionsPerSector: Record<Sector, number>;
  correlatedSectors: Record<Sector, Sector[]>;
}

/**
 * SymbolSectorService
 *
 * 바이낸스 공식 섹터 분류 사용 (underlyingSubType)
 * - 전체 USDT 선물 종목 섹터 자동 분류
 * - 주기적 업데이트 (하루 2회)
 * - 섹터별 포지션 제한 지원
 */
@Injectable()
export class SymbolSectorService implements OnModuleInit {
  private readonly logger = new Logger(SymbolSectorService.name);
  private readonly DATA_FILE = path.join(process.cwd(), 'data', 'symbol-sectors.json');

  // 섹터 데이터 캐시
  private sectorMap: Map<string, Sector> = new Map();
  private lastUpdate: Date | null = null;

  // 섹터 설정
  private readonly config: SectorConfig = {
    // 섹터별 최대 포지션 수 (리스크 분산)
    maxPositionsPerSector: {
      'Layer-1': 3,
      'Layer-2': 3,
      'DeFi': 3,
      'AI': 3,
      'Meme': 2,          // 밈코인은 변동성이 커서 2개로 제한
      'Gaming': 2,
      'Metaverse': 2,
      'Infrastructure': 3,
      'Storage': 2,
      'NFT': 2,
      'PoW': 2,           // BTC, ETC 등 - 메이저라 영향력 큼
      'Payment': 2,
      'Alpha': 2,         // 신규 토큰은 리스크 높음
      'Unknown': 3,
    },
    // 상관관계 높은 섹터 (한 섹터가 차면 관련 섹터도 주의)
    correlatedSectors: {
      'Layer-1': ['Layer-2', 'PoW'],      // L1/L2/PoW는 시장 전체와 연동
      'Layer-2': ['Layer-1'],
      'DeFi': ['Infrastructure'],          // DeFi와 인프라(오라클 등)
      'AI': [],
      'Meme': [],                          // 밈은 독립적
      'Gaming': ['Metaverse', 'NFT'],      // 게임/메타버스/NFT 연관
      'Metaverse': ['Gaming', 'NFT'],
      'Infrastructure': ['DeFi'],
      'Storage': [],
      'NFT': ['Gaming', 'Metaverse'],
      'PoW': ['Layer-1'],
      'Payment': [],
      'Alpha': [],
      'Unknown': [],
    },
  };

  constructor(private binanceService: BinanceService) {}

  async onModuleInit() {
    // 데이터 디렉토리 생성
    const dataDir = path.dirname(this.DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 기존 데이터 로드 또는 새로 생성
    await this.loadOrUpdateSectorData();
  }

  /**
   * 하루 2회 섹터 데이터 업데이트 (00:05, 12:05 UTC)
   */
  @Cron('5 0,12 * * *')
  async scheduledUpdate() {
    this.logger.log('Scheduled sector data update starting...');
    await this.updateSectorData();
  }

  /**
   * 섹터 데이터 로드 또는 업데이트
   */
  private async loadOrUpdateSectorData() {
    try {
      if (fs.existsSync(this.DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.DATA_FILE, 'utf-8'));
        const lastUpdate = new Date(data.updatedAt);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

        // 12시간 이내 데이터면 로드만
        if (hoursSinceUpdate < 12) {
          this.loadFromFile(data);
          this.logger.log(
            `Loaded ${this.sectorMap.size} symbols from cache (${hoursSinceUpdate.toFixed(1)}h old)`
          );
          return;
        }
      }

      // 새로 업데이트
      await this.updateSectorData();
    } catch (error) {
      this.logger.error('Error loading sector data:', error);
      await this.updateSectorData();
    }
  }

  /**
   * 파일에서 섹터 데이터 로드
   */
  private loadFromFile(data: any) {
    this.sectorMap.clear();
    for (const item of data.symbols) {
      this.sectorMap.set(item.symbol, item.sector as Sector);
    }
    this.lastUpdate = new Date(data.updatedAt);
  }

  /**
   * 바이낸스에서 전체 종목 가져와서 섹터 분류 업데이트
   * underlyingSubType 필드를 사용한 공식 분류
   */
  async updateSectorData() {
    this.logger.log('Updating sector data from OKX...');

    try {
      const instruments = await this.binanceService.getExchangeInfo();

      // OKX returns array directly, not { symbols: [...] }
      // Map to compatible format and filter USDT swaps
      const usdtSymbols = instruments
        .filter((inst: any) => inst.instId.includes('-USDT-SWAP'))
        .map((inst: any) => ({
          symbol: inst.instId.replace('-USDT-SWAP', 'USDT'),
          baseAsset: inst.instId.split('-')[0],
          status: inst.state === 'live' ? 'TRADING' : inst.state,
          contractType: 'PERPETUAL',
        }));

      const symbols: SymbolSectorData[] = [];
      const sectorCounts: Record<string, number> = {};

      for (const symbolInfo of usdtSymbols) {
        const baseAsset = symbolInfo.baseAsset;

        // 바이낸스 공식 분류 사용 (underlyingSubType)
        // 타입 정의에 없는 필드이므로 any로 접근
        const underlyingSubType = (symbolInfo as any).underlyingSubType;
        const binanceSector = underlyingSubType?.[0] || 'Unknown';
        const sector = this.normalizeSector(binanceSector);

        symbols.push({
          symbol: symbolInfo.symbol,
          sector,
          baseAsset,
          updatedAt: new Date().toISOString(),
        });

        this.sectorMap.set(symbolInfo.symbol, sector);
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      }

      // 파일 저장
      const data = {
        updatedAt: new Date().toISOString(),
        totalSymbols: symbols.length,
        sectorCounts,
        symbols,
      };

      fs.writeFileSync(this.DATA_FILE, JSON.stringify(data, null, 2));
      this.lastUpdate = new Date();

      this.logger.log(
        `\n${'═'.repeat(60)}\n` +
        `  SECTOR DATA UPDATED (Binance Official)\n` +
        `${'═'.repeat(60)}\n` +
        `  Total Symbols: ${symbols.length}\n` +
        `  Sectors:\n` +
        Object.entries(sectorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([sector, count]) => `    - ${sector}: ${count}`)
          .join('\n') +
        `\n${'═'.repeat(60)}`
      );

      return data;
    } catch (error) {
      this.logger.error('Error updating sector data:', error);
      throw error;
    }
  }

  /**
   * 바이낸스 섹터명을 우리 타입으로 정규화
   */
  private normalizeSector(binanceSector: string): Sector {
    const sectorMap: Record<string, Sector> = {
      'Layer-1': 'Layer-1',
      'Layer-2': 'Layer-2',
      'DeFi': 'DeFi',
      'AI': 'AI',
      'Meme': 'Meme',
      'Gaming': 'Gaming',
      'Metaverse': 'Metaverse',
      'Infrastructure': 'Infrastructure',
      'Storage': 'Storage',
      'NFT': 'NFT',
      'PoW': 'PoW',
      'Payment': 'Payment',
      'Alpha': 'Alpha',
      // 기타 분류들
      'Index': 'Unknown',
      'ETF': 'Unknown',
      'RWA': 'Unknown',
      'TradFi': 'Unknown',
      'Pre-Market': 'Alpha',  // 프리마켓은 Alpha로
      'Chinese': 'Unknown',
    };

    return sectorMap[binanceSector] || 'Unknown';
  }

  /**
   * 심볼의 섹터 조회
   */
  getSector(symbol: string): Sector {
    return this.sectorMap.get(symbol) || 'Unknown';
  }

  /**
   * 섹터별 최대 포지션 수
   */
  getMaxPositionsForSector(sector: Sector): number {
    return this.config.maxPositionsPerSector[sector] || 3;
  }

  /**
   * 기본 섹터 최대값 (하위 호환성)
   */
  getMaxPositionsPerSector(): number {
    return 3;
  }

  /**
   * 상관관계 높은 섹터 목록
   */
  getCorrelatedSectors(sector: Sector): Sector[] {
    return this.config.correlatedSectors[sector] || [];
  }

  /**
   * 특정 섹터의 모든 심볼 조회
   */
  getSymbolsBySector(sector: Sector): string[] {
    const symbols: string[] = [];
    for (const [symbol, s] of this.sectorMap.entries()) {
      if (s === sector) {
        symbols.push(symbol);
      }
    }
    return symbols;
  }

  /**
   * 전체 섹터 통계
   */
  getSectorStats(): Record<Sector, number> {
    const stats: Record<string, number> = {};
    for (const sector of this.sectorMap.values()) {
      stats[sector] = (stats[sector] || 0) + 1;
    }
    return stats as Record<Sector, number>;
  }

  /**
   * 마지막 업데이트 시간
   */
  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  /**
   * 전체 섹터 맵 조회 (디버깅용)
   */
  getAllSectors(): Map<string, Sector> {
    return new Map(this.sectorMap);
  }

  /**
   * 총 종목 수
   */
  getTotalSymbols(): number {
    return this.sectorMap.size;
  }
}
