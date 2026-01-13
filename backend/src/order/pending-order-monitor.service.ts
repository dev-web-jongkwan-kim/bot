import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OkxService } from '../okx/okx.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';

/**
 * 미체결 지정가 주문 모니터링 서비스
 *
 * OrderService에서 지정가 주문을 넣은 후, 이 서비스에서 비동기로 모니터링:
 * - 체결 여부 확인
 * - OB 영역 이탈 시 취소
 * - 타임아웃(15분/45분) 시 취소
 * - 체결 시 SL/TP 주문 생성 및 Position 저장
 */

interface PendingOrder {
  orderId: string;  // OKX uses string orderId
  symbol: string;
  side: 'LONG' | 'SHORT';
  limitPrice: number;
  quantity: number;
  leverage: number;
  obTop: number;
  obBottom: number;
  timeframe: string;
  maxWaitTime: number;  // ms
  startTime: number;    // timestamp
  signal: any;          // 원본 시그널 (SL/TP 계산용)
  positionSize: any;    // 포지션 사이즈 정보
}

@Injectable()
export class PendingOrderMonitorService implements OnModuleInit {
  private readonly logger = new Logger(PendingOrderMonitorService.name);

  // 모니터링 중인 미체결 주문들
  private pendingOrders: Map<string, PendingOrder> = new Map(); // key: symbol

  // 모니터링 루프 제어
  private isMonitoring = false;
  private readonly CHECK_INTERVAL = 2000; // 2초마다 체크

  constructor(
    private readonly okxService: OkxService,
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(Signal)
    private readonly signalRepo: Repository<Signal>,
  ) {}

  onModuleInit() {
    this.startMonitoring();
  }

  /**
   * 미체결 주문 등록 (OrderService에서 호출)
   */
  addPendingOrder(order: PendingOrder): void {
    const key = order.symbol;

    // 이미 해당 심볼에 대기 중인 주문이 있으면 먼저 취소
    if (this.pendingOrders.has(key)) {
      this.logger.warn(`[MONITOR] ${order.symbol} already has pending order, replacing...`);
    }

    this.pendingOrders.set(key, order);

    this.logger.log(
      `[MONITOR] 📝 Added pending order:\n` +
      `  Symbol:    ${order.symbol} ${order.side}\n` +
      `  Order ID:  ${order.orderId}\n` +
      `  Price:     ${order.limitPrice}\n` +
      `  OB Zone:   ${order.obBottom.toFixed(4)} - ${order.obTop.toFixed(4)}\n` +
      `  Validity:  ${order.maxWaitTime / 1000}s\n` +
      `  Pending:   ${this.pendingOrders.size} orders`
    );
  }

  /**
   * 대기 중인 주문 수 조회
   */
  getPendingCount(): number {
    return this.pendingOrders.size;
  }

  /**
   * 특정 심볼에 대기 중인 주문이 있는지 확인
   */
  hasPendingOrder(symbol: string): boolean {
    return this.pendingOrders.has(symbol);
  }

  /**
   * 모니터링 루프 시작
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.logger.log('🟢 PendingOrderMonitorService started');
    this.monitorLoop();
  }

  /**
   * 메인 모니터링 루프
   */
  private async monitorLoop(): Promise<void> {
    while (this.isMonitoring) {
      try {
        if (this.pendingOrders.size > 0) {
          await this.checkAllPendingOrders();
        }
      } catch (error) {
        this.logger.error(`[MONITOR] Loop error: ${error.message}`);
      }

      await this.delay(this.CHECK_INTERVAL);
    }
  }

  /**
   * 모든 대기 주문 체크
   */
  private async checkAllPendingOrders(): Promise<void> {
    const now = Date.now();
    const ordersToRemove: string[] = [];

    // 병렬로 모든 주문 체크
    const checkPromises = Array.from(this.pendingOrders.entries()).map(
      async ([symbol, order]) => {
        try {
          const result = await this.checkSingleOrder(order, now);
          if (result.shouldRemove) {
            ordersToRemove.push(symbol);
          }
        } catch (error) {
          this.logger.error(`[MONITOR] Error checking ${symbol}: ${error.message}`);
        }
      }
    );

    await Promise.all(checkPromises);

    // 처리 완료된 주문 제거
    for (const symbol of ordersToRemove) {
      this.pendingOrders.delete(symbol);
    }
  }

