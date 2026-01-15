import { Injectable, Logger } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import {
  ScalpingPosition,
  PendingOrder,
  PositionManagerState,
  PositionSummary,
  CloseReason,
} from '../interfaces';
import { ScalpingSignal } from '../interfaces';

/**
 * 스캘핑 포지션 관리 서비스
 *
 * - 활성 포지션 추적
 * - 대기 주문 관리
 * - 일일 손익 추적
 * - 연속 손실 관리
 */
@Injectable()
export class ScalpingPositionService {
  private readonly logger = new Logger(ScalpingPositionService.name);

  // 활성 포지션 맵 (symbol -> position)
  private positions: Map<string, ScalpingPosition> = new Map();

  // 대기 중인 주문 맵 (symbol -> pending order)
  private pendingOrders: Map<string, PendingOrder> = new Map();

  // 일일 통계
  private dailyLoss: number = 0;
  private consecutiveLosses: number = 0;
  private cooldownUntil: number = 0;
  private lastResetDate: string = '';

  // 오늘 거래 통계
  private todayTradeCount: number = 0;
  private todayWinCount: number = 0;
  private todayLossCount: number = 0;

  constructor() {
    this.logger.log('[ScalpingPosition] Position service initialized');
  }

  // ============================================
  // 포지션 관리
  // ============================================

  /**
   * 포지션 추가
   */
  addPosition(position: ScalpingPosition): void {
    this.positions.set(position.symbol, position);

    this.logger.log(
      `[ScalpingPosition] ➕ Position added: ${position.symbol} ${position.direction}`,
    );
    this.logger.log(
      `[ScalpingPosition]   Entry: ${position.entryPrice.toFixed(4)}, Qty: ${position.quantity}`,
    );
    this.logger.log(
      `[ScalpingPosition]   TP: ${position.tpPrice.toFixed(4)}, SL: ${position.slPrice.toFixed(4)}`,
    );
    this.logger.log(
      `[ScalpingPosition]   Active positions: ${this.positions.size}/${SCALPING_CONFIG.risk.maxPositions}`,
    );
  }

  /**
   * 포지션 제거
   */
  removePosition(symbol: string): ScalpingPosition | undefined {
    const position = this.positions.get(symbol);
    if (position) {
      this.positions.delete(symbol);
      this.logger.log(
        `[ScalpingPosition] ➖ Position removed: ${symbol}`,
      );
      this.logger.log(
        `[ScalpingPosition]   Active positions: ${this.positions.size}/${SCALPING_CONFIG.risk.maxPositions}`,
      );
    }
    return position;
  }

  /**
   * 포지션 조회
   */
  getPosition(symbol: string): ScalpingPosition | undefined {
    return this.positions.get(symbol);
  }

  /**
   * 모든 활성 포지션 조회
   */
  getActivePositions(): ScalpingPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * 포지션 업데이트
   */
  updatePosition(symbol: string, updates: Partial<ScalpingPosition>): void {
    const position = this.positions.get(symbol);
    if (position) {
      Object.assign(position, updates);
      this.logger.debug(
        `[ScalpingPosition] Position updated: ${symbol}`,
      );
    }
  }

  // ============================================
  // 대기 주문 관리
  // ============================================

  /**
   * 대기 주문 추가
   */
  addPendingOrder(order: PendingOrder): void {
    this.pendingOrders.set(order.symbol, order);

    this.logger.log(
      `[ScalpingPosition] ⏳ Pending order added: ${order.symbol} ${order.direction}`,
    );
    this.logger.log(
      `[ScalpingPosition]   Limit price: ${order.entryPrice.toFixed(4)}, Qty: ${order.quantity}`,
    );
    this.logger.log(
      `[ScalpingPosition]   Pending orders: ${this.pendingOrders.size}`,
    );
  }

  /**
   * 대기 주문 제거
   */
  removePendingOrder(symbol: string): PendingOrder | undefined {
    const order = this.pendingOrders.get(symbol);
    if (order) {
      this.pendingOrders.delete(symbol);
      this.logger.debug(
        `[ScalpingPosition] Pending order removed: ${symbol}`,
      );
    }
    return order;
  }

  /**
   * 대기 주문 조회
   */
  getPendingOrder(symbol: string): PendingOrder | undefined {
    return this.pendingOrders.get(symbol);
  }

