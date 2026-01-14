import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../../binance/binance.service';
import { ScalpingSignalService } from './scalping-signal.service';
import { ScalpingPositionService } from './scalping-position.service';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { ScalpingSignal } from '../interfaces/signal.interface';
import { PendingOrder, ScalpingPosition } from '../interfaces/position.interface';

/**
 * 스캘핑 주문 실행 서비스
 *
 * STEP 6: 리스크 필터
 * STEP 7: 주문 실행 (Limit + TP/SL)
 * STEP 8: 포지션 관리 (시간 기반 청산)
 */
@Injectable()
export class ScalpingOrderService {
  private readonly logger = new Logger(ScalpingOrderService.name);

  // 대기 중인 주문 (미체결)
  private pendingOrders: Map<string, PendingOrder> = new Map();

  // 오늘 손실 추적
  private dailyLoss: number = 0;
  private lastResetDate: string = '';

  // 연속 손실 추적
  private consecutiveLosses: number = 0;
  private cooldownUntil: number = 0;

  // 거래 통계
  private stats = {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnl: 0,
  };

  constructor(
    private readonly binance: BinanceService,
    private readonly signalService: ScalpingSignalService,
    private readonly positionService: ScalpingPositionService,
  ) {
    this.logger.log(
      '═══════════════════════════════════════════════════════════',
    );
    this.logger.log('💰 [SCALPING ORDER] 주문 서비스 초기화');
    this.logger.log(`  최대 포지션:     ${SCALPING_CONFIG.risk.maxPositions}개`);
    this.logger.log(`  방향별 최대:     ${SCALPING_CONFIG.risk.maxSameDirection}개`);
    this.logger.log(`  레버리지:        ${SCALPING_CONFIG.risk.leverage}x`);
    this.logger.log(`  리스크/거래:     ${SCALPING_CONFIG.risk.riskPerTrade * 100}%`);
    this.logger.log(`  일일 최대 손실:  ${SCALPING_CONFIG.risk.maxDailyLoss * 100}%`);
    this.logger.log(
      '═══════════════════════════════════════════════════════════',
    );
  }

  /**
   * 메인 실행 루프
   * 매 10초마다 실행
   */
  @Cron('*/10 * * * * *')
  async executeLoop(): Promise<void> {
    const loopStart = Date.now();

    try {
      // 일일 손실 리셋 체크
      this.checkDailyReset();

      // 쿨다운 체크
      if (Date.now() < this.cooldownUntil) {
        const remainingMin = (this.cooldownUntil - Date.now()) / 60000;
        this.logger.debug(
          `[LOOP] ⏸️ 쿨다운 중... 남은 시간: ${remainingMin.toFixed(1)}분`,
        );
        return;
      }

      // 일일 손실 한도 체크
      if (this.dailyLoss >= SCALPING_CONFIG.risk.maxDailyLoss) {
        this.logger.warn(
          `[LOOP] 🛑 일일 손실 한도 도달: ${(this.dailyLoss * 100).toFixed(2)}%`,
        );
        return;
      }

      // 1. 새 시그널 처리
      await this.processNewSignals();

      // 2. 미체결 주문 관리
      await this.managePendingOrders();

      // 3. 포지션 관리 (시간 기반)
      await this.managePositions();

      const elapsed = Date.now() - loopStart;
      if (elapsed > 1000) {
        this.logger.debug(`[LOOP] 실행 완료 (${elapsed}ms)`);
      }
    } catch (error: any) {
      this.logger.error(`[LOOP] ❌ 실행 오류: ${error.message}`);
    }
  }

