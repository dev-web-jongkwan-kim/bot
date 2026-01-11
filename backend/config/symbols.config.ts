/**
 * 거래 종목 설정
 *
 * 80개 종목을 Tier별로 분류
 * - Tier 1: 초대형 (가장 안정적)
 * - Tier 2: 대형 (높은 유동성)
 * - Tier 3: 중형 (적당한 유동성)
 * - Tier 4: 중소형 (높은 변동성)
 */

export interface SymbolConfig {
  symbol: string;
  tier: 1 | 2 | 3 | 4;
  minVolume24h?: number;  // 최소 24시간 거래량 (USDT)
  maxLeverage?: number;   // 최대 레버리지
  enabled: boolean;
}

// Tier 1: 초대형 (10개) - 가장 안정적
const TIER1_SYMBOLS: SymbolConfig[] = [
  { symbol: 'BTCUSDT', tier: 1, minVolume24h: 1000000000, maxLeverage: 5, enabled: true },
  { symbol: 'ETHUSDT', tier: 1, minVolume24h: 500000000, maxLeverage: 5, enabled: true },
  { symbol: 'BNBUSDT', tier: 1, minVolume24h: 100000000, maxLeverage: 5, enabled: true },
  { symbol: 'SOLUSDT', tier: 1, minVolume24h: 100000000, maxLeverage: 5, enabled: true },
  { symbol: 'XRPUSDT', tier: 1, minVolume24h: 100000000, maxLeverage: 5, enabled: true },
  { symbol: 'ADAUSDT', tier: 1, minVolume24h: 50000000, maxLeverage: 5, enabled: true },
  { symbol: 'DOGEUSDT', tier: 1, minVolume24h: 50000000, maxLeverage: 5, enabled: true },
  { symbol: 'DOTUSDT', tier: 1, minVolume24h: 50000000, maxLeverage: 5, enabled: true },
  { symbol: 'MATICUSDT', tier: 1, minVolume24h: 50000000, maxLeverage: 5, enabled: true },
  { symbol: 'AVAXUSDT', tier: 1, minVolume24h: 50000000, maxLeverage: 5, enabled: true },
];

// Tier 2: 대형 (20개) - 높은 유동성
const TIER2_SYMBOLS: SymbolConfig[] = [
  { symbol: 'LINKUSDT', tier: 2, minVolume24h: 30000000, maxLeverage: 5, enabled: true },
  { symbol: 'LTCUSDT', tier: 2, minVolume24h: 30000000, maxLeverage: 5, enabled: true },
  { symbol: 'ATOMUSDT', tier: 2, minVolume24h: 30000000, maxLeverage: 5, enabled: true },
  { symbol: 'UNIUSDT', tier: 2, minVolume24h: 30000000, maxLeverage: 5, enabled: true },
  { symbol: 'ETCUSDT', tier: 2, minVolume24h: 30000000, maxLeverage: 5, enabled: true },
  { symbol: 'FILUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'APTUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'ARBUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'OPUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'NEARUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'SUIUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'ICPUSDT', tier: 2, minVolume24h: 20000000, maxLeverage: 5, enabled: true },
  { symbol: 'RENDERUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'INJUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'STXUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'SEIUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'TIAUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'LDOUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'WLDUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
  { symbol: 'JUPUSDT', tier: 2, minVolume24h: 15000000, maxLeverage: 5, enabled: true },
];

// Tier 3: 중형 (30개) - 적당한 유동성
const TIER3_SYMBOLS: SymbolConfig[] = [
  { symbol: 'AAVEUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'ALGOUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'AXSUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'SANDUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'MANAUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'GALAUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'APEUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'GMXUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'ROSEUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'CHZUSDT', tier: 3, minVolume24h: 10000000, maxLeverage: 3, enabled: true },
  { symbol: 'ENJUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'FTMUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'ZILUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'ONEUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'RUNEUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'OCEANUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'CRVUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'SNXUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'COMPUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'MKRUSDT', tier: 3, minVolume24h: 8000000, maxLeverage: 3, enabled: true },
  { symbol: 'SUSHIUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'YFIUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: '1INCHUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'LRCUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'KSMUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'CELOUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'QNTUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'FLOWUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'IMXUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
  { symbol: 'BLURUSDT', tier: 3, minVolume24h: 5000000, maxLeverage: 3, enabled: true },
];

// Tier 4: 중소형 (20개) - 높은 변동성
const TIER4_SYMBOLS: SymbolConfig[] = [
  { symbol: 'ORDIUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'PYTHUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'ACEUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'NFPUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'AIUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'XAIUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'MANTAUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'ALTUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'DYMUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'PIXELUSDT', tier: 4, minVolume24h: 3000000, maxLeverage: 3, enabled: true },
  { symbol: 'PORTALUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'RONINUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'PDAUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'WUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'METISUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'AEVOUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'VANRYUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'BOMEUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'WIFUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
  { symbol: 'ENAUSDT', tier: 4, minVolume24h: 2000000, maxLeverage: 3, enabled: true },
];

// 전체 종목 리스트
export const ALL_SYMBOLS: SymbolConfig[] = [
  ...TIER1_SYMBOLS,
  ...TIER2_SYMBOLS,
  ...TIER3_SYMBOLS,
  ...TIER4_SYMBOLS,
];

// 활성화된 종목만 필터링
export function getActiveSymbols(): string[] {
  return ALL_SYMBOLS
    .filter(config => config.enabled)
    .map(config => config.symbol);
}

// Tier별 종목 가져오기
export function getSymbolsByTier(tier: 1 | 2 | 3 | 4): string[] {
  return ALL_SYMBOLS
    .filter(config => config.tier === tier && config.enabled)
    .map(config => config.symbol);
}

// 특정 종목 설정 가져오기
export function getSymbolConfig(symbol: string): SymbolConfig | undefined {
  return ALL_SYMBOLS.find(config => config.symbol === symbol);
}

// 통계
export function getSymbolStats() {
  const total = ALL_SYMBOLS.length;
  const active = ALL_SYMBOLS.filter(s => s.enabled).length;
  const byTier = {
    tier1: TIER1_SYMBOLS.filter(s => s.enabled).length,
    tier2: TIER2_SYMBOLS.filter(s => s.enabled).length,
    tier3: TIER3_SYMBOLS.filter(s => s.enabled).length,
    tier4: TIER4_SYMBOLS.filter(s => s.enabled).length,
  };

  return {
    total,
    active,
    byTier,
    coverage: `${((active / total) * 100).toFixed(1)}%`,
  };
}

// 기본 export
export default {
  ALL_SYMBOLS,
  getActiveSymbols,
  getSymbolsByTier,
  getSymbolConfig,
  getSymbolStats,
};