  /**
   * 모든 대기 주문 조회
   */
  getAllPendingOrders(): PendingOrder[] {
    return Array.from(this.pendingOrders.values());
  }

  // ============================================
  // 리스크 관리
  // ============================================

  /**
   * 일일 리셋 체크
   */
  checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.logger.log(
        `[ScalpingPosition] 📅 Daily reset: ${this.lastResetDate} → ${today}`,
      );
      this.logger.log(
        `[ScalpingPosition]   Yesterday stats: Trades=${this.todayTradeCount}, Wins=${this.todayWinCount}, Losses=${this.todayLossCount}`,
      );

      this.dailyLoss = 0;
      this.todayTradeCount = 0;
      this.todayWinCount = 0;
      this.todayLossCount = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * 새 포지션 진입 가능 여부 체크
   */
  canEnterNewPosition(direction: 'LONG' | 'SHORT'): {
    allowed: boolean;
    reason?: string;
  } {
    this.checkDailyReset();

    // 쿨다운 체크
    if (Date.now() < this.cooldownUntil) {
      const remainingMinutes = Math.ceil(
        (this.cooldownUntil - Date.now()) / 60000,
      );
      return {
        allowed: false,
        reason: `Cooldown active (${remainingMinutes}min remaining)`,
      };
    }

    // 일일 손실 한도 체크
    if (this.dailyLoss >= SCALPING_CONFIG.risk.maxDailyLoss) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: ${(this.dailyLoss * 100).toFixed(2)}%`,
      };
    }

    // 최대 포지션 수 체크
    const totalPositions = this.positions.size + this.pendingOrders.size;
    if (totalPositions >= SCALPING_CONFIG.risk.maxPositions) {
      return {
        allowed: false,
        reason: `Max positions reached: ${totalPositions}/${SCALPING_CONFIG.risk.maxPositions}`,
      };
    }

    // 방향별 포지션 수 체크
    const longCount = this.getDirectionCount('LONG');
    const shortCount = this.getDirectionCount('SHORT');

    if (
      direction === 'LONG' &&
      longCount >= SCALPING_CONFIG.risk.maxSameDirection
    ) {
      return {
        allowed: false,
        reason: `Max LONG positions reached: ${longCount}/${SCALPING_CONFIG.risk.maxSameDirection}`,
      };
    }

    if (
      direction === 'SHORT' &&
      shortCount >= SCALPING_CONFIG.risk.maxSameDirection
    ) {
      return {
        allowed: false,
        reason: `Max SHORT positions reached: ${shortCount}/${SCALPING_CONFIG.risk.maxSameDirection}`,
      };
    }

    return { allowed: true };
  }

  /**
   * 특정 방향 포지션 수 카운트
   */
  private getDirectionCount(direction: 'LONG' | 'SHORT'): number {
    let count = 0;

    for (const position of this.positions.values()) {
      if (position.direction === direction) count++;
    }

    for (const order of this.pendingOrders.values()) {
      if (order.direction === direction) count++;
    }

    return count;
  }

  /**
   * 심볼에 이미 포지션/주문이 있는지 체크
   */
  hasPositionOrOrder(symbol: string): boolean {
    return this.positions.has(symbol) || this.pendingOrders.has(symbol);
  }

  /**
   * PnL 기록
   */
  recordPnl(pnlPercent: number, closeReason: CloseReason): void {
    this.todayTradeCount++;

    if (pnlPercent < 0) {
      this.dailyLoss += Math.abs(pnlPercent);
      this.consecutiveLosses++;
      this.todayLossCount++;

      this.logger.log(
        `[ScalpingPosition] 📉 Loss recorded: ${(pnlPercent * 100).toFixed(2)}% (${closeReason})`,
      );
      this.logger.log(
        `[ScalpingPosition]   Consecutive losses: ${this.consecutiveLosses}/${SCALPING_CONFIG.risk.consecutiveLossLimit}`,
      );
      this.logger.log(
        `[ScalpingPosition]   Daily loss: ${(this.dailyLoss * 100).toFixed(2)}%/${(SCALPING_CONFIG.risk.maxDailyLoss * 100).toFixed(2)}%`,
      );

      // 연속 손실 체크 → 쿨다운
      if (
        this.consecutiveLosses >= SCALPING_CONFIG.risk.consecutiveLossLimit
      ) {
        this.cooldownUntil =
          Date.now() + SCALPING_CONFIG.risk.cooldownMinutes * 60 * 1000;
        this.consecutiveLosses = 0;
        this.logger.warn(
          `[ScalpingPosition] ⚠️ Consecutive loss limit reached - Cooldown for ${SCALPING_CONFIG.risk.cooldownMinutes} minutes`,
        );
      }
    } else {
      this.consecutiveLosses = 0; // 리셋
      this.todayWinCount++;

      this.logger.log(
        `[ScalpingPosition] 📈 Profit recorded: +${(pnlPercent * 100).toFixed(2)}% (${closeReason})`,
      );
    }

    // 일일 통계 로깅
    const winRate =
      this.todayTradeCount > 0
        ? (this.todayWinCount / this.todayTradeCount) * 100
        : 0;

    this.logger.log(
      `[ScalpingPosition]   Today: ${this.todayTradeCount} trades, ${this.todayWinCount}W/${this.todayLossCount}L (${winRate.toFixed(1)}%)`,
    );
  }

  // ============================================
  // 상태 조회
  // ============================================

  /**
   * 전체 상태 반환
   */
  getState(): PositionManagerState {
    return {
      activePositions: this.getActivePositions(),
      pendingOrders: this.getAllPendingOrders(),
      dailyLoss: this.dailyLoss,
      consecutiveLosses: this.consecutiveLosses,
      cooldownUntil: this.cooldownUntil,
      todayTradeCount: this.todayTradeCount,
      todayWinCount: this.todayWinCount,
      todayLossCount: this.todayLossCount,
    };
  }

  /**
   * 포지션 요약 정보 반환 (로깅용)
   */
  getPositionSummaries(currentPrices: Map<string, number>): PositionSummary[] {
    const summaries: PositionSummary[] = [];

    for (const position of this.positions.values()) {
      const currentPrice = currentPrices.get(position.symbol) || position.entryPrice;
      const unrealizedPnl =
        position.direction === 'LONG'
          ? (currentPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - currentPrice) * position.quantity;
      const unrealizedPnlPercent =
        position.direction === 'LONG'
          ? (currentPrice - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentPrice) / position.entryPrice;

      summaries.push({
        symbol: position.symbol,
        direction: position.direction,
        entryPrice: position.entryPrice,
        currentPrice,
        unrealizedPnl,
        unrealizedPnlPercent,
        elapsedSeconds: Math.floor((Date.now() - position.enteredAt) / 1000),
        tpReduced: position.tpReduced,
      });
    }

    return summaries;
  }

  /**
   * 로깅용 상태 출력
   */
  logStatus(): void {
    const state = this.getState();

    this.logger.log('────────────────────────────────────────────────────────────');
    this.logger.log('[ScalpingPosition] Current Status:');
    this.logger.log(
      `[ScalpingPosition]   Active positions: ${state.activePositions.length}/${SCALPING_CONFIG.risk.maxPositions}`,
    );
    this.logger.log(
      `[ScalpingPosition]   Pending orders: ${state.pendingOrders.length}`,
    );
    this.logger.log(
      `[ScalpingPosition]   Daily loss: ${(state.dailyLoss * 100).toFixed(2)}%/${(SCALPING_CONFIG.risk.maxDailyLoss * 100).toFixed(2)}%`,
    );
    this.logger.log(
      `[ScalpingPosition]   Today: ${state.todayTradeCount} trades (${state.todayWinCount}W/${state.todayLossCount}L)`,
    );

    if (state.cooldownUntil > Date.now()) {
      const remainingMinutes = Math.ceil((state.cooldownUntil - Date.now()) / 60000);
      this.logger.warn(
        `[ScalpingPosition]   ⚠️ Cooldown: ${remainingMinutes}min remaining`,
      );
    }

    // 활성 포지션 상세
    for (const position of state.activePositions) {
      const elapsedSeconds = Math.floor((Date.now() - position.enteredAt) / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const elapsedSecs = elapsedSeconds % 60;

      this.logger.log(
        `[ScalpingPosition]   📍 ${position.symbol} ${position.direction} | ` +
          `Entry: ${position.entryPrice.toFixed(4)} | ` +
          `Elapsed: ${elapsedMinutes}m ${elapsedSecs}s | ` +
          `TP reduced: ${position.tpReduced}`,
      );
    }

    this.logger.log('────────────────────────────────────────────────────────────');
  }
}