  /**
   * STEP 6: 리스크 필터 + STEP 7: 주문 실행
   */
  private async processNewSignals(): Promise<void> {
    // 현재 포지션 수 체크
    const positions = this.positionService.getActivePositions();
    const pendingCount = this.pendingOrders.size;
    const totalOpen = positions.length + pendingCount;

    if (totalOpen >= SCALPING_CONFIG.risk.maxPositions) {
      this.logger.debug(
        `[SIGNALS] 최대 포지션 도달 (${totalOpen}/${SCALPING_CONFIG.risk.maxPositions})`,
      );
      return;
    }

    // 방향별 포지션 수 체크
    const longCount = this.positionService.getPositionCount('LONG');
    const shortCount = this.positionService.getPositionCount('SHORT');

    // 새 시그널 가져오기
    const signals = this.signalService.getActiveSignals();

    if (signals.length === 0) {
      return;
    }

    this.logger.debug(`[SIGNALS] 처리할 시그널: ${signals.length}개`);

    for (const signal of signals) {
      // 이미 해당 종목 포지션 있으면 스킵
      if (this.positionService.hasPosition(signal.symbol)) {
        this.logger.debug(`[SIGNALS] ${signal.symbol}: 이미 포지션 보유`);
        continue;
      }

      // 이미 해당 종목 대기 주문 있으면 스킵
      if (this.pendingOrders.has(signal.symbol)) {
        this.logger.debug(`[SIGNALS] ${signal.symbol}: 이미 대기 주문 있음`);
        continue;
      }

      // 방향 편중 체크
      if (
        signal.direction === 'LONG' &&
        longCount >= SCALPING_CONFIG.risk.maxSameDirection
      ) {
        this.logger.debug(
          `[SIGNALS] ${signal.symbol}: LONG 최대 도달 (${longCount}/${SCALPING_CONFIG.risk.maxSameDirection})`,
        );
        continue;
      }
      if (
        signal.direction === 'SHORT' &&
        shortCount >= SCALPING_CONFIG.risk.maxSameDirection
      ) {
        this.logger.debug(
          `[SIGNALS] ${signal.symbol}: SHORT 최대 도달 (${shortCount}/${SCALPING_CONFIG.risk.maxSameDirection})`,
        );
        continue;
      }

      // 주문 실행
      await this.placeOrder(signal);

      // 최대 포지션 도달 시 중단
      if (
        positions.length + this.pendingOrders.size >=
        SCALPING_CONFIG.risk.maxPositions
      ) {
        break;
      }
    }
  }

  /**
   * 주문 실행
   */
  private async placeOrder(signal: ScalpingSignal): Promise<void> {
    this.logger.log(
      `\n[ORDER] ═══════════════════════════════════════════════════════`,
    );
    this.logger.log(`[ORDER] 📝 주문 실행: ${signal.symbol} ${signal.direction}`);

    try {
      // 레버리지 설정
      try {
        await this.binance.changeLeverage(
          signal.symbol,
          SCALPING_CONFIG.risk.leverage,
        );
        this.logger.debug(
          `[ORDER] 레버리지 설정: ${SCALPING_CONFIG.risk.leverage}x`,
        );
      } catch (e: any) {
        this.logger.debug(`[ORDER] 레버리지 설정 실패 (무시): ${e.message}`);
      }

      // 포지션 사이즈 계산
      const accountBalance = await this.getAccountBalance();
      const positionSize = this.calculatePositionSize(
        accountBalance,
        signal.entryPrice,
        signal.slPrice,
        signal.direction,
      );

      if (positionSize <= 0) {
        this.logger.warn(`[ORDER] ❌ 유효하지 않은 포지션 사이즈: ${positionSize}`);
        return;
      }

      this.logger.log(`[ORDER] 계좌 잔고:    $${accountBalance.toFixed(2)}`);
      this.logger.log(`[ORDER] 포지션 사이즈: ${positionSize.toFixed(6)}`);
      this.logger.log(`[ORDER] 진입가:       ${signal.entryPrice.toFixed(6)}`);

      // 1. 메인 Limit 주문
      const side = signal.direction === 'LONG' ? 'BUY' : 'SELL';

      const mainOrder = await this.binance.createOrder({
        symbol: signal.symbol,
        side: side as 'BUY' | 'SELL',
        type: 'LIMIT',
        quantity: positionSize,
        price: signal.entryPrice,
        timeInForce: 'GTC',
      });

      this.logger.log(`[ORDER] ✅ 주문 생성 완료`);
      this.logger.log(`  주문 ID:   ${mainOrder.orderId}`);
      this.logger.log(`  상태:      ${mainOrder.status}`);
      this.logger.log(`  가격:      ${signal.entryPrice.toFixed(6)}`);
      this.logger.log(`  수량:      ${positionSize.toFixed(6)}`);

      // 대기 주문 등록
      this.pendingOrders.set(signal.symbol, {
        symbol: signal.symbol,
        orderId: mainOrder.orderId,
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        tpPrice: signal.tpPrice,
        slPrice: signal.slPrice,
        quantity: positionSize,
        createdAt: Date.now(),
        signal,
      });

      this.logger.log(`[ORDER] ═══════════════════════════════════════════════════════\n`);
    } catch (error: any) {
      this.logger.error(`[ORDER] ❌ 주문 실패: ${error.message}`);
    }
  }

