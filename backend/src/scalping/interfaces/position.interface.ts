import { ScalpingSignal, SignalDirection } from './signal.interface';

/**
 * 스캘핑 포지션 관련 인터페이스
 */

/**
 * 스캘핑 포지션
 *
 * 체결 후 포지션 관리를 위한 정보
 */
export interface ScalpingPosition {
  // ============================
  // 기본 정보
  // ============================

  /** 심볼 (예: BTCUSDT) */
  symbol: string;

  /** 포지션 방향 */
  direction: SignalDirection;

  // ============================
  // 가격/수량
  // ============================

  /** 실제 진입가 (체결가) */
  entryPrice: number;

  /** 포지션 수량 */
  quantity: number;

  /** 레버리지 */
  leverage?: number;

  /** 현재 TP 가격 (단일 TP 사용 시) */
  tpPrice: number;

  /** TP1 가격 (부분 청산 50%) */
  tp1Price?: number;

  /** TP2 가격 (나머지 50% 청산) */
  tp2Price?: number;

  /** 현재 SL 가격 */
  slPrice: number;

  /** 원래 TP 가격 (축소 전) */
  originalTpPrice: number;

  /** TP1 청산 완료 여부 */
  tp1Filled?: boolean;

  // ============================
  // 상태
  // ============================

  /** TP 축소 여부 */
  tpReduced: boolean;

  /** 포지션 상태 */
  status: 'OPEN' | 'CLOSING' | 'CLOSED';

  // ============================
  // 주문 정보
  // ============================

  /** 메인 주문 ID */
  mainOrderId?: string;

  /** TP 주문 ID */
  tpOrderId?: string;

  /** SL 주문 ID */
  slOrderId?: string;

  // ============================
  // 시간 정보
  // ============================

  /** 진입 시간 (timestamp) */
  enteredAt: number;

  /** 청산 시간 (timestamp, 청산 후) */
  closedAt?: number;

  // ============================
  // 손익 정보
  // ============================

  /** 실현 손익 (USDT) */
  realizedPnl?: number;

  /** 실현 손익 (%) */
  realizedPnlPercent?: number;

  /** 청산 사유 */
  closeReason?: CloseReason;

  // ============================
  // 원본 시그널 (디버깅용)
  // ============================

  /** 원본 시그널 정보 */
  signal: ScalpingSignal;
}

/**
 * 청산 사유
 */
export type CloseReason =
  | 'TP_HIT' // TP 도달
  | 'TP1_HIT' // TP1 도달 (50% 청산)
  | 'TP2_HIT' // TP2 도달 (나머지 50% 청산)
  | 'SL_HIT' // SL 도달
  | 'TP_REDUCED_HIT' // 축소된 TP 도달
  | 'BREAKEVEN_TIMEOUT' // 본전 청산 (시간 초과)
  | 'MAX_TIME_TIMEOUT' // 최대 보유 시간 초과
  | 'MANUAL' // 수동 청산
  | 'RISK_LIMIT' // 리스크 한도 도달
  | 'ERROR'; // 에러로 인한 청산

/**
 * 대기 중인 주문
 *
 * Limit 주문 체결 대기 상태
 */
export interface PendingOrder {
  /** 심볼 */
  symbol: string;

  /** 주문 ID */
  orderId: string;

  /** 포지션 방향 */
  direction: SignalDirection;

  /** Limit 주문 가격 */
  entryPrice: number;

  /** 예정 TP 가격 */
  tpPrice: number;

  /** 예정 SL 가격 */
  slPrice: number;

  /** 주문 수량 */
  quantity: number;

  /** 레버리지 */
  leverage?: number;

  /** 주문 생성 시간 */
  createdAt: number;

  /** 원본 시그널 */
  signal: ScalpingSignal;
}

/**
 * 포지션 관리 상태
 *
 * 전체 포지션 현황
 */
export interface PositionManagerState {
  /** 활성 포지션 목록 */
  activePositions: ScalpingPosition[];

  /** 대기 중인 주문 목록 */
  pendingOrders: PendingOrder[];

  /** 오늘 총 손실 (%) */
  dailyLoss: number;

  /** 연속 손실 횟수 */
  consecutiveLosses: number;

  /** 쿨다운 종료 시간 (timestamp) */
  cooldownUntil: number;

  /** 오늘 거래 횟수 */
  todayTradeCount: number;

  /** 오늘 승리 횟수 */
  todayWinCount: number;

  /** 오늘 패배 횟수 */
  todayLossCount: number;
}

/**
 * 포지션 요약 정보 (로깅용)
 */
export interface PositionSummary {
  symbol: string;
  direction: SignalDirection;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  elapsedSeconds: number;
  tpReduced: boolean;
}
