/**
 * 스캘핑 포지션 인터페이스
 */

import { ScalpingSignal, SignalDirection } from './signal.interface';

export interface ScalpingPosition {
  // 기본 정보
  symbol: string;
  direction: SignalDirection;

  // 가격/수량
  entryPrice: number;
  quantity: number;
  tpPrice: number;
  slPrice: number;
  originalTpPrice: number; // TP 축소 전 원본

  // 상태
  tpReduced?: boolean; // TP 축소 여부

  // 시간
  enteredAt: number;

  // 바이낸스 주문 ID
  mainOrderId?: number;
  tpOrderId?: string;
  slOrderId?: string;

  // 원본 시그널 (디버깅용)
  signal: ScalpingSignal;
}

/**
 * 대기 중인 주문
 */
export interface PendingOrder {
  symbol: string;
  orderId: number;
  direction: SignalDirection;
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  quantity: number;
  createdAt: number;
  signal: ScalpingSignal;
}
