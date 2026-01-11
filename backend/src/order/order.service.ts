import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BinanceService } from '../binance/binance.service';
import { Position } from '../database/entities/position.entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  // ✅ 중복 포지션 방지: 현재 처리 중인 심볼 추적
  // PositionSyncService에서 확인하여 MANUAL 포지션 중복 생성 방지
  private static pendingSymbols: Set<string> = new Set();

  // ✅ Fill Rate 모니터링 통계
  private orderStats = {
    total: 0,
    filled: 0,
    skipped: 0,
    canceled: 0,
    failed: 0,
    // 스킵 사유별 분류
    skipReasons: {} as Record<string, number>,
    // 시간별 통계 (최근 1시간)
    recentOrders: [] as Array<{ time: number; status: string; symbol: string }>,
  };

  constructor(
    private binanceService: BinanceService,
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
  ) {
    // 1시간마다 통계 로깅
    setInterval(() => this.logOrderStats(), 60 * 60 * 1000);
  }

  /**
   * ✅ Fill Rate 통계 로깅
   */
  private logOrderStats() {
    if (this.orderStats.total === 0) return;

    const fillRate = ((this.orderStats.filled / this.orderStats.total) * 100).toFixed(1);
    const skipRate = ((this.orderStats.skipped / this.orderStats.total) * 100).toFixed(1);
    const cancelRate = ((this.orderStats.canceled / this.orderStats.total) * 100).toFixed(1);

    this.logger.log(
      `\n📊 [ORDER STATISTICS]\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `  Total Orders:   ${this.orderStats.total}\n` +
      `  Filled:         ${this.orderStats.filled} (${fillRate}%)\n` +
      `  Skipped:        ${this.orderStats.skipped} (${skipRate}%)\n` +
      `  Canceled:       ${this.orderStats.canceled} (${cancelRate}%)\n` +
      `  Failed:         ${this.orderStats.failed}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `  📌 Skip Reasons:\n` +
      Object.entries(this.orderStats.skipReasons)
        .map(([reason, count]) => `    - ${reason}: ${count}`)
        .join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

    // 최근 1시간 데이터만 유지
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.orderStats.recentOrders = this.orderStats.recentOrders.filter(o => o.time > oneHourAgo);
  }

  /**
   * ✅ 주문 결과 통계 기록
   */
  private recordOrderResult(symbol: string, status: string, reason?: string) {
    this.orderStats.total++;
    this.orderStats.recentOrders.push({ time: Date.now(), status, symbol });

    switch (status) {
      case 'FILLED':
        this.orderStats.filled++;
        break;
      case 'SKIPPED':
        this.orderStats.skipped++;
        if (reason) {
          this.orderStats.skipReasons[reason] = (this.orderStats.skipReasons[reason] || 0) + 1;
        }
        break;
      case 'CANCELED':
        this.orderStats.canceled++;
        break;
      default:
        this.orderStats.failed++;
    }

    // 5회마다 간단 로그
    if (this.orderStats.total % 5 === 0) {
      const fillRate = ((this.orderStats.filled / this.orderStats.total) * 100).toFixed(1);
      this.logger.log(`📈 [FILL RATE] ${this.orderStats.filled}/${this.orderStats.total} (${fillRate}%)`);
    }
  }

  /**
   * ✅ 현재 통계 조회 (API용)
   */
  getOrderStats() {
    const total = this.orderStats.total;
    return {
      total,
      filled: this.orderStats.filled,
      skipped: this.orderStats.skipped,
      canceled: this.orderStats.canceled,
      failed: this.orderStats.failed,
      fillRate: total > 0 ? (this.orderStats.filled / total) * 100 : 0,
      skipReasons: this.orderStats.skipReasons,
    };
  }

  /**
   * ✅ 중복 포지션 방지: 심볼이 현재 처리 중인지 확인
   * PositionSyncService에서 호출하여 MANUAL 포지션 중복 생성 방지
   */
  static isSymbolPending(symbol: string): boolean {
    return OrderService.pendingSymbols.has(symbol);
  }

  /**
   * ✅ 처리 중인 심볼 추가
   */
  private addPendingSymbol(symbol: string): void {
    OrderService.pendingSymbols.add(symbol);
    this.logger.debug(`[PENDING] Added ${symbol} to pending set (total: ${OrderService.pendingSymbols.size})`);
  }

  /**
   * ✅ 처리 완료된 심볼 제거
   */
  private removePendingSymbol(symbol: string): void {
    OrderService.pendingSymbols.delete(symbol);
    this.logger.debug(`[PENDING] Removed ${symbol} from pending set (total: ${OrderService.pendingSymbols.size})`);
  }

  /**
   * ✅ 주문 실패 후 바이낸스 포지션 검증
   * - 주문이 "실패"로 처리되었지만 실제로 체결된 경우 감지
   * - 예상치 못한 포지션 발견 시 긴급 SL 생성
   */
  private async verifyNoUnexpectedPosition(signal: any): Promise<void> {
    try {
      const positions = await this.binanceService.getOpenPositions();
      const binancePosition = positions.find(
        (p: any) => p.symbol === signal.symbol && parseFloat(p.positionAmt) !== 0
      );

      if (binancePosition) {
        const positionAmt = parseFloat(binancePosition.positionAmt);
        const entryPrice = parseFloat(binancePosition.entryPrice);
        const side = positionAmt > 0 ? 'LONG' : 'SHORT';

        // 예상 방향과 같은 포지션이 있으면 경고
        if ((signal.side === 'LONG' && positionAmt > 0) ||
            (signal.side === 'SHORT' && positionAmt < 0)) {
          this.logger.error(
            `\n🚨 [CRITICAL] Unexpected position found after "failed" order!\n` +
            `  Symbol: ${signal.symbol}\n` +
            `  Side: ${side}\n` +
            `  Amount: ${Math.abs(positionAmt)}\n` +
            `  Entry: ${entryPrice}\n` +
            `  → Creating emergency SL to protect position...`
          );

          // 긴급 SL 생성 (3%)
          const EMERGENCY_SL_PERCENT = 0.03;
          const slPrice = side === 'LONG'
            ? entryPrice * (1 - EMERGENCY_SL_PERCENT)
            : entryPrice * (1 + EMERGENCY_SL_PERCENT);
          const formattedSL = parseFloat(this.binanceService.formatPrice(signal.symbol, slPrice));

          try {
            await this.binanceService.createAlgoOrder({
              symbol: signal.symbol,
              side: side === 'LONG' ? 'SELL' : 'BUY',
              type: 'STOP_MARKET',
              triggerPrice: formattedSL,
              closePosition: true,
            });
            this.logger.log(`  ✅ Emergency SL created at ${formattedSL}`);
          } catch (slError: any) {
            if (!slError.message?.includes('-4130')) {
              this.logger.error(`  ❌ Failed to create emergency SL: ${slError.message}`);
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.warn(`[VERIFY] Failed to check position: ${error.message}`);
    }
  }

  async executeOrder(signal: any, positionSize: any): Promise<any> {
    this.logger.log(
      `\n🚀 [ORDER SERVICE] Received order execution request for ${signal.symbol} ${signal.side}`
    );

    // ✅ 중복 포지션 방지: 처리 시작 시 pending 세트에 추가
    this.addPendingSymbol(signal.symbol);

    try {
      const result = await this._executeOrderInternal(signal, positionSize);

      // ✅ 주문 실패 시 바이낸스 포지션 검증 (예상치 못한 체결 감지)
      if (result.status === 'FAILED' || result.status === 'CANCELED') {
        await this.verifyNoUnexpectedPosition(signal);
      }

      return result;
    } finally {
      // ✅ 성공/실패 관계없이 pending 세트에서 제거
      this.removePendingSymbol(signal.symbol);
    }
  }

  /**
   * 실제 주문 실행 로직 (내부 함수)
   */
  private async _executeOrderInternal(signal: any, positionSize: any): Promise<any> {
    // ✅ 항상 MAKER(지정가) 주문만 사용 - 시장가 제거
    this.logger.log(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 [ORDER EXECUTION START]\n` +
      `  Symbol:     ${signal.symbol}\n` +
      `  Side:       ${signal.side}\n` +
      `  Strategy:   ${signal.strategy}\n` +
      `  Tier:       ${signal.metadata?.tier || 'N/A'}\n` +
      `  Score:      ${signal.score}/100\n` +
      `  Order Type: MAKER (Limit)\n` +
      `  Quantity:   ${positionSize.quantity}\n` +
      `  Leverage:   ${positionSize.leverage}x\n` +
      `  Entry:      ${signal.entryPrice}\n` +
      `  Stop Loss:  ${signal.stopLoss}\n` +
      `  TP1:        ${signal.takeProfit1} (${signal.tp1Percent}%)\n` +
      `  TP2:        ${signal.takeProfit2} (${signal.tp2Percent}%)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

    try {
      // 1. 레버리지 설정 (실패 시 fallback)
      let actualLeverage = positionSize.leverage;
      this.logger.log(`[ORDER] Step 1/6: Setting leverage to ${actualLeverage}x for ${signal.symbol}...`);
      try {
        await this.binanceService.changeLeverage(signal.symbol, actualLeverage);
        this.logger.log(`[ORDER] ✓ Leverage set to ${actualLeverage}x successfully`);
      } catch (leverageError: any) {
        // 레버리지 설정 실패 시 10x로 fallback
        this.logger.warn(`[ORDER] ⚠️ Failed to set leverage ${actualLeverage}x: ${leverageError.message}`);
        actualLeverage = 10;
        this.logger.log(`[ORDER] Retrying with fallback leverage ${actualLeverage}x...`);
        await this.binanceService.changeLeverage(signal.symbol, actualLeverage);
        this.logger.log(`[ORDER] ✓ Leverage set to ${actualLeverage}x (fallback) successfully`);
        // 포지션 사이즈 재계산 (레버리지가 낮아졌으므로)
        positionSize.leverage = actualLeverage;
      }

      // 2. 마진 모드 설정
      this.logger.log(`[ORDER] Step 2/6: Setting margin type to ISOLATED for ${signal.symbol}...`);
      await this.binanceService.changeMarginType(signal.symbol, 'ISOLATED');
      this.logger.log(`[ORDER] ✓ Margin type set successfully`);

      let mainOrder: any;
      let entryPrice: number;
      let executedQty: number;

      // ✅ 메이커 주문 (지정가만 사용 - 시장가 미사용)
      this.logger.log(`[ORDER] Step 3/6: Preparing LIMIT order...`);

        // Binance API에서 틱 사이즈 조회
        const tickSize = this.binanceService.getTickSize(signal.symbol);

        // 현재 시장가 조회
        const currentMarketPrice = await this.binanceService.getSymbolPrice(signal.symbol);
        const obMidpoint = signal.entryPrice;
        const obTop = signal.metadata?.obTop || obMidpoint * 1.005;
        const obBottom = signal.metadata?.obBottom || obMidpoint * 0.995;

        // 가격이 얼마나 벗어났는지 계산 (로깅용)
        const deviation = Math.abs(currentMarketPrice - obMidpoint) / obMidpoint;

        // ✅ 지정가 주문이므로 현재 가격 위치와 무관하게 주문 생성
        // - LONG: midpoint에 매수 지정가 → 가격이 내려오면 체결
        // - SHORT: midpoint에 매도 지정가 → 가격이 올라오면 체결
        // - 체결 안 되면 타임아웃으로 자동 취소

        // ✅ 타임프레임별 유효시간 설정 (3캔들)
        // 5분봉: 15분 (900초) = 3캔들
        // 15분봉: 45분 (2700초) = 3캔들
        const timeframe = signal.metadata?.timeframe || signal.timeframe || '5m';
        const maxWaitTime = timeframe === '15m' ? 2700000 : 900000; // ms

        // MIDPOINT 지정가 설정
        const limitPrice = parseFloat(this.binanceService.formatPrice(signal.symbol, obMidpoint));

        this.logger.log(
          `📊 [LIMIT ORDER] Price Analysis:\n` +
          `  Market Price:    ${currentMarketPrice}\n` +
          `  OB Midpoint:     ${obMidpoint.toFixed(6)}\n` +
          `  Deviation:       ${(deviation * 100).toFixed(3)}%\n` +
          `  Order Type:      MIDPOINT\n` +
          `  Limit Price:     ${limitPrice}\n` +
          `  Timeframe:       ${timeframe}\n` +
          `  Validity:        ${maxWaitTime / 1000}s\n` +
          `  Tick Size:       ${tickSize}`
        );

        // 지정가 주문 (MIDPOINT만 사용)
        this.logger.log(`[LIMIT ORDER] Placing MIDPOINT limit order at ${limitPrice}...`);

        mainOrder = await this.binanceService.createOrder({
          symbol: signal.symbol,
          side: signal.side === 'LONG' ? 'BUY' : 'SELL',
          type: 'LIMIT',
          quantity: positionSize.quantity,
          price: limitPrice,
          timeInForce: 'GTC',
        });

        this.logger.log(
          `[ORDER] Order placed successfully:\n` +
          `  Order ID: ${mainOrder.orderId}\n` +
          `  Status:   ${mainOrder.status}\n` +
          `  Type:     MIDPOINT\n` +
          `  Price:    ${mainOrder.price || mainOrder.avgPrice || 'MARKET'}\n` +
          `  Quantity: ${mainOrder.origQty}`
        );

        // ✅ 지정가 주문이 즉시 체결된 경우
        if (mainOrder.status === 'FILLED') {
          this.logger.log(`✅ [LIMIT ORDER] Immediately filled!`);
          entryPrice = parseFloat(mainOrder.avgPrice || mainOrder.price);
          executedQty = parseFloat(mainOrder.executedQty || mainOrder.origQty);
        }
        // ✅ OB 영역 모니터링: 미체결 시 가격 이탈 또는 유효시간 초과 시 취소
        else if (mainOrder.status === 'NEW') {
          const checkInterval = 2000; // 2초마다 체크
          const startTime = Date.now();

          this.logger.log(
            `⏳ [LIMIT ORDER] Monitoring for fill...\n` +
            `  Order ID: ${mainOrder.orderId}\n` +
            `  OB Zone:  ${obBottom?.toFixed(2)} - ${obTop?.toFixed(2)}\n` +
            `  Validity: ${maxWaitTime / 1000}s (${timeframe})`
          );

          let orderFilled = false;
          let orderCanceled = false;

          while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));

            try {
              // 1. 주문 상태 확인
              const orderStatus = await this.binanceService.queryOrder(signal.symbol, mainOrder.orderId);

              if (orderStatus.status === 'FILLED') {
                this.logger.log(`✅ [MAKER ORDER] Order filled!`);
                entryPrice = parseFloat(orderStatus.avgPrice || orderStatus.price);
                executedQty = parseFloat(orderStatus.executedQty);
                orderFilled = true;
                break;
              }

              if (orderStatus.status === 'CANCELED' || orderStatus.status === 'EXPIRED') {
                this.logger.warn(`⚠️ [MAKER ORDER] Order ${orderStatus.status}`);
                orderCanceled = true;
                break;
              }

              // 2. 현재 가격이 OB 영역 이탈했는지 확인
              if (obTop && obBottom) {
                const currentPrice = await this.binanceService.getSymbolPrice(signal.symbol);

                // OB 영역 이탈 체크 (버퍼 0.5% 추가)
                const buffer = (obTop - obBottom) * 0.5;
                const isOutOfZone = signal.side === 'LONG'
                  ? currentPrice < obBottom - buffer  // LONG: 하단 이탈
                  : currentPrice > obTop + buffer;     // SHORT: 상단 이탈

                if (isOutOfZone) {
                  this.logger.warn(
                    `🛑 [OB ZONE EXIT] Price exited OB zone, canceling order...\n` +
                    `  Current Price: ${currentPrice}\n` +
                    `  OB Zone:       ${obBottom.toFixed(2)} - ${obTop.toFixed(2)}\n` +
                    `  Side:          ${signal.side}`
                  );

                  await this.binanceService.cancelOrder(signal.symbol, mainOrder.orderId);
                  orderCanceled = true;
                  break;
                }

                this.logger.debug(
                  `[OB MONITOR] ${signal.symbol} | Price: ${currentPrice.toFixed(2)} | ` +
                  `Zone: ${obBottom.toFixed(2)}-${obTop.toFixed(2)} | Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`
                );
              }
            } catch (monitorError) {
              this.logger.warn(`[OB MONITOR] Error during monitoring:`, monitorError.message);
            }
          }

          // 타임아웃 처리
          if (!orderFilled && !orderCanceled) {
            this.logger.warn(
              `⏰ [TIMEOUT] Order not filled within ${maxWaitTime / 1000}s, canceling...\n` +
              `  Order ID: ${mainOrder.orderId}`
            );

            try {
              await this.binanceService.cancelOrder(signal.symbol, mainOrder.orderId);
            } catch (cancelError) {
              this.logger.warn(`[TIMEOUT] Cancel error (may already be filled):`, cancelError.message);

              // 취소 실패 시 주문 상태 재확인
              const finalStatus = await this.binanceService.queryOrder(signal.symbol, mainOrder.orderId);
              if (finalStatus.status === 'FILLED') {
                entryPrice = parseFloat(finalStatus.avgPrice || finalStatus.price);
                executedQty = parseFloat(finalStatus.executedQty);
                orderFilled = true;
              }
            }
          }

          // 주문이 체결되지 않았으면 실패 반환
          if (!orderFilled) {
            const cancelReason = orderCanceled ? 'OB zone exit' : 'Order timeout';
            this.recordOrderResult(signal.symbol, 'CANCELED', cancelReason);
            return {
              status: 'CANCELED',
              error: orderCanceled ? 'Order canceled due to OB zone exit' : 'Order timeout',
            };
          }
        } else if (mainOrder.status === 'FILLED') {
          // 즉시 체결됨
          entryPrice = parseFloat(mainOrder.avgPrice || mainOrder.price || limitPrice.toString());
          executedQty = parseFloat(mainOrder.executedQty || mainOrder.origQty || '0');

          this.logger.log(
            `✅ [MAKER ORDER] Immediately filled:\n` +
            `  Entry Price: ${entryPrice}\n` +
            `  Executed Qty: ${executedQty}`
          );
        } else {
          // 기타 상태
          this.logger.error(
            `❌ [MAKER ORDER] Unexpected status:\n` +
            `  Status: ${mainOrder?.status}\n` +
            `  Order ID: ${mainOrder?.orderId}`
          );
          this.recordOrderResult(signal.symbol, 'FAILED', `Unexpected status: ${mainOrder?.status}`);
          return {
            status: 'FAILED',
            error: `Unexpected order status: ${mainOrder?.status}`,
          };
        }

      this.logger.log(
        `\n✅ [ORDER] Main order FILLED successfully:\n` +
        `  Type:       MAKER (Limit)\n` +
        `  Symbol:     ${signal.symbol}\n` +
        `  Side:       ${signal.side}\n` +
        `  Entry:      ${entryPrice.toFixed(2)}\n` +
        `  Quantity:   ${executedQty}\n` +
        `  Notional:   ${(entryPrice * executedQty).toFixed(2)} USDT`
      );

      // ═══════════════════════════════════════════════════════════════════
      // 🔄 SL/TP 슬리피지 보정 (OB 구조 기반 유지)
      // 백테스트와 동일: SL은 OB 구조 기반, TP는 R:R 비율 유지
      // ═══════════════════════════════════════════════════════════════════
      const TP1_RATIO = 1.2;    // TP1 = 1.2R (백테스트와 동일)
      const TP2_RATIO = 4.0;    // TP2 = 4.0R (백테스트와 동일)

      // ✅ OB 기반 SL 유지 (signal에서 이미 계산됨: activeOB.bottom/top × (1 ± slBuffer))
      // 슬리피지로 인한 진입가 변동분만 SL에 반영
      const entrySlippageAmount = entryPrice - signal.entryPrice;
      const actualStopLoss = signal.stopLoss + entrySlippageAmount;

      // Risk 계산 (실제 진입가 - 실제 SL) - 백테스트와 동일 방식
      const actualRisk = Math.abs(entryPrice - actualStopLoss);

      // 실제 진입가 기준 TP 계산 (R:R 비율 유지)
      const actualTP1 = signal.side === 'LONG'
        ? entryPrice + (actualRisk * TP1_RATIO)
        : entryPrice - (actualRisk * TP1_RATIO);

      const actualTP2 = signal.side === 'LONG'
        ? entryPrice + (actualRisk * TP2_RATIO)
        : entryPrice - (actualRisk * TP2_RATIO);

      // 원본 계획값 저장 (savePosition에서 사용)
      const plannedValues = {
        entry: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
      };

      // 슬리피지 로깅
      const slippagePercent = (entrySlippageAmount / signal.entryPrice) * 100;
      const slDistancePercent = (actualRisk / entryPrice) * 100;

      this.logger.log(
        `\n🔄 [SL/TP ADJUSTMENT] OB-based SL preserved with slippage correction\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  Entry Slippage: ${entrySlippageAmount >= 0 ? '+' : ''}${entrySlippageAmount.toFixed(4)} (${slippagePercent >= 0 ? '+' : ''}${slippagePercent.toFixed(3)}%)\n` +
        `  ┌─────────────────────────────────────────────────\n` +
        `  │            Planned (OB-based)  →  Actual (Slippage adjusted)\n` +
        `  │ Entry:     ${plannedValues.entry.toFixed(4)}      →    ${entryPrice.toFixed(4)}\n` +
        `  │ SL:        ${plannedValues.stopLoss.toFixed(4)}      →    ${actualStopLoss.toFixed(4)} (${slDistancePercent.toFixed(2)}% from entry)\n` +
        `  │ TP1:       ${plannedValues.takeProfit1?.toFixed(4) || 'N/A'}      →    ${actualTP1.toFixed(4)} (${TP1_RATIO}R)\n` +
        `  │ TP2:       ${plannedValues.takeProfit2?.toFixed(4) || 'N/A'}      →    ${actualTP2.toFixed(4)} (${TP2_RATIO}R)\n` +
        `  │ Risk:      ${actualRisk.toFixed(4)} USDT per unit\n` +
        `  └─────────────────────────────────────────────────\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );

      // signal 객체 업데이트 (실제값으로 덮어쓰기 - SL/TP 주문에 사용)
      signal.stopLoss = actualStopLoss;
      signal.takeProfit1 = actualTP1;
      signal.takeProfit2 = actualTP2;

      // 계획값 별도 저장 (메타데이터용)
      signal._plannedValues = plannedValues;

      // 4. Stop Loss 주문 (Algo Order API 사용 - 2025-12-09 바이낸스 변경)
      // ✅ 틱 사이즈에 맞게 가격 포맷팅 (실제 계산된 SL 사용)
      const formattedSL = parseFloat(this.binanceService.formatPrice(signal.symbol, actualStopLoss));
      this.logger.log(`[ORDER] Step 4/6: Placing Stop Loss order at ${formattedSL} (adjusted from planned: ${signal.stopLoss.toFixed(4)})...`);

      // ✅ 기존 algo order 정리 (closePosition=true 충돌 방지 - Error -4130)
      try {
        const existingAlgoOrders = await this.binanceService.getOpenAlgoOrders(signal.symbol);
        const conflictingOrders = existingAlgoOrders.filter(o =>
          (o.type === 'STOP_MARKET' || o.type === 'TAKE_PROFIT_MARKET') &&
          (o.closePosition === true || o.closePosition === 'true')  // boolean 또는 string 모두 처리
        );

        if (conflictingOrders.length > 0) {
          this.logger.warn(
            `⚠️ [ORDER] Found ${conflictingOrders.length} conflicting algo orders for ${signal.symbol} - canceling...`
          );

          for (const order of conflictingOrders) {
            try {
              await this.binanceService.cancelAlgoOrder(signal.symbol, order.algoId);
              this.logger.log(`[ORDER] ✓ Canceled conflicting algo order: ${order.algoId} (${order.type})`);
            } catch (cancelErr: any) {
              this.logger.warn(`[ORDER] Failed to cancel algo ${order.algoId}: ${cancelErr.message}`);
            }
          }

          // 취소 처리 대기
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (checkErr: any) {
        this.logger.warn(`[ORDER] Failed to check existing algo orders: ${checkErr.message}`);
      }

      let slOrder: any;
      try {
        // ✅ NEW: Algo Order API 사용 (기존 createOrder의 STOP_MARKET은 -4120 에러 발생)
        // closePosition: true 사용 - TP 부분 청산 후에도 남은 전체 포지션 청산 보장
        slOrder = await this.binanceService.createAlgoOrder({
          symbol: signal.symbol,
          side: signal.side === 'LONG' ? 'SELL' : 'BUY',
          type: 'STOP_MARKET',
          triggerPrice: formattedSL,
          closePosition: true,  // ✅ 전체 포지션 청산 (quantity 대신)
        });

        this.logger.log(
          `[ORDER] ✓ Stop Loss order placed (Algo Order):\n` +
          `  Algo ID: ${slOrder.algoId}\n` +
          `  Trigger Price: ${signal.stopLoss}\n` +
          `  Mode: closePosition=true (Full Position Close)`
        );

        // ✅ SL 주문 검증: 실제로 생성되었는지 확인 (1초 대기 후)
        await new Promise(resolve => setTimeout(resolve, 1000));
        const verifyAlgoOrders = await this.binanceService.getOpenAlgoOrders(signal.symbol);
        const verifiedSL = verifyAlgoOrders.find(o => o.type === 'STOP_MARKET');

        if (!verifiedSL) {
          this.logger.warn(`[ORDER] ⚠️ SL verification failed - retrying...`);
          // 재시도 (단, 이미 존재하면 성공으로 처리)
          try {
            slOrder = await this.binanceService.createAlgoOrder({
              symbol: signal.symbol,
              side: signal.side === 'LONG' ? 'SELL' : 'BUY',
              type: 'STOP_MARKET',
              triggerPrice: formattedSL,
              closePosition: true,
            });
            this.logger.log(`[ORDER] ✓ SL retry successful: ${slOrder.algoId}`);
          } catch (retryError: any) {
            // -4130: 이미 SL/TP가 존재함 = 실제로 SL이 있으므로 성공
            if (retryError.code === -4130 || retryError.message?.includes('-4130') ||
                retryError.message?.includes('closePosition in the direction is existing')) {
              this.logger.log(`[ORDER] ✓ SL already exists (verified via -4130 error)`);
            } else {
              // 다른 에러는 다시 throw
              throw retryError;
            }
          }
        } else {
          this.logger.log(`[ORDER] ✓ SL verified: Algo ID ${verifiedSL.algoId}`);
        }
      } catch (slError: any) {
        // ⚠️ SL 주문 실패 시 즉시 포지션 청산 (보호 없는 포지션 방지)
        this.logger.error(
          `❌ [CRITICAL] Stop Loss order FAILED - Closing position immediately!\n` +
          `  Symbol: ${signal.symbol}\n` +
          `  Error: ${slError.message}\n` +
          `  Action: Emergency market close`
        );

        try {
          // 시장가로 즉시 청산
          const closeOrder = await this.binanceService.createOrder({
            symbol: signal.symbol,
            side: signal.side === 'LONG' ? 'SELL' : 'BUY',
            type: 'MARKET',
            quantity: executedQty,
          });

          this.logger.warn(
            `⚠️ [EMERGENCY CLOSE] Position closed to prevent unprotected exposure:\n` +
            `  Order ID: ${closeOrder.orderId}\n` +
            `  Status: ${closeOrder.status}`
          );

          this.recordOrderResult(signal.symbol, 'FAILED', 'SL failed - emergency close');
          return {
            status: 'CLOSED_EMERGENCY',
            error: `SL failed: ${slError.message} - Position closed immediately`,
            mainOrder,
            closeOrder,
          };
        } catch (closeError: any) {
          // 청산도 실패하면 매우 위험한 상황
          this.logger.error(
            `🚨 [CRITICAL] Emergency close ALSO FAILED!\n` +
            `  Symbol: ${signal.symbol}\n` +
            `  Position is UNPROTECTED!\n` +
            `  Manual intervention required!`
          );

          this.recordOrderResult(signal.symbol, 'FAILED', 'CRITICAL - unprotected position');
          return {
            status: 'CRITICAL_ERROR',
            error: `SL failed AND emergency close failed: ${closeError.message}`,
            requiresManualIntervention: true,
          };
        }
      }

      // 5. Take Profit 주문 (실패해도 SL이 있으므로 계속 진행)
      this.logger.log(`[ORDER] Step 5/6: Placing Take Profit orders...`);
      const tpOrders = [];

      // ✅ TP 주문 최소 Notional 검증 (Binance 최소 $5, 안전마진 포함 $10)
      const MIN_TP_NOTIONAL = 10;
      const totalPositionNotional = executedQty * entryPrice;

      // TP1/TP2 Notional 계산
      const tp1Qty = executedQty * (signal.tp1Percent / 100);
      const tp2Qty = executedQty * (signal.tp2Percent / 100);
      const tp1Notional = tp1Qty * entryPrice;
      const tp2Notional = tp2Qty * entryPrice;

      this.logger.log(
        `[TP CHECK] Notional validation:\n` +
        `  Total Position: $${totalPositionNotional.toFixed(2)}\n` +
        `  TP1 (${signal.tp1Percent}%): $${tp1Notional.toFixed(2)}\n` +
        `  TP2 (${signal.tp2Percent}%): $${tp2Notional.toFixed(2)}\n` +
        `  Min Required: $${MIN_TP_NOTIONAL}`
      );

      // TP Notional이 너무 작으면 분할 TP 대신 단일 TP 또는 SL만 사용
      const usePartialTP = tp1Notional >= MIN_TP_NOTIONAL && tp2Notional >= MIN_TP_NOTIONAL;

      if (!usePartialTP) {
        this.logger.warn(
          `[TP CHECK] ⚠️ TP notional too small for partial exit:\n` +
          `  TP1: $${tp1Notional.toFixed(2)} ${tp1Notional < MIN_TP_NOTIONAL ? '❌' : '✓'}\n` +
          `  TP2: $${tp2Notional.toFixed(2)} ${tp2Notional < MIN_TP_NOTIONAL ? '❌' : '✓'}\n` +
          `  → Using single TP order at TP1 price for full position`
        );

        // 단일 TP 주문 (전체 포지션) - 검증 및 재시도 포함
        if (signal.takeProfit1 && totalPositionNotional >= MIN_TP_NOTIONAL) {
          const formattedTP1 = parseFloat(this.binanceService.formatPrice(signal.symbol, signal.takeProfit1));
          const formattedQty = parseFloat(this.binanceService.formatQuantity(signal.symbol, executedQty));

          let tpCreated = false;
          let retryCount = 0;
          const maxRetries = 2;

          while (!tpCreated && retryCount <= maxRetries) {
            try {
              this.logger.log(`[TP] Placing single TP order (Algo): 100% at ${formattedTP1}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

              const tpOrder = await this.binanceService.createAlgoOrder({
                symbol: signal.symbol,
                side: signal.side === 'LONG' ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP1,
                quantity: formattedQty,
              });

              // ✅ TP 검증: 1초 후 존재 여부 확인
              await new Promise(resolve => setTimeout(resolve, 1000));
              const verifyAlgoOrders = await this.binanceService.getOpenAlgoOrders(signal.symbol);
              const verifiedTP = verifyAlgoOrders.find(o => o.type === 'TAKE_PROFIT_MARKET');

              if (verifiedTP) {
                this.logger.log(
                  `[TP] ✓ Single TP order placed & verified:\n` +
                  `  Algo ID: ${tpOrder.algoId}\n` +
                  `  Trigger Price: ${formattedTP1}\n` +
                  `  Quantity: ${formattedQty} (100%)`
                );
                tpOrders.push(tpOrder);
                tpCreated = true;
              } else {
                this.logger.warn(`[TP] ⚠️ TP verification failed - retrying...`);
                retryCount++;
              }
            } catch (tpError: any) {
              this.logger.warn(`[TP] ⚠️ Order failed: ${tpError.message}`);
              retryCount++;
              if (retryCount <= maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }

          if (!tpCreated) {
            this.logger.error(`[TP] ❌ Failed to create TP after ${maxRetries + 1} attempts - will be handled by Watchdog`);
          }
        }
      } else {
        // 정상적인 분할 TP 주문 (검증 및 재시도 포함)
        const formattedTp1Qty = parseFloat(this.binanceService.formatQuantity(signal.symbol, tp1Qty));
        const formattedTp2Qty = parseFloat(this.binanceService.formatQuantity(signal.symbol, tp2Qty));

        if (signal.tp1Percent > 0 && signal.takeProfit1) {
          const formattedTP1 = parseFloat(this.binanceService.formatPrice(signal.symbol, signal.takeProfit1));
          let tp1Created = false;
          let retryCount = 0;

          while (!tp1Created && retryCount <= 2) {
            try {
              this.logger.log(`[TP1] Placing TP1 order (Algo): ${signal.tp1Percent}% at ${formattedTP1}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

              const tp1Order = await this.binanceService.createAlgoOrder({
                symbol: signal.symbol,
                side: signal.side === 'LONG' ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP1,
                quantity: formattedTp1Qty,
              });

              // 검증
              await new Promise(resolve => setTimeout(resolve, 500));
              const verifyOrders = await this.binanceService.getOpenAlgoOrders(signal.symbol);
              if (verifyOrders.find(o => o.type === 'TAKE_PROFIT_MARKET')) {
                this.logger.log(`[TP1] ✓ Order placed & verified: ${tp1Order.algoId}`);
                tpOrders.push(tp1Order);
                tp1Created = true;
              } else {
                retryCount++;
              }
            } catch (tp1Error: any) {
              this.logger.warn(`[TP1] ⚠️ Order failed: ${tp1Error.message}`);
              retryCount++;
            }
          }
        }

        if (signal.tp2Percent > 0 && signal.takeProfit2) {
          const formattedTP2 = parseFloat(this.binanceService.formatPrice(signal.symbol, signal.takeProfit2));
          let tp2Created = false;
          let retryCount = 0;

          while (!tp2Created && retryCount <= 2) {
            try {
              this.logger.log(`[TP2] Placing TP2 order (Algo): ${signal.tp2Percent}% at ${formattedTP2}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

              const tp2Order = await this.binanceService.createAlgoOrder({
                symbol: signal.symbol,
                side: signal.side === 'LONG' ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP2,
                quantity: formattedTp2Qty,
              });

              // 검증
              await new Promise(resolve => setTimeout(resolve, 500));
              const verifyOrders = await this.binanceService.getOpenAlgoOrders(signal.symbol);
              // TP2는 두 번째 TP이므로 개수로 확인
              const tpCount = verifyOrders.filter(o => o.type === 'TAKE_PROFIT_MARKET').length;
              if (tpCount >= 2) {
                this.logger.log(`[TP2] ✓ Order placed & verified: ${tp2Order.algoId}`);
                tpOrders.push(tp2Order);
                tp2Created = true;
              } else {
                retryCount++;
              }
            } catch (tp2Error: any) {
              this.logger.warn(`[TP2] ⚠️ Order failed: ${tp2Error.message}`);
              retryCount++;
            }
          }
        }
      }

      // 6. 포지션 저장
      this.logger.log(`[ORDER] Step 6/6: Saving position to database...`);

      await this.savePosition(signal, {
        entryPrice,
        quantity: executedQty,
        mainOrder,
        slOrder,
        tpOrders,
      });

      this.logger.log(`[ORDER] ✓ Position saved successfully`);

      const riskRewardRatio = ((signal.takeProfit1 - entryPrice) / (entryPrice - signal.stopLoss)).toFixed(2);

      this.logger.log(
        `\n✅ [ORDER EXECUTION COMPLETE] ${signal.symbol} ${signal.side}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  Entry:          ${entryPrice.toFixed(2)}\n` +
        `  Quantity:       ${executedQty}\n` +
        `  Stop Loss:      ${signal.stopLoss} (Risk: ${((Math.abs(entryPrice - signal.stopLoss) / entryPrice) * 100).toFixed(2)}%)\n` +
        `  Take Profit 1:  ${signal.takeProfit1} (${signal.tp1Percent}%)\n` +
        `  Take Profit 2:  ${signal.takeProfit2} (${signal.tp2Percent}%)\n` +
        `  R:R Ratio:      1:${riskRewardRatio}\n` +
        `  Notional Value: ${(entryPrice * executedQty).toFixed(2)} USDT\n` +
        `  Main Order ID:  ${mainOrder.orderId}\n` +
        `  SL Algo ID:     ${slOrder.algoId}\n` +
        `  TP Orders:      ${tpOrders.length} orders (Algo)\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      );

      // ✅ 성공 기록
      this.recordOrderResult(signal.symbol, 'FILLED');

      return {
        status: 'FILLED',
        entryPrice,
        quantity: executedQty,
        mainOrder,
        slOrder,
        tpOrders,
      };
    } catch (error) {
      this.logger.error(
        `\n❌ [ORDER EXECUTION FAILED]\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  Symbol:   ${signal.symbol}\n` +
        `  Side:     ${signal.side}\n` +
        `  Strategy: ${signal.strategy}\n` +
        `  Error:    ${error.message}\n` +
        `  Stack:    ${error.stack}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
      this.recordOrderResult(signal.symbol, 'FAILED', error.message);
      return {
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  private async savePosition(signal: any, orderResult: any) {
    // 계획값 (signal._plannedValues에서 가져오거나 signal에서 추출)
    const planned = signal._plannedValues || {
      entry: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
    };

    const actualEntry = orderResult.entryPrice;
    const entrySlippage = actualEntry - planned.entry;
    const entrySlippagePercent = (entrySlippage / planned.entry) * 100;

    // signal.stopLoss, signal.takeProfit1/2는 이미 실제값으로 업데이트됨
    const actualStopLoss = signal.stopLoss;
    const actualTP1 = signal.takeProfit1;
    const actualTP2 = signal.takeProfit2;

    const position = this.positionRepo.create({
      symbol: signal.symbol,
      strategy: signal.strategy,
      timeframe: signal.timeframe,  // 타임프레임 저장
      side: signal.side,
      entryPrice: actualEntry,           // 실제 체결 진입가
      quantity: orderResult.quantity,
      leverage: signal.leverage,
      stopLoss: actualStopLoss,          // 실제 SL (재계산된 값)
      takeProfit1: actualTP1,            // 실제 TP1 (재계산된 값)
      takeProfit2: actualTP2,            // 실제 TP2 (재계산된 값)
      status: 'OPEN',
      openedAt: new Date(),
      metadata: {
        // 기존 메타데이터 유지
        ...signal.metadata,

        // ═══════════════════════════════════════════════════════════
        // 📊 계획값 (Expected/Planned Values) - 원래 전략에서 계산한 값
        // ═══════════════════════════════════════════════════════════
        planned: {
          entry: planned.entry,              // 계획된 진입가 (OB midpoint)
          stopLoss: planned.stopLoss,        // 계획된 손절가
          takeProfit1: planned.takeProfit1,  // 계획된 TP1
          takeProfit2: planned.takeProfit2,  // 계획된 TP2
          tp1Percent: signal.tp1Percent,     // TP1 청산 비율 (%)
          tp2Percent: signal.tp2Percent,     // TP2 청산 비율 (%)
          riskRewardRatio: planned.takeProfit1 && planned.stopLoss
            ? Math.abs((planned.takeProfit1 - planned.entry) / (planned.entry - planned.stopLoss))
            : 0,
        },

        // ═══════════════════════════════════════════════════════════
        // 💰 실제값 (Actual Values) - 진입 시점
        // ═══════════════════════════════════════════════════════════
        actual: {
          entry: actualEntry,            // 실제 체결 진입가
          stopLoss: actualStopLoss,      // 실제 SL (재계산됨)
          takeProfit1: actualTP1,        // 실제 TP1 (재계산됨)
          takeProfit2: actualTP2,        // 실제 TP2 (재계산됨)
          entryOrderId: orderResult.mainOrder?.orderId,
          entryTime: new Date().toISOString(),
          slAlgoId: orderResult.slOrder?.algoId,
          tpAlgoIds: orderResult.tpOrders?.map((o: any) => o.algoId) || [],
        },

        // ═══════════════════════════════════════════════════════════
        // 📈 슬리피지 분석 (Slippage Analysis)
        // ═══════════════════════════════════════════════════════════
        slippage: {
          entry: entrySlippage,          // 진입 슬리피지 (USDT)
          entryPercent: entrySlippagePercent, // 진입 슬리피지 (%)
          // 청산 슬리피지는 position-sync에서 업데이트
        },

        // ═══════════════════════════════════════════════════════════
        // 🎯 신호 정보 (Signal Info)
        // ═══════════════════════════════════════════════════════════
        signal: {
          score: signal.score,           // 신호 점수
          tier: signal.metadata?.tier,   // 티어 (TIER1/TIER2)
          timeframe: signal.metadata?.timeframe || signal.timeframe,
          obTop: signal.metadata?.obTop,
          obBottom: signal.metadata?.obBottom,
          obMidpoint: signal.metadata?.obMidpoint || planned.entry,
          atr: signal.metadata?.atr,
          atrPercent: signal.metadata?.atrPercent,
        },
      },
    });

    await this.positionRepo.save(position);

    this.logger.log(
      `\n📊 [POSITION SAVED] ${signal.symbol} ${signal.side}\n` +
      `  ┌─────────────────────────────────────────────────────\n` +
      `  │ 📋 계획값 (Planned)\n` +
      `  │   Entry:    ${planned.entry.toFixed(4)}\n` +
      `  │   SL:       ${planned.stopLoss.toFixed(4)}\n` +
      `  │   TP1:      ${planned.takeProfit1?.toFixed(4)} (${signal.tp1Percent}%)\n` +
      `  │   TP2:      ${planned.takeProfit2?.toFixed(4)} (${signal.tp2Percent}%)\n` +
      `  ├─────────────────────────────────────────────────────\n` +
      `  │ 💰 실제값 (Actual - Adjusted for slippage)\n` +
      `  │   Entry:    ${actualEntry.toFixed(4)}\n` +
      `  │   SL:       ${actualStopLoss.toFixed(4)}\n` +
      `  │   TP1:      ${actualTP1.toFixed(4)}\n` +
      `  │   TP2:      ${actualTP2.toFixed(4)}\n` +
      `  ├─────────────────────────────────────────────────────\n` +
      `  │ 📈 슬리피지 (Slippage)\n` +
      `  │   Entry:    ${entrySlippage >= 0 ? '+' : ''}${entrySlippage.toFixed(4)} (${entrySlippagePercent >= 0 ? '+' : ''}${entrySlippagePercent.toFixed(3)}%)\n` +
      `  └─────────────────────────────────────────────────────`
    );
  }

  /**
   * ✅ 메이커 주문 가격 계산 (Binance API 사용)
   * 현재 시장가보다 1-2틱 유리한 가격으로 리밋 주문
   * @param signal 거래 신호
   * @param tickSize Binance API에서 조회한 틱 사이즈
   * @param currentMarketPrice 현재 시장 가격
   * @returns 메이커 주문용 리밋 가격
   */
  private calculateMakerPrice(signal: any, tickSize: number, currentMarketPrice: number): number {
    const ticks = 1; // 1틱 유리하게 (메이커 수수료 받기 위해)

    let limitPrice: number;

    if (signal.side === 'LONG') {
      // 롱: 현재가보다 낮게 매수 (bid 측)
      limitPrice = currentMarketPrice - (tickSize * ticks);
    } else {
      // 숏: 현재가보다 높게 매도 (ask 측)
      limitPrice = currentMarketPrice + (tickSize * ticks);
    }

    // 가격을 심볼의 precision에 맞게 포맷팅
    const formattedPrice = this.binanceService.formatPrice(signal.symbol, limitPrice);

    this.logger.debug(
      `[MAKER PRICE CALC] ${signal.side} order:\n` +
      `  Market: ${currentMarketPrice}\n` +
      `  Limit:  ${formattedPrice}\n` +
      `  Ticks:  ${ticks} x ${tickSize} = ${tickSize * ticks}`
    );

    return parseFloat(formattedPrice);
  }
}


