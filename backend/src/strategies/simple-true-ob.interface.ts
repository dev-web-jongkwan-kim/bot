/**
 * SimpleTrueOB 전략 인터페이스 정의
 * tb1 프로젝트에서 가져옴
 */

// OHLCV 캔들 데이터 인터페이스
export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
}

// Pine Script 설정값 (백테스트용)
export interface PineConfig {
  lookback: number;           // 5
  minBodyRatio: number;       // 0.5
  minVolume: number;          // 1.3
  maxAtrMult: number;         // 2.5
  useBodyOnly: boolean;       // true
  minAwayMult: number;        // 1.5 (기본값, 동적 조정으로 대체됨)
  requireReversal: boolean;   // true
  sweepWickMin: number;       // 0.6
  sweepPenMin: number;        // 0.1
  sweepPenMax: number;        // 1.0
  orbAtr: number;             // 1.8
  orbVol: number;             // 2.5
  londonHour: number;         // 7
  nyHour: number;             // 14
  rrRatio: number;            // 2.5 (실시간과 동일)
  obMaxBars: number;          // 50
  makerFee: number;           // 0.0004 (0.04% - 진입 수수료)
  takerFee: number;           // 0.00075 (0.075% - 청산 수수료)
  leverage: number;           // 10 (레버리지)
  capitalUsage: number;       // 0.1 (거래당 자본 사용 비율 - 10%)
  slippage: number;           // 0.0002 (0.02% - 리밋 오더 슬리피지)
  maxHoldingBars: number;     // 최대 포지션 유지 캔들 수
  preventSameCandleExit: boolean; // 진입 캔들에서 즉시 청산 방지
  // 동적 minAwayMult 설정 (변동성 기반)
  minAwayMultRangebound: number; // 0.5 (횡보장)
  minAwayMultNormal: number;     // 1.0 (보통)
  minAwayMultTrending: number;   // 1.5 (트렌딩)
  // TP 설정 (Phase 2 최적화)
  tp1Ratio: number;              // 1.0 (TP1 = 1R)
  tp1Percent: number;            // 0.9 (90% 청산)
  // OB 교체 설정 (비교 테스트용)
  enableOBReplacement?: boolean; // true: 강한 OB 교체, false: 기존 OB 유지
  // 리스크 캡 설정 (v16 테스트)
  enableRiskCap?: boolean;       // true: 리스크 캡 적용, false: 기존 OB 기반
  maxRiskAtr?: number;           // 최대 리스크 ATR 배수 (기본 2.0)
  // v10: ATR + CVD 방향 필터
  useATRCVDFilter?: boolean;     // ATR + CVD 필터 사용 여부
  atrFilterMin?: number;         // ATR% 최소값 (0.5%)
  atrFilterMax?: number;         // ATR% 최대값 (3.0%)
  cvdLookback?: number;          // CVD 계산 기간 (20캔들)
}

// Order Block 인터페이스
export interface OrderBlock {
  top: number;
  bottom: number;
  type: 'LONG' | 'SHORT';
  method: 'MSB' | 'SWEEP' | 'ORB';
  barIndex: number;
  age: number;
  pricedMovedAway: boolean;
}

// 리밋 오더 인터페이스 (OB 중간가 진입용)
export interface LimitOrder {
  type: 'LONG' | 'SHORT';
  limitPrice: number;  // OB 중간가
  ob: OrderBlock;      // 연결된 OB
  createdBarIndex: number;
}

// 거래 기록 인터페이스
export interface Trade {
  entryTime: Date;
  exitTime: Date;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;   // 포지션 크기 (코인 개수)
  positionValue: number;  // 포지션 총 크기 (USDT) - 레버리지 포함
  margin: number;         // 실제 증거금 (USDT) - 레버리지 제외
  capital: number;        // 진입 시점 자본
  entryFee: number;       // 진입 수수료 (USDT)
  exitFee: number;        // 청산 수수료 (USDT)
  pnl: number;            // 수수료 포함 실제 손익
  pnlPercent: number;
  isWin: boolean;
  method: string;
}

// 리스크 관리 상태
export interface RiskManagementState {
  consecutiveLosses: number;
  consecutiveWins: number;
  positionSizeMultiplier: number;
}

// 백테스트 결과 인터페이스
export interface SimpleTrueOBBacktestResult {
  trades: Trade[];
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  riskManagementState: RiskManagementState;
}

// 실시간 전략 설정값
export interface RealtimeConfig {
  lookback: number;
  minBodyRatio: number;
  minVolume: number;
  maxAtrMult: number;
  useBodyOnly: boolean;
  minAwayMult: number;
  requireReversal: boolean;
  sweepWickMin: number;
  sweepPenMin: number;
  sweepPenMax: number;
  orbAtr: number;
  orbVol: number;
  londonHour: number;
  nyHour: number;
  rrRatio: number;
  obMaxBars: number;
  makerFee: number;
  takerFee: number;
  leverage: number;
  capitalUsage: number;
  maxHoldingBars: number;
  preventSameCandleExit: boolean;
}

// 진입 시그널 인터페이스
export interface EntrySignal {
  symbol?: string;
  timeframe?: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfits?: Array<{ price: number; percentage: number; label: string }>;
  method: string;
  obBottom: number;
  obTop: number;
  positionSize: number;
  margin: number;
  positionValue: number;
  leverage?: number;
  tier?: string;
  score?: number;
  metadata?: {
    orderBlock?: {
      top: number;
      bottom: number;
      midpoint: number;
      method: string;
    };
    atrPercent?: number;  // v7: ATR% 기반 동적 레버리지용
  };
}

// Pending Limit Order 인터페이스
export interface PendingLimitOrder {
  direction: 'LONG' | 'SHORT';
  limitPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  method: string;
  obBottom: number;
  obTop: number;
  positionSize: number;
  margin: number;
  positionValue: number;
  createdAt: Date;
  expiresAt: Date;
  createdBarIndex: number;
  waitBars: number;
}

// 실시간 포지션 인터페이스
export interface Position {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  direction: 'LONG' | 'SHORT';
  entryTime: Date;
  entryBarIndex: number;
  method: string;
  margin: number;
  positionSize: number;
  positionValue: number;
  remainingSize: number;
  partialExitDone: boolean;
}
