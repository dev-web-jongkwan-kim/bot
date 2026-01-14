/**
 * 스캘핑 시그널 인터페이스
 */

export type SignalDirection = 'LONG' | 'SHORT';
export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type MomentumState = 'MOMENTUM' | 'PULLBACK' | 'EXHAUSTED' | 'NEUTRAL';

export interface ScalpingSignal {
  // 기본 정보
  symbol: string;
  direction: SignalDirection;
  strength: number; // 0-100

  // 가격 정보
  currentPrice: number;
  entryPrice: number;
  tpPrice: number;
  slPrice: number;

  // ATR 정보
  atr: number;
  atrPercent: number;

  // 지표 정보
  trend: TrendDirection;
  momentum: MomentumState;
  cvd: number;
  fundingRate: number;
  oiChange: number;

  // 메타 정보
  createdAt: number;
  expiresAt: number;

  // 필터 통과 정보 (디버깅용)
  filtersPassed?: {
    spread: boolean;
    funding: boolean;
    trend: boolean;
    momentum: boolean;
    cvd: boolean;
  };
}

/**
 * 시그널 생성 결과
 */
export interface SignalGenerationResult {
  symbol: string;
  passed: boolean;
  signal?: ScalpingSignal;
  rejectReason?: string;
  step?: number; // 어느 필터에서 거부됐는지
}