  /**
   * 미체결 주문 관리
   */
  private async managePendingOrders(): Promise<void> {
    const now = Date.now();
    const timeout = SCALPING_CONFIG.order.unfillTimeoutSec * 1000;

    for (const [symbol, pending] of this.pendingOrders) {
      try {
        // 주문 상태 확인
        const orders = await this.binance.getOpenOrders(symbol);
        const order = orders.find((o: any) => o.orderId === pending.orderId);

        if (!order) {
          // 주문이 없음 = 체결됨 또는 취소됨
          const allOrders = await this.binance.getOpenOrders(symbol);
          const filled = !allOrders.find((o: any) => o.orderId === pending.orderId);

          if (filled) {
            // 체결됨 → 포지션 등록 + TP/SL
            this.logger.log(`[PENDING] ${symbol}: 체결 감지`);
            await this.onOrderFilled(pending);
          }

          this.pendingOrders.delete(symbol);
        } else if (now - pending.createdAt > timeout) {
          // 타임아웃 → 취소
          this.logger.log(`[PENDING] ${symbol}: 타임아웃 - 주문 취소`);

          try {
            await this.binance.cancelOrder(symbol, pending.orderId);
          } catch (cancelError: any) {
            this.logger.debug(`[PENDING] 취소 실패: ${cancelError.message}`);
          }

          this.pendingOrders.delete(symbol);
        } else {
          // 대기 중
          const elapsedSec = (now - pending.createdAt) / 1000;
          this.logger.debug(
            `[PENDING] ${symbol}: 대기 중 (${elapsedSec.toFixed(0)}s / ${SCALPING_CONFIG.order.unfillTimeoutSec}s)`,
          );
        }
      } catch (error: any) {
        this.logger.error(`[PENDING] ${symbol} 관리 오류: ${error.message}`);
      }
    }
  }

  /**
   * 주문 체결 시 처리
   */
  private async onOrderFilled(pending: PendingOrder): Promise<void> {
    this.logger.log(
      `\n[FILLED] ═══════════════════════════════════════════════════════`,
    );
    this.logger.log(`[FILLED] ✅ 주문 체결: ${pending.symbol} ${pending.direction}`);
    this.logger.log(`  진입가:  ${pending.entryPrice.toFixed(6)}`);
    this.logger.log(`  수량:    ${pending.quantity}`);

    try {
      // TP 주문 (Algo Order)
      const tpSide = pending.direction === 'LONG' ? 'SELL' : 'BUY';

      try {
        const tpOrder = await this.binance.createAlgoOrder({
          symbol: pending.symbol,
          side: tpSide as 'BUY' | 'SELL',
          type: 'TAKE_PROFIT_MARKET',
          triggerPrice: pending.tpPrice,
          quantity: pending.quantity,
          workingType: 'CONTRACT_PRICE',
        });

        this.logger.log(`  TP 설정: ${pending.tpPrice.toFixed(6)} (Algo ID: ${tpOrder.algoId})`);
      } catch (tpError: any) {
        this.logger.warn(`  TP 설정 실패: ${tpError.message}`);
      }

      // SL 주문 (Algo Order)
      try {
        const slOrder = await this.binance.createAlgoOrder({
          symbol: pending.symbol,
          side: tpSide as 'BUY' | 'SELL',
          type: 'STOP_MARKET',
          triggerPrice: pending.slPrice,
          quantity: pending.quantity,
          workingType: 'CONTRACT_PRICE',
        });

        this.logger.log(`  SL 설정: ${pending.slPrice.toFixed(6)} (Algo ID: ${slOrder.algoId})`);
      } catch (slError: any) {
        this.logger.warn(`  SL 설정 실패: ${slError.message}`);
      }

      // 포지션 등록
      this.positionService.addPosition({
        symbol: pending.symbol,
        direction: pending.direction,
        entryPrice: pending.entryPrice,
        quantity: pending.quantity,
        tpPrice: pending.tpPrice,
        slPrice: pending.slPrice,
        originalTpPrice: pending.tpPrice,
        enteredAt: Date.now(),
        signal: pending.signal,
        mainOrderId: pending.orderId,
      });

      this.logger.log(`[FILLED] ═══════════════════════════════════════════════════════\n`);
    } catch (error: any) {
      this.logger.error(`[FILLED] 처리 오류: ${error.message}`);
    }
  }

