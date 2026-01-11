import { CandleData } from '../websocket/candle-aggregator.service';

export interface StrategySignal {
  strategy: string;
  symbol: string;
  timeframe: string;  // '5m' or '15m'
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  tp1Percent: number;
  tp2Percent: number;
  leverage: number;
  score: number;
  timestamp: Date;
  metadata?: any;
}

export interface IStrategy {
  readonly name: string;

  // 5분 캔들 종료 시 호출
  on5minCandleClose?(symbol: string, candle: CandleData): Promise<StrategySignal | null>;

  // 15분 캔들 종료 시 호출 (시그널 생성 가능)
  on15minCandleClose?(symbol: string, candle: CandleData): Promise<StrategySignal | null | void>;

  // 1시간 캔들 종료 시 호출
  on1hCandleClose?(symbol: string, candle: CandleData): Promise<void>;

  // 백테스트용 메서드
  backtestOn5minCandle?(symbol: string, candle: any): Promise<StrategySignal | null>;
  backtestOn15minCandle?(symbol: string, candle: any): Promise<StrategySignal | null | void>;
}

export const STRATEGY_NAMES = {
  // ===== SimpleTrueOB Strategy =====
  SIMPLE_TRUE_OB: 'SimpleTrueOB',

  // ===== Legacy SMC Strategy (제거됨) =====
  // SMC_STRATEGY: 'Smart Money Concepts',

  // ===== MANUAL =====
  MANUAL: 'MANUAL',
} as const;

export type StrategyName = typeof STRATEGY_NAMES[keyof typeof STRATEGY_NAMES];
