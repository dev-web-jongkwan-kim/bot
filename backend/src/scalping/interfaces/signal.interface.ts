/**
 * 스캘핑 시그널 관련 인터페이스
 */

export type SignalDirection = 'LONG' | 'SHORT';

/**
 * 스캘핑 시그널
 *
 * 시그널 생성 서비스에서 생성되어 주문 서비스로 전달됨
 */
export interface ScalpingSignal {
  // ============================
  // 기본 정보
  // ============================

  /** 심볼 (예: BTCUSDT) */
  symbol: string;

  /** 포지션 방향 */
  direction: SignalDirection;

  /** 시그널 강도 (0-100) */
  strength: number;

  // ============================
  // 가격 정보
  // ============================

  /** 현재가 */
  currentPrice: number;

  /** 진입가 (Limit 주문 가격) */
  entryPrice: number;

  /** TP 가격 */
  tpPrice: number;

  /** SL 가격 */
  slPrice: number;

  // ============================
  // ATR 정보
  // ============================

  /** ATR 값 */
  atr: number;

  /** ATR 퍼센트 (ATR / 현재가) */
  atrPercent: number;

  // ============================
  // 지표 정보 (분석 결과)
  // ============================

  /** 15분봉 추세 방향 */
  trend: 'UP' | 'DOWN' | 'NEUTRAL';

  /** 추세 강도 (0-1) */
  trendStrength: number;

  /** 5분봉 모멘텀 상태 */
  momentum: 'MOMENTUM' | 'PULLBACK' | 'EXHAUSTED' | 'NEUTRAL';

  /** CVD (Cumulative Volume Delta) */
  cvd: number;

  /** Funding Rate */
  fundingRate: number;

  /** OI 변화율 */
  oiChange: number;

  /** 스프레드 (%) */
  spreadPercent: number;

  // ============================
  // 필터 통과 정보
  // ============================

  /** 1차 필터 통과 여부 */
  passedFilter1: boolean;

  /** 2차 필터 통과 여부 */
  passedFilter2: boolean;

  /** 3차 필터 통과 여부 */
  passedFilter3: boolean;

  // ============================
  // 메타 정보
  // ============================

  /** 생성 시간 (timestamp) */
  createdAt: number;

  /** 만료 시간 (timestamp) */
  expiresAt: number;

  /** 생성 이유 (로깅용) */
  reason?: string;
}

/**
 * 필터 결과 상세 정보
 *
 * 로깅 및 디버깅용
 */
export interface FilterResult {
  /** 통과 여부 */
  passed: boolean;

  /** 실패 사유 (실패 시) */
  reason?: string;

  /** 상세 정보 */
  details: {
    [key: string]: number | string | boolean;
  };
}

/**
 * 시그널 분석 결과
 *
 * analyzeSymbol 함수의 반환 타입
 */
export interface SignalAnalysisResult {
  /** 심볼 */
  symbol: string;

  /** 시그널 (필터 통과 시) */
  signal: ScalpingSignal | null;

  /** 1차 필터 결과 */
  filter1Result: FilterResult;

  /** 2차 필터 결과 */
  filter2Result: FilterResult;

  /** 3차 필터 결과 */
  filter3Result: FilterResult;

  /** 분석 소요 시간 (ms) */
  analysisTimeMs: number;
}

/**
 * 스캔 결과 요약
 */
export interface ScanSummary {
  /** 스캔 시작 시간 */
  startTime: number;

  /** 스캔 종료 시간 */
  endTime: number;

  /** 총 스캔 심볼 수 */
  totalSymbols: number;

  /** 1차 필터 통과 수 */
  passedFilter1: number;

  /** 2차 필터 통과 수 */
  passedFilter2: number;

  /** 3차 필터 통과 수 */
  passedFilter3: number;

  /** 생성된 시그널 수 */
  signalsGenerated: number;

  /** 생성된 시그널 목록 (심볼, 방향, 강도) */
  signals: Array<{
    symbol: string;
    direction: SignalDirection;
    strength: number;
  }>;
}
