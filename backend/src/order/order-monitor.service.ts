import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OkxService } from '../okx/okx.service';
import { Position } from '../database/entities/position.entity';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { Signal } from '../database/entities/signal.entity';

/**
 * 대기 중인 LIMIT 주문 정보
 */
export interface PendingLimitOrder {
  symbol: string;
  orderId: string;  // OKX uses string orderId
  side: 'LONG' | 'SHORT';
  quantity: number;
  price: number;
  signal: any;          // 원본 시그널 (SL/TP 생성용)
  positionSize: any;    // 포지션 사이즈 정보
  createdAt: number;    // 생성 시간 (ms)
  expireAt: number;     // 만료 시간 (ms)
  obTop?: number;       // OB 상단 (이탈 감지용)
  obBottom?: number;    // OB 하단 (이탈 감지용)
  timeframe: string;    // 타임프레임 (5m, 15m)
  retryCount: number;   // SL/TP 생성 재시도 횟수
}

/**
 * OrderMonitorService - 비동기 주문 모니터링 서비스
 *
 * 역할:
 * 1. LIMIT 주문 상태 비동기 모니터링 (2초 간격)
 * 2. 체결 시 SL/TP 주문 생성 및 포지션 저장
 * 3. 타임아웃/OB 이탈 시 주문 취소
 * 4. 대기 주문 개수 관리 (포지션 제한 통합용)
 * 5. 바이낸스 API 동기화 (60초마다)
 */
@Injectable()
export class OrderMonitorService implements OnModuleInit {
  private readonly logger = new Logger(OrderMonitorService.name);

  // ✅ 대기 중인 LIMIT 주문 (symbol -> PendingLimitOrder)
  private pendingOrders: Map<string, PendingLimitOrder> = new Map();

  // ✅ 모니터링 루프 상태
  private isMonitoring = false;

  // ✅ SL/TP 생성 최대 재시도 횟수
  private readonly MAX_SLTP_RETRIES = 3;

  // ✅ 모니터링 간격 (ms)
  private readonly MONITOR_INTERVAL = 2000;

  constructor(
    private okxService: OkxService,
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    @InjectRepository(Signal)
    private signalRepo: Repository<Signal>,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private wsGateway: AppWebSocketGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 OrderMonitorService initialized, starting monitor loop...');
    // 서버 시작 시 바이낸스와 동기화
    await this.syncWithBinance();
    this.startMonitorLoop();
  }

  /**
   * ✅ 대기 중인 LIMIT 주문 개수 반환
   * RiskService에서 포지션 제한 체크 시 사용
   */
  getPendingOrderCount(): number {
    return this.pendingOrders.size;
  }

  /**
   * ✅ 특정 심볼이 대기 중인지 확인
   */
  isSymbolPending(symbol: string): boolean {
    return this.pendingOrders.has(symbol);
  }

  /**
   * ✅ 대기 주문 목록 반환 (디버그/API용)
   */
  getPendingOrders(): PendingLimitOrder[] {
    return Array.from(this.pendingOrders.values());
  }

  /**
   * ✅ LIMIT 주문 등록 (SignalProcessorService에서 호출)
   */
  registerPendingOrder(order: PendingLimitOrder): void {
    this.pendingOrders.set(order.symbol, order);
    this.logger.log(
      `[MONITOR] 📝 Registered: ${order.symbol} ${order.side} | ` +
      `Price: ${order.price} | Expire: ${new Date(order.expireAt).toISOString()} | ` +
      `Total pending: ${this.pendingOrders.size}`
    );
  }

  /**
   * ✅ 대기 주문 제거
   */
  private removePendingOrder(symbol: string): void {
    if (this.pendingOrders.has(symbol)) {
      this.pendingOrders.delete(symbol);
      this.logger.debug(`[MONITOR] Removed ${symbol} from pending (total: ${this.pendingOrders.size})`);
    }
  }

