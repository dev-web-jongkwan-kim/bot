import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { OkxService } from '../okx/okx.service';
import { SimpleTrueOBStrategy } from '../strategies/simple-true-ob.strategy';
import { OrderService } from '../order/order.service';
import { RiskService } from '../risk/risk.service';
import { ScalpingPositionService } from '../scalping/services/scalping-position.service';

@Injectable()
export class PositionSyncService {
  private readonly logger = new Logger(PositionSyncService.name);
  private isSyncing = false;

  // TP1 체결 추적 (심볼 -> 본전 이동 완료 여부)
  private tp1TriggeredPositions: Set<string> = new Set();

  // ✅ 방어 로직: SL/TP 생성 실패 재시도 카운터 (심볼 -> 실패 횟수)
  private slTpRetryCount: Map<string, number> = new Map();
  private readonly MAX_SLTP_RETRIES = 3;

  // ✅ 방어 로직: 방금 강제 청산된 심볼은 SL/TP 재생성 스킵
  private recentlyForceClosedSymbols: Map<string, number> = new Map();
  private readonly FORCE_CLOSE_SKIP_MS = 60 * 1000; // 60초

  // ✅ 방어 로직: 비정상 마진(원금) 임계값
  private readonly MAX_MARGIN_PERCENT = 0.10;  // 마진이 총 자본의 10% 초과 시 청산
  private readonly ABSOLUTE_MAX_MARGIN = 35;   // v16: 절대 마진 임계값 $35 이상이면 무조건 청산

  // ✅ 방어 로직: SL 없이 오래된 포지션 강제 청산 (분)
  private readonly MAX_TIME_WITHOUT_SL_MINUTES = 5;  // SL 없이 5분 이상 방치 시 청산

  // ✅ 방어 로직: 포지션별 SL 부재 시작 시간 추적
  private positionWithoutSlSince: Map<string, number> = new Map();