  /**
   * STEP 8: 포지션 관리 (시간 기반 청산)
   */
  private async managePositions(): Promise<void> {
    const positions = this.positionService.getActivePositions();
    const now = Date.now();

    for (const position of positions) {
      const elapsedSec = (now - position.enteredAt) / 1000;

      try {
        // 현재 가격 조회
        const currentPrice = await this.binance.getSymbolPrice(position.symbol);
        const pnlPercent = this.calculatePnlPercent(position, currentPrice);

        // 1. 시간 기반 TP 축소 (20분 경과)
        if (
          elapsedSec >= SCALPING_CONFIG.position.tpReduceTimeSec &&
          !position.tpReduced
        ) {
          this.logger.log(
            `[MANAGE] ⏰ ${position.symbol}: 20분 경과 - TP 축소`,
          );
          await this.reduceTp(position);
        }

        // 2. 본전 청산 (25분 경과)
        if (
          elapsedSec >= SCALPING_CONFIG.position.breakevenTimeSec &&
          pnlPercent >= 0
        ) {
          this.logger.log(
            `[MANAGE] 💰 ${position.symbol}: 25분 경과 + 본전 이상 - 청산`,
          );
          await this.closePosition(position, 'BREAKEVEN_TIMEOUT');
          continue;
        }

        // 3. 강제 청산 (30분 경과)
        if (elapsedSec >= SCALPING_CONFIG.position.maxHoldTimeSec) {
          this.logger.log(
            `[MANAGE] ⏱️ ${position.symbol}: 30분 경과 - 강제 청산`,
          );
          await this.closePosition(position, 'MAX_TIME_TIMEOUT');
          continue;
        }

        // 상태 로깅
        const remainingSec = SCALPING_CONFIG.position.maxHoldTimeSec - elapsedSec;
        this.logger.debug(
          `[MANAGE] ${position.symbol}: ${position.direction} | ` +
            `PnL: ${pnlPercent >= 0 ? '+' : ''}${(pnlPercent * 100).toFixed(2)}% | ` +
            `남은 시간: ${(remainingSec / 60).toFixed(1)}분`,
        );
      } catch (error: any) {
        this.logger.error(`[MANAGE] ${position.symbol} 관리 오류: ${error.message}`);
      }
    }
  }

  /**
   * TP 축소
   */
  private async reduceTp(position: ScalpingPosition): Promise<void> {
    const newTpPrice = this.calculateReducedTp(position);

    this.logger.log(
      `\n[TP REDUCE] ═══════════════════════════════════════════════`,
    );
    this.logger.log(`[TP REDUCE] ${position.symbol}: TP 축소`);
    this.logger.log(`  원래 TP: ${position.originalTpPrice.toFixed(6)}`);
    this.logger.log(`  새 TP:   ${newTpPrice.toFixed(6)}`);

    try {
      // 기존 알고 주문 취소
      await this.binance.cancelAllAlgoOrders(position.symbol);

      // 새 TP 설정
      const tpSide = position.direction === 'LONG' ? 'SELL' : 'BUY';

      await this.binance.createAlgoOrder({
        symbol: position.symbol,
        side: tpSide as 'BUY' | 'SELL',
        type: 'TAKE_PROFIT_MARKET',
        triggerPrice: newTpPrice,
        quantity: position.quantity,
        workingType: 'CONTRACT_PRICE',
      });

      // SL 재설정
      await this.binance.createAlgoOrder({
        symbol: position.symbol,
        side: tpSide as 'BUY' | 'SELL',
        type: 'STOP_MARKET',
        triggerPrice: position.slPrice,
        quantity: position.quantity,
        workingType: 'CONTRACT_PRICE',
      });

      // 포지션 업데이트
      this.positionService.markTpReduced(position.symbol, newTpPrice);

      this.logger.log(`[TP REDUCE] ✅ 완료`);
      this.logger.log(`[TP REDUCE] ═══════════════════════════════════════════════\n`);
    } catch (error: any) {
      this.logger.error(`[TP REDUCE] ❌ 실패: ${error.message}`);
    }
  }

  /**
   * 포지션 청산
   */
  private async closePosition(
    position: ScalpingPosition,
    reason: string,
  ): Promise<void> {
    this.logger.log(
      `\n[CLOSE] ═══════════════════════════════════════════════════════`,
    );
    this.logger.log(`[CLOSE] ${position.symbol}: 청산 (${reason})`);

    try {
      // 모든 관련 알고 주문 취소
      await this.binance.cancelAllAlgoOrders(position.symbol);

      // 시장가 청산
      const side = position.direction === 'LONG' ? 'SELL' : 'BUY';

      await this.binance.createOrder({
        symbol: position.symbol,
        side: side as 'BUY' | 'SELL',
        type: 'MARKET',
        quantity: position.quantity,
        reduceOnly: true,
      });

      // 손익 계산
      const currentPrice = await this.binance.getSymbolPrice(position.symbol);
      const pnlPercent = this.calculatePnlPercent(position, currentPrice);

      // 손익 기록
      this.recordPnl(pnlPercent, position);

      // 포지션 제거
      this.positionService.removePosition(position.symbol);

      this.logger.log(`  청산 가격: ${currentPrice.toFixed(6)}`);
      this.logger.log(
        `  PnL:       ${pnlPercent >= 0 ? '+' : ''}${(pnlPercent * 100).toFixed(2)}%`,
      );
      this.logger.log(`[CLOSE] ═══════════════════════════════════════════════════════\n`);
    } catch (error: any) {
      this.logger.error(`[CLOSE] ❌ 청산 실패: ${error.message}`);
    }
  }

