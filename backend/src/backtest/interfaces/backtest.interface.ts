export interface BacktestCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestPosition {
  id: number;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTime: Date;
  quantity: number;
  leverage: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  tp1Percent: number;
  tp2Percent: number;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: 'TP1' | 'TP2' | 'SL' | 'LIQUIDATION';
  realizedPnl?: number;
}

export interface BacktestSignal {
  strategy: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  tp1Percent: number;
  tp2Percent: number;
  leverage: number;
  riskReward1?: number;
  riskReward2?: number;
  score: number;
  timestamp: Date;
  metadata?: any;
}

export interface BacktestConfig {
  symbols: string[];
  startDate: string;
  endDate: string;
  initialBalance: number;
  strategies: string[];
  riskPerTrade?: number;
  dailyLossLimit?: number;
  maxPositions?: number;
  takerFee?: number;
  slippage?: number;
  riskParams?: RiskManagementParams;
}

export interface RiskManagementParams {
  strategy: string;
  stopLossMethod?: 'FIXED_PCT' | 'ATR_BASED';
  stopLossPct?: number;
  stopLossATRMultiplier?: number;
  minStopLossPct?: number;
  maxStopLossPct?: number;
  takeProfitMethod?: 'RR_RATIO' | 'ATR_BASED' | 'FIXED_PCT';
  rrRatio1?: number;
  rrRatio2?: number;
  atrMultiplier1?: number;
  atrMultiplier2?: number;
  tp1Percent?: number;
  leverageOverride?: number;
}

export interface BacktestTrade {
  positionId: number;
  symbol: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTime: Date;
  exitPrice: number;
  exitTime: Date;
  exitReason: string;
  quantity: number;
  leverage: number;
  pnl: number;
  fee: number;
  partial: boolean;
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
  maxDrawdown?: number;
  sharpeRatio?: number;
  tradesLog: BacktestTrade[];
  equityCurve: Array<{ timestamp: Date; balance: number; equity: number }>;
  dailyPnl?: Record<string, number>;
}
