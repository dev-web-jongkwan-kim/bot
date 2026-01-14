/**
 * v23: 시간 기반 포지션 관리 서비스
 *
 * 포지션 보유 시간에 따른 동적 관리:
 * 1. TP 축소: 20분 후 TP를 50%로 축소
 * 2. 본전 청산: 25분 후 본전 이상이면 청산
 * 3. 강제 청산: 30분 후 무조건 시장가 청산
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../database/entities/position.entity';
import { BinanceService } from '../binance/binance.service';

interface TimeConfig {
  maxHoldTimeSec: number;       // 최대 보유 시간 (초)
  tpReduceTimeSec: number;      // TP 축소 시작 시간 (초)
  tpReduceRatio: number;        // TP 축소 비율 (0~1)
  breakevenTimeSec: number;     // 본전 청산 시작 시간 (초)
}

@Injectable()
export class PositionTimeManagerService {
  private readonly logger = new Logger(PositionTimeManagerService.name);

  // 설정 (strategy와 동기화)
  private readonly config: TimeConfig = {
    maxHoldTimeSec: 1800,       // 30분
    tpReduceTimeSec: 1200,      // 20분
    tpReduceRatio: 0.5,         // 50%
    breakevenTimeSec: 1500,     // 25분
  };

  // TP 축소 적용 여부 추적 (중복 방지)
  private tpReducedPositions: Set<number> = new Set();

  constructor(
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    private binanceService: BinanceService,
  ) {
    this.logger.log(
      `[TIME MANAGER] Initialized with config:\n` +
      `  Max Hold: ${this.config.maxHoldTimeSec / 60}min\n` +
      `  TP Reduce: ${this.config.tpReduceTimeSec / 60}min (${this.config.tpReduceRatio * 100}%)\n` +
      `  Breakeven: ${this.config.breakevenTimeSec / 60}min`
    );
  }

  /**
   * 10초마다 포지션 시간 관리 실행
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async managePositionsByTime(): Promise<void> {
    try {
      const openPositions = await this.positionRepo.find({
        where: { status: 'OPEN' },
      });

      if (openPositions.length === 0) return;

      const now = Date.now();

      for (const position of openPositions) {
        const holdTimeSec = (now - new Date(position.createdAt).getTime()) / 1000;

        // 1. 강제 청산 (30분 초과)
        if (holdTimeSec >= this.config.maxHoldTimeSec) {
          await this.forceClosePosition(position, holdTimeSec, 'MAX_HOLD_TIME');
          continue;
        }

        // 2. 본전 청산 (25분 초과)
        if (holdTimeSec >= this.config.breakevenTimeSec) {
          await this.checkBreakevenClose(position, holdTimeSec);
          continue;
        }

        // 3. TP 축소 (20분 초과)
        if (holdTimeSec >= this.config.tpReduceTimeSec) {
          await this.reduceTP(position, holdTimeSec);
        }
      }
    } catch (error: any) {
      this.logger.error(`[TIME MANAGER] Error: ${error.message}`);
    }
  }

  /**
   * 강제 청산 (시간 초과)
   */
  private async forceClosePosition(position: Position, holdTimeSec: number, reason: string): Promise<void> {
    this.logger.warn(
      `\n⏰ [FORCE CLOSE] ${position.symbol} ${position.side}\n` +
      `  Hold Time: ${(holdTimeSec / 60).toFixed(1)}min > ${this.config.maxHoldTimeSec / 60}min\n` +
      `  Reason: ${reason}\n` +
      `  → Closing at market price...`
    );

    try {
      // 바이낸스에서 현재 포지션 확인
      const binancePositions = await this.binanceService.getOpenPositions();
      const binancePos = binancePositions.find(p => p.symbol === position.symbol);

      if (!binancePos || Math.abs(parseFloat(binancePos.positionAmt)) < 0.000001) {
        this.logger.warn(`[FORCE CLOSE] ${position.symbol}: No position on Binance, marking as CLOSED`);
        position.status = 'CLOSED';
        position.closedAt = new Date();
        position.metadata = {
          ...position.metadata,
          closeReason: reason,
          closeType: 'TIME_EXPIRED_NO_POSITION',
        };
        await this.positionRepo.save(position);
        return;
      }

      const positionAmt = parseFloat(binancePos.positionAmt);
      const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
      const quantity = Math.abs(positionAmt);

      // 기존 알고 주문 취소
      try {
        const algoOrders = await this.binanceService.getOpenAlgoOrders(position.symbol);
        for (const order of algoOrders) {
          await this.binanceService.cancelAlgoOrder(position.symbol, order.algoId);
        }
      } catch (e) {
        // 취소 실패 무시
      }

      // 시장가 청산
      const closeOrder = await this.binanceService.createOrder({
        symbol: position.symbol,
        side: closeSide,
        type: 'MARKET',
        quantity,
      });

      // 시장가 주문은 avgPrice가 즉시 채워지지 않을 수 있음
      // 현재 가격으로 대체하거나 주문 상세 조회
      let exitPrice = parseFloat(closeOrder.avgPrice || closeOrder.price || '0');

      if (exitPrice === 0) {
        // 현재 가격으로 대체
        try {
          exitPrice = await this.binanceService.getSymbolPrice(position.symbol);
        } catch (e) {
          this.logger.warn(`[FORCE CLOSE] Could not get current price for ${position.symbol}`);
        }
      }

      const pnl = position.side === 'LONG'
        ? (exitPrice - position.entryPrice) * quantity
        : (position.entryPrice - exitPrice) * quantity;

      this.logger.log(
        `  ✅ Position closed:\n` +
        `  Exit Price: ${exitPrice.toFixed(6)}\n` +
        `  PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
      );

      // DB 업데이트
      position.status = 'CLOSED';
      position.closedAt = new Date();
      position.realizedPnl = pnl;
      position.metadata = {
        ...position.metadata,
        closeReason: reason,
        closeType: 'TIME_FORCE_CLOSE',
        holdTimeSec,
        exitPrice,
      };
      await this.positionRepo.save(position);

      // 추적 목록에서 제거
      this.tpReducedPositions.delete(position.id);

    } catch (error: any) {
      this.logger.error(`[FORCE CLOSE] ${position.symbol} failed: ${error.message}`);
    }
  }

  /**
   * 본전 청산 체크 (25분 초과 시)
   */
  private async checkBreakevenClose(position: Position, holdTimeSec: number): Promise<void> {
    try {
      // 현재 가격 조회
      const currentPrice = await this.binanceService.getSymbolPrice(position.symbol);

      // PnL 계산
      const pnlPercent = position.side === 'LONG'
        ? ((currentPrice - position.entryPrice) / position.entryPrice) * 100
        : ((position.entryPrice - currentPrice) / position.entryPrice) * 100;

      // 본전 이상이면 청산
      if (pnlPercent >= 0) {
        this.logger.log(
          `\n💰 [BREAKEVEN CLOSE] ${position.symbol} ${position.side}\n` +
          `  Hold Time: ${(holdTimeSec / 60).toFixed(1)}min\n` +
          `  Current PnL: +${pnlPercent.toFixed(2)}%\n` +
          `  → Closing at profit...`
        );

        await this.forceClosePosition(position, holdTimeSec, 'BREAKEVEN_CLOSE');
      } else {
        this.logger.debug(
          `[BREAKEVEN CHECK] ${position.symbol}: PnL ${pnlPercent.toFixed(2)}% < 0%, waiting...`
        );
      }
    } catch (error: any) {
      this.logger.error(`[BREAKEVEN CHECK] ${position.symbol} error: ${error.message}`);
    }
  }

  /**
   * TP 축소 (20분 초과 시)
   */
  private async reduceTP(position: Position, holdTimeSec: number): Promise<void> {
    // 이미 축소된 포지션은 스킵
    if (this.tpReducedPositions.has(position.id)) {
      return;
    }

    try {
      this.logger.log(
        `\n📉 [TP REDUCE] ${position.symbol} ${position.side}\n` +
        `  Hold Time: ${(holdTimeSec / 60).toFixed(1)}min\n` +
        `  → Reducing TP to ${this.config.tpReduceRatio * 100}%...`
      );

      // 기존 TP 알고 주문 취소
      const algoOrders = await this.binanceService.getOpenAlgoOrders(position.symbol);
      const tpOrders = algoOrders.filter(o => o.type === 'TAKE_PROFIT_MARKET');

      for (const tpOrder of tpOrders) {
        try {
          await this.binanceService.cancelAlgoOrder(position.symbol, tpOrder.algoId);
          this.logger.debug(`[TP REDUCE] Canceled old TP: ${tpOrder.algoId}`);
        } catch (e) {
          // 무시
        }
      }

      // 새 TP 가격 계산 (기존의 50%)
      const entryPrice = position.entryPrice;
      const originalTpDistance = Math.abs(position.takeProfit1 - entryPrice);
      const newTpDistance = originalTpDistance * this.config.tpReduceRatio;

      const newTp = position.side === 'LONG'
        ? entryPrice + newTpDistance
        : entryPrice - newTpDistance;

      const formattedTp = parseFloat(this.binanceService.formatPrice(position.symbol, newTp));

      // 바이낸스에서 현재 수량 확인
      const binancePositions = await this.binanceService.getOpenPositions();
      const binancePos = binancePositions.find(p => p.symbol === position.symbol);

      if (!binancePos || Math.abs(parseFloat(binancePos.positionAmt)) < 0.000001) {
        this.logger.warn(`[TP REDUCE] ${position.symbol}: No position on Binance`);
        return;
      }

      const quantity = Math.abs(parseFloat(binancePos.positionAmt));
      const formattedQty = parseFloat(this.binanceService.formatQuantity(position.symbol, quantity));

      // 새 TP 주문 생성
      const tpOrder = await this.binanceService.createAlgoOrder({
        symbol: position.symbol,
        side: position.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'TAKE_PROFIT_MARKET',
        triggerPrice: formattedTp,
        quantity: formattedQty,
      });

      this.logger.log(
        `  ✅ New TP created:\n` +
        `  Original TP: ${position.takeProfit1}\n` +
        `  New TP: ${formattedTp} (${this.config.tpReduceRatio * 100}%)\n` +
        `  Algo ID: ${tpOrder.algoId}`
      );

      // DB 업데이트
      position.takeProfit1 = newTp;
      position.metadata = {
        ...position.metadata,
        tpReduced: true,
        tpReducedAt: new Date().toISOString(),
        originalTp: position.metadata?.actual?.takeProfit1 || position.takeProfit1,
      };
      await this.positionRepo.save(position);

      // 축소 완료 표시
      this.tpReducedPositions.add(position.id);

    } catch (error: any) {
      this.logger.error(`[TP REDUCE] ${position.symbol} failed: ${error.message}`);
    }
  }

  /**
   * 포지션 종료 시 추적 목록에서 제거 (외부 호출용)
   */
  onPositionClosed(positionId: number): void {
    this.tpReducedPositions.delete(positionId);
  }
}