  /**
   * 축소된 TP 계산
   */
  private calculateReducedTp(position: ScalpingPosition): number {
    const originalTpDistance = Math.abs(
      position.originalTpPrice - position.entryPrice,
    );
    const reducedDistance =
      originalTpDistance * SCALPING_CONFIG.position.tpReduceRatio;

    if (position.direction === 'LONG') {
      return position.entryPrice + reducedDistance;
    } else {
      return position.entryPrice - reducedDistance;
    }
  }

  /**
   * PnL 퍼센트 계산
   */
  private calculatePnlPercent(
    position: ScalpingPosition,
    currentPrice: number,
  ): number {
    if (position.direction === 'LONG') {
      return (currentPrice - position.entryPrice) / position.entryPrice;
    } else {
      return (position.entryPrice - currentPrice) / position.entryPrice;
    }
  }

  /**
   * 손익 기록
   */
  private recordPnl(pnlPercent: number, position: ScalpingPosition): void {
    this.stats.totalTrades++;

    if (pnlPercent < 0) {
      this.stats.losses++;
      this.dailyLoss += Math.abs(pnlPercent);
      this.consecutiveLosses++;

      // 연속 손실 체크
      if (this.consecutiveLosses >= SCALPING_CONFIG.risk.consecutiveLossLimit) {
        this.cooldownUntil =
          Date.now() + SCALPING_CONFIG.risk.cooldownMinutes * 60 * 1000;
        this.consecutiveLosses = 0;

        this.logger.warn(
          `[RISK] 🛑 연속 손실 ${SCALPING_CONFIG.risk.consecutiveLossLimit}회 - ${SCALPING_CONFIG.risk.cooldownMinutes}분 휴식`,
        );
      }
    } else {
      this.stats.wins++;
      this.consecutiveLosses = 0;
    }

    this.stats.totalPnl += pnlPercent;

    this.logger.log(
      `[STATS] 총 거래: ${this.stats.totalTrades} | ` +
        `승: ${this.stats.wins} | 패: ${this.stats.losses} | ` +
        `승률: ${((this.stats.wins / this.stats.totalTrades) * 100).toFixed(1)}%`,
    );
  }

  // ========================================
  // 헬퍼 메서드들
  // ========================================

  private async getAccountBalance(): Promise<number> {
    try {
      return await this.binance.getAvailableBalance();
    } catch (error) {
      return 100; // 기본값
    }
  }

  private calculatePositionSize(
    balance: number,
    entryPrice: number,
    slPrice: number,
    direction: string,
  ): number {
    // 고정 마진 $15 USDT 사용
    const FIXED_MARGIN_USDT = 15;
    const leverage = SCALPING_CONFIG.risk.leverage; // 15x

    // 포지션 가치 = 마진 × 레버리지
    const positionValue = FIXED_MARGIN_USDT * leverage; // $15 × 15 = $225

    // 수량 = 포지션 가치 / 진입가
    const quantity = positionValue / entryPrice;

    // 최소 명목가치 체크
    const minNotional = 5; // USDT
    const actualNotional = quantity * entryPrice;

    if (actualNotional < minNotional) {
      return minNotional / entryPrice;
    }

    this.logger.debug(
      `[POSITION SIZE] 마진: $${FIXED_MARGIN_USDT} | 레버리지: ${leverage}x | ` +
      `포지션 가치: $${positionValue.toFixed(2)} | 수량: ${quantity.toFixed(6)}`
    );

    return quantity;
  }

  private checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.dailyLoss = 0;
      this.lastResetDate = today;
      this.logger.log(`[RESET] 일일 손실 리셋: ${today}`);
    }
  }

  // ========================================
  // 외부 접근 메서드
  // ========================================

  /**
   * 거래 통계 조회
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 대기 주문 수 조회
   */
  getPendingOrderCount(): number {
    return this.pendingOrders.size;
  }
}
