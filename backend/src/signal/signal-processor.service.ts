import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mutex } from 'async-mutex';
import { Signal } from '../database/entities/signal.entity';
import { Position } from '../database/entities/position.entity';
import { RiskService } from '../risk/risk.service';
import { OrderService } from '../order/order.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { OrderBlockHistoryService } from '../strategies/order-block-history.service';
import { TradingControlService } from '../trading-control/trading-control.service';

@Injectable()
export class SignalProcessorService {
  private readonly logger = new Logger(SignalProcessorService.name);
  private queue: any[] = [];  // 단순 FIFO 큐 (우선순위 제거)
  private processing = false;

  // ✅ Mutex for thread-safe queue operations
  private readonly queueMutex = new Mutex();

  // 큐 크기 제한 (80개 심볼 동시 신호 대비)
  private readonly MAX_QUEUE_SIZE = 100;

  constructor(
    @InjectRepository(Signal)
    private signalRepo: Repository<Signal>,
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    private riskService: RiskService,
    private orderService: OrderService,
    private wsGateway: AppWebSocketGateway,
    private obHistoryService: OrderBlockHistoryService,
    private tradingControl: TradingControlService,
  ) {
    this.logger.log('🚀 SignalProcessorService initialized, starting queue processor...');
    this.startProcessing();
  }

  async addSignal(signal: any) {
    // ✅ 매매 상태 체크 - 중지 상태면 신호 무시
    if (!this.tradingControl.isRunning()) {
      this.logger.debug(`[FLOW-4] ⏸️ Trading is STOPPED - ignoring signal: ${signal.symbol} ${signal.side}`);
      return;
    }

    // [FLOW-4] 신호 수신 로깅
    this.logger.log(
      `[FLOW-4] SignalProcessor → Queue | ${signal.symbol} ${signal.side} received | Score: ${signal.score}`
    );

    // ✅ 신호 중복 체크 (15분 내 동일 심볼+방향 스킵)
    const duplicateResult = await this.checkAndMergeDuplicateSignal(signal);
    if (duplicateResult.action === 'skip') {
      this.logger.warn(`[FLOW-4] ⏭️  SKIP | ${signal.symbol} - duplicate signal within 15min`);
      return;
    }

    // 신호 저장 (PENDING 상태)
    const savedSignal = await this.signalRepo.save({
      strategy: signal.strategy,
      symbol: signal.symbol,
      timeframe: signal.timeframe,  // 타임프레임 저장
      side: signal.side,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      leverage: signal.leverage,
      score: signal.score,
      timestamp: signal.timestamp,
      metadata: signal.metadata,
      status: 'PENDING',
    });

    // WebSocket 브로드캐스트 (PENDING 상태)
    this.wsGateway.broadcastSignal({
      ...signal,
      id: savedSignal.id,
      status: 'PENDING',
    });

    // 시그널 ID를 signal 객체에 저장 (나중에 상태 업데이트용)
    signal.dbId = savedSignal.id;

    this.logger.log(`[FLOW-4] SignalProcessor → DB | Signal ID: ${savedSignal.id} saved`);

    // ✅ Mutex로 큐 작업 보호 (Race Condition 방지)
    await this.queueMutex.runExclusive(async () => {
      // 큐에 추가 (크기 제한 적용) - FIFO 순서
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        const dropped = this.queue.shift();  // 가장 오래된 것 제거
        this.logger.warn(
          `[FLOW-4] ⚠️  QUEUE FULL | Dropped oldest: ${dropped?.symbol} ${dropped?.side}`
        );
      }

      this.queue.push(signal);  // 단순 FIFO 추가
    });

