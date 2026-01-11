export interface Position {
  id: number;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  openedAt: string;
}

export interface Trade {
  id: number;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  realizedPnl: number;
  exitReason: string;
  openedAt: string;
  closedAt: string;
}

export interface DashboardMetrics {
  accountBalance: number;
  equity: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;
  openPositions: number;
  todayTrades: number;
  winRateToday: number;
}

export interface BacktestConfig {
  symbols: string[];
  startDate: string;
  endDate: string;
  initialBalance: number;
  strategies: string[];
}

export interface BacktestTrade {
  entryTime: string;
  exitTime: string;
  holdingTime: string;
  holdingMinutes: number;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  exitReason: string;
  partial: boolean;
  leverage: number;
  quantity: number;
  positionSizeUSDT: number;
  entryPrice: number;
  exitPrice: number;
  priceChange: number;
  priceChangePercent: number;
  pnl: number;
  pnlPercent: number;
  fee: number;
  netPnl: number;
  riskReward: number | null;
}

export interface BacktestResults {
  initialBalance: number;
  finalBalance: number;
  totalPnl: number;
  roi: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  equityCurve: Array<{ timestamp: string; balance: number; equity: number }>;
  detailedTrades?: BacktestTrade[];
  metrics?: any;
}

export interface ClosedTrade {
  id: number;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  realizedPnl: number;   // 순수익 (수수료 차감 후)
  grossPnl?: number;     // 총 손익 (수수료 미포함)
  fee?: number;          // 총 수수료
  pnlPercent: number;
  closeType?: 'SL' | 'TP1' | 'TP2' | 'MANUAL' | 'LIQUIDATION' | 'UNKNOWN';
  openedAt: string;
  closedAt: string;
}

export interface TradesSummary {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  roi: number;
  todayTrades: number;
  todayWins: number;
  todayLosses: number;
  todayWinRate: number;
  todayPnl: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
  maxWin: number;
  maxLoss: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 Position Metadata Structure (v11)
// 모든 매매의 계획값과 실제값을 저장하여 전략 분석에 활용
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 계획값 (신호 생성 시점에 결정된 값)
 */
export interface PlannedValues {
  entry: number;           // 계획된 진입가 (OB midpoint)
  stopLoss: number;        // 계획된 손절가
  takeProfit1: number;     // 계획된 TP1
  takeProfit2: number;     // 계획된 TP2
  tp1Percent: number;      // TP1 청산 비율 (%)
  tp2Percent: number;      // TP2 청산 비율 (%)
  riskRewardRatio: number; // 계획된 R:R 비율
}

/**
 * 실제값 (주문 체결 시점의 실제 데이터)
 */
export interface ActualValues {
  // 진입 시점
  entry: number;           // 실제 체결 진입가
  entryOrderId: number;    // Binance 주문 ID
  entryTime: string;       // 진입 시간
  slAlgoId: number;        // SL Algo 주문 ID
  tpAlgoIds: number[];     // TP Algo 주문 ID들

  // 청산 시점 (position-sync에서 업데이트)
  exit?: number;           // 실제 청산가
  exitTime?: string;       // 청산 시간
  closeType?: 'SL' | 'TP1' | 'TP2' | 'MANUAL' | 'LIQUIDATION';
  closeTriggerPrice?: number; // 트리거된 목표가
}

/**
 * 슬리피지 분석 데이터
 */
export interface SlippageAnalysis {
  // 진입 슬리피지
  entry: number;           // 진입 슬리피지 (USDT) = 실제진입가 - 계획진입가
  entryPercent: number;    // 진입 슬리피지 (%)

  // 청산 슬리피지 (position-sync에서 업데이트)
  exit?: number;           // 청산 슬리피지 (USDT)
  exitPercent?: number;    // 청산 슬리피지 (%)
  totalSlippage?: number;  // 총 슬리피지 (진입 + 청산)
  totalSlippagePercent?: number;
}

/**
 * 신호 정보 (전략 분석용)
 */
export interface SignalInfo {
  score: number;           // 신호 점수 (0-100)
  tier: 'TIER1' | 'TIER2'; // 신호 등급
  timeframe: '5m' | '15m'; // 타임프레임
  obTop: number;           // Order Block 상단
  obBottom: number;        // Order Block 하단
  obMidpoint: number;      // Order Block 중간점
  atr: number;             // ATR 값
  atrPercent: number;      // ATR (%)
}

/**
 * 거래 결과 분석 (position-sync에서 업데이트)
 */
export interface TradeResult {
  win: boolean;            // 승리 여부
  grossPnl: number;        // 총 손익 (수수료 미포함)
  fee: number;             // 총 수수료
  entryFee: number;        // 진입 수수료
  exitFee: number;         // 청산 수수료
  pnl: number;             // 순수익 (수수료 차감 후)
  pnlPercent: number;      // 실현 손익 (%)
  holdingTime: number;     // 보유 시간 (ms)
  expectedPnl: number;     // 예상 손익 (계획된 SL/TP 기준)
}

/**
 * Position Metadata 전체 구조
 * positions 테이블의 metadata JSONB 컬럼에 저장됨
 */
export interface PositionMetadata {
  // 기존 필드 (하위 호환)
  tier?: string;
  timeframe?: string;
  obTop?: number;
  obBottom?: number;
  obMidpoint?: number;
  tp1Triggered?: boolean;
  slMovedToBreakeven?: boolean;
  closePrice?: number;
  closeTradeIds?: number[];
  closeTradeCount?: number;
  closeTime?: string;

  // 📊 구조화된 분석 데이터 (v11+)
  planned?: PlannedValues;
  actual?: ActualValues;
  slippage?: SlippageAnalysis;
  signal?: SignalInfo;
  result?: TradeResult;
}

/**
 * 확장된 ClosedTrade (분석용)
 */
export interface ClosedTradeDetailed extends ClosedTrade {
  metadata?: PositionMetadata;

  // 계산된 필드
  entrySlippage?: number;
  exitSlippage?: number;
  totalSlippage?: number;
  holdingMinutes?: number;
  closeType?: 'SL' | 'TP1' | 'TP2' | 'MANUAL' | 'LIQUIDATION';
  expectedPnl?: number;
  pnlDifference?: number;  // 실제PnL - 예상PnL
}