  /**
   * 단일 주문 체크
   */
  private async checkSingleOrder(
    order: PendingOrder,
    now: number
  ): Promise<{ shouldRemove: boolean }> {
    const elapsed = now - order.startTime;
    const elapsedSec = Math.round(elapsed / 1000);

    // 1. 주문 상태 확인
    let orderStatus;
    try {
      orderStatus = await this.okxService.queryOrder(order.symbol, order.orderId);
    } catch (error) {
      this.logger.warn(`[MONITOR] Failed to query order ${order.symbol}: ${error.message}`);
      return { shouldRemove: false };
    }

    // 2. 체결됨 → SL/TP 생성 및 Position 저장
    if (orderStatus.status === 'FILLED') {
      this.logger.log(`✅ [MONITOR] Order FILLED: ${order.symbol} ${order.side}`);

      const entryPrice = parseFloat(orderStatus.avgPrice || orderStatus.price);
      const executedQty = parseFloat(orderStatus.executedQty);

      await this.handleFilledOrder(order, entryPrice, executedQty);
      return { shouldRemove: true };
    }

    // 3. 이미 취소됨
    if (orderStatus.status === 'CANCELED' || orderStatus.status === 'EXPIRED') {
      this.logger.warn(`⚠️ [MONITOR] Order ${orderStatus.status}: ${order.symbol}`);
      await this.updateSignalStatus(order.signal.dbId, 'CANCELED');
      return { shouldRemove: true };
    }

    // 4. 타임아웃 체크
    if (elapsed >= order.maxWaitTime) {
      this.logger.warn(
        `⏰ [MONITOR] Timeout: ${order.symbol} (${elapsedSec}s/${order.maxWaitTime / 1000}s)`
      );

      await this.cancelOrder(order, 'timeout');
      return { shouldRemove: true };
    }

    // 5. OB 영역 이탈 체크
    try {
      const currentPrice = await this.okxService.getSymbolPrice(order.symbol);
      const buffer = (order.obTop - order.obBottom) * 0.5;

      const isOutOfZone = order.side === 'LONG'
        ? currentPrice < order.obBottom - buffer
        : currentPrice > order.obTop + buffer;

      if (isOutOfZone) {
        this.logger.warn(
          `🛑 [MONITOR] OB Zone Exit: ${order.symbol}\n` +
          `  Price: ${currentPrice} | Zone: ${order.obBottom.toFixed(4)}-${order.obTop.toFixed(4)}`
        );

        await this.cancelOrder(order, 'ob_zone_exit');
        return { shouldRemove: true };
      }

      // 디버그 로그 (30초마다)
      if (elapsedSec % 30 === 0 && elapsedSec > 0) {
        this.logger.debug(
          `[MONITOR] ${order.symbol} | Price: ${currentPrice.toFixed(4)} | ` +
          `Elapsed: ${elapsedSec}s | Remaining: ${Math.round((order.maxWaitTime - elapsed) / 1000)}s`
        );
      }
    } catch (error) {
      this.logger.warn(`[MONITOR] Price check failed for ${order.symbol}: ${error.message}`);
    }

    return { shouldRemove: false };
  }

  /**
   * 주문 취소
   */
  private async cancelOrder(order: PendingOrder, reason: string): Promise<void> {
    try {
      await this.okxService.cancelOrder(order.symbol, order.orderId);
      this.logger.log(`[MONITOR] ❌ Canceled ${order.symbol} order #${order.orderId} (${reason})`);
    } catch (error) {
      // 이미 체결되었을 수 있음 - 재확인
      const finalStatus = await this.okxService.queryOrder(order.symbol, order.orderId);
      if (finalStatus.status === 'FILLED') {
        const entryPrice = parseFloat(finalStatus.avgPrice || finalStatus.price);
        const executedQty = parseFloat(finalStatus.executedQty);
        await this.handleFilledOrder(order, entryPrice, executedQty);
        return;
      }
    }

    await this.updateSignalStatus(order.signal.dbId, 'CANCELED');
  }

