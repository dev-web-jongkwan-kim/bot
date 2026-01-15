/**
 * 마켓 데이터 관련 인터페이스
 *
 * Funding Rate, Open Interest, Spread 등
 */

/**
 * Funding Rate 데이터
 */
export interface FundingData {
  /** 심볼 */
  symbol: string;

  /** 현재 Funding Rate (소수점, 예: 0.0001 = 0.01%) */
  fundingRate: number;

  /** 다음 정산 시간 (timestamp) */
  nextFundingTime: number;

  /** Mark Price */
  markPrice: number;

  /** Index Price */
  indexPrice: number;

  /** 데이터 갱신 시간 */
  updatedAt: number;
}

/**
 * Open Interest 데이터
 */
export interface OiData {
  /** 심볼 */
  symbol: string;

  /** 현재 Open Interest */
  openInterest: number;

  /** 이전 대비 변화량 */
  oiChange: number;

  /** 변화율 (소수점) */
  oiChangePercent: number;

  /** 변화 방향 */
  direction: 'UP' | 'DOWN' | 'FLAT';

  /** 데이터 갱신 시간 */
  updatedAt: number;
}

/**
 * Spread (Book Ticker) 데이터
 */
export interface SpreadData {
  /** 심볼 */
  symbol: string;

  /** Best Bid Price */
  bidPrice: number;

  /** Best Ask Price */
  askPrice: number;

  /** Mid Price */
  midPrice: number;

  /** Spread (절대값) */
  spread: number;

  /** Spread (%) */
  spreadPercent: number;

  /** 데이터 갱신 시간 */
  updatedAt: number;
}

/**
 * 캔들 데이터
 *
 * Redis에서 가져온 캔들 데이터 형식
 */
export interface CandleData {
  /** 타임스탬프 */
  timestamp: number;

  /** 시가 */
  open: number;

  /** 고가 */
  high: number;

  /** 저가 */
  low: number;

  /** 종가 */
  close: number;

  /** 거래량 (base asset) */
  volume: number;

  /** 거래량 (quote asset, USDT) */
  quoteVolume?: number;

  /** Taker Buy Volume (매수 체결량) */
  takerBuyVolume?: number;
}

/**
 * 심볼 마켓 데이터 종합
 *
 * 시그널 분석에 필요한 모든 데이터
 */
export interface SymbolMarketData {
  /** 심볼 */
  symbol: string;

  /** 5분봉 캔들 목록 (최신 순) */
  candles5m: CandleData[];

  /** 15분봉 캔들 목록 (최신 순) */
  candles15m: CandleData[];

  /** 현재가 */
  currentPrice: number;

  /** Funding Rate 데이터 */
  fundingData: FundingData | null;

  /** Open Interest 데이터 */
  oiData: OiData | null;

  /** Spread 데이터 */
  spreadData: SpreadData | null;

  /** 데이터 완전성 여부 */
  isComplete: boolean;

  /** 누락된 데이터 필드 */
  missingFields: string[];
}

/**
 * ATR 계산 결과
 */
export interface AtrResult {
  /** ATR 값 */
  atr: number;

  /** ATR 퍼센트 (%) */
  atrPercent: number;

  /** 계산에 사용된 캔들 수 */
  candleCount: number;
}

/**
 * CVD (Cumulative Volume Delta) 계산 결과
 */
export interface CvdResult {
  /** 누적 CVD 값 */
  cvd: number;

  /** CVD 방향 (양수면 매수 우세, 음수면 매도 우세) */
  direction: 'BUY' | 'SELL' | 'NEUTRAL';

  /** 계산에 사용된 캔들 수 */
  candleCount: number;
}

/**
 * 거래량 순위 데이터
 */
export interface VolumeRankData {
  /** 심볼 */
  symbol: string;

  /** 24시간 거래량 (USDT) */
  volume24h: number;

  /** 거래량 순위 (0-1, 0이 최상위) */
  rank: number;

  /** 데이터 갱신 시간 */
  updatedAt: number;
}
