import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { BinanceService } from '../binance/binance.service';
import { SimpleTrueOBStrategy } from '../strategies/simple-true-ob.strategy';
import { OrderService } from '../order/order.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class PositionSyncService {
  private readonly logger = new Logger(PositionSyncService.name);
  private isSyncing = false;

  // TP1 체결 추적 (심볼 -> 본전 이동 완료 여부)
  private tp1TriggeredPositions: Set<string> = new Set();

  // ✅ 방어 로직: SL/TP 생성 실패 재시도 카운터 (심볼 -> 실패 횟수)
  private slTpRetryCount: Map<string, number> = new Map();
  private readonly MAX_SLTP_RETRIES = 3;

  // ✅ 방어 로직: 비정상 마진(원금) 임계값
  private readonly MAX_MARGIN_PERCENT = 0.10;  // 마진이 총 자본의 10% 초과 시 청산
  private readonly ABSOLUTE_MAX_MARGIN = 35;   // v16: 절대 마진 임계값 $35 이상이면 무조건 청산

  // ✅ 방어 로직: SL 없이 오래된 포지션 강제 청산 (분)
  private readonly MAX_TIME_WITHOUT_SL_MINUTES = 5;  // SL 없이 5분 이상 방치 시 청산

  // ✅ 방어 로직: 포지션별 SL 부재 시작 시간 추적
  private positionWithoutSlSince: Map<string, number> = new Map();

  // v15: 타임프레임별 최대 보유 시간 (밀리초)
  // 5분봉: 2시간 (24캔들) - 데이터 분석 결과 120분 이후 승률 급락
  // 15분봉: 4시간 (16캔들) - 기존 유지
  private readonly MAX_HOLDING_TIME_MS: Record<string, number> = {
    '5m': 2 * 60 * 60 * 1000,   // 2시간
    '15m': 4 * 60 * 60 * 1000,  // 4시간
    'default': 4 * 60 * 60 * 1000,  // 기본값 4시간
  };

  constructor(
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    @InjectRepository(Signal)
    private signalRepo: Repository<Signal>,
    private binanceService: BinanceService,
    @Inject(forwardRef(() => SimpleTrueOBStrategy))
    private simpleTrueOBStrategy: SimpleTrueOBStrategy,
    private riskService: RiskService,  // v13: 블랙리스트 기록용
  ) {}

  async onModuleInit() {
    // 서버 시작 시 즉시 동기화
    this.logger.log('Performing initial position sync...');
    await this.syncPositions();
  }

  // ✅ 10초마다 동기화 (TP1 감지 속도 향상: 30초 → 10초)
  @Cron('*/10 * * * * *')
  async scheduledSync() {
    await this.syncPositions();
  }

  async syncPositions() {
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    try {
      // 1. 바이낸스에서 실제 오픈 포지션 가져오기
      const binancePositions = await this.binanceService.getOpenPositions();
      const activePositions = binancePositions.filter(
        p => Math.abs(parseFloat(p.positionAmt)) > 0.000001
      );

      // 2. DB의 오픈 포지션 가져오기
      const dbPositions = await this.positionRepo.find({
        where: { status: 'OPEN' },
      });

      // ✅ [방어 로직 1] 미인식 포지션 감지 및 즉시 청산
      await this.detectAndCloseUnknownPositions(dbPositions, activePositions);

      // ✅ [방어 로직 2] 비정상 사이즈 포지션 감지 및 청산
      await this.detectAndCloseOversizedPositions(activePositions);

      // [FLOW-7] TP1 체결 감지 및 SL 본전 이동
      await this.checkAndMoveSlToBreakeven(dbPositions, activePositions);

      // ✅ SL Watchdog: SL이 없는 오픈 포지션에 자동으로 SL 생성
      // [방어 로직 3] 재시도 횟수 초과 시 강제 청산
      await this.checkAndPlaceMissingSL(dbPositions);

      // v14: 최대 보유시간 초과 포지션 강제 청산 (30분)
      await this.checkAndForceCloseExpiredPositions(dbPositions, activePositions);

      // 3. 바이낸스에 있는 포지션 기준으로 DB 업데이트/생성
      for (const binancePos of activePositions) {
        const symbol = binancePos.symbol;
        const positionAmt = parseFloat(binancePos.positionAmt);
        const entryPrice = parseFloat(binancePos.entryPrice);
        const markPrice = parseFloat(binancePos.markPrice);
        const unrealizedProfit = parseFloat(binancePos.unRealizedProfit);
        const leverage = parseInt(binancePos.leverage);

        // DB에서 해당 심볼 찾기
        let dbPosition = dbPositions.find(p => p.symbol === symbol);

        if (dbPosition) {
          // 포지션이 DB에 있으면 업데이트
          const quantityChanged = Math.abs(dbPosition.quantity - Math.abs(positionAmt)) > 0.000001;

          if (quantityChanged) {
            this.logger.log(
              `Syncing ${symbol}: DB quantity ${dbPosition.quantity} → Binance ${Math.abs(positionAmt)}`
            );

            dbPosition.quantity = Math.abs(positionAmt);
            dbPosition.entryPrice = entryPrice;
            dbPosition.leverage = leverage;
            dbPosition.updatedAt = new Date();

            await this.positionRepo.save(dbPosition);
          }
        } else {
          // DB에 없는 포지션 - 바이낸스에서 수동으로 열었을 가능성
          // ⚠️ 레이스 컨디션 방지 (강화된 로직)

          // 1차 체크: OrderService에서 현재 처리 중인지 확인
          if (OrderService.isSymbolPending(symbol)) {
            this.logger.debug(
              `[DUPLICATE_PREVENTION] ${symbol} is currently being processed by OrderService, skipping`
            );
            continue;
          }

          // 2차 체크: 3초 대기 후 DB 및 pending 상태 재확인
          await new Promise(resolve => setTimeout(resolve, 3000));

          // 대기 후 다시 확인 (OrderService가 저장했을 수 있음)
          const existingPosition = await this.positionRepo.findOne({
            where: { symbol, status: 'OPEN' },
          });

          if (existingPosition) {
            this.logger.debug(
              `[DUPLICATE_PREVENTION] ${symbol} was created by OrderService during wait, skipping`
            );
            continue;
          }

          // 3차 체크: 대기 후에도 pending 상태인지 다시 확인
          if (OrderService.isSymbolPending(symbol)) {
            this.logger.debug(
              `[DUPLICATE_PREVENTION] ${symbol} is still being processed by OrderService after wait, skipping`
            );
            continue;
          }

          // ✅ PENDING 신호 매칭 시도 (최근 30분 이내 - 타임아웃 3캔들 고려)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const pendingSignal = await this.signalRepo.findOne({
            where: {
              symbol,
              side: positionAmt > 0 ? 'LONG' : 'SHORT',
              status: 'PENDING',
              createdAt: MoreThan(thirtyMinutesAgo),
            },
            order: { createdAt: 'DESC' },
          });

          let strategy = 'MANUAL';
          let stopLoss = 0;
          let takeProfit1 = null;
          let takeProfit2 = null;

          if (pendingSignal) {
            this.logger.log(
              `✅ [RECOVERY] Found matching PENDING signal for ${symbol}!\n` +
              `  Signal ID: ${pendingSignal.id}\n` +
              `  SL: ${pendingSignal.stopLoss}\n` +
              `  TP1: ${pendingSignal.takeProfit1}\n` +
              `  TP2: ${pendingSignal.takeProfit2}`
            );

            strategy = pendingSignal.strategy || 'SimpleTrueOB';
            stopLoss = pendingSignal.stopLoss || 0;
            takeProfit1 = pendingSignal.takeProfit1;
            takeProfit2 = pendingSignal.takeProfit2;

            // 신호 상태를 FILLED로 업데이트
            await this.signalRepo.update(pendingSignal.id, {
              status: 'FILLED',
            });
          } else {
            // ✅ MANUAL 포지션: 긴급 SL/TP 계산 (3% SL, 1.2R TP)
            const EMERGENCY_SL_PERCENT = 0.03;  // 3%
            const side = positionAmt > 0 ? 'LONG' : 'SHORT';

            if (side === 'LONG') {
              stopLoss = entryPrice * (1 - EMERGENCY_SL_PERCENT);
              const risk = entryPrice - stopLoss;
              takeProfit1 = entryPrice + (risk * 1.2);  // 1.2R
            } else {
              stopLoss = entryPrice * (1 + EMERGENCY_SL_PERCENT);
              const risk = stopLoss - entryPrice;
              takeProfit1 = entryPrice - (risk * 1.2);  // 1.2R
            }

            this.logger.warn(
              `\n⚠️ [MANUAL POSITION] Found in Binance but not in DB: ${symbol}\n` +
              `  → Creating with emergency SL/TP\n` +
              `  Entry: ${entryPrice.toFixed(4)}\n` +
              `  SL: ${stopLoss.toFixed(4)} (3%)\n` +
              `  TP: ${takeProfit1.toFixed(4)} (1.2R)`
            );
          }

          const newPosition = this.positionRepo.create({
            symbol,
            strategy,
            side: positionAmt > 0 ? 'LONG' : 'SHORT',
            entryPrice,
            quantity: Math.abs(positionAmt),
            leverage,
            stopLoss,
            takeProfit1,
            takeProfit2,
            status: 'OPEN',
            openedAt: new Date(),
            metadata: pendingSignal ? {
              recoveredFromSignal: true,
              signalId: pendingSignal.id,
              signalCreatedAt: pendingSignal.createdAt,
            } : undefined,
          });

          await this.positionRepo.save(newPosition);

          // ✅ TP 주문 생성 (신호에서 TP 정보가 있는 경우)
          // v4 최적화: TP1에서 100% 청산 (TP2 미사용)
          if (takeProfit1) {
            this.logger.log(`[RECOVERY] Creating TP order for ${symbol}...`);

            try {
              const formattedTP1 = parseFloat(this.binanceService.formatPrice(symbol, takeProfit1));
              const formattedQty = parseFloat(this.binanceService.formatQuantity(symbol, Math.abs(positionAmt)));

              await this.binanceService.createAlgoOrder({
                symbol,
                side: positionAmt > 0 ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP1,
                quantity: formattedQty,  // 100% 청산
              });
              this.logger.log(`[RECOVERY] ✓ TP created at ${formattedTP1} (100% qty: ${formattedQty})`);
            } catch (tpError: any) {
              this.logger.warn(`[RECOVERY] TP order failed: ${tpError.message}`);
            }
          }
        }
      }

      // 4. DB에는 있지만 바이낸스에 없는 포지션 → 닫힌 것으로 처리
      const binanceSymbols = new Set(activePositions.map(p => p.symbol));

      for (const dbPos of dbPositions) {
        if (!binanceSymbols.has(dbPos.symbol)) {
          // ✅ 이미 수동으로 종료 처리된 포지션은 스킵 (API에서 처리됨)
          if (dbPos.metadata?.manualClose || dbPos.metadata?.actual?.closeType === 'MANUAL') {
            this.logger.debug(`[SYNC] Skipping ${dbPos.symbol} - already manually closed`);
            continue;
          }

          this.logger.warn(
            `\n🔔 [POSITION CLOSED DETECTED]\n` +
            `  Symbol:     ${dbPos.symbol}\n` +
            `  Side:       ${dbPos.side}\n` +
            `  Entry:      ${dbPos.entryPrice}\n` +
            `  Quantity:   ${dbPos.quantity}\n` +
            `  → Fetching trade history for PnL...`
          );

          // 바이낸스에서 최근 거래 내역 조회하여 실현 PnL 확인
          // v10: 더 많은 거래 조회 + 모든 관련 거래 합산 (슬리피지/부분 체결 반영)
          try {
            const trades = await this.binanceService.getRecentTrades(dbPos.symbol, 50);  // 50개로 증가

            // 청산 거래 찾기 (반대 방향, 포지션 오픈 이후)
            const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
            const positionOpenTime = new Date(dbPos.openedAt).getTime();

            // v10: 모든 관련 청산 거래 수집 (부분 체결 포함)
            const closeTrades = trades.filter((t: any) =>
              t.side === closeSide &&
              new Date(t.time).getTime() > positionOpenTime
            );

            if (closeTrades.length > 0) {
              // v10: 모든 청산 거래의 PnL 합산 (실제 슬리피지 반영)
              let totalRealizedPnl = 0;  // 바이낸스 realizedPnl (수수료 미포함)
              let totalCommission = 0;   // 청산 거래 수수료
              let totalQuantity = 0;
              let weightedPriceSum = 0;

              for (const trade of closeTrades) {
                const qty = parseFloat(trade.qty || '0');
                const price = parseFloat(trade.price || '0');
                const pnl = parseFloat(trade.realizedPnl || '0');
                const commission = parseFloat(trade.commission || '0');

                totalRealizedPnl += pnl;
                totalCommission += commission;
                totalQuantity += qty;
                weightedPriceSum += price * qty;
              }

              // 진입 수수료 계산 (진입가 * 수량 * taker fee 0.04%)
              const entryCommission = (typeof dbPos.entryPrice === 'string'
                ? parseFloat(dbPos.entryPrice) : dbPos.entryPrice)
                * totalQuantity * 0.0004;

              // 총 수수료 = 진입 + 청산
              const totalFee = entryCommission + totalCommission;

              // 순수익 = 실현손익 - 총 수수료
              const netPnl = totalRealizedPnl - totalFee;

              // 가중 평균 청산가
              const avgClosePrice = totalQuantity > 0 ? weightedPriceSum / totalQuantity : 0;

              // ═══════════════════════════════════════════════════════════
              // 📊 청산 타입 감지 (SL/TP1/TP2/MANUAL)
              // ═══════════════════════════════════════════════════════════
              const entryPrice = typeof dbPos.entryPrice === 'string'
                ? parseFloat(dbPos.entryPrice) : dbPos.entryPrice;
              const plannedSL = typeof dbPos.stopLoss === 'string'
                ? parseFloat(dbPos.stopLoss) : dbPos.stopLoss;
              const plannedTP1 = typeof dbPos.takeProfit1 === 'string'
                ? parseFloat(dbPos.takeProfit1) : dbPos.takeProfit1;
              const plannedTP2 = typeof dbPos.takeProfit2 === 'string'
                ? parseFloat(dbPos.takeProfit2) : dbPos.takeProfit2;

              // 청산 타입 결정 (가장 가까운 목표가 기준)
              let closeType: 'SL' | 'TP1' | 'TP2' | 'MANUAL' | 'LIQUIDATION' = 'MANUAL';
              let closeTriggerPrice = 0;
              let closeSlippage = 0;
              let closeSlippagePercent = 0;

              if (plannedSL && plannedTP1) {
                const slDistance = Math.abs(avgClosePrice - plannedSL);
                const tp1Distance = Math.abs(avgClosePrice - plannedTP1);
                const tp2Distance = plannedTP2 ? Math.abs(avgClosePrice - plannedTP2) : Infinity;

                // 가장 가까운 목표가로 청산 타입 결정 (5% 오차 허용)
                const minDistance = Math.min(slDistance, tp1Distance, tp2Distance);
                const tolerance = entryPrice * 0.05; // 5% 허용 오차

                if (minDistance < tolerance) {
                  if (minDistance === slDistance) {
                    closeType = 'SL';
                    closeTriggerPrice = plannedSL;
                  } else if (minDistance === tp1Distance) {
                    closeType = 'TP1';
                    closeTriggerPrice = plannedTP1;
                  } else {
                    closeType = 'TP2';
                    closeTriggerPrice = plannedTP2!;
                  }

                  // 슬리피지 계산 (실제 청산가 - 계획된 트리거가)
                  closeSlippage = avgClosePrice - closeTriggerPrice;
                  closeSlippagePercent = (closeSlippage / closeTriggerPrice) * 100;

                  // LONG은 양수 슬리피지가 유리, SHORT는 음수가 유리
                  if (dbPos.side === 'SHORT') {
                    closeSlippage = -closeSlippage;
                    closeSlippagePercent = -closeSlippagePercent;
                  }
                }
              }

              // ═══════════════════════════════════════════════════════════
              // 💾 상세 청산 정보 저장
              // ═══════════════════════════════════════════════════════════
              // ✅ 순수익(수수료 차감) 저장 - 바이낸스 표시와 동일하게
              dbPos.realizedPnl = netPnl;
              dbPos.metadata = {
                ...dbPos.metadata,
                // 기존 필드 (하위 호환)
                closePrice: avgClosePrice,
                closeTradeIds: closeTrades.map((t: any) => t.id),
                closeTradeCount: closeTrades.length,
                closeTime: closeTrades[closeTrades.length - 1].time,

                // 📊 실제 청산 정보 (actual 객체 업데이트)
                actual: {
                  ...(dbPos.metadata?.actual || {}),
                  exit: avgClosePrice,           // 실제 청산가
                  exitTime: closeTrades[closeTrades.length - 1].time,
                  closeType: closeType,          // SL/TP1/TP2/MANUAL
                  closeTriggerPrice: closeTriggerPrice, // 트리거된 목표가
                },

                // 📈 청산 슬리피지 분석
                slippage: {
                  ...(dbPos.metadata?.slippage || {}),
                  exit: closeSlippage,           // 청산 슬리피지 (USDT)
                  exitPercent: closeSlippagePercent, // 청산 슬리피지 (%)
                  totalSlippage: (dbPos.metadata?.slippage?.entry || 0) + closeSlippage,
                  totalSlippagePercent: (dbPos.metadata?.slippage?.entryPercent || 0) + closeSlippagePercent,
                },

                // 📊 거래 결과 분석
                result: {
                  win: netPnl > 0,
                  grossPnl: totalRealizedPnl,   // 수수료 미포함 손익
                  fee: totalFee,                 // 총 수수료 (진입 + 청산)
                  entryFee: entryCommission,     // 진입 수수료
                  exitFee: totalCommission,      // 청산 수수료
                  pnl: netPnl,                   // 순수익 (수수료 차감)
                  pnlPercent: entryPrice > 0
                    ? (netPnl / (entryPrice * totalQuantity / (dbPos.leverage || 10))) * 100
                    : 0,
                  holdingTime: dbPos.openedAt
                    ? new Date(closeTrades[closeTrades.length - 1].time).getTime() - new Date(dbPos.openedAt).getTime()
                    : 0,
                  expectedPnl: closeType === 'SL'
                    ? -Math.abs(entryPrice - plannedSL) * totalQuantity
                    : closeType === 'TP1'
                      ? Math.abs(plannedTP1 - entryPrice) * totalQuantity
                      : closeType === 'TP2'
                        ? Math.abs(plannedTP2! - entryPrice) * totalQuantity
                        : 0,
                },
              };

              const holdingMinutes = dbPos.metadata.result?.holdingTime
                ? Math.round(dbPos.metadata.result.holdingTime / 60000)
                : 0;

              this.logger.log(
                `  ✅ Trades found: ${closeTrades.length} fill(s)\n` +
                `    ┌─────────────────────────────────────────────────────\n` +
                `    │ 📊 청산 분석\n` +
                `    │   Close Type:     ${closeType} ${closeType === 'SL' ? '🔴' : closeType.startsWith('TP') ? '🟢' : '⚪'}\n` +
                `    │   Planned Trigger: ${closeTriggerPrice > 0 ? closeTriggerPrice.toFixed(4) : 'N/A'}\n` +
                `    │   Actual Close:   ${avgClosePrice.toFixed(4)}\n` +
                `    ├─────────────────────────────────────────────────────\n` +
                `    │ 📈 슬리피지\n` +
                `    │   Exit Slippage:  ${closeSlippage >= 0 ? '+' : ''}${closeSlippage.toFixed(4)} (${closeSlippagePercent >= 0 ? '+' : ''}${closeSlippagePercent.toFixed(3)}%)\n` +
                `    │   Total Slippage: ${dbPos.metadata.slippage?.totalSlippage >= 0 ? '+' : ''}${(dbPos.metadata.slippage?.totalSlippage || 0).toFixed(4)}\n` +
                `    ├─────────────────────────────────────────────────────\n` +
                `    │ 💰 결과\n` +
                `    │   Gross PnL:      $${totalRealizedPnl.toFixed(2)}\n` +
                `    │   Trading Fee:    -$${totalFee.toFixed(2)} (entry: $${entryCommission.toFixed(2)}, exit: $${totalCommission.toFixed(2)})\n` +
                `    │   Net PnL:        $${netPnl.toFixed(2)} ${netPnl >= 0 ? '🟢 WIN' : '🔴 LOSS'}\n` +
                `    │   Holding Time:   ${holdingMinutes} minutes\n` +
                `    └─────────────────────────────────────────────────────`
              );
            } else {
              this.logger.warn(`  ⚠️ No matching close trade found - may be liquidation`);
              dbPos.metadata = {
                ...dbPos.metadata,
                closedByLiquidation: true,
              };
            }
          } catch (tradeError: any) {
            this.logger.warn(`  ⚠️ Failed to fetch trade history: ${tradeError.message}`);
          }

          // ✅ 남은 조건 주문(SL/TP) 정리 - 포지션 청산 후 잔여 주문 취소
          try {
            this.logger.log(`  → Cleaning up remaining algo orders for ${dbPos.symbol}...`);
            const cleanup = await this.binanceService.cancelAllAlgoOrders(dbPos.symbol);
            if (cleanup.canceled > 0) {
              this.logger.log(`  ✅ Cleaned up ${cleanup.canceled} remaining algo orders`);
            }
          } catch (cleanupError: any) {
            this.logger.warn(`  ⚠️ Failed to cleanup algo orders: ${cleanupError.message}`);
          }

          dbPos.status = 'CLOSED';
          dbPos.closedAt = new Date();
          await this.positionRepo.save(dbPos);

          // v13: 손실 시 블랙리스트 기록 (당일 2회 이상 손실 시 진입 금지)
          if (dbPos.realizedPnl < 0) {
            this.riskService.recordSymbolLoss(dbPos.symbol);
          }

          // TP1 추적에서 제거
          this.tp1TriggeredPositions.delete(dbPos.symbol);

          // v8: 재진입 쿨다운 시작 (5분봉, 15분봉 모두)
          if (dbPos.strategy === 'SIMPLE_TRUE_OB') {
            this.simpleTrueOBStrategy.onPositionClosed(dbPos.symbol, '5m');
            this.simpleTrueOBStrategy.onPositionClosed(dbPos.symbol, '15m');
            this.logger.log(`  → [v8] Reentry cooldown started for ${dbPos.symbol} (12 bars)`);
          }

          this.logger.log(`  → Position marked as CLOSED in DB`);
        }
      }

      // [FLOW-7] 동기화 완료 로깅
      if (activePositions.length > 0) {
        this.logger.log(
          `[FLOW-7] PositionSync → Complete | ${activePositions.length} active positions | ` +
          `TP1 Tracked: ${this.tp1TriggeredPositions.size}`
        );
      }
    } catch (error: any) {
      this.logger.error(`[FLOW-7] ❌ Sync Error: ${error?.message || error}`);
      if (error?.stack) {
        this.logger.debug(error.stack);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async forceSync() {
    this.logger.log('Force syncing positions...');
    await this.syncPositions();
  }

  /**
   * [FLOW-7] TP1 체결 감지 및 SL 본전 이동
   *
   * 로직:
   * 1. DB 포지션의 원래 수량과 바이낸스 실제 수량 비교
   * 2. 수량이 줄었으면 TP1이 체결된 것
   * 3. TP1 체결 시 SL을 진입가(본전)로 이동
   */
  private async checkAndMoveSlToBreakeven(
    dbPositions: Position[],
    binancePositions: any[]
  ): Promise<void> {
    for (const dbPos of dbPositions) {
      // 이미 SL 본전 이동 완료된 포지션 스킵
      if (this.tp1TriggeredPositions.has(dbPos.symbol)) {
        continue;
      }

      const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);
      if (!binancePos) continue;

      // PostgreSQL decimal 타입은 string으로 반환될 수 있으므로 parseFloat 처리
      const originalQty = typeof dbPos.quantity === 'string' ? parseFloat(dbPos.quantity) : dbPos.quantity;
      const currentQty = Math.abs(parseFloat(binancePos.positionAmt));
      const entryPrice = typeof dbPos.entryPrice === 'string' ? parseFloat(dbPos.entryPrice) : dbPos.entryPrice;

      // TP1 비율 (70%)이 체결되었는지 확인
      // 원래 수량의 25-40% 정도가 남아있으면 TP1이 체결된 것
      const remainingRatio = currentQty / originalQty;

      // TP1 (70%) 체결 → 남은 비율이 약 30% (±5% 오차 허용)
      if (remainingRatio > 0.25 && remainingRatio < 0.40 && currentQty > 0) {
        this.logger.log(
          `\n[FLOW-7] ═══════════════════════════════════════════════════════════\n` +
          `[FLOW-7] 🎯 TP1 DETECTED | ${dbPos.symbol}\n` +
          `[FLOW-7] ───────────────────────────────────────────────────────────\n` +
          `[FLOW-7]   Original Qty: ${originalQty.toFixed(4)}\n` +
          `[FLOW-7]   Current Qty:  ${currentQty.toFixed(4)} (${(remainingRatio * 100).toFixed(1)}% remaining)\n` +
          `[FLOW-7]   Entry Price:  ${entryPrice}\n` +
          `[FLOW-7]   → Moving SL to BREAKEVEN (Entry Price)\n` +
          `[FLOW-7] ═══════════════════════════════════════════════════════════`
        );

        try {
          // 현재 열린 Algo 주문에서 SL 주문 ID 찾기 (2025-12-09 Algo Order API 변경)
          const algoOrders = await this.binanceService.getOpenAlgoOrders(dbPos.symbol);
          const slAlgoOrder = algoOrders.find(o => o.type === 'STOP_MARKET');

          // SL을 본전(진입가)으로 이동
          await this.binanceService.modifyStopLoss(
            dbPos.symbol,
            dbPos.side as 'LONG' | 'SHORT',
            entryPrice,
            slAlgoOrder?.algoId
          );

          // DB 업데이트
          dbPos.stopLoss = entryPrice;
          dbPos.metadata = {
            ...dbPos.metadata,
            tp1Triggered: true,
            tp1TriggeredAt: new Date().toISOString(),
            slMovedToBreakeven: true,
          };
          await this.positionRepo.save(dbPos);

          // 추적 세트에 추가 (중복 실행 방지)
          this.tp1TriggeredPositions.add(dbPos.symbol);

          this.logger.log(
            `[FLOW-7] ✅ SL MOVED TO BREAKEVEN | ${dbPos.symbol} | New SL: ${entryPrice}`
          );
        } catch (error: any) {
          this.logger.error(
            `[FLOW-7] ❌ Failed to move SL to breakeven for ${dbPos.symbol}: ${error.message}`
          );
        }
      }
    }

    // 청산된 포지션은 추적 세트에서 제거
    const activeSymbols = new Set(binancePositions.map(p => p.symbol));
    for (const symbol of this.tp1TriggeredPositions) {
      if (!activeSymbols.has(symbol)) {
        this.tp1TriggeredPositions.delete(symbol);
        this.logger.debug(`[FLOW-7] Removed ${symbol} from TP1 tracking (position closed)`);
      }
    }
  }

  /**
   * v14: 최대 보유시간 초과 포지션 강제 청산
   *
   * 분석 결과 기반:
   * - 15-30분 보유가 유일한 +PnL
   * - 30분 초과 시 손실 급증
   * - 따라서 30분 초과 포지션은 강제 청산
   */
  private async checkAndForceCloseExpiredPositions(
    dbPositions: Position[],
    binancePositions: any[]
  ): Promise<void> {
    const now = Date.now();

    for (const dbPos of dbPositions) {
      // 포지션 오픈 시간 확인
      const openedAt = dbPos.openedAt ? new Date(dbPos.openedAt).getTime() :
                       dbPos.createdAt ? new Date(dbPos.createdAt).getTime() : null;

      if (!openedAt) continue;

      const holdingTimeMs = now - openedAt;
      const holdingMinutes = Math.floor(holdingTimeMs / 60000);

      // 타임프레임별 최대 보유 시간 결정
      const timeframe = dbPos.metadata?.signal?.timeframe || 'default';
      const maxHoldingTime = this.MAX_HOLDING_TIME_MS[timeframe] || this.MAX_HOLDING_TIME_MS['default'];
      const maxHoldingMinutes = Math.floor(maxHoldingTime / 60000);

      // 최대 보유 시간 미만이면 스킵
      if (holdingTimeMs < maxHoldingTime) continue;

      // 바이낸스에 포지션이 있는지 확인
      const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);
      if (!binancePos) continue;

      const currentQty = Math.abs(parseFloat(binancePos.positionAmt));
      if (currentQty <= 0) continue;

      this.logger.warn(
        `\n⏰ [MAX HOLDING TIME EXCEEDED]\n` +
        `  Symbol: ${dbPos.symbol} ${dbPos.side}\n` +
        `  Timeframe: ${timeframe}\n` +
        `  Holding: ${holdingMinutes}분 (Max: ${maxHoldingMinutes}분)\n` +
        `  Quantity: ${currentQty}\n` +
        `  → Force closing position...`
      );

      try {
        // 1. 모든 SL/TP 주문 취소
        await this.binanceService.cancelAllAlgoOrders(dbPos.symbol);

        // 2. 시장가로 강제 청산
        const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
        const closeOrder = await this.binanceService.createOrder({
          symbol: dbPos.symbol,
          side: closeSide,
          type: 'MARKET',
          quantity: currentQty,
          reduceOnly: true,
        });

        this.logger.log(`  ✅ Force close order executed: ${closeOrder.orderId}`);

        // 3. DB 업데이트
        // 실제 PnL은 다음 sync 사이클에서 trade history로 계산됨
        dbPos.metadata = {
          ...dbPos.metadata,
          forceClose: true,
          forceCloseReason: 'MAX_HOLDING_TIME',
          forceCloseTime: new Date().toISOString(),
          holdingMinutes: holdingMinutes,
        };
        await this.positionRepo.save(dbPos);

      } catch (error: any) {
        this.logger.error(`  ❌ Force close failed: ${error.message}`);
      }
    }
  }

  /**
   * ✅ SL Watchdog: SL이 없는 오픈 포지션에 자동으로 SL 생성
   * [방어 로직 3] 재시도 횟수 초과 시 강제 청산
   *
   * 발생 가능 시나리오:
   * 1. 진입 주문 체결 후 SL 주문 실패
   * 2. 네트워크 오류로 SL이 생성되지 않음
   * 3. 수동 거래로 생성된 포지션
   */
  private async checkAndPlaceMissingSL(dbPositions: Position[]): Promise<void> {
    for (const dbPos of dbPositions) {
      try {
        // Algo Order에서 SL/TP 주문 찾기
        const algoOrders = await this.binanceService.getOpenAlgoOrders(dbPos.symbol);

        // SL 체크: closePosition=true인 STOP_MARKET
        const existingSL = algoOrders.find(o =>
          o.type === 'STOP_MARKET' &&
          (o.closePosition === true || o.closePosition === 'true')
        );

        // TP 체크: TAKE_PROFIT_MARKET (quantity 또는 closePosition)
        const existingTP = algoOrders.find(o => o.type === 'TAKE_PROFIT_MARKET');

        // 둘 다 있으면 OK - 재시도 카운터 및 SL 부재 추적 초기화
        if (existingSL && existingTP) {
          this.logger.debug(`[WATCHDOG] ${dbPos.symbol}: SL ✓ TP ✓`);
          this.slTpRetryCount.delete(dbPos.symbol);  // 성공 시 카운터 리셋
          this.positionWithoutSlSince.delete(dbPos.symbol);  // SL 부재 추적 해제
          continue;
        }

        // ═══════════════════════════════════════════════════════════
        // [방어 로직] SL 없이 오래된 포지션 강제 청산
        // ═══════════════════════════════════════════════════════════
        if (!existingSL) {
          const now = Date.now();
          const firstDetected = this.positionWithoutSlSince.get(dbPos.symbol);

          if (!firstDetected) {
            // 처음 SL 부재 감지 - 시간 기록
            this.positionWithoutSlSince.set(dbPos.symbol, now);
            this.logger.warn(
              `[WATCHDOG] ⚠️ ${dbPos.symbol}: SL missing - tracking started`
            );
          } else {
            const minutesWithoutSL = (now - firstDetected) / 60000;

            if (minutesWithoutSL >= this.MAX_TIME_WITHOUT_SL_MINUTES) {
              this.logger.error(
                `\n🚨🚨🚨 [CRITICAL] POSITION WITHOUT SL FOR ${minutesWithoutSL.toFixed(1)} MINUTES! 🚨🚨🚨\n` +
                `  Symbol: ${dbPos.symbol}\n` +
                `  → FORCE CLOSING due to prolonged SL absence!`
              );

              try {
                const binancePositions = await this.binanceService.getOpenPositions();
                const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);

                if (binancePos) {
                  const currentQty = Math.abs(parseFloat(binancePos.positionAmt));
                  if (currentQty > 0) {
                    await this.binanceService.cancelAllAlgoOrders(dbPos.symbol);

                    const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
                    await this.binanceService.createOrder({
                      symbol: dbPos.symbol,
                      side: closeSide,
                      type: 'MARKET',
                      quantity: currentQty,
                      reduceOnly: true,
                    });

                    this.logger.log(`  ✅ Position force closed due to SL absence`);

                    dbPos.metadata = {
                      ...dbPos.metadata,
                      forceClose: true,
                      forceCloseReason: 'PROLONGED_SL_ABSENCE',
                      forceCloseTime: new Date().toISOString(),
                      minutesWithoutSL: minutesWithoutSL,
                    };
                    await this.positionRepo.save(dbPos);
                  }
                }

                this.positionWithoutSlSince.delete(dbPos.symbol);
                this.slTpRetryCount.delete(dbPos.symbol);
              } catch (forceCloseError: any) {
                this.logger.error(`  ❌ Force close failed: ${forceCloseError.message}`);
              }
              continue;
            }
          }
        }

        // ═══════════════════════════════════════════════════════════
        // [방어 로직] 재시도 횟수 체크 - 초과 시 강제 청산
        // ═══════════════════════════════════════════════════════════
        const currentRetries = this.slTpRetryCount.get(dbPos.symbol) || 0;
        if (currentRetries >= this.MAX_SLTP_RETRIES) {
          this.logger.error(
            `\n🚨🚨🚨 [CRITICAL] SL/TP CREATION FAILED ${this.MAX_SLTP_RETRIES} TIMES! 🚨🚨🚨\n` +
            `  Symbol: ${dbPos.symbol}\n` +
            `  SL exists: ${!!existingSL}\n` +
            `  TP exists: ${!!existingTP}\n` +
            `  → FORCE CLOSING POSITION!`
          );

          try {
            // 시장가로 강제 청산
            const binancePositions = await this.binanceService.getOpenPositions();
            const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);

            if (binancePos) {
              const currentQty = Math.abs(parseFloat(binancePos.positionAmt));
              if (currentQty > 0) {
                await this.binanceService.cancelAllAlgoOrders(dbPos.symbol);

                const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
                await this.binanceService.createOrder({
                  symbol: dbPos.symbol,
                  side: closeSide,
                  type: 'MARKET',
                  quantity: currentQty,
                  reduceOnly: true,
                });

                this.logger.log(`  ✅ Position force closed due to SL/TP failure`);

                dbPos.metadata = {
                  ...dbPos.metadata,
                  forceClose: true,
                  forceCloseReason: 'SLTP_CREATION_FAILED',
                  forceCloseTime: new Date().toISOString(),
                  slTpRetries: currentRetries,
                };
                await this.positionRepo.save(dbPos);
              }
            }

            this.slTpRetryCount.delete(dbPos.symbol);
          } catch (forceCloseError: any) {
            this.logger.error(`  ❌ Force close failed: ${forceCloseError.message}`);
          }
          continue;
        }

        const entryPrice = typeof dbPos.entryPrice === 'string'
          ? parseFloat(dbPos.entryPrice) : dbPos.entryPrice;

        // ═══════════════════════════════════════════════════════════
        // SL이 없으면 긴급 생성
        // ═══════════════════════════════════════════════════════════
        if (!existingSL) {
          this.logger.warn(
            `\n🚨 [SL WATCHDOG] Missing SL detected!\n` +
            `  Symbol: ${dbPos.symbol} ${dbPos.side}\n` +
            `  Entry:  ${entryPrice}\n` +
            `  → Creating emergency SL order...`
          );

          let slPrice = typeof dbPos.stopLoss === 'string'
            ? parseFloat(dbPos.stopLoss) : dbPos.stopLoss;

          const EMERGENCY_SL_PERCENT = 0.03;
          if (!slPrice || slPrice <= 0) {
            slPrice = dbPos.side === 'LONG'
              ? entryPrice * (1 - EMERGENCY_SL_PERCENT)
              : entryPrice * (1 + EMERGENCY_SL_PERCENT);
            this.logger.warn(`  ⚠️ No SL price in DB, using 3%: ${slPrice.toFixed(4)}`);
          }

          const formattedSL = parseFloat(this.binanceService.formatPrice(dbPos.symbol, slPrice));

          try {
            const slOrder = await this.binanceService.createAlgoOrder({
              symbol: dbPos.symbol,
              side: dbPos.side === 'LONG' ? 'SELL' : 'BUY',
              type: 'STOP_MARKET',
              triggerPrice: formattedSL,
              closePosition: true,
            });

            dbPos.metadata = {
              ...dbPos.metadata,
              slWatchdogCreated: true,
              slWatchdogTime: new Date().toISOString(),
            };
            await this.positionRepo.save(dbPos);

            this.logger.log(`  ✅ Emergency SL created: ${slOrder.algoId} @ ${formattedSL}`);
            // SL 성공 - 카운터 리셋하지 않음 (TP도 필요하므로)
          } catch (slError: any) {
            if (slError.code === -4130 || slError.message?.includes('-4130')) {
              this.logger.log(`[SL WATCHDOG] ${dbPos.symbol}: SL already exists`);
            } else {
              // ✅ [방어 로직] SL 생성 실패 - 재시도 카운터 증가
              this.slTpRetryCount.set(dbPos.symbol, currentRetries + 1);
              this.logger.error(
                `[SL WATCHDOG] Failed (retry ${currentRetries + 1}/${this.MAX_SLTP_RETRIES}): ${slError.message}`
              );
            }
          }
        }

        // ═══════════════════════════════════════════════════════════
        // TP가 없으면 긴급 생성
        // ═══════════════════════════════════════════════════════════
        if (!existingTP) {
          let tpPrice = typeof dbPos.takeProfit1 === 'string'
            ? parseFloat(dbPos.takeProfit1) : dbPos.takeProfit1;

          // TP 가격이 없으면 1.2R로 계산 (SL 기준)
          if (!tpPrice || tpPrice <= 0) {
            const slPrice = typeof dbPos.stopLoss === 'string'
              ? parseFloat(dbPos.stopLoss) : dbPos.stopLoss;
            if (slPrice && slPrice > 0) {
              const risk = Math.abs(entryPrice - slPrice);
              tpPrice = dbPos.side === 'LONG'
                ? entryPrice + (risk * 1.2)
                : entryPrice - (risk * 1.2);
            }
          }

          if (tpPrice && tpPrice > 0) {
            this.logger.warn(
              `\n🚨 [TP WATCHDOG] Missing TP detected!\n` +
              `  Symbol: ${dbPos.symbol} ${dbPos.side}\n` +
              `  Entry:  ${entryPrice}\n` +
              `  → Creating emergency TP order at ${tpPrice.toFixed(4)}...`
            );

            const formattedTP = parseFloat(this.binanceService.formatPrice(dbPos.symbol, tpPrice));
            const quantity = typeof dbPos.quantity === 'string'
              ? parseFloat(dbPos.quantity) : dbPos.quantity;
            const formattedQty = parseFloat(this.binanceService.formatQuantity(dbPos.symbol, quantity));

            try {
              const tpOrder = await this.binanceService.createAlgoOrder({
                symbol: dbPos.symbol,
                side: dbPos.side === 'LONG' ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP,
                quantity: formattedQty,
              });

              dbPos.metadata = {
                ...dbPos.metadata,
                tpWatchdogCreated: true,
                tpWatchdogTime: new Date().toISOString(),
              };
              await this.positionRepo.save(dbPos);

              this.logger.log(`  ✅ Emergency TP created: ${tpOrder.algoId} @ ${formattedTP}`);
              // SL과 TP 둘 다 성공하면 다음 사이클에서 카운터 리셋됨
            } catch (tpError: any) {
              // ✅ [방어 로직] TP 생성 실패 - 재시도 카운터 증가
              this.slTpRetryCount.set(dbPos.symbol, currentRetries + 1);
              this.logger.error(
                `[TP WATCHDOG] Failed (retry ${currentRetries + 1}/${this.MAX_SLTP_RETRIES}): ${tpError.message}`
              );
            }
          } else {
            // TP 가격을 구할 수 없는 경우도 재시도 카운터 증가
            this.slTpRetryCount.set(dbPos.symbol, currentRetries + 1);
            this.logger.warn(
              `[TP WATCHDOG] ${dbPos.symbol}: Cannot create TP - no valid price (retry ${currentRetries + 1}/${this.MAX_SLTP_RETRIES})`
            );
          }
        }

      } catch (error: any) {
        this.logger.error(`[WATCHDOG] Error for ${dbPos.symbol}: ${error.message}`);
      }
    }
  }

  /**
   * ✅ [방어 로직 1] 미인식 포지션 감지 및 즉시 청산
   *
   * 시스템이 생성하지 않은 포지션을 감지하고 즉시 청산합니다.
   * - DB에 없고
   * - 매칭되는 PENDING 신호도 없고
   * - OrderService에서 처리 중이 아닌 경우
   * → 즉시 시장가 청산
   */
  private async detectAndCloseUnknownPositions(
    dbPositions: Position[],
    binancePositions: any[]
  ): Promise<void> {
    const dbSymbols = new Set(dbPositions.map(p => p.symbol));

    for (const binancePos of binancePositions) {
      const symbol = binancePos.symbol;
      const positionAmt = parseFloat(binancePos.positionAmt);

      // 이미 DB에 있으면 스킵
      if (dbSymbols.has(symbol)) continue;

      // OrderService에서 처리 중이면 스킵
      if (OrderService.isSymbolPending(symbol)) {
        this.logger.debug(`[DEFENSE] ${symbol}: Being processed by OrderService, skipping`);
        continue;
      }

      // PENDING 또는 FILLED 신호 확인 (최근 30분 이내)
      // - 주문 체결까지 시간이 걸릴 수 있음 (Limit 주문은 최대 15분)
      // - FILLED 직후 OrderMonitorService와 경쟁 상태 발생 가능
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentSignal = await this.signalRepo.findOne({
        where: [
          {
            symbol,
            side: positionAmt > 0 ? 'LONG' : 'SHORT',
            status: 'PENDING',
            createdAt: MoreThan(thirtyMinutesAgo),
          },
          {
            symbol,
            side: positionAmt > 0 ? 'LONG' : 'SHORT',
            status: 'FILLED',
            createdAt: MoreThan(thirtyMinutesAgo),
          },
        ],
      });

      if (recentSignal) {
        this.logger.debug(`[DEFENSE] ${symbol}: Has recent signal (${recentSignal.status}), allowing`);
        continue;
      }

      // ⚠️ 추가 대기: 방금 체결된 주문일 수 있음 (Race Condition 방지)
      // OrderMonitorService가 처리할 시간을 줌
      this.logger.debug(`[DEFENSE] ${symbol}: No signal found, waiting 3s before final check...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3초 대기 후 다시 확인
      if (OrderService.isSymbolPending(symbol)) {
        this.logger.debug(`[DEFENSE] ${symbol}: Now being processed by OrderService after wait, skipping`);
        continue;
      }

      // DB에 포지션이 생성되었는지 재확인
      const newDbPosition = await this.positionRepo.findOne({
        where: { symbol, status: 'OPEN' },
      });
      if (newDbPosition) {
        this.logger.debug(`[DEFENSE] ${symbol}: Position was created during wait, skipping`);
        continue;
      }

      // ⚠️ 미인식 포지션 발견 - 즉시 청산!
      const entryPrice = parseFloat(binancePos.entryPrice);
      const currentQty = Math.abs(positionAmt);
      const positionValue = entryPrice * currentQty;

      this.logger.error(
        `\n🚨🚨🚨 [CRITICAL] UNKNOWN POSITION DETECTED! 🚨🚨🚨\n` +
        `  Symbol:    ${symbol}\n` +
        `  Side:      ${positionAmt > 0 ? 'LONG' : 'SHORT'}\n` +
        `  Quantity:  ${currentQty}\n` +
        `  Entry:     ${entryPrice}\n` +
        `  Value:     $${positionValue.toFixed(2)}\n` +
        `  → CLOSING IMMEDIATELY!`
      );

      try {
        // 1. 모든 관련 주문 취소
        await this.binanceService.cancelAllAlgoOrders(symbol);

        // 2. 시장가로 즉시 청산
        const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
        const closeOrder = await this.binanceService.createOrder({
          symbol,
          side: closeSide,
          type: 'MARKET',
          quantity: currentQty,
          reduceOnly: true,
        });

        this.logger.log(
          `  ✅ Unknown position CLOSED: ${closeOrder.orderId}\n` +
          `  ════════════════════════════════════════════════════`
        );

      } catch (error: any) {
        this.logger.error(`  ❌ Failed to close unknown position: ${error.message}`);
      }
    }
  }

  /**
   * ✅ [방어 로직 2] 비정상 마진 포지션 감지 및 청산
   *
   * 마진(원금)이 총 자본의 10%를 초과하는 포지션을 감지하고 청산합니다.
   * 마진 = 포지션 가치 / 레버리지
   */
  private async detectAndCloseOversizedPositions(
    binancePositions: any[]
  ): Promise<void> {
    // ✅ 총 자본 조회 (Available Balance + Unrealized PnL)
    let totalCapital: number;
    try {
      const availableBalance = await this.binanceService.getAvailableBalance();
      // 미실현 손익 포함한 총 자본 계산
      const totalUnrealizedPnl = binancePositions.reduce((sum, p) => {
        return sum + parseFloat(p.unRealizedProfit || '0');
      }, 0);
      totalCapital = availableBalance + totalUnrealizedPnl;
    } catch (error: any) {
      this.logger.warn(`[OVERSIZED] Failed to get balance: ${error.message}, using fallback`);
      totalCapital = 500;  // fallback: $500
    }

    const maxMargin = totalCapital * this.MAX_MARGIN_PERCENT;

    for (const binancePos of binancePositions) {
      const symbol = binancePos.symbol;
      const positionAmt = parseFloat(binancePos.positionAmt);
      const markPrice = parseFloat(binancePos.markPrice);
      const leverage = parseInt(binancePos.leverage) || 10;
      const currentQty = Math.abs(positionAmt);

      // 포지션 가치 계산 (마크 가격 기준)
      const positionValue = markPrice * currentQty;

      // ✅ 마진(원금) 계산 = 포지션 가치 / 레버리지
      const margin = positionValue / leverage;

      // ✅ v16: 비정상 마진 체크 - 2가지 조건
      // 1) 총 자본의 10% 초과 (단, 마진이 $50 이상일 때만 체크)
      // 2) 절대값 $35 이상 (무조건)
      // v20: 마진 $50 미만은 퍼센트 체크 스킵 (소액 시드용)
      const MIN_MARGIN_FOR_PERCENT_CHECK = 50;
      const exceedsPercentLimit = margin >= MIN_MARGIN_FOR_PERCENT_CHECK && margin > maxMargin;
      const exceedsAbsoluteLimit = margin >= this.ABSOLUTE_MAX_MARGIN;

      if (exceedsPercentLimit || exceedsAbsoluteLimit) {
        const reason = exceedsAbsoluteLimit
          ? `ABSOLUTE LIMIT ($${this.ABSOLUTE_MAX_MARGIN}+)`
          : `PERCENT LIMIT (${(this.MAX_MARGIN_PERCENT * 100).toFixed(0)}% of capital)`;

        this.logger.error(
          `\n🚨🚨🚨 [CRITICAL] OVERSIZED MARGIN DETECTED! 🚨🚨🚨\n` +
          `  Symbol:         ${symbol}\n` +
          `  Side:           ${positionAmt > 0 ? 'LONG' : 'SHORT'}\n` +
          `  Quantity:       ${currentQty}\n` +
          `  Position Value: $${positionValue.toFixed(2)}\n` +
          `  Leverage:       ${leverage}x\n` +
          `  Margin (원금):  $${margin.toFixed(2)}\n` +
          `  Total Capital:  $${totalCapital.toFixed(2)}\n` +
          `  Percent Limit:  $${maxMargin.toFixed(2)} (${(this.MAX_MARGIN_PERCENT * 100).toFixed(0)}% of capital)\n` +
          `  Absolute Limit: $${this.ABSOLUTE_MAX_MARGIN}\n` +
          `  Reason:         ${reason}\n` +
          `  → CLOSING IMMEDIATELY!`
        );

        try {
          // 1. 모든 관련 주문 취소
          await this.binanceService.cancelAllAlgoOrders(symbol);

          // 2. 시장가로 즉시 청산
          const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
          const closeOrder = await this.binanceService.createOrder({
            symbol,
            side: closeSide,
            type: 'MARKET',
            quantity: currentQty,
            reduceOnly: true,
          });

          this.logger.log(
            `  ✅ Oversized margin position CLOSED: ${closeOrder.orderId}\n` +
            `  ════════════════════════════════════════════════════`
          );

          // DB에 포지션이 있으면 상태 업데이트
          const dbPos = await this.positionRepo.findOne({
            where: { symbol, status: 'OPEN' },
          });
          if (dbPos) {
            dbPos.metadata = {
              ...dbPos.metadata,
              forceClose: true,
              forceCloseReason: exceedsAbsoluteLimit ? 'ABSOLUTE_MARGIN_LIMIT' : 'OVERSIZED_MARGIN',
              forceCloseTime: new Date().toISOString(),
              margin: margin,
              maxAllowedMargin: maxMargin,
              absoluteMarginLimit: this.ABSOLUTE_MAX_MARGIN,
              totalCapital: totalCapital,
              positionValue: positionValue,
              leverage: leverage,
            };
            await this.positionRepo.save(dbPos);
          }

        } catch (error: any) {
          this.logger.error(`  ❌ Failed to close oversized margin position: ${error.message}`);
        }
      }
    }
  }
}