  /**
   * 체결된 주문 처리 (SL/TP 생성 + Position 저장)
   */
  private async handleFilledOrder(
    order: PendingOrder,
    entryPrice: number,
    executedQty: number
  ): Promise<void> {
    const signal = order.signal;

    try {
      // ═══════════════════════════════════════════════════════════════════
      // SL/TP 슬리피지 보정 (백테스트와 동일)
      // ═══════════════════════════════════════════════════════════════════
      const TP1_RATIO = 1.2;
      const TP2_RATIO = 4.0;

      const plannedEntry = signal.entryPrice;
      const entrySlippageAmount = entryPrice - plannedEntry;
      const actualStopLoss = signal.stopLoss + entrySlippageAmount;
      const actualRisk = Math.abs(entryPrice - actualStopLoss);

      const actualTP1 = signal.side === 'LONG'
        ? entryPrice + (actualRisk * TP1_RATIO)
        : entryPrice - (actualRisk * TP1_RATIO);

      const actualTP2 = signal.side === 'LONG'
        ? entryPrice + (actualRisk * TP2_RATIO)
        : entryPrice - (actualRisk * TP2_RATIO);

      this.logger.log(
        `\n🔄 [MONITOR] SL/TP Calculation for ${order.symbol}:\n` +
        `  Entry:    ${plannedEntry.toFixed(4)} → ${entryPrice.toFixed(4)}\n` +
        `  SL:       ${signal.stopLoss.toFixed(4)} → ${actualStopLoss.toFixed(4)}\n` +
        `  TP1:      ${actualTP1.toFixed(4)} (${TP1_RATIO}R)\n` +
        `  TP2:      ${actualTP2.toFixed(4)} (${TP2_RATIO}R)`
      );

      // ═══════════════════════════════════════════════════════════════════
      // SL 주문 생성 (Algo Order)
      // ═══════════════════════════════════════════════════════════════════
      const formattedSL = parseFloat(this.okxService.formatPrice(order.symbol, actualStopLoss));

      // 기존 algo order 정리
      try {
        const existingAlgoOrders = await this.okxService.getOpenAlgoOrders(order.symbol);
        const conflictingOrders = existingAlgoOrders.filter(o =>
          (o.type === 'STOP_MARKET' || o.type === 'TAKE_PROFIT_MARKET') &&
          o.closePosition === true
        );

        for (const o of conflictingOrders) {
          await this.okxService.cancelAlgoOrder(order.symbol, o.algoId);
        }
      } catch (e) {
        this.logger.warn(`[MONITOR] Failed to clear existing algo orders: ${e.message}`);
      }

      let slOrder;
      try {
        slOrder = await this.okxService.createAlgoOrder({
          symbol: order.symbol,
          side: order.side === 'LONG' ? 'SELL' : 'BUY',
          type: 'STOP_MARKET',
          triggerPrice: formattedSL,
          closePosition: true,
        });
        this.logger.log(`[MONITOR] ✓ SL created: ${slOrder.algoId} at ${formattedSL}`);
      } catch (slError) {
        // SL 실패 시 긴급 청산
        this.logger.error(`[MONITOR] ❌ SL failed, emergency close: ${slError.message}`);
        await this.emergencyClose(order, executedQty);
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // TP 주문 생성
      // ═══════════════════════════════════════════════════════════════════
      const tpOrders = [];
      const MIN_TP_NOTIONAL = 10;
      const totalNotional = executedQty * entryPrice;

      const tp1Qty = executedQty * (signal.tp1Percent / 100);
      const tp1Notional = tp1Qty * entryPrice;

      if (tp1Notional >= MIN_TP_NOTIONAL) {
        const formattedTP1 = parseFloat(this.okxService.formatPrice(order.symbol, actualTP1));
        const formattedQty = parseFloat(this.okxService.formatQuantity(order.symbol,
          signal.tp1Percent === 100 ? executedQty : tp1Qty
        ));

        try {
          const tpOrder = await this.okxService.createAlgoOrder({
            symbol: order.symbol,
            side: order.side === 'LONG' ? 'SELL' : 'BUY',
            type: 'TAKE_PROFIT_MARKET',
            triggerPrice: formattedTP1,
            quantity: formattedQty,
          });
          tpOrders.push(tpOrder);
          this.logger.log(`[MONITOR] ✓ TP created: ${tpOrder.algoId} at ${formattedTP1}`);
        } catch (tpError) {
          this.logger.warn(`[MONITOR] TP order failed: ${tpError.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // Position 저장
      // ═══════════════════════════════════════════════════════════════════
      const position = this.positionRepo.create({
        symbol: order.symbol,
        strategy: signal.strategy,
        timeframe: signal.timeframe,
        side: order.side,
        entryPrice: entryPrice,
        quantity: executedQty,
        leverage: order.leverage,
        stopLoss: actualStopLoss,
        takeProfit1: actualTP1,
        takeProfit2: actualTP2,
        status: 'OPEN',
        openedAt: new Date(),
        metadata: {
          ...signal.metadata,
          planned: {
            entry: plannedEntry,
            stopLoss: signal.stopLoss,
            takeProfit1: signal.takeProfit1,
            takeProfit2: signal.takeProfit2,
            tp1Percent: signal.tp1Percent,
            tp2Percent: signal.tp2Percent,
          },
          actual: {
            entry: entryPrice,
            stopLoss: actualStopLoss,
            takeProfit1: actualTP1,
            takeProfit2: actualTP2,
            slAlgoId: slOrder?.algoId,
            tpAlgoIds: tpOrders.map(o => o.algoId),
          },
          slippage: {
            entry: entrySlippageAmount,
            entryPercent: (entrySlippageAmount / plannedEntry) * 100,
          },
        },
      });

      await this.positionRepo.save(position);

      this.logger.log(
        `\n✅ [MONITOR] ORDER COMPLETE: ${order.symbol} ${order.side}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  Entry:      ${entryPrice.toFixed(4)}\n` +
        `  Quantity:   ${executedQty}\n` +
        `  Notional:   $${totalNotional.toFixed(2)}\n` +
        `  SL:         ${actualStopLoss.toFixed(4)}\n` +
        `  TP1:        ${actualTP1.toFixed(4)}\n` +
        `  Position ID: ${position.id}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );

      await this.updateSignalStatus(signal.dbId, 'FILLED');

    } catch (error) {
      this.logger.error(`[MONITOR] handleFilledOrder error: ${error.message}`);
      await this.updateSignalStatus(signal.dbId, 'FAILED');
    }
  }

  /**
   * 긴급 청산 (SL 생성 실패 시)
   */
  private async emergencyClose(order: PendingOrder, quantity: number): Promise<void> {
    try {
      await this.okxService.createOrder({
        symbol: order.symbol,
        side: order.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: quantity,
      });
      this.logger.warn(`[MONITOR] ⚠️ Emergency closed ${order.symbol}`);
    } catch (error) {
      this.logger.error(`[MONITOR] 🚨 CRITICAL: Emergency close failed for ${order.symbol}`);
    }

    await this.updateSignalStatus(order.signal.dbId, 'FAILED');
  }

  /**
   * 시그널 상태 업데이트
   */
  private async updateSignalStatus(signalId: number, status: string): Promise<void> {
    if (!signalId) return;
    try {
      await this.signalRepo.update(signalId, { status });
    } catch (error) {
      this.logger.warn(`[MONITOR] Failed to update signal status: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