    this.logger.log(
      `[FLOW-4] ✅ QUEUED | ${signal.symbol} ${signal.side} | Queue: ${this.queue.length}/${this.MAX_QUEUE_SIZE}`
    );
  }

  // ✅ 단순 중복 체크 (병합 로직 제거 - 백테스트와 동일하게)
  private async checkAndMergeDuplicateSignal(signal: any): Promise<{
    action: 'none' | 'skip' | 'merge' | 'conflict';
    mergedSignal?: any;
    useNewSignal?: boolean;
  }> {
    // 최근 15분 내 동일 종목의 신호 확인
    const recentSignals = await this.signalRepo
      .createQueryBuilder('signal')
      .where('signal.symbol = :symbol', { symbol: signal.symbol })
      .andWhere('signal.timestamp > :time', { time: new Date(Date.now() - 15 * 60 * 1000) })
      .orderBy('signal.timestamp', 'DESC')
      .getMany();

    if (recentSignals.length === 0) {
      return { action: 'none' };
    }

    const sameDirectionSignals = recentSignals.filter(s => s.side === signal.side);

    // 같은 방향의 신호가 15분 내 이미 있으면 스킵 (병합 없이 단순 중복 방지)
    if (sameDirectionSignals.length > 0) {
      return { action: 'skip' };
    }

    return { action: 'none' };
  }

  private async startProcessing() {
    if (this.processing) {
      this.logger.warn('⚠️ Queue processor already running!');
      return;
    }
    this.processing = true;
    this.logger.log('✅ Queue processor started!');

    while (true) {
      // ✅ Mutex로 큐 작업 보호 (Race Condition 방지) - FIFO
      let signal: any | undefined;

      await this.queueMutex.runExclusive(async () => {
        if (this.queue.length > 0) {
          signal = this.queue.shift();
        }
      });

      if (!signal) {
        await this.delay(1000);
        continue;
      }

      this.logger.log(
        `\n[FLOW-4→5] ═══════════════════════════════════════════════════════════\n` +
        `[FLOW-4→5] 📦 PROCESSING | ${signal.symbol} ${signal.side} | Queue: ${this.queue.length} remaining\n` +
        `[FLOW-4→5] ═══════════════════════════════════════════════════════════`
      );

      try {
        // 중복 체크
        if (await this.isDuplicate(signal)) {
          this.logger.warn(`[FLOW-5] ❌ REJECT | ${signal.symbol} - duplicate signal`);
          continue;
        }

        // ✅ 주문 처리 중인 심볼 스킵 (동시 주문 방지)
        if (OrderService.isSymbolPending(signal.symbol)) {
          this.logger.warn(`[FLOW-5] ⏭️ SKIP | ${signal.symbol} - order already in progress`);
          continue;
        }

        // [FLOW-5] 리스크 체크
        this.logger.log(`[FLOW-5] RiskCheck → DailyLoss | Checking...`);
        if (!(await this.riskService.checkDailyLossLimit())) {
          this.logger.warn(`[FLOW-5] ❌ REJECT | Daily loss limit reached`);
          continue;
        }
        this.logger.log(`[FLOW-5] ✅ PASS | Daily loss check`);

        this.logger.log(`[FLOW-5] RiskCheck → Position | Checking ${signal.side}...`);
        if (!(await this.riskService.checkPositionLimit(signal.side as 'LONG' | 'SHORT'))) {
          this.logger.warn(`[FLOW-5] ❌ REJECT | Position limit reached (${signal.side})`);
          continue;
        }
        this.logger.log(`[FLOW-5] ✅ PASS | Position limit check`);

        // v13: 일일 심볼 블랙리스트 체크 (2회 이상 손실 시 당일 진입 금지)
        this.logger.log(`[FLOW-5] RiskCheck → Blacklist | Checking ${signal.symbol}...`);
        if (!this.riskService.checkSymbolBlacklist(signal.symbol)) {
          this.logger.warn(`[FLOW-5] ❌ REJECT | ${signal.symbol} - blacklisted (2+ losses today)`);
          continue;
        }
        this.logger.log(`[FLOW-5] ✅ PASS | Blacklist check`);

        this.logger.log(`[FLOW-5] RiskCheck → Correlation | Checking ${signal.symbol}...`);
        if (!(await this.riskService.checkCorrelation(signal))) {
          this.logger.warn(`[FLOW-5] ❌ REJECT | ${signal.symbol} - correlation conflict`);
          continue;
        }
        this.logger.log(`[FLOW-5] ✅ PASS | Correlation check`);

        // v23: 캔들 기반 동시 진입 제한 제거
        // 기존: 같은 캔들 내 같은 방향 2개 제한
        // 변경: 제한 없음 (MAX_POSITIONS=20, 방향별 10개만 유지)

        // 포지션 크기 계산
        this.logger.log(`[FLOW-5] RiskCheck → PositionSize | Calculating...`);
        const positionSize = await this.riskService.calculatePositionSize(signal);
        this.logger.log(
          `[FLOW-5] 💰 Position | Size: $${positionSize.positionSizeUsdt.toFixed(2)} | ` +
          `Margin: $${positionSize.marginRequired.toFixed(2)} | Leverage: ${positionSize.leverage}x`
        );

        // [FLOW-6] 주문 실행 (비동기 모드 - blocking 없음)
        this.logger.log(`[FLOW-6] OrderService → ExecuteAsync | ${signal.symbol} ${signal.side}...`);
        let orderResult: any;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          try {
            // ✅ 비동기 주문: LIMIT 주문 생성 후 즉시 반환
            // OrderMonitorService가 체결 감지 및 SL/TP 생성 담당
            orderResult = await this.orderService.executeOrderAsync(signal, positionSize);
            break; // 성공 시 루프 탈출
          } catch (execError: any) {
            // Rate Limit 에러인 경우 재시도
            if (execError.message?.includes('throttled') && retryCount < maxRetries) {
              retryCount++;
              this.logger.warn(`[FLOW-6] ⚠️ Rate limited, retry ${retryCount}/${maxRetries} after 3s...`);
              await this.delay(3000);
            } else {
              throw execError; // 다른 에러는 그대로 throw
            }
          }
        }

        // ✅ 비동기 모드: PENDING은 나중에 OrderMonitorService가 업데이트
        if (orderResult.status === 'PENDING') {
          this.logger.log(
            `\n[FLOW-6] ═══════════════════════════════════════════════════════════\n` +
            `[FLOW-6] 📝 ORDER PENDING | ${signal.symbol} ${signal.side}\n` +
            `[FLOW-6]   Order ID: ${orderResult.orderId}\n` +
            `[FLOW-6]   → Monitoring for fill asynchronously\n` +
            `[FLOW-6] ═══════════════════════════════════════════════════════════\n`
          );

          // ✅ 캔들 진입 카운터 증가 (주문 생성 시점에 카운트)
          const timeframe = signal.timeframe || signal.metadata?.timeframe || '5m';
          this.riskService.recordCandleEntry(timeframe, signal.side);

          // PENDING 상태는 OrderMonitorService가 체결 시 업데이트
        } else if (orderResult.status === 'SKIPPED') {
          this.logger.warn(`[FLOW-6] ⏭️  SKIPPED | ${signal.symbol} - ${orderResult.error}`);

          if (signal.dbId) {
            await this.signalRepo.update(signal.dbId, { status: 'SKIPPED' });
            this.wsGateway.broadcastSignalUpdate({
              id: signal.dbId,
              symbol: signal.symbol,
              status: 'SKIPPED',
              error: orderResult.error,
            });
          }
        } else {
          this.logger.error(`[FLOW-6] ❌ FAILED | ${signal.symbol} - ${orderResult.error}`);

          if (signal.dbId) {
            await this.signalRepo.update(signal.dbId, { status: 'FAILED' });
            this.wsGateway.broadcastSignalUpdate({
              id: signal.dbId,
              symbol: signal.symbol,
              status: 'FAILED',
              error: orderResult.error,
            });
          }
        }
      } catch (error) {
        this.logger.error(`[FLOW-6] ❌ ERROR | ${signal.symbol}: ${error.message}`);
      }

      // ✅ 주문 간 딜레이 (Binance Rate Limit 방지)
      // 동시에 여러 신호 발생 시 API 스로틀링 방지
      if (this.queue.length > 0) {
        this.logger.log(`[FLOW-6] ⏳ Rate limit delay (2s)... Queue: ${this.queue.length} remaining`);
        await this.delay(2000);
      }
    }
  }

  private async isDuplicate(signal: any): Promise<boolean> {
    const recent = await this.signalRepo
      .createQueryBuilder('signal')
      .where('signal.symbol = :symbol', { symbol: signal.symbol })
      .andWhere('signal.side = :side', { side: signal.side })
      .andWhere('signal.timestamp > :time', { time: new Date(Date.now() - 15 * 60 * 1000) })
      .andWhere('signal.timestamp < :currentTime', { currentTime: signal.timestamp })
      .getCount();

    return recent > 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
