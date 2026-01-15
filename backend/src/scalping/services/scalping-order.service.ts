import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OkxService } from '../../okx/okx.service';
import { ScalpingSignalService } from './scalping-signal.service';
import { ScalpingPositionService } from './scalping-position.service';
import { ScalpingDataService } from './scalping-data.service';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';
import { Signal } from '../../database/entities/signal.entity';
import { Position } from '../../database/entities/position.entity';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import {
  ScalpingSignal,
  ScalpingPosition,
  PendingOrder,
  CloseReason,
} from '../interfaces';

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

  // 서비스 활성화 상태
  private isEnabled: boolean = false;

  // 심볼별 DB Signal ID 매핑 (시그널 상태 업데이트용)
  private signalIdMap: Map<string, number> = new Map();
  // 심볼별 DB Position ID 매핑 (포지션 상태 업데이트용)
  private positionIdMap: Map<string, number> = new Map();

  constructor(
    private readonly okxService: OkxService,
    private readonly signalService: ScalpingSignalService,
    private readonly positionService: ScalpingPositionService,
    private readonly dataService: ScalpingDataService,
    private readonly wsGateway: AppWebSocketGateway,
    @InjectRepository(Signal) private readonly signalRepository: Repository<Signal>,
    @InjectRepository(Position) private readonly positionRepository: Repository<Position>,
  ) {
    this.logger.log('[ScalpingOrder] Order service initialized');
  }

  /**
   * 서비스 활성화/비활성화
   */
  enable(): void {
    this.isEnabled = true;
    this.logger.log('[ScalpingOrder] ✅ Service ENABLED - Trading active');
  }

  disable(): void {
    this.isEnabled = false;
    this.logger.log('[ScalpingOrder] ⛔ Service DISABLED - Trading paused');
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * 메인 실행 루프
   *
   * 매 10초마다 실행:
   * 1. 새 시그널 확인 및 주문
   * 2. 미체결 주문 관리
   * 3. 포지션 관리
   */
  @Cron('*/10 * * * * *') // 매 10초
  async executeLoop(): Promise<void> {
    if (!this.isEnabled) {
      return; // 비활성화 시 스킵
    }

    try {
      const positions = this.positionService.getActivePositions();
      const pendingOrders = this.positionService.getAllPendingOrders();
      this.logger.log(
        `[ScalpingOrder] 🔄 Loop start | Signals=${this.signalService.getActiveSignals().length} ` +
          `Pending=${pendingOrders.length} Positions=${positions.length}`,
      );
      // 1. 새 시그널 처리
      await this.processNewSignals();

      // 2. 미체결 주문 관리
      await this.managePendingOrders();

      // 3. 포지션 관리
      await this.managePositions();
      this.logger.log('[ScalpingOrder] ✅ Loop completed');
    } catch (error) {
      this.logger.error('[ScalpingOrder] ✗ Execute loop failed', error);
    }
  }

  /**
   * STEP 6 + 7: 새 시그널 처리 및 주문 실행
   */
  private async processNewSignals(): Promise<void> {
    const signals = this.signalService.getActiveSignals();

    if (signals.length === 0) {
      this.logger.debug('[ScalpingOrder] No active signals');
      return;
    }

    this.logger.log('────────────────────────────────────────────────────────────');
    this.logger.log(
      `[ScalpingOrder] Processing ${signals.length} signal(s)...`,
    );

    // 현재 상태 로깅
    const positions = this.positionService.getActivePositions();
    const pendingOrders = this.positionService.getAllPendingOrders();
    const longCount = positions.filter((p) => p.direction === 'LONG').length +
      pendingOrders.filter((o) => o.direction === 'LONG').length;
    const shortCount = positions.filter((p) => p.direction === 'SHORT').length +
      pendingOrders.filter((o) => o.direction === 'SHORT').length;

    this.logger.log(
      `[ScalpingOrder] Current: Positions=${positions.length}/${SCALPING_CONFIG.risk.maxPositions} (L:${longCount}, S:${shortCount})`,
    );

    for (const signal of signals) {
      // 이미 해당 종목 포지션/주문 있으면 스킵
      if (this.positionService.hasPositionOrOrder(signal.symbol)) {
        this.logger.debug(
          `[ScalpingOrder] [${signal.symbol}] Skip - already has position/order`,
        );
        continue;
      }

      // 리스크 체크
      const riskCheck = this.positionService.canEnterNewPosition(signal.direction);
      if (!riskCheck.allowed) {
        this.logger.log(
          `[ScalpingOrder] [${signal.symbol}] ⚠️ Risk check failed: ${riskCheck.reason}`,
        );
        continue;
      }

      // 주문 실행
      await this.placeOrder(signal);
    }
  }

  /**
   * 주문 실행
   */
  private async placeOrder(signal: ScalpingSignal): Promise<void> {
    try {
      // ✅ 잔액 체크 (주문 전)
      const availableBalance = await this.okxService.getAvailableBalance();
      const requiredMargin = SCALPING_CONFIG.risk.fixedMarginUsdt;

      if (availableBalance < requiredMargin) {
        this.logger.warn(
          `[ScalpingOrder] [${signal.symbol}] ⚠️ Insufficient balance: $${availableBalance.toFixed(2)} < $${requiredMargin} required`,
        );
        return;
      }

      this.logger.log(
        `[ScalpingOrder] [${signal.symbol}] 📝 Placing ${signal.direction} order... (Balance: $${availableBalance.toFixed(2)})`,
      );

      // 포지션 사이즈 계산
      const quantity = await this.calculatePositionSize(signal);

      if (quantity <= 0) {
        this.logger.warn(
          `[ScalpingOrder] [${signal.symbol}] ⚠️ Invalid quantity: ${quantity}`,
        );
        return;
      }

      // Limit 주문 생성
      // ⚠️ 스캘핑에서는 방향 반전 없이 직접 매매
      // LONG = BUY, SHORT = SELL
      const side = signal.direction === 'LONG' ? 'BUY' : 'SELL';
      const currentPrice = await this.dataService.getCurrentPrice(signal.symbol);
      if (currentPrice) {
        const likelyTaker =
          (side === 'BUY' && signal.entryPrice >= currentPrice) ||
          (side === 'SELL' && signal.entryPrice <= currentPrice);
        this.logger.log(
          `[ScalpingOrder] [${signal.symbol}] Entry check | ` +
            `Current=${currentPrice.toFixed(4)}, Entry=${signal.entryPrice.toFixed(4)}, ` +
            `Side=${side}, Likely=${likelyTaker ? 'TAKER' : 'MAKER'}`,
        );
      }

      this.logger.log(
        `[ScalpingOrder] [${signal.symbol}] Creating LIMIT ${side} @ ${signal.entryPrice.toFixed(4)}, qty=${quantity}`,
      );

      // 레버리지 설정 (폴백 지원: 15 → 10 → 5)
      await this.okxService.changeLeverage(
        signal.symbol,
        SCALPING_CONFIG.risk.leverageFallback,
      );

      // Limit 주문 (reduceOnly: false → 신규 진입, 하지만 스캘핑은 반전 없음)
      // OkxService의 createOrder는 기본적으로 반전함
      // 스캘핑은 직접 매매이므로 reduceOnly=true로 설정하여 반전 방지
      // 또는 직접 API 호출
      const order = await this.createLimitOrderDirect(
        signal.symbol,
        side,
        quantity,
        signal.entryPrice,
      );

      if (!order) {
        this.logger.error(
          `[ScalpingOrder] [${signal.symbol}] ✗ Order creation failed`,
        );
        return;
      }

      this.logger.log(
        `[ScalpingOrder] [${signal.symbol}] ✓ Order placed: orderId=${order.orderId}`,
      );

      // DB에 시그널 저장
      const signalEntity = this.signalRepository.create({
        strategy: 'SCALPING',
        symbol: signal.symbol,
        timeframe: '5m',
        side: signal.direction,
        entryPrice: signal.entryPrice,
        stopLoss: signal.slPrice,
        takeProfit1: signal.tpPrice,
        leverage: SCALPING_CONFIG.risk.leverage,
        score: signal.strength,
        timestamp: new Date(),
        status: 'PENDING',
        metadata: {
          trend: signal.trend,
          momentum: signal.momentum,
          cvd: signal.cvd,
          fundingRate: signal.fundingRate,
          atr: signal.atr,
          orderId: order.orderId,
        },
      });
      const savedSignal = await this.signalRepository.save(signalEntity);
      this.signalIdMap.set(signal.symbol, savedSignal.id);

      // 프론트엔드에 시그널 브로드캐스트
      this.wsGateway.broadcastSignal({
        id: savedSignal.id,
        symbol: signal.symbol,
        direction: signal.direction,
        side: signal.direction === 'LONG' ? 'BUY' : 'SELL',
        entryPrice: signal.entryPrice,
        tpPrice: signal.tpPrice,
        slPrice: signal.slPrice,
        strength: signal.strength,
        status: 'PENDING',
        strategy: 'SCALPING',
        createdAt: new Date().toISOString(),
      });

      // 대기 주문 등록
      const pendingOrder: PendingOrder = {
        symbol: signal.symbol,
        orderId: order.orderId,
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        tpPrice: signal.tpPrice,
        slPrice: signal.slPrice,
        quantity,
        createdAt: Date.now(),
        signal,
      };

      this.positionService.addPendingOrder(pendingOrder);
    } catch (error) {
      this.logger.error(
        `[ScalpingOrder] [${signal.symbol}] ✗ Order placement failed`,
        error,
      );
    }
  }

  /**
   * 직접 Limit 주문 생성 (반전 없음)
   */
  private async createLimitOrderDirect(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
  ): Promise<any> {
    try {
      // 스캘핑은 방향 반전 없이 직접 실행
      // reverseEntry: false = LONG → BUY, SHORT → SELL

      const result = await this.okxService.createOrder({
        symbol,
        side,
        type: 'LIMIT',
        quantity,
        price,
        reduceOnly: false, // 신규 포지션
        timeInForce: 'GTC',
        reverseEntry: false, // ✅ 스캘핑: 방향 반전 없음
      });

      return result;
    } catch (error) {
      this.logger.error(`[ScalpingOrder] Direct order failed:`, error);
      return null;
    }
  }

  /**
   * 포지션 사이즈 계산
   */
  private async calculatePositionSize(signal: ScalpingSignal): Promise<number> {
    try {
      // 고정 마진 사용
      const marginUsdt = SCALPING_CONFIG.risk.fixedMarginUsdt;
      const leverage = SCALPING_CONFIG.risk.leverage;

      // 포지션 가치 = 마진 × 레버리지
      const notionalValue = marginUsdt * leverage;

      // 수량 = 포지션 가치 / 진입가
      const quantity = notionalValue / signal.entryPrice;

      this.logger.debug(
        `[ScalpingOrder] [${signal.symbol}] Position size: margin=$${marginUsdt}, leverage=${leverage}x, qty=${quantity.toFixed(6)}`,
      );

      return quantity;
    } catch (error) {
      this.logger.error(
        `[ScalpingOrder] [${signal.symbol}] Position size calculation failed`,
        error,
      );
      return 0;
    }
  }

  /**
   * 미체결 주문 관리
   */
  private async managePendingOrders(): Promise<void> {
    const pendingOrders = this.positionService.getAllPendingOrders();

    if (pendingOrders.length === 0) {
      this.logger.debug('[ScalpingOrder] No pending orders to manage');
      return;
    }

    this.logger.log(
      `[ScalpingOrder] 🧾 Managing ${pendingOrders.length} pending order(s)`,
    );
    const now = Date.now();
    const timeout = SCALPING_CONFIG.order.unfillTimeoutSec * 1000;

    for (const pending of pendingOrders) {
      try {
        // 주문 상태 확인
        const orderStatus = await this.okxService.queryOrder(
          pending.symbol,
          pending.orderId,
        );

        if (!orderStatus) {
          this.logger.warn(
            `[ScalpingOrder] [${pending.symbol}] Order status unknown`,
          );
          continue;
        }

        const status = orderStatus.status || orderStatus.state;

        if (status === 'FILLED' || status === 'filled') {
          // 체결됨 → 포지션 등록 + TP/SL
          this.logger.log(
            `[ScalpingOrder] [${pending.symbol}] Order filled detected, processing TP/SL`,
          );
          await this.onOrderFilled(pending, orderStatus);
          this.positionService.removePendingOrder(pending.symbol);
        } else if (
          status === 'CANCELED' ||
          status === 'canceled' ||
          status === 'EXPIRED'
        ) {
          // 취소됨
          this.logger.log(
            `[ScalpingOrder] [${pending.symbol}] Order ${status}`,
          );
          this.positionService.removePendingOrder(pending.symbol);
        } else if (now - pending.createdAt > timeout) {
          // 타임아웃 → 취소
          this.logger.log(
            `[ScalpingOrder] [${pending.symbol}] Order timeout - canceling...`,
          );
          await this.okxService.cancelOrder(pending.symbol, pending.orderId);
          this.positionService.removePendingOrder(pending.symbol);
        }
      } catch (error) {
        this.logger.error(
          `[ScalpingOrder] [${pending.symbol}] Pending order management failed`,
          error,
        );
      }
    }
    this.logger.log('[ScalpingOrder] ✅ Pending order management completed');
  }

  /**
   * 주문 체결 시 처리
   */
  private async onOrderFilled(
    pending: PendingOrder,
    orderStatus: any,
  ): Promise<void> {
    const filledPrice = parseFloat(
      orderStatus.avgPx || orderStatus.avgPrice || orderStatus.price || pending.entryPrice,
    );
    const filledQty = parseFloat(
      orderStatus.fillSz || orderStatus.executedQty || pending.quantity,
    );

    this.logger.log(
      `[ScalpingOrder] [${pending.symbol}] ✅ ORDER FILLED @ ${filledPrice.toFixed(4)}`,
    );

    // TP1/SL 주문 설정 (부분 청산: TP1에서 50% 청산)
    const tpSide = pending.direction === 'LONG' ? 'SELL' : 'BUY';
    const tp1Price = pending.signal.tp1Price || pending.tpPrice;
    const tp2Price = pending.signal.tp2Price;

    try {
      // TP1과 SL 설정 (TP1에서 50% 청산)
      // OKX는 부분 청산을 지원하므로 TP1에 50% 수량 설정
      const tp1QuantityRaw = filledQty * 0.5; // 50% 청산
      
      // Lot size로 반올림
      const lotSizeInfo = this.okxService.getLotSizeInfo(pending.symbol);
      const lotSz = lotSizeInfo.stepSize;
      const tp1Quantity = Math.floor(tp1QuantityRaw / lotSz) * lotSz;
      
      // 최소 수량 체크
      if (tp1Quantity < lotSz) {
        this.logger.warn(
          `[ScalpingOrder] [${pending.symbol}] TP1 quantity too small: ${tp1Quantity} < ${lotSz}, using full quantity`,
        );
        // 전체 수량 사용
        await this.okxService.createTpSlOrder({
          symbol: pending.symbol,
          side: tpSide,
          quantity: filledQty,
          tpTriggerPrice: tp1Price,
          slTriggerPrice: pending.slPrice,
          isStrategyPosition: false,
        });
      } else {
        // SL 가격 검증 (롱일 때 SL < 현재가, 숏일 때 SL > 현재가)
        const currentPrice = parseFloat(orderStatus.avgPx || orderStatus.avgPrice || orderStatus.price || filledPrice);
        const slPrice = pending.slPrice;
        
        let validSlPrice = slPrice;
        if (pending.direction === 'LONG' && slPrice >= currentPrice) {
          // 롱 포지션: SL은 현재가보다 낮아야 함
          validSlPrice = currentPrice * 0.999; // 현재가의 99.9%로 조정
          this.logger.warn(
            `[ScalpingOrder] [${pending.symbol}] SL price adjusted: ${slPrice.toFixed(4)} → ${validSlPrice.toFixed(4)} (LONG position)`,
          );
        } else if (pending.direction === 'SHORT' && slPrice <= currentPrice) {
          // 숏 포지션: SL은 현재가보다 높아야 함
          validSlPrice = currentPrice * 1.001; // 현재가의 100.1%로 조정
          this.logger.warn(
            `[ScalpingOrder] [${pending.symbol}] SL price adjusted: ${slPrice.toFixed(4)} → ${validSlPrice.toFixed(4)} (SHORT position)`,
          );
        }
        
        await this.okxService.createTpSlOrder({
          symbol: pending.symbol,
          side: tpSide,
          quantity: tp1Quantity,  // TP1: 50% 청산 (lot size 반올림)
          tpTriggerPrice: tp1Price,
          slTriggerPrice: validSlPrice,
          isStrategyPosition: false, // 스캘핑은 직접 매매, 반전 없음
        });
      }
      
      this.logger.log(
        `[ScalpingOrder] [${pending.symbol}] ✅ TP1/SL set | TP1: ${tp1Price.toFixed(4)} (50%), SL: ${pending.slPrice.toFixed(4)}, Qty: ${tp1Quantity}`,
      );
      
      // TP2가 있으면 별도 주문으로 설정 (나머지 50%)
      if (tp2Price) {
        // TP2는 TP1 도달 후 수동으로 설정하거나, 별도 알고 주문으로 설정
        // 여기서는 포지션 관리 로직에서 처리
      }
    } catch (e: any) {
      this.logger.error(
        `[ScalpingOrder] [${pending.symbol}] ✗ Failed to set TP1/SL: ${e.message}`,
      );
    }

    // 포지션 등록
    const position: ScalpingPosition = {
      symbol: pending.symbol,
      direction: pending.direction,
      entryPrice: filledPrice,
      quantity: filledQty,
      tpPrice: pending.tpPrice, // 단일 TP (fallback)
      tp1Price: tp1Price, // 부분 청산 TP1
      tp2Price: tp2Price, // 부분 청산 TP2
      slPrice: pending.slPrice,
      originalTpPrice: pending.tpPrice,
      tpReduced: false,
      tp1Filled: false, // TP1 청산 완료 여부
      status: 'OPEN',
      mainOrderId: pending.orderId,
      enteredAt: Date.now(),
      signal: pending.signal,
    };

    this.positionService.addPosition(position);

    // DB에 포지션 저장
    const positionEntity = this.positionRepository.create({
      symbol: pending.symbol,
      strategy: 'SCALPING',
      timeframe: '5m',
      side: pending.direction,
      entryPrice: filledPrice,
      quantity: filledQty,
      leverage: SCALPING_CONFIG.risk.leverage,
      stopLoss: pending.slPrice,
      takeProfit1: tp1Price, // TP1 가격
      takeProfit2: tp2Price, // TP2 가격 (있을 경우)
      status: 'OPEN',
      openedAt: new Date(),
      metadata: {
        orderId: pending.orderId,
        signal: pending.signal,
      },
    });
    const savedPosition = await this.positionRepository.save(positionEntity);
    this.positionIdMap.set(pending.symbol, savedPosition.id);

    // Signal 상태 DB 업데이트
    const signalId = this.signalIdMap.get(pending.symbol);
    if (signalId) {
      await this.signalRepository.update(signalId, { status: 'FILLED' });
      this.signalIdMap.delete(pending.symbol);
    }

    // 프론트엔드에 포지션 브로드캐스트
    this.wsGateway.broadcastPosition({
      id: savedPosition.id,
      symbol: position.symbol,
      side: position.direction,
      entryPrice: position.entryPrice,
      positionAmt: position.quantity,
      leverage: SCALPING_CONFIG.risk.leverage,
      unrealizedPnl: 0,
      marginType: 'isolated',
      tpPrice: position.tpPrice,
      slPrice: position.slPrice,
      strategy: 'SCALPING',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    });

    // 시그널 상태 업데이트 (FILLED)
    this.wsGateway.broadcastSignalUpdate({
      id: signalId || Date.now(),
      symbol: pending.symbol,
      status: 'FILLED',
    });
  }

  /**
   * STEP 8: 포지션 관리 (시간 기반)
   */
  private async managePositions(): Promise<void> {
    const positions = this.positionService.getActivePositions();

    if (positions.length === 0) {
      this.logger.debug('[ScalpingOrder] No active positions to manage');
      return;
    }

    this.logger.log(
      `[ScalpingOrder] 📌 Managing ${positions.length} active position(s)`,
    );
    const now = Date.now();

    for (const position of positions) {
      const elapsedSec = (now - position.enteredAt) / 1000;
      const elapsedMinutes = Math.floor(elapsedSec / 60);
      const elapsedSeconds = Math.floor(elapsedSec % 60);

      try {
        // 현재 가격 조회
        const currentPrice = await this.dataService.getCurrentPrice(
          position.symbol,
        );
        if (!currentPrice) continue;

        const pnlPercent = this.calculatePnlPercent(position, currentPrice);

        // 부분 청산 체크: TP1 도달 시 50% 청산
        if (position.tp1Price && !position.tp1Filled) {
          const tp1Hit = position.direction === 'LONG'
            ? currentPrice >= position.tp1Price
            : currentPrice <= position.tp1Price;

          if (tp1Hit) {
            this.logger.log(
              `[ScalpingOrder] [${position.symbol}] 🎯 TP1 HIT @ ${currentPrice.toFixed(4)} - Partial closing 50%`,
            );
            await this.partialClosePosition(position, currentPrice, 0.5, 'TP1_HIT');
            continue;
          }
        }

        // TP2 체크 (TP1 청산 후)
        if (position.tp2Price && position.tp1Filled) {
          const tp2Hit = position.direction === 'LONG'
            ? currentPrice >= position.tp2Price
            : currentPrice <= position.tp2Price;

          if (tp2Hit) {
            this.logger.log(
              `[ScalpingOrder] [${position.symbol}] 🎯 TP2 HIT @ ${currentPrice.toFixed(4)} - Closing remaining 50%`,
            );
            await this.closePosition(position, currentPrice, 'TP2_HIT');
            continue;
          }
        }

        // 상세 로깅 (5분마다)
        if (Math.floor(elapsedSec) % 300 < 10) {
          this.logger.log(
            `[ScalpingOrder] [${position.symbol}] ${position.direction} | ` +
              `Elapsed: ${elapsedMinutes}m ${elapsedSeconds}s | ` +
              `PnL: ${pnlPercent >= 0 ? '+' : ''}${(pnlPercent * 100).toFixed(2)}%` +
              (position.tp1Filled ? ' | TP1 Filled' : ''),
          );
        }

        // 1. 시간 기반 TP 축소 (20분 경과)
        if (
          elapsedSec >= SCALPING_CONFIG.position.tpReduceTimeSec &&
          !position.tpReduced
        ) {
          await this.reduceTp(position);
        }

        // 2. 본전 청산 (25분 경과) - 조건부 청산 (최소 수익률 이상일 때만)
        if (
          elapsedSec >= SCALPING_CONFIG.position.breakevenTimeSec &&
          pnlPercent >= SCALPING_CONFIG.position.breakevenMinProfit
        ) {
          this.logger.log(
            `[ScalpingOrder] [${position.symbol}] ⏰ Breakeven timeout (${elapsedMinutes}m) - closing at +${(pnlPercent * 100).toFixed(2)}%`,
          );
          await this.closePosition(position, currentPrice, 'BREAKEVEN_TIMEOUT');
          continue;
        }

        // 3. 강제 청산 (30분 경과) - 수익 중일 때만
        // 손실 중이면 SL까지 대기 (강제 청산으로 큰 손실 방지)
        if (elapsedSec >= SCALPING_CONFIG.position.maxHoldTimeSec) {
          if (pnlPercent >= 0) {
            this.logger.warn(
              `[ScalpingOrder] [${position.symbol}] ⏰ MAX TIME (${elapsedMinutes}m) - closing at +${(pnlPercent * 100).toFixed(2)}%`,
            );
            await this.closePosition(position, currentPrice, 'MAX_TIME_TIMEOUT');
            continue;
          } else {
            // 손실 중이면 SL까지 대기 (로깅만)
            if (Math.floor(elapsedSec) % 60 < 10) {
              this.logger.log(
                `[ScalpingOrder] [${position.symbol}] ⏰ MAX TIME exceeded but in loss (${(pnlPercent * 100).toFixed(2)}%) - waiting for SL`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `[ScalpingOrder] [${position.symbol}] Position management failed`,
          error,
        );
      }
    }
    this.logger.log('[ScalpingOrder] ✅ Position management completed');
  }

  /**
   * TP 축소
   */
  private async reduceTp(position: ScalpingPosition): Promise<void> {
    const newTpPrice = this.calculateReducedTp(position);

    this.logger.log(
      `[ScalpingOrder] [${position.symbol}] 📉 Reducing TP: ${position.tpPrice.toFixed(4)} → ${newTpPrice.toFixed(4)} (50%)`,
    );

    try {
      // 기존 알고 주문 취소
      await this.okxService.cancelAllAlgoOrders(position.symbol);

      // 새 TP/SL 설정 (OKX는 closeFraction="1" 주문을 하나만 허용)
      const tpSide = position.direction === 'LONG' ? 'SELL' : 'BUY';

      await this.okxService.createTpSlOrder({
        symbol: position.symbol,
        side: tpSide,
        quantity: position.quantity,  // ✅ 수량 추가
        tpTriggerPrice: newTpPrice,
        slTriggerPrice: position.slPrice,
        isStrategyPosition: false,
      });

      // 포지션 업데이트
      this.positionService.updatePosition(position.symbol, {
        tpPrice: newTpPrice,
        tpReduced: true,
      });

      this.logger.log(
        `[ScalpingOrder] [${position.symbol}] ✓ TP reduced successfully | New TP: ${newTpPrice.toFixed(4)}, SL: ${position.slPrice.toFixed(4)}`,
      );
    } catch (error) {
      this.logger.error(
        `[ScalpingOrder] [${position.symbol}] ✗ TP reduction failed`,
        error,
      );
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
   * 부분 청산 (TP1 도달 시 50% 청산)
   */
  private async partialClosePosition(
    position: ScalpingPosition,
    currentPrice: number,
    closeRatio: number, // 0.5 = 50%
    reason: CloseReason,
  ): Promise<void> {
    try {
      this.logger.log(
        `[ScalpingOrder] [${position.symbol}] 🔒 Partial closing ${(closeRatio * 100).toFixed(0)}% (${reason})...`,
      );

      // 알고 주문 취소
      await this.okxService.cancelAllAlgoOrders(position.symbol);

      // 부분 청산 수량 계산 (lot size 반올림)
      const closeQuantityRaw = position.quantity * closeRatio;
      const lotSizeInfo = this.okxService.getLotSizeInfo(position.symbol);
      const lotSz = lotSizeInfo.stepSize;
      const closeQuantity = Math.floor(closeQuantityRaw / lotSz) * lotSz;
      const remainingQuantity = position.quantity - closeQuantity;
      
      // 최소 수량 체크
      if (closeQuantity < lotSz) {
        this.logger.warn(
          `[ScalpingOrder] [${position.symbol}] Close quantity too small: ${closeQuantity} < ${lotSz}, skipping partial close`,
        );
        return;
      }

      // 시장가 부분 청산
      const closeSide = position.direction === 'LONG' ? 'SELL' : 'BUY';

      await this.okxService.createOrder({
        symbol: position.symbol,
        side: closeSide,
        type: 'MARKET',
        quantity: closeQuantity,
        reduceOnly: true,
        reverseEntry: false,
      });

      // 부분 청산 손익 계산
      const pnlPercent = this.calculatePnlPercent(position, currentPrice);
      const realizedPnl = pnlPercent * closeQuantity * position.entryPrice;

      // 포지션 수량 업데이트
      this.positionService.updatePosition(position.symbol, {
        quantity: remainingQuantity,
        tp1Filled: true, // TP1 청산 완료
      });

      // TP2가 있으면 TP2 주문 설정 (나머지 수량도 lot size 반올림)
      if (position.tp2Price && remainingQuantity >= lotSz) {
        const tpSide = position.direction === 'LONG' ? 'SELL' : 'BUY';
        const remainingQtyRounded = Math.floor(remainingQuantity / lotSz) * lotSz;
        
        if (remainingQtyRounded >= lotSz) {
          await this.okxService.createTpSlOrder({
            symbol: position.symbol,
            side: tpSide,
            quantity: remainingQtyRounded, // 나머지 50% (lot size 반올림)
            tpTriggerPrice: position.tp2Price,
            slTriggerPrice: position.slPrice,
            isStrategyPosition: false,
          });
          this.logger.log(
            `[ScalpingOrder] [${position.symbol}] ✅ TP2/SL set for remaining 50% | TP2: ${position.tp2Price.toFixed(4)}, Qty: ${remainingQtyRounded}`,
          );
        } else {
          this.logger.warn(
            `[ScalpingOrder] [${position.symbol}] Remaining quantity too small for TP2: ${remainingQuantity} < ${lotSz}`,
          );
        }
      }

      // DB 업데이트 (부분 청산 기록)
      const positionId = this.positionIdMap.get(position.symbol);
      if (positionId) {
        await this.positionRepository
          .createQueryBuilder()
          .update(Position)
          .set({
            quantity: remainingQuantity,
            metadata: () => `metadata || '${JSON.stringify({ tp1Filled: true, partialClose: { reason, pnlPercent, quantity: closeQuantity } })}'::jsonb`,
          })
          .where('id = :id', { id: positionId })
          .execute();
      }

      this.logger.log(
        `[ScalpingOrder] [${position.symbol}] ✅ Partial closed ${(closeRatio * 100).toFixed(0)}% | ` +
          `PnL: ${pnlPercent >= 0 ? '+' : ''}${(pnlPercent * 100).toFixed(2)}% | ` +
          `Remaining: ${remainingQuantity.toFixed(6)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[ScalpingOrder] [${position.symbol}] ✗ Partial close failed`,
        error,
      );
    }
  }

  /**
   * 포지션 청산
   */
  private async closePosition(
    position: ScalpingPosition,
    currentPrice: number,
    reason: CloseReason,
  ): Promise<void> {
    try {
      this.logger.log(
        `[ScalpingOrder] [${position.symbol}] 🔒 Closing position (${reason})...`,
      );

      // 알고 주문 취소
      await this.okxService.cancelAllAlgoOrders(position.symbol);

      // 시장가 청산
      const closeSide = position.direction === 'LONG' ? 'SELL' : 'BUY';

      await this.okxService.createOrder({
        symbol: position.symbol,
        side: closeSide,
        type: 'MARKET',
        quantity: position.quantity,
        reduceOnly: true,
        reverseEntry: false, // ✅ 스캘핑: 방향 반전 없음
      });

      // 손익 계산
      const pnlPercent = this.calculatePnlPercent(position, currentPrice);

      // 손익 기록
      this.positionService.recordPnl(pnlPercent, reason);

      // 포지션 제거
      this.positionService.removePosition(position.symbol);

      // DB 포지션 상태 업데이트
      const positionId = this.positionIdMap.get(position.symbol);
      if (positionId) {
        const realizedPnl = pnlPercent * position.quantity * position.entryPrice;
        await this.positionRepository
          .createQueryBuilder()
          .update(Position)
          .set({
            status: 'CLOSED',
            closedAt: new Date(),
            realizedPnl,
            metadata: () => `metadata || '${JSON.stringify({ closeReason: reason, pnlPercent })}'::jsonb`,
          })
          .where('id = :id', { id: positionId })
          .execute();
        this.positionIdMap.delete(position.symbol);
      }

      // 프론트엔드에 포지션 청산 브로드캐스트
      this.wsGateway.broadcastPosition({
        id: positionId,
        symbol: position.symbol,
        side: position.direction,
        entryPrice: position.entryPrice,
        positionAmt: 0,
        leverage: SCALPING_CONFIG.risk.leverage,
        unrealizedPnl: pnlPercent * position.quantity * position.entryPrice,
        marginType: 'isolated',
        tpPrice: position.tpPrice,
        slPrice: position.slPrice,
        strategy: 'SCALPING',
        status: 'CLOSED',
        closeReason: reason,
        pnlPercent,
        closedAt: new Date().toISOString(),
      });

      this.logger.log(
        `[ScalpingOrder] [${position.symbol}] ✅ Position closed | ` +
          `PnL: ${pnlPercent >= 0 ? '+' : ''}${(pnlPercent * 100).toFixed(2)}% | ` +
          `Reason: ${reason}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[ScalpingOrder] [${position.symbol}] ✗ Close position failed`,
        error,
      );

      // ✅ OKX에서 "포지션 없음" 에러(51169)가 오면 내부 추적에서 제거
      // 이미 청산되었거나 외부에서 청산된 경우
      const errorMsg = error?.message || '';
      if (errorMsg.includes('51169') || errorMsg.includes("don't have any positions")) {
        this.logger.warn(
          `[ScalpingOrder] [${position.symbol}] 🧹 Position already closed on OKX - removing from tracking`,
        );
        this.positionService.removePosition(position.symbol);

        // DB 상태도 업데이트
        const positionId = this.positionIdMap.get(position.symbol);
        if (positionId) {
          await this.positionRepository
            .createQueryBuilder()
            .update(Position)
            .set({
              status: 'CLOSED',
              closedAt: new Date(),
              metadata: () => `metadata || '${JSON.stringify({ closeReason: 'EXTERNAL_CLOSE' })}'::jsonb`,
            })
            .where('id = :id', { id: positionId })
            .execute();
          this.positionIdMap.delete(position.symbol);
        }
      }
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
   * 상태 로깅
   */
  logStatus(): void {
    this.positionService.logStatus();
  }
}