  // ✅ 스캘핑 포지션 실포지션 누락 감지 유예 시간
  private scalpingMissingSince: Map<string, number> = new Map();
  private readonly SCALPING_MISSING_GRACE_MS = 90 * 1000; // 90초
  private scalpingMissingCount: Map<string, number> = new Map();
  private readonly SCALPING_MISSING_CONFIRM_COUNT = 3;

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
    private okxService: OkxService,
    @Inject(forwardRef(() => SimpleTrueOBStrategy))
    private simpleTrueOBStrategy: SimpleTrueOBStrategy,
    private riskService: RiskService,  // v13: 블랙리스트 기록용
    @Optional() @Inject(forwardRef(() => ScalpingPositionService))
    private scalpingPositionService: ScalpingPositionService,  // 스캘핑 포지션 서비스
  ) {}

  /**
   * ✅ 오늘자 체결 내역 기준으로 DB 포지션 동기화
   */
  async syncTodayTradesFromBinance(): Promise<{
    success: boolean;
    symbols: number;
    positions: number;
    closedUpdated: number;
    pnlUpdated: number;
    skipped: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayPositions = await this.positionRepo.find({
      where: [
        { openedAt: MoreThanOrEqual(startOfDay) },
        { closedAt: MoreThanOrEqual(startOfDay) },
      ],
      order: { openedAt: 'DESC' },
    });

    const symbolSet = new Set(todayPositions.map((p) => p.symbol));
    if (symbolSet.size === 0) {
      return {
        success: true,
        symbols: 0,
        positions: 0,
        closedUpdated: 0,
        pnlUpdated: 0,
        skipped: 0,
      };
    }

    const livePositions = await this.okxService.getOpenPositions();
    const liveMap = new Map<string, number>();
    for (const pos of livePositions) {
      const qty = Math.abs(parseFloat(pos.positionAmt || '0'));
      if (qty > 0) {
        liveMap.set(pos.symbol, qty);
      }
    }

    const tradesBySymbol = new Map<string, any[]>();
    for (const symbol of symbolSet) {
      try {
        const trades = await this.okxService.getUserTrades({
          symbol,
          startTime: startOfDay.getTime(),
          endTime: Date.now(),
          limit: 1000,
        });
        const sorted = [...trades].sort(
          (a, b) => (a.time || 0) - (b.time || 0),
        );
        tradesBySymbol.set(symbol, sorted);
      } catch (error: any) {
        this.logger.warn(
          `[SYNC] ${symbol}: failed to fetch userTrades - ${error.message}`,
        );
        tradesBySymbol.set(symbol, []);
      }
    }

    let closedUpdated = 0;
    let pnlUpdated = 0;
    let skipped = 0;

    for (const dbPos of todayPositions) {
      const trades = tradesBySymbol.get(dbPos.symbol) || [];
      if (trades.length === 0) {
        skipped++;
        continue;
      }

      const openedAtMs = dbPos.openedAt?.getTime?.() || startOfDay.getTime();
      const relevant = trades.filter(
        (t) => (t.time || 0) >= openedAtMs - 60_000,
      );
      if (relevant.length === 0) {
        skipped++;
        continue;
      }

      const lastTrade = relevant[relevant.length - 1];
      const realizedPnl = relevant.reduce(
        (sum, t) => sum + parseFloat(t.realizedPnl || '0'),
        0,
      );

      const hasLive = liveMap.has(dbPos.symbol);
      if (dbPos.status === 'OPEN' && !hasLive) {
        dbPos.status = 'CLOSED';
        dbPos.closedAt = new Date(lastTrade.time || Date.now());
        dbPos.realizedPnl = Number(realizedPnl.toFixed(8));
        dbPos.metadata = {
          ...dbPos.metadata,
          closeReason: 'BINANCE_TRADE_SYNC',
          closeTime: lastTrade.time || Date.now(),
          actual: {
            entry: dbPos.entryPrice,
            exit: parseFloat(lastTrade.price || '0'),
            exitTime: lastTrade.time || Date.now(),
          },
          tradeSync: {
            tradeCount: relevant.length,
            lastTradeId: lastTrade.id || lastTrade.tradeId,
          },
        };

        await this.positionRepo.save(dbPos);
        closedUpdated++;

        if (this.scalpingPositionService) {
          this.scalpingPositionService.removePosition(dbPos.symbol);
          this.scalpingPositionService.removePendingOrder(dbPos.symbol);
          this.scalpingPositionService.setSymbolCooldown(dbPos.symbol, 'MANUAL');
        }
        continue;
      }

      if (
        dbPos.status === 'CLOSED' &&
        (dbPos.realizedPnl === null || dbPos.realizedPnl === undefined)
      ) {
        dbPos.realizedPnl = Number(realizedPnl.toFixed(8));
        dbPos.metadata = {
          ...dbPos.metadata,
          tradeSync: {
            tradeCount: relevant.length,
            lastTradeId: lastTrade.id || lastTrade.tradeId,
            lastTradeTime: lastTrade.time || Date.now(),
          },
        };
        await this.positionRepo.save(dbPos);
        pnlUpdated++;
        continue;
      }

      skipped++;
    }

    this.logger.log(
      `[SYNC] Binance today sync complete: symbols=${symbolSet.size}, positions=${todayPositions.length}, closedUpdated=${closedUpdated}, pnlUpdated=${pnlUpdated}, skipped=${skipped}`,
    );

    return {
      success: true,
      symbols: symbolSet.size,
      positions: todayPositions.length,
      closedUpdated,
      pnlUpdated,
      skipped,
    };
  }

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
      const binancePositions = await this.okxService.getOpenPositions();
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
      await this.detectAndCloseOversizedPositions(activePositions, dbPositions);

      // [FLOW-7] TP1 체결 감지 및 SL 본전 이동
      await this.checkAndMoveSlToBreakeven(dbPositions, activePositions);

      // ✅ SL Watchdog: SL이 없는 오픈 포지션에 자동으로 SL 생성
      // [방어 로직 3] 재시도 횟수 초과 시 강제 청산
      await this.checkAndPlaceMissingSL(dbPositions, activePositions);

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
          // ✅ 주문 반전 로직 고려: LONG 신호 → SHORT 포지션, SHORT 신호 → LONG 포지션
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const actualSide = positionAmt > 0 ? 'LONG' : 'SHORT';
          const reversedSide = positionAmt > 0 ? 'SHORT' : 'LONG';  // 전략 반전 시 신호 side

          // 먼저 반전된 side로 찾기 (전략 포지션)
          let pendingSignal = await this.signalRepo.findOne({
            where: {
              symbol,
              side: reversedSide,  // ✅ 반전된 side 먼저 체크
              status: 'PENDING',
              createdAt: MoreThan(thirtyMinutesAgo),
            },
            order: { createdAt: 'DESC' },
          });

          // 없으면 실제 side로 찾기 (수동 포지션 또는 반전 안 된 경우)
          if (!pendingSignal) {
            pendingSignal = await this.signalRepo.findOne({
              where: {
                symbol,
                side: actualSide,
                status: 'PENDING',
                createdAt: MoreThan(thirtyMinutesAgo),
              },
              order: { createdAt: 'DESC' },
            });
          }

          let strategy = 'MANUAL';
          let stopLoss = 0;
          let takeProfit1 = null;
          let takeProfit2 = null;

          if (pendingSignal) {
            this.logger.log(
              `✅ [RECOVERY] Found matching PENDING signal for ${symbol}!\n` +
              `  Signal ID: ${pendingSignal.id}\n` +
              `  Signal Side: ${pendingSignal.side}\n` +
              `  Original SL: ${pendingSignal.stopLoss}\n` +
              `  Original TP1: ${pendingSignal.takeProfit1}\n` +
              `  Original TP2: ${pendingSignal.takeProfit2}`
            );

            strategy = pendingSignal.strategy || 'SimpleTrueOB';
            const actualPositionSide = positionAmt > 0 ? 'LONG' : 'SHORT';

            // ✅ 주문 반전 감지: 신호 side와 실제 포지션 side가 반대인 경우
            // LONG 신호 → SHORT 포지션, SHORT 신호 → LONG 포지션
            const isReversed = pendingSignal.side !== actualPositionSide;

            if (isReversed) {
              // ✅ SL/TP 반전: 신호의 SL이 새 TP, 신호의 TP가 새 SL
              // LONG 신호: SL(아래) → TP(아래), TP(위) → SL(위)
              // SHORT 신호: SL(위) → TP(위), TP(아래) → SL(아래)
              stopLoss = pendingSignal.takeProfit1 || 0;  // 원래 TP → 새 SL
              takeProfit1 = pendingSignal.stopLoss;       // 원래 SL → 새 TP
              takeProfit2 = null;  // TP2는 사용 안 함

              this.logger.log(
                `  → Order Reversed: ${pendingSignal.side} signal → ${actualPositionSide} position\n` +
                `  → Swapped SL: ${stopLoss.toFixed(4)} (was TP1)\n` +
                `  → Swapped TP: ${takeProfit1?.toFixed(4)} (was SL)`
              );
            } else {
              stopLoss = pendingSignal.stopLoss || 0;
              takeProfit1 = pendingSignal.takeProfit1;
              takeProfit2 = pendingSignal.takeProfit2;
            }

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
              const formattedTP1 = parseFloat(this.okxService.formatPrice(symbol, takeProfit1));
              const formattedQty = parseFloat(this.okxService.formatQuantity(symbol, Math.abs(positionAmt)));

              // ✅ positionAmt는 실제 포지션 방향이므로 추가 반전 불필요
              await this.okxService.createAlgoOrder({
                symbol,
                side: positionAmt > 0 ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP1,
                quantity: formattedQty,  // 100% 청산
                isStrategyPosition: false,  // ✅ 실제 포지션 방향 - 반전 불필요
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

      for (const livePos of activePositions) {
        this.scalpingMissingSince.delete(livePos.symbol);
        this.scalpingMissingCount.delete(livePos.symbol);
      }

      for (const dbPos of dbPositions) {
        if (!binanceSymbols.has(dbPos.symbol)) {
          // ✅ 이미 수동으로 종료 처리된 포지션은 스킵 (API에서 처리됨)
          if (dbPos.metadata?.manualClose || dbPos.metadata?.actual?.closeType === 'MANUAL') {
            this.logger.debug(`[SYNC] Skipping ${dbPos.symbol} - already manually closed`);
            continue;
          }

          if (dbPos.strategy === 'SCALPING') {
            const missingSince = this.scalpingMissingSince.get(dbPos.symbol);
            if (!missingSince) {
              this.scalpingMissingSince.set(dbPos.symbol, Date.now());
              this.logger.warn(
                `[SYNC] ${dbPos.symbol}: scalping missing on exchange - grace period started`,
              );
              continue;
            }
            if (Date.now() - missingSince < this.SCALPING_MISSING_GRACE_MS) {
              this.logger.warn(
                `[SYNC] ${dbPos.symbol}: scalping missing on exchange - waiting (${Math.round((Date.now() - missingSince) / 1000)}s)`,
              );
              continue;
            }

            const missingCount = (this.scalpingMissingCount.get(dbPos.symbol) || 0) + 1;
            this.scalpingMissingCount.set(dbPos.symbol, missingCount);
            if (missingCount < this.SCALPING_MISSING_CONFIRM_COUNT) {
              this.logger.warn(
                `[SYNC] ${dbPos.symbol}: scalping missing confirm ${missingCount}/${this.SCALPING_MISSING_CONFIRM_COUNT}`,
              );
              continue;
            }

            const pendingOrder = this.scalpingPositionService?.getPendingOrder(dbPos.symbol);
            if (pendingOrder) {
              this.logger.warn(
                `[SYNC] ${dbPos.symbol}: scalping pending order exists - skip close`,
              );
              continue;
            }

            const algoOrders = await this.okxService.getOpenAlgoOrders(dbPos.symbol);
            if (algoOrders.length > 0) {
              this.logger.warn(
                `[SYNC] ${dbPos.symbol}: scalping algo orders exist (${algoOrders.length}) - skip close`,
              );
              continue;
            }

            const entryOrderId = dbPos.metadata?.orderId;
            if (entryOrderId) {
              const entryStatus = await this.okxService.queryOrder(dbPos.symbol, Number(entryOrderId));
              const status = entryStatus?.status || entryStatus?.state;
              if (status && status !== 'FILLED' && status !== 'filled') {
                this.logger.warn(
                  `[SYNC] ${dbPos.symbol}: entry order not filled (${status}) - skip close`,
                );
                continue;
              }
            }

            // 스캘핑 포지션이 장기간 미확인이고 연관 주문도 없으면 정리
            this.logger.warn(
              `[SYNC] ${dbPos.symbol}: scalping missing confirmed - closing stale DB position`,
            );
            dbPos.status = 'CLOSED';
            dbPos.closedAt = new Date();
            dbPos.metadata = {
              ...dbPos.metadata,
              closeReason: 'SCALPING_MISSING_ON_EXCHANGE',
              closedByUnknown: false,
              closeTime: Date.now(),
            };
            await this.positionRepo.save(dbPos);
            if (this.scalpingPositionService) {
              this.scalpingPositionService.removePosition(dbPos.symbol);
              this.scalpingPositionService.removePendingOrder(dbPos.symbol);
              this.scalpingPositionService.setSymbolCooldown(dbPos.symbol, 'MANUAL');
            }
            continue;
          }

          this.logger.warn(
            `\n🔔 [POSITION CLOSED DETECTED]\n` +
            `  Symbol:     ${dbPos.symbol}\n` +
            `  Side:       ${dbPos.side}\n` +
            `  Entry:      ${dbPos.entryPrice}\n` +
            `  Quantity:   ${dbPos.quantity}\n` +
            `  → Fetching OKX Position History for accurate PnL...`
          );
          if (dbPos.strategy !== 'SCALPING' && this.scalpingPositionService) {
            this.scalpingPositionService.removePosition(dbPos.symbol);
          }

          // ✅ OKX Position History API 사용 - 정확한 PnL 조회
          try {
            const closedPosition = await this.okxService.getLastClosedPosition(dbPos.symbol);

            if (closedPosition) {
              // OKX에서 정확한 PnL 데이터 가져오기
              const realizedPnl = closedPosition.realizedPnl;
              const fee = closedPosition.fee;
              const fundingFee = closedPosition.fundingFee;
              const avgClosePrice = closedPosition.closePrice;
              const entryPriceOkx = closedPosition.entryPrice;

              // 총 비용 = 수수료 + 펀딩비
              const totalFee = Math.abs(fee) + Math.abs(fundingFee);

              // 순 PnL = 실현 PnL (OKX가 이미 수수료 포함)
              const netPnl = realizedPnl;

              const entryPrice = typeof dbPos.entryPrice === 'string'
                ? parseFloat(dbPos.entryPrice) : dbPos.entryPrice;
              const plannedSL = typeof dbPos.stopLoss === 'string'
                ? parseFloat(dbPos.stopLoss) : dbPos.stopLoss;
              const plannedTP1 = typeof dbPos.takeProfit1 === 'string'
                ? parseFloat(dbPos.takeProfit1) : dbPos.takeProfit1;
              const plannedTP2 = typeof dbPos.takeProfit2 === 'string'
                ? parseFloat(dbPos.takeProfit2) : dbPos.takeProfit2;

              // 청산 타입 결정
              let closeType: 'SL' | 'TP1' | 'TP2' | 'MANUAL' | 'LIQUIDATION' = 'MANUAL';
              let closeTriggerPrice = 0;
              let closeSlippage = 0;
              let closeSlippagePercent = 0;

              // OKX closeType: 1=full, 2=partial, 3=liquidation, 4=ADL
              if (closedPosition.closeType === '3' || closedPosition.closeType === '4') {
                closeType = 'LIQUIDATION';
              } else if (plannedSL && plannedTP1) {
                const slDistance = Math.abs(avgClosePrice - plannedSL);
                const tp1Distance = Math.abs(avgClosePrice - plannedTP1);
                const tp2Distance = plannedTP2 ? Math.abs(avgClosePrice - plannedTP2) : Infinity;

                const minDistance = Math.min(slDistance, tp1Distance, tp2Distance);
                const tolerance = entryPrice * 0.05;

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

              // 손익 방향과 라벨 불일치 보정 (양수인데 SL, 음수인데 TP)
              if (netPnl > 0 && closeType === 'SL') {
                closeType = plannedTP2 ? 'TP2' : 'TP1';
                closeTriggerPrice = plannedTP2 || plannedTP1 || 0;
              } else if (netPnl < 0 && closeType.startsWith('TP')) {
                closeType = 'SL';
                closeTriggerPrice = plannedSL || 0;
              }

              // 보유 시간 계산
              const holdingTimeRaw = dbPos.openedAt
                ? closedPosition.closeTime - new Date(dbPos.openedAt).getTime()
                : 0;
              const holdingTime = Math.max(0, holdingTimeRaw);
              const holdingMinutes = Math.round(holdingTime / 60000);

              // ═══════════════════════════════════════════════════════════
              // 💾 상세 청산 정보 저장 (OKX Position History 기반)
              // ═══════════════════════════════════════════════════════════
              dbPos.realizedPnl = netPnl;
              dbPos.metadata = {
                ...dbPos.metadata,
                // OKX Position History 데이터
                closePrice: avgClosePrice,
                closeTime: closedPosition.closeTime,
                okxPositionHistory: closedPosition.raw,

                // 📊 실제 청산 정보
                actual: {
                  ...(dbPos.metadata?.actual || {}),
                  entry: entryPriceOkx,          // OKX 실제 진입가
                  exit: avgClosePrice,           // OKX 실제 청산가
                  exitTime: closedPosition.closeTime,
                  closeType: closeType,
                  closeTriggerPrice: closeTriggerPrice,
                },

                // 📈 슬리피지
                slippage: {
                  ...(dbPos.metadata?.slippage || {}),
                  exit: closeSlippage,
                  exitPercent: closeSlippagePercent,
                  totalSlippage: (dbPos.metadata?.slippage?.entry || 0) + closeSlippage,
                  totalSlippagePercent: (dbPos.metadata?.slippage?.entryPercent || 0) + closeSlippagePercent,
                },

                // 📊 거래 결과 (OKX 기준)
                result: {
                  win: netPnl > 0,
                  pnl: netPnl,                   // OKX 실현 PnL (수수료 포함)
                  fee: totalFee,                 // 총 수수료
                  fundingFee: fundingFee,        // 펀딩비
                  pnlPercent: entryPrice > 0
                    ? (netPnl / (entryPrice * (closedPosition.quantity || dbPos.quantity) / (dbPos.leverage || 10))) * 100
                    : 0,
                  holdingTime: holdingTime,
                },
              };

              this.logger.log(
                `  ✅ OKX Position History found\n` +
                `    ┌─────────────────────────────────────────────────────\n` +
                `    │ 📊 청산 분석 (OKX 기준)\n` +
                `    │   Close Type:     ${closeType} ${closeType === 'SL' ? '🔴' : closeType.startsWith('TP') ? '🟢' : closeType === 'LIQUIDATION' ? '💀' : '⚪'}\n` +
                `    │   Entry Price:    ${entryPriceOkx.toFixed(4)} (OKX)\n` +
                `    │   Close Price:    ${avgClosePrice.toFixed(4)} (OKX)\n` +
                `    ├─────────────────────────────────────────────────────\n` +
                `    │ 💰 결과 (OKX 정확값)\n` +
                `    │   Realized PnL:   $${realizedPnl.toFixed(4)}\n` +
                `    │   Fee:            $${Math.abs(fee).toFixed(4)}\n` +
                `    │   Funding Fee:    $${Math.abs(fundingFee).toFixed(4)}\n` +
                `    │   Net PnL:        $${netPnl.toFixed(4)} ${netPnl >= 0 ? '🟢 WIN' : '🔴 LOSS'}\n` +
                `    │   Holding Time:   ${holdingMinutes} minutes\n` +
                `    └─────────────────────────────────────────────────────`
              );
            } else {
              this.logger.warn(`  ⚠️ No OKX position history found - using fallback close info`);
              const entryPrice = typeof dbPos.entryPrice === 'string'
                ? parseFloat(dbPos.entryPrice) : dbPos.entryPrice;
              const lastPrice = await this.okxService.getSymbolPrice(dbPos.symbol);
              const closePrice = lastPrice || entryPrice;
              const pnlPercent = entryPrice > 0
                ? (dbPos.side === 'LONG'
                  ? (closePrice - entryPrice) / entryPrice
                  : (entryPrice - closePrice) / entryPrice)
                : 0;
              const realizedPnl = pnlPercent * Number(dbPos.quantity) * entryPrice;
              const holdingTimeRaw = dbPos.openedAt
                ? Date.now() - new Date(dbPos.openedAt).getTime()
                : 0;
              const holdingTime = Math.max(0, holdingTimeRaw);

              dbPos.realizedPnl = realizedPnl;
              dbPos.metadata = {
                ...dbPos.metadata,
                closedByUnknown: dbPos.strategy === 'SCALPING' ? false : true,
                closeReason: 'POSITION_NOT_ON_EXCHANGE',
                actual: {
                  ...(dbPos.metadata?.actual || {}),
                  entry: entryPrice,
                  exit: closePrice,
                  exitTime: Date.now(),
                  closeType: 'MANUAL',
                  closeTriggerPrice: 0,
                },
                result: {
                  win: realizedPnl > 0,
                  pnl: realizedPnl,
                  fee: 0,
                  fundingFee: 0,
                  pnlPercent: pnlPercent * 100,
                  holdingTime: holdingTime,
                },
                closePrice,
                closeTime: Date.now(),
              };
            }
          } catch (tradeError: any) {
            this.logger.warn(`  ⚠️ Failed to fetch OKX position history: ${tradeError.message}`);
          }

          // ✅ 남은 조건 주문(SL/TP) 정리 - 포지션 청산 후 잔여 주문 취소
          try {
            this.logger.log(`  → Cleaning up remaining algo orders for ${dbPos.symbol}...`);
            const cleanup = await this.okxService.cancelAllAlgoOrders(dbPos.symbol);
            if (cleanup.canceled > 0) {
              this.logger.log(`  ✅ Cleaned up ${cleanup.canceled} remaining algo orders`);
            }
          } catch (cleanupError: any) {
            this.logger.warn(`  ⚠️ Failed to cleanup algo orders: ${cleanupError.message}`);
          }

          dbPos.status = 'CLOSED';
          dbPos.closedAt = new Date();
          await this.positionRepo.save(dbPos);
          if (dbPos.strategy === 'SCALPING' && this.scalpingPositionService) {
            this.scalpingPositionService.setSymbolCooldown(dbPos.symbol, 'MANUAL');
            this.scalpingPositionService.removePosition(dbPos.symbol);
          }

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
   * ✅ 고아 주문 자동 정리 (60초마다)
   * DB에 없는 포지션의 주문(리밋/알고)을 자동 취소
   */
  @Cron('*/60 * * * * *')
  async cleanupOrphanOrders(): Promise<void> {
    try {
      // 1. 활성 포지션 심볼 수집 (OKX + DB + 스캘핑 대기 주문)
      const okxPositions = await this.okxService.getOpenPositions();
      const activeSymbols = new Set<string>();

      for (const pos of okxPositions) {
        if (Math.abs(parseFloat(pos.positionAmt)) > 0.000001) {
          activeSymbols.add(pos.symbol);
        }
      }

      const dbPositions = await this.positionRepo.find({
        where: { status: 'OPEN' },
      });
      for (const dbPos of dbPositions) {
        activeSymbols.add(dbPos.symbol);
      }

      // ✅ 스캘핑 대기 주문 심볼도 활성으로 처리 (고아 취소 방지)
      if (this.scalpingPositionService) {
        const scalpingPendingOrders = this.scalpingPositionService.getAllPendingOrders();
        for (const order of scalpingPendingOrders) {
          activeSymbols.add(order.symbol);
        }
        // 스캘핑 활성 포지션도 추가
        const scalpingPositions = this.scalpingPositionService.getActivePositions();
        for (const pos of scalpingPositions) {
          activeSymbols.add(pos.symbol);
        }
      }

      let totalCanceled = 0;

      // 2. 고아 리밋 주문 취소
      const limitOrders = await this.okxService.getAllOpenOrders();
      for (const order of limitOrders) {
        if (!activeSymbols.has(order.symbol)) {
          try {
            await this.okxService.cancelOrder(order.symbol, order.ordId);
            totalCanceled++;
            this.logger.log(`[ORPHAN CLEANUP] Canceled limit order: ${order.symbol} ${order.side} @ ${order.px}`);
          } catch (err: any) {
            this.logger.warn(`[ORPHAN CLEANUP] Failed to cancel limit: ${err.message}`);
          }
        }
      }

      // 3. 고아 알고 주문 취소
      const algoOrders = await this.okxService.getOpenAlgoOrders();
      for (const order of algoOrders) {
        if (!activeSymbols.has(order.symbol)) {
          try {
            await this.okxService.cancelAlgoOrder(order.symbol, order.algoId);
            totalCanceled++;
            this.logger.log(`[ORPHAN CLEANUP] Canceled algo order: ${order.symbol} ${order.type}`);
          } catch (err: any) {
            this.logger.warn(`[ORPHAN CLEANUP] Failed to cancel algo: ${err.message}`);
          }
        }
      }

      if (totalCanceled > 0) {
        this.logger.log(`[ORPHAN CLEANUP] ✅ Cleaned up ${totalCanceled} orphan orders`);
      }
    } catch (error: any) {
      this.logger.error(`[ORPHAN CLEANUP] Error: ${error.message}`);
    }
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
      if (dbPos.strategy === 'SCALPING') {
        continue;
      }
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
          const algoOrders = await this.okxService.getOpenAlgoOrders(dbPos.symbol);
          const slAlgoOrder = algoOrders.find(o => o.type === 'STOP_MARKET');

          // SL을 본전(진입가)으로 이동
          await this.okxService.modifyStopLoss(
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
      if (dbPos.strategy === 'SCALPING') {
        // 스캘핑은 시스템 강제 청산 금지
        continue;
      }
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
        await this.okxService.cancelAllAlgoOrders(dbPos.symbol);

        // 2. 시장가로 강제 청산
        const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
        const closeOrder = await this.okxService.createOrder({
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
  private async checkAndPlaceMissingSL(
    dbPositions: Position[],
    activePositions: any[],
  ): Promise<void> {
    for (const dbPos of dbPositions) {
      try {
        const isScalping = dbPos.strategy === 'SCALPING';
        if (isScalping) {
          const isTracked =
            !!this.scalpingPositionService?.getPosition(dbPos.symbol) ||
            !!this.scalpingPositionService?.getPendingOrder(dbPos.symbol);
          if (isTracked) {
            this.logger.debug(
              `[WATCHDOG] ${dbPos.symbol}: scalping tracked - skip SL/TP watchdog`,
            );
            continue;
          }
          this.logger.warn(
            `[WATCHDOG] ${dbPos.symbol}: scalping untracked - skip SL/TP watchdog (prevent duplicate orders)`,
          );
          continue;
        }
        const forceClosedAt = this.recentlyForceClosedSymbols.get(dbPos.symbol);
        if (forceClosedAt && Date.now() - forceClosedAt < this.FORCE_CLOSE_SKIP_MS) {
          this.logger.debug(`[WATCHDOG] ${dbPos.symbol}: skipped (recently force closed)`);
          continue;
        }
        const livePos = activePositions.find((p) => p.symbol === dbPos.symbol);
        const liveQty = livePos ? Math.abs(parseFloat(livePos.positionAmt)) : 0;
        if (!livePos || liveQty < 0.000001) {
          this.logger.warn(
            `[SL WATCHDOG] Skipping ${dbPos.symbol} - no live position on Binance`,
          );
          if (dbPos.strategy === 'SCALPING' && this.scalpingPositionService) {
            this.scalpingPositionService.removePosition(dbPos.symbol);
          }
          dbPos.status = 'CLOSED';
          dbPos.closedAt = new Date();
          dbPos.metadata = {
            ...dbPos.metadata,
            closedBy: 'SL_WATCHDOG_NO_LIVE_POSITION',
            closedAt: new Date().toISOString(),
          };
          await this.positionRepo.save(dbPos);
          this.slTpRetryCount.delete(dbPos.symbol);
          this.positionWithoutSlSince.delete(dbPos.symbol);
          continue;
        }

        // Algo Order에서 SL/TP 주문 찾기
        const algoOrders = await this.okxService.getOpenAlgoOrders(dbPos.symbol);
        const orderTypes = algoOrders.map(o => o.type || (o as any).orderType);

        // Binance는 closePosition 필드를 항상 주지 않음 → type 기준으로 판단
        const existingSL = algoOrders.find(o =>
          ['STOP_MARKET', 'STOP'].includes((o.type || (o as any).orderType) as string)
        );

        const existingTP = algoOrders.find(o =>
          ['TAKE_PROFIT_MARKET', 'TAKE_PROFIT'].includes((o.type || (o as any).orderType) as string)
        );

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
              `[WATCHDOG] ⚠️ ${dbPos.symbol}: SL missing - tracking started (open algo: ${orderTypes.join(', ') || 'none'})`
            );
          } else {
            const minutesWithoutSL = (now - firstDetected) / 60000;

            if (minutesWithoutSL >= this.MAX_TIME_WITHOUT_SL_MINUTES) {
              if (isScalping) {
                this.logger.warn(
                  `[WATCHDOG] ${dbPos.symbol}: SL missing for ${minutesWithoutSL.toFixed(1)}m (scalping) - skip force close`,
                );
                continue;
              }
              this.logger.error(
                `\n🚨🚨🚨 [CRITICAL] POSITION WITHOUT SL FOR ${minutesWithoutSL.toFixed(1)} MINUTES! 🚨🚨🚨\n` +
                `  Symbol: ${dbPos.symbol}\n` +
                `  → FORCE CLOSING due to prolonged SL absence!`
              );

              try {
                const binancePositions = await this.okxService.getOpenPositions();
                const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);

                if (binancePos) {
                  const currentQty = Math.abs(parseFloat(binancePos.positionAmt));
                  if (currentQty > 0) {
                    await this.okxService.cancelAllAlgoOrders(dbPos.symbol);

                    const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
                    await this.okxService.createOrder({
                      symbol: dbPos.symbol,
                      side: closeSide,
                      type: 'MARKET',
                      quantity: currentQty,
                      reduceOnly: true,
                      quantityInContracts: true,  // ✅ positionAmt는 이미 계약 단위
                    });

                    this.logger.log(`  ✅ Position force closed due to SL absence (${currentQty} contracts)`);

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
          if (isScalping) {
            this.logger.warn(
              `[WATCHDOG] ${dbPos.symbol}: SL/TP create failed ${currentRetries}x (scalping) - skip force close`,
            );
            this.slTpRetryCount.delete(dbPos.symbol);
            continue;
          }
          this.logger.error(
            `\n🚨🚨🚨 [CRITICAL] SL/TP CREATION FAILED ${this.MAX_SLTP_RETRIES} TIMES! 🚨🚨🚨\n` +
            `  Symbol: ${dbPos.symbol}\n` +
            `  SL exists: ${!!existingSL}\n` +
            `  TP exists: ${!!existingTP}\n` +
            `  → FORCE CLOSING POSITION!`
          );

          try {
            // 시장가로 강제 청산
            const binancePositions = await this.okxService.getOpenPositions();
            const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);

            if (binancePos) {
              const currentQty = Math.abs(parseFloat(binancePos.positionAmt));
              if (currentQty > 0) {
                await this.okxService.cancelAllAlgoOrders(dbPos.symbol);

                const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
                await this.okxService.createOrder({
                  symbol: dbPos.symbol,
                  side: closeSide,
                  type: 'MARKET',
                  quantity: currentQty,
                  reduceOnly: true,
                  quantityInContracts: true,  // ✅ positionAmt는 이미 계약 단위
                });

                this.logger.log(`  ✅ Position force closed due to SL/TP failure (${currentQty} contracts)`);

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

          // ✅ SL 방향 검증: LONG은 entry 아래, SHORT는 entry 위
          // 잘못된 방향이면 긴급 SL 사용
          const isSlInWrongDirection =
            (dbPos.side === 'LONG' && slPrice && slPrice > entryPrice) ||
            (dbPos.side === 'SHORT' && slPrice && slPrice < entryPrice);

          if (!slPrice || slPrice <= 0 || isSlInWrongDirection) {
            const oldSlPrice = slPrice;
            slPrice = dbPos.side === 'LONG'
              ? entryPrice * (1 - EMERGENCY_SL_PERCENT)
              : entryPrice * (1 + EMERGENCY_SL_PERCENT);

            if (isSlInWrongDirection) {
              this.logger.warn(
                `  ⚠️ SL in wrong direction (${oldSlPrice?.toFixed(4)}), using 3%: ${slPrice.toFixed(4)}`
              );
            } else {
              this.logger.warn(`  ⚠️ No SL price in DB, using 3%: ${slPrice.toFixed(4)}`);
            }
          }

          // 현재가 기준으로 SL이 즉시 트리거되지 않도록 보정
          const currentMark = livePos?.markPrice ? parseFloat(livePos.markPrice) : 0;
          if (currentMark > 0) {
            if (dbPos.side === 'LONG' && slPrice >= currentMark) {
              slPrice = currentMark * 0.98;
            } else if (dbPos.side === 'SHORT' && slPrice <= currentMark) {
              slPrice = currentMark * 1.02;
            }
          }

          const formattedSL = parseFloat(this.okxService.formatPrice(dbPos.symbol, slPrice));

          try {
            // ✅ DB 포지션의 side는 이미 실제 포지션 방향이므로 추가 반전 불필요
            const slOrder = await this.okxService.createAlgoOrder({
              symbol: dbPos.symbol,
              side: dbPos.side === 'LONG' ? 'SELL' : 'BUY',
              type: 'STOP_MARKET',
              triggerPrice: formattedSL,
              quantity: liveQty,
              quantityInContracts: true,
              isStrategyPosition: false,  // ✅ DB side는 실제 포지션 방향 - 반전 불필요
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

          // ✅ TP 방향 검증: LONG은 entry 위, SHORT는 entry 아래
          // 잘못된 방향이면 긴급 TP 사용
          const isTpInWrongDirection =
            (dbPos.side === 'LONG' && tpPrice && tpPrice < entryPrice) ||
            (dbPos.side === 'SHORT' && tpPrice && tpPrice > entryPrice);

          // TP 가격이 없거나 잘못된 방향이면 1.2R로 계산 (entry 기준)
          if (!tpPrice || tpPrice <= 0 || isTpInWrongDirection) {
            const oldTpPrice = tpPrice;
            // SL 기반이 아닌 entry 기반으로 1.5% TP 계산
            const EMERGENCY_TP_PERCENT = 0.015;  // 1.5%
            tpPrice = dbPos.side === 'LONG'
              ? entryPrice * (1 + EMERGENCY_TP_PERCENT)
              : entryPrice * (1 - EMERGENCY_TP_PERCENT);

            if (isTpInWrongDirection) {
              this.logger.warn(
                `  ⚠️ TP in wrong direction (${oldTpPrice?.toFixed(4)}), using 1.5%: ${tpPrice.toFixed(4)}`
              );
            }
          }

          if (tpPrice && tpPrice > 0) {
            // ✅ 현재가 확인 - TP 가격이 이미 도달했는지 체크
            const binancePositions = await this.okxService.getOpenPositions();
            const binancePos = binancePositions.find(p => p.symbol === dbPos.symbol);
            const currentPrice = binancePos ? parseFloat(binancePos.markPrice) : 0;

            // 디버깅 로그 추가
            this.logger.debug(
              `[TP WATCHDOG] ${dbPos.symbol}: markPrice=${binancePos?.markPrice}, currentPrice=${currentPrice}, tpPrice=${tpPrice}`
            );

            // TP 방향 검증: LONG은 TP > current, SHORT는 TP < current
            // LONG: TP is above entry, price going UP triggers TP → tpAlreadyPassed when currentPrice >= tpPrice
            // SHORT: TP is below entry, price going DOWN triggers TP → tpAlreadyPassed when currentPrice <= tpPrice
            const tpAlreadyPassed = dbPos.side === 'LONG'
              ? (currentPrice > 0 && currentPrice >= tpPrice)   // LONG: current >= TP means TP reached
              : (currentPrice > 0 && currentPrice <= tpPrice);  // SHORT: current <= TP means TP reached

            if (tpAlreadyPassed) {
              this.logger.warn(
                `\n💰 [TP WATCHDOG] Price already passed TP!\n` +
                `  Symbol: ${dbPos.symbol} ${dbPos.side}\n` +
                `  TP Target: ${tpPrice.toFixed(4)}\n` +
                `  Current:   ${currentPrice.toFixed(4)}\n` +
                `  → Price is ${dbPos.side === 'LONG' ? 'above' : 'below'} TP, closing at market...`
              );

              // 시장가로 즉시 청산
              try {
                const currentQty = binancePos ? Math.abs(parseFloat(binancePos.positionAmt)) : 0;
                if (currentQty > 0) {
                  await this.okxService.cancelAllAlgoOrders(dbPos.symbol);
                  const closeSide = dbPos.side === 'LONG' ? 'SELL' : 'BUY';
                  await this.okxService.createOrder({
                    symbol: dbPos.symbol,
                    side: closeSide,
                    type: 'MARKET',
                    quantity: currentQty,
                    reduceOnly: true,
                    quantityInContracts: true,  // ✅ positionAmt는 이미 계약 단위
                  });
                  this.logger.log(`  ✅ Position closed at market (TP already reached, ${currentQty} contracts)`);
                }
              } catch (closeError: any) {
                this.logger.error(`  ❌ Market close failed: ${closeError.message}`);
              }
              this.slTpRetryCount.delete(dbPos.symbol);
              continue;  // 다음 포지션으로
            }

            // ✅ OKX에서 실제 포지션 수량 확인 (계약 단위)
            const currentQtyForTp = binancePos ? Math.abs(parseFloat(binancePos.positionAmt)) : 0;
          if (currentQtyForTp <= 0) {
            this.logger.warn(`[TP WATCHDOG] ${dbPos.symbol}: skipped (no live qty)`);
            continue;
          }

            this.logger.warn(
              `\n🚨 [TP WATCHDOG] Missing TP detected!\n` +
              `  Symbol: ${dbPos.symbol} ${dbPos.side}\n` +
              `  Entry:  ${entryPrice}\n` +
              `  Qty:    ${currentQtyForTp} contracts\n` +
              `  → Creating emergency TP order at ${tpPrice.toFixed(4)}...`
            );

            const formattedTP = parseFloat(this.okxService.formatPrice(dbPos.symbol, tpPrice));

            try {
              // ✅ DB 포지션의 side는 이미 실제 포지션 방향이므로 추가 반전 불필요
              const tpOrder = await this.okxService.createAlgoOrder({
                symbol: dbPos.symbol,
                side: dbPos.side === 'LONG' ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                triggerPrice: formattedTP,
                quantity: currentQtyForTp,
                quantityInContracts: true,  // ✅ positionAmt는 이미 계약 단위
                isStrategyPosition: false,  // ✅ DB side는 실제 포지션 방향 - 반전 불필요
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
    const scalpingSymbols = new Set<string>();
    if (this.scalpingPositionService) {
      const scalpingPendingOrders = this.scalpingPositionService.getAllPendingOrders();
      for (const order of scalpingPendingOrders) {
        scalpingSymbols.add(order.symbol);
      }
      const scalpingPositions = this.scalpingPositionService.getActivePositions();
      for (const pos of scalpingPositions) {
        scalpingSymbols.add(pos.symbol);
      }
    }

    for (const binancePos of binancePositions) {
      const symbol = binancePos.symbol;
      const positionAmt = parseFloat(binancePos.positionAmt);

      // 스캘핑 서비스에서 추적 중이면 스킵 (레이스 컨디션 방지)
      if (scalpingSymbols.has(symbol)) {
        this.logger.debug(`[DEFENSE] ${symbol}: Tracked by ScalpingPositionService, skipping`);
        continue;
      }

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
      // ✅ 주문 반전 로직 고려: LONG 신호 → SHORT 포지션, SHORT 신호 → LONG 포지션
      // 따라서 양쪽 side 모두 체크해야 함
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const actualPositionSide = positionAmt > 0 ? 'LONG' : 'SHORT';
      const reversedSignalSide = positionAmt > 0 ? 'SHORT' : 'LONG';  // 전략 반전 시 신호 side

      const recentSignal = await this.signalRepo.findOne({
        where: [
          // 실제 포지션 side와 일치하는 신호 (수동 포지션/반전 안 된 경우)
          {
            symbol,
            side: actualPositionSide,
            status: 'PENDING',
            createdAt: MoreThan(thirtyMinutesAgo),
          },
          {
            symbol,
            side: actualPositionSide,
            status: 'FILLED',
            createdAt: MoreThan(thirtyMinutesAgo),
          },
          // ✅ 반전된 신호 side (전략 LONG → 실제 SHORT 포지션인 경우)
          {
            symbol,
            side: reversedSignalSide,
            status: 'PENDING',
            createdAt: MoreThan(thirtyMinutesAgo),
          },
          {
            symbol,
            side: reversedSignalSide,
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
        await this.okxService.cancelAllAlgoOrders(symbol);

        // 2. 시장가로 즉시 청산
        const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
        const closeOrder = await this.okxService.createOrder({
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
    binancePositions: any[],
    dbPositions: Position[],
  ): Promise<void> {
    // ✅ 총 자본 조회 (Available Balance + Unrealized PnL)
    let totalCapital: number;
    try {
      const availableBalance = await this.okxService.getAvailableBalance();
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

    const dbPositionBySymbol = new Map(dbPositions.map((p) => [p.symbol, p]));
    const scalpingSymbols = new Set<string>();
    const scalpingPendingSymbols = new Set<string>();
    if (this.scalpingPositionService) {
      const scalpingPositions = this.scalpingPositionService.getActivePositions();
      for (const pos of scalpingPositions) {
        scalpingSymbols.add(pos.symbol);
      }
      const scalpingPendingOrders = this.scalpingPositionService.getAllPendingOrders();
      for (const order of scalpingPendingOrders) {
        scalpingPendingSymbols.add(order.symbol);
      }
    }

    // 최근 스캘핑 신호(체결/대기) 심볼은 오버사이즈 청산 제외
    const recentCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const recentSignals = await this.signalRepo.find({
      select: ['symbol'],
      where: [
        { strategy: 'SCALPING', status: 'PENDING', createdAt: MoreThan(recentCutoff) },
        { strategy: 'SCALPING', status: 'FILLED', createdAt: MoreThan(recentCutoff) },
      ],
    });
    const recentScalpingSymbols = new Set(recentSignals.map((s) => s.symbol));

    for (const binancePos of binancePositions) {
      const symbol = binancePos.symbol;
      const dbPos = dbPositionBySymbol.get(symbol);
      if (
        dbPos?.strategy === 'SCALPING' ||
        scalpingSymbols.has(symbol) ||
        scalpingPendingSymbols.has(symbol) ||
        recentScalpingSymbols.has(symbol)
      ) {
        this.logger.debug(`[OVERSIZED] ${symbol}: skipped (scalping position/pending/recent signal)`);
        continue;
      }
      const positionAmt = parseFloat(binancePos.positionAmt);
      const markPrice = parseFloat(binancePos.markPrice);
      const leverage = parseInt(binancePos.leverage) || 10;
      const currentQty = Math.abs(positionAmt);

      // 포지션 가치 계산 (마크 가격 기준)
      const positionValue = markPrice * currentQty;

      // ✅ 마진(원금) 계산 = 포지션 가치 / 레버리지
      const margin = positionValue / leverage;

      // ✅ v16: 비정상 마진 체크 - 2가지 조건
      // 1) 총 자본의 10% 초과
      // 2) 절대값 $35 이상 (무조건)
      const exceedsPercentLimit = margin > maxMargin;
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
          await this.okxService.cancelAllAlgoOrders(symbol);

          // 2. 시장가로 즉시 청산
          const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
          const closeOrder = await this.okxService.createOrder({
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
          this.recentlyForceClosedSymbols.set(symbol, Date.now());

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