  /**
   * ✅ 모니터링 루프 시작
   */
  private startMonitorLoop(): void {
    if (this.isMonitoring) {
      this.logger.warn('⚠️ Monitor loop already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.log('✅ Monitor loop started');

    this.runMonitorLoop();
  }

  /**
   * ✅ 모니터링 루프 실행
   */
  private async runMonitorLoop(): Promise<void> {
    while (this.isMonitoring) {
      try {
        await this.checkPendingOrders();
      } catch (error: any) {
        this.logger.error(`[MONITOR] Loop error: ${error.message}`);
      }

      await this.delay(this.MONITOR_INTERVAL);
    }
  }

  /**
   * ✅ 대기 주문 상태 확인
   */
  private async checkPendingOrders(): Promise<void> {
    if (this.pendingOrders.size === 0) {
      return;
    }

    const now = Date.now();
    const symbolsToRemove: string[] = [];

    for (const [symbol, pending] of this.pendingOrders) {
      try {
        // 1. 주문 상태 확인
        const orderStatus = await this.okxService.queryOrder(symbol, pending.orderId);

        // ═══════════════════════════════════════════════════════════
        // CASE 1: 체결됨
        // ═══════════════════════════════════════════════════════════
        if (orderStatus.status === 'FILLED') {
          const entryPrice = parseFloat(orderStatus.avgPrice || orderStatus.price);
          const executedQty = parseFloat(orderStatus.executedQty);

          this.logger.log(
            `\n[MONITOR] ═══════════════════════════════════════════════════════════\n` +
            `[MONITOR] ✅ ORDER FILLED | ${symbol} ${pending.side}\n` +
            `[MONITOR]   Entry:    ${entryPrice}\n` +
            `[MONITOR]   Quantity: ${executedQty}\n` +
            `[MONITOR] ═══════════════════════════════════════════════════════════`
          );

          // SL/TP 생성 및 포지션 저장
          await this.onOrderFilled(pending, entryPrice, executedQty);
          symbolsToRemove.push(symbol);
          continue;
        }

        // ═══════════════════════════════════════════════════════════
        // CASE 2: 취소됨/만료됨
        // ═══════════════════════════════════════════════════════════
        if (orderStatus.status === 'CANCELED' || orderStatus.status === 'EXPIRED') {
          this.logger.warn(`[MONITOR] ⚠️ Order ${orderStatus.status}: ${symbol}`);
          await this.onOrderCanceled(pending, orderStatus.status);
          symbolsToRemove.push(symbol);
          continue;
        }

        // ═══════════════════════════════════════════════════════════
        // CASE 3: 아직 대기 중 - 타임아웃/OB 이탈 체크
        // ═══════════════════════════════════════════════════════════
        if (orderStatus.status === 'NEW' || orderStatus.status === 'PARTIALLY_FILLED') {
          // 타임아웃 체크
          if (now >= pending.expireAt) {
            this.logger.warn(
              `[MONITOR] ⏰ TIMEOUT: ${symbol} | Elapsed: ${Math.round((now - pending.createdAt) / 1000)}s`
            );
            await this.cancelOrder(pending, 'TIMEOUT');
            symbolsToRemove.push(symbol);
            continue;
          }

          // OB 이탈 체크
          if (pending.obTop && pending.obBottom) {
            const currentPrice = await this.okxService.getSymbolPrice(symbol);
            const buffer = (pending.obTop - pending.obBottom) * 0.5;

            const isOutOfZone = pending.side === 'LONG'
              ? currentPrice < pending.obBottom - buffer
              : currentPrice > pending.obTop + buffer;

            if (isOutOfZone) {
              this.logger.warn(
                `[MONITOR] 🛑 OB ZONE EXIT: ${symbol} | ` +
                `Price: ${currentPrice} | Zone: ${pending.obBottom?.toFixed(2)}-${pending.obTop?.toFixed(2)}`
              );
              await this.cancelOrder(pending, 'OB_EXIT');
              symbolsToRemove.push(symbol);
              continue;
            }
          }
        }

      } catch (error: any) {
        this.logger.warn(`[MONITOR] Error checking ${symbol}: ${error.message}`);
      }
    }

    // 처리 완료된 주문 제거
    for (const symbol of symbolsToRemove) {
      this.removePendingOrder(symbol);
    }
  }

  /**
   * ✅ 주문 체결 시 처리 - SL/TP 생성 및 포지션 저장
   */
  private async onOrderFilled(
    pending: PendingLimitOrder,
    entryPrice: number,
    executedQty: number
  ): Promise<void> {
    const signal = pending.signal;
    const symbol = pending.symbol;

    try {
      // ═══════════════════════════════════════════════════════════
      // 1. SL/TP 가격 재계산 (슬리피지 보정)
      // ═══════════════════════════════════════════════════════════
      const TP1_RATIO = 1.2;
      const TP2_RATIO = 4.0;

      const entrySlippageAmount = entryPrice - signal.entryPrice;
      const actualStopLoss = signal.stopLoss + entrySlippageAmount;
      const actualRisk = Math.abs(entryPrice - actualStopLoss);

      const actualTP1 = signal.side === 'LONG'
        ? entryPrice + (actualRisk * TP1_RATIO)
        : entryPrice - (actualRisk * TP1_RATIO);

      const actualTP2 = signal.side === 'LONG'
        ? entryPrice + (actualRisk * TP2_RATIO)
        : entryPrice - (actualRisk * TP2_RATIO);

      this.logger.log(
        `[MONITOR] 🔄 SL/TP Adjusted:\n` +
        `  Entry: ${signal.entryPrice} → ${entryPrice}\n` +
        `  SL:    ${signal.stopLoss?.toFixed(4)} → ${actualStopLoss.toFixed(4)}\n` +
        `  TP1:   ${signal.takeProfit1?.toFixed(4)} → ${actualTP1.toFixed(4)}\n` +
        `  TP2:   ${signal.takeProfit2?.toFixed(4)} → ${actualTP2.toFixed(4)}`
      );

      // ═══════════════════════════════════════════════════════════
      // 2. SL 주문 생성 (필수 - 재시도 포함)
      // ═══════════════════════════════════════════════════════════
      // ⚠️ 주문 체결 직후 Binance가 포지션을 인식하는 데 시간이 필요함
      // "Time in Force (TIF) GTE can only be used with open positions" 에러 방지
      this.logger.log(`[MONITOR] ⏳ Waiting 2s for Binance to recognize position...`);
      await this.delay(2000);

      let slOrder: any = null;
      let slRetryCount = 0;

      while (!slOrder && slRetryCount <= this.MAX_SLTP_RETRIES) {
        try {
          // 포지션 존재 확인 (closePosition 사용 전 필수)
          const positions = await this.okxService.getOpenPositions();
          const position = positions.find((p: any) => p.symbol === symbol);
          const positionAmt = position ? Math.abs(parseFloat(position.positionAmt)) : 0;

          if (positionAmt === 0) {
            slRetryCount++;
            this.logger.warn(`[MONITOR] Position not ready yet (retry ${slRetryCount}/${this.MAX_SLTP_RETRIES})`);
            if (slRetryCount <= this.MAX_SLTP_RETRIES) {
              await this.delay(2000);  // 2초 더 대기
            }
            continue;
          }

          // 기존 algo order 정리
          if (slRetryCount === 0) {
            try {
              const existingAlgoOrders = await this.okxService.getOpenAlgoOrders(symbol);
              const conflicting = existingAlgoOrders.filter(o =>
                (o.type === 'STOP_MARKET' || o.type === 'TAKE_PROFIT_MARKET') &&
                o.closePosition === true
              );
              for (const order of conflicting) {
                await this.okxService.cancelAlgoOrder(symbol, order.algoId);
              }
            } catch (cleanupError) {
              this.logger.warn(`[MONITOR] Cleanup error: ${cleanupError.message}`);
            }
          }

          const formattedSL = parseFloat(this.okxService.formatPrice(symbol, actualStopLoss));

          slOrder = await this.okxService.createAlgoOrder({
            symbol,
            side: signal.side === 'LONG' ? 'SELL' : 'BUY',
            type: 'STOP_MARKET',
            triggerPrice: formattedSL,
            closePosition: true,
          });

          this.logger.log(`[MONITOR] ✅ SL created: ${slOrder.algoId} @ ${formattedSL}`);
        } catch (slError: any) {
          if (slError.code === -4130 || slError.message?.includes('-4130')) {
            this.logger.log(`[MONITOR] SL already exists (verified via -4130)`);
            slOrder = { algoId: 'existing' };
          } else if (slError.code === -4509 || slError.message?.includes('-4509')) {
            // "TIF GTE can only be used with open positions" - 포지션 아직 미인식
            slRetryCount++;
            this.logger.warn(`[MONITOR] Position not recognized by Binance yet (retry ${slRetryCount}/${this.MAX_SLTP_RETRIES})`);
            if (slRetryCount <= this.MAX_SLTP_RETRIES) {
              await this.delay(2000);  // 2초 더 대기
            }
          } else {
            slRetryCount++;
            this.logger.warn(`[MONITOR] SL failed (${slRetryCount}/${this.MAX_SLTP_RETRIES}): ${slError.message}`);
            if (slRetryCount <= this.MAX_SLTP_RETRIES) {
              await this.delay(1000);
            }
          }
        }
      }

      // SL 생성 실패 시 긴급 청산
      if (!slOrder) {
        this.logger.error(`[MONITOR] 🚨 SL CREATION FAILED - EMERGENCY CLOSE!`);
        await this.emergencyClose(symbol, signal.side, executedQty);
        return;
      }

      // ═══════════════════════════════════════════════════════════
      // 3. TP 주문 생성 (TP Notional 검증 포함)
      // ═══════════════════════════════════════════════════════════
      const tpOrders: any[] = [];
      const MIN_TP_NOTIONAL = 10;
      const tp1Qty = executedQty * (signal.tp1Percent / 100);
      const tp2Qty = executedQty * (signal.tp2Percent / 100);
      const tp1Notional = tp1Qty * entryPrice;
      const tp2Notional = tp2Qty * entryPrice;

      const usePartialTP = tp1Notional >= MIN_TP_NOTIONAL && tp2Notional >= MIN_TP_NOTIONAL;

      if (!usePartialTP) {
        // 단일 TP (전체 포지션)
        const totalNotional = executedQty * entryPrice;
        if (totalNotional >= MIN_TP_NOTIONAL) {
          const formattedTP = parseFloat(this.okxService.formatPrice(symbol, actualTP1));
          const formattedQty = parseFloat(this.okxService.formatQuantity(symbol, executedQty));

          try {
            const tpOrder = await this.okxService.createAlgoOrder({
              symbol,
              side: signal.side === 'LONG' ? 'SELL' : 'BUY',
              type: 'TAKE_PROFIT_MARKET',
              triggerPrice: formattedTP,
              quantity: formattedQty,
            });
            tpOrders.push(tpOrder);
            this.logger.log(`[MONITOR] ✅ Single TP created: ${tpOrder.algoId} @ ${formattedTP}`);
          } catch (tpError: any) {
            this.logger.warn(`[MONITOR] TP failed: ${tpError.message} (will be handled by watchdog)`);
          }
        }
      } else {
        // 분할 TP (TP1 + TP2)
        const formattedTp1Qty = parseFloat(this.okxService.formatQuantity(symbol, tp1Qty));
        const formattedTp2Qty = parseFloat(this.okxService.formatQuantity(symbol, tp2Qty));

        // TP1
        try {
          const formattedTP1 = parseFloat(this.okxService.formatPrice(symbol, actualTP1));
          const tp1Order = await this.okxService.createAlgoOrder({
            symbol,
            side: signal.side === 'LONG' ? 'SELL' : 'BUY',
            type: 'TAKE_PROFIT_MARKET',
            triggerPrice: formattedTP1,
            quantity: formattedTp1Qty,
          });
          tpOrders.push(tp1Order);
          this.logger.log(`[MONITOR] ✅ TP1 created: ${tp1Order.algoId} @ ${formattedTP1}`);
        } catch (tp1Error: any) {
          this.logger.warn(`[MONITOR] TP1 failed: ${tp1Error.message}`);
        }

        // TP2
        try {
          const formattedTP2 = parseFloat(this.okxService.formatPrice(symbol, actualTP2));
          const tp2Order = await this.okxService.createAlgoOrder({
            symbol,
            side: signal.side === 'LONG' ? 'SELL' : 'BUY',
            type: 'TAKE_PROFIT_MARKET',
            triggerPrice: formattedTP2,
            quantity: formattedTp2Qty,
          });
          tpOrders.push(tp2Order);
          this.logger.log(`[MONITOR] ✅ TP2 created: ${tp2Order.algoId} @ ${formattedTP2}`);
        } catch (tp2Error: any) {
          this.logger.warn(`[MONITOR] TP2 failed: ${tp2Error.message}`);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 4. 포지션 DB 저장
      // ═══════════════════════════════════════════════════════════
      const plannedValues = {
        entry: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
      };

      const entrySlippage = entryPrice - plannedValues.entry;
      const entrySlippagePercent = (entrySlippage / plannedValues.entry) * 100;

      const position = this.positionRepo.create({
        symbol,
        strategy: signal.strategy,
        timeframe: signal.timeframe,
        side: signal.side,
        entryPrice,
        quantity: executedQty,
        leverage: signal.leverage,
        stopLoss: actualStopLoss,
        takeProfit1: actualTP1,
        takeProfit2: actualTP2,
        status: 'OPEN',
        openedAt: new Date(),
        metadata: {
          ...signal.metadata,
          planned: {
            entry: plannedValues.entry,
            stopLoss: plannedValues.stopLoss,
            takeProfit1: plannedValues.takeProfit1,
            takeProfit2: plannedValues.takeProfit2,
            tp1Percent: signal.tp1Percent,
            tp2Percent: signal.tp2Percent,
          },
          actual: {
            entry: entryPrice,
            stopLoss: actualStopLoss,
            takeProfit1: actualTP1,
            takeProfit2: actualTP2,
            entryOrderId: pending.orderId,
            entryTime: new Date().toISOString(),
            slAlgoId: slOrder?.algoId,
            tpAlgoIds: tpOrders.map(o => o.algoId),
          },
          slippage: {
            entry: entrySlippage,
            entryPercent: entrySlippagePercent,
          },
          signal: {
            score: signal.score,
            tier: signal.metadata?.tier,
            timeframe: signal.timeframe,
            obTop: signal.metadata?.obTop,
            obBottom: signal.metadata?.obBottom,
          },
          asyncFill: true,
        },
      });

      await this.positionRepo.save(position);
      this.logger.log(`[MONITOR] ✅ Position saved: ${symbol} ${signal.side}`);

      // 시그널 상태 업데이트
      if (signal.dbId) {
        await this.signalRepo.update(signal.dbId, { status: 'FILLED' });
        this.wsGateway.broadcastSignalUpdate({
          id: signal.dbId,
          symbol,
          status: 'FILLED',
        });
      }

      // 포지션 브로드캐스트
      this.wsGateway.broadcastPosition(position);

    } catch (error: any) {
      this.logger.error(`[MONITOR] onOrderFilled error: ${error.message}`);
      // 오류 발생 시 긴급 청산 고려
    }
  }

  /**
   * ✅ 주문 취소됨 처리
   */
  private async onOrderCanceled(pending: PendingLimitOrder, reason: string): Promise<void> {
    const signal = pending.signal;

    if (signal.dbId) {
      await this.signalRepo.update(signal.dbId, { status: 'CANCELED' });
      this.wsGateway.broadcastSignalUpdate({
        id: signal.dbId,
        symbol: pending.symbol,
        status: 'CANCELED',
        error: reason,
      });
    }

    this.logger.log(`[MONITOR] Order canceled: ${pending.symbol} - ${reason}`);
  }

  /**
   * ✅ 주문 취소 (타임아웃/OB 이탈)
   */
  private async cancelOrder(pending: PendingLimitOrder, reason: string): Promise<void> {
    try {
      await this.okxService.cancelOrder(pending.symbol, pending.orderId);
      this.logger.log(`[MONITOR] Order canceled: ${pending.symbol} - ${reason}`);
    } catch (cancelError: any) {
      this.logger.warn(`[MONITOR] Cancel failed: ${cancelError.message}`);

      // 취소 실패 시 주문 상태 재확인
      try {
        const finalStatus = await this.okxService.queryOrder(pending.symbol, pending.orderId);
        if (finalStatus.status === 'FILLED') {
          // 취소 직전에 체결된 경우
          const entryPrice = parseFloat(finalStatus.avgPrice || finalStatus.price);
          const executedQty = parseFloat(finalStatus.executedQty);
          await this.onOrderFilled(pending, entryPrice, executedQty);
          return;
        }
      } catch (queryError: any) {
        this.logger.warn(`[MONITOR] Query failed: ${queryError.message}`);
      }
    }

    await this.onOrderCanceled(pending, reason);
  }

  /**
   * ✅ 긴급 청산 (SL 생성 실패 시)
   */
  private async emergencyClose(symbol: string, side: 'LONG' | 'SHORT', quantity: number): Promise<void> {
    this.logger.error(
      `\n🚨🚨🚨 [EMERGENCY CLOSE] 🚨🚨🚨\n` +
      `  Symbol:   ${symbol}\n` +
      `  Side:     ${side}\n` +
      `  Quantity: ${quantity}\n` +
      `  → Closing position immediately!`
    );

    try {
      const closeOrder = await this.okxService.createOrder({
        symbol,
        side: side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity,
        reduceOnly: true,  // ✅ 필수: 새 포지션 오픈 방지
      });

      this.logger.log(`  ✅ Emergency close executed: ${closeOrder.orderId}`);
    } catch (closeError: any) {
      this.logger.error(`  ❌ Emergency close FAILED: ${closeError.message}`);
    }
  }

  /**
   * ✅ 바이낸스 API와 동기화 (60초마다)
   * - 서버 재시작 시 대기 주문 복구
   * - 로컬 상태와 실제 상태 검증
   */
  @Cron('*/60 * * * * *')  // 매 60초
  async syncWithBinance(): Promise<void> {
    this.logger.debug('[MONITOR] Syncing with Binance...');

    try {
      // 1. 바이낸스의 모든 오픈 LIMIT 주문 조회
      const binanceOrders = await this.okxService.getAllOpenOrders();
      const limitOrders = binanceOrders.filter((o: any) => o.type === 'LIMIT');

      // 2. 현재 오픈 포지션 조회
      const binancePositions = await this.okxService.getOpenPositions();
      const activeSymbols = new Set(
        binancePositions
          .filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0)
          .map((p: any) => p.symbol)
      );

      // 3. 로컬에서 추적 중인데 바이낸스에 없는 주문 정리
      for (const [symbol, pending] of this.pendingOrders) {
        const exists = limitOrders.find((o: any) =>
          o.symbol === symbol && o.orderId === pending.orderId
        );

        if (!exists) {
          // 바이낸스에 주문이 없음 - 이미 체결되었거나 취소됨
          // 포지션이 있으면 체결된 것
          if (activeSymbols.has(symbol)) {
            this.logger.warn(`[SYNC] ${symbol}: Order not found but position exists - was filled`);
            // 포지션이 있지만 DB에 없으면 처리 필요 (position-sync가 처리)
          } else {
            this.logger.warn(`[SYNC] ${symbol}: Order not found, no position - was canceled`);
          }
          this.removePendingOrder(symbol);
        }
      }

      // 4. 바이낸스에 있는데 로컬에 없는 LIMIT 주문 로깅 (정보 목적)
      for (const order of limitOrders) {
        if (!this.pendingOrders.has(order.symbol)) {
          this.logger.debug(
            `[SYNC] Unknown LIMIT order: ${order.symbol} #${order.orderId} (not tracked)`
          );
        }
      }

      this.logger.debug(
        `[SYNC] Complete | Pending: ${this.pendingOrders.size} | ` +
        `Binance LIMIT: ${limitOrders.length} | Active positions: ${activeSymbols.size}`
      );

    } catch (error: any) {
      this.logger.warn(`[SYNC] Error: ${error.message}`);
    }
  }

  /**
   * ✅ 전체 슬롯 사용량 반환 (포지션 제한용)
   * OPEN 포지션 + 대기 중 LIMIT 주문
   */
  async getTotalSlotUsage(): Promise<{
    openPositions: number;
    pendingOrders: number;
    total: number;
    openLongPositions: number;
    openShortPositions: number;
  }> {
    const openPositions = await this.positionRepo.count({ where: { status: 'OPEN' } });
    const openLongPositions = await this.positionRepo.count({ where: { status: 'OPEN', side: 'LONG' } });
    const openShortPositions = await this.positionRepo.count({ where: { status: 'OPEN', side: 'SHORT' } });
    const pendingOrders = this.pendingOrders.size;

    return {
      openPositions,
      pendingOrders,
      total: openPositions + pendingOrders,
      openLongPositions,
      openShortPositions,
    };
  }

  /**
   * ✅ 대기 중 특정 방향 주문 개수
   */
  getPendingOrderCountBySide(side: 'LONG' | 'SHORT'): number {
    let count = 0;
    for (const pending of this.pendingOrders.values()) {
      if (pending.side === side) {
        count++;
      }
    }
    return count;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
