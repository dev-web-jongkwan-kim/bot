import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OkxService } from '../../okx/okx.service';
import { ScalpingPositionService } from './scalping-position.service';

@Injectable()
export class ScalpingOrderWatchdogService {
  private readonly logger = new Logger(ScalpingOrderWatchdogService.name);
  private readonly rebuildCooldownMs = 15000;
  private readonly lastRebuildAt = new Map<string, number>();
  private readonly algoOrderRetryMs = 60000;
  private readonly algoOrderFailUntil = new Map<string, number>();

  constructor(
    private readonly okxService: OkxService,
    private readonly positionService: ScalpingPositionService,
  ) {}

  @Cron('*/15 * * * * *')
  async checkScalpingOrders(): Promise<void> {
    const positions = this.positionService.getActivePositions();
    if (positions.length === 0) {
      return;
    }

    const livePositions = await this.okxService.getOpenPositions();
    const livePositionMap = new Map(
      livePositions.map((pos: any) => [pos.symbol, pos]),
    );

    for (const position of positions) {
      try {
        if (this.positionService.getPendingOrder(position.symbol)) {
          continue;
        }

        const livePos = livePositionMap.get(position.symbol);
        const liveQty = livePos ? Math.abs(parseFloat(livePos.positionAmt)) : 0;
        if (!livePos || liveQty <= 0) {
          const algoOrders = await this.getOpenAlgoOrdersSafe(position.symbol);
          if (algoOrders && algoOrders.length > 0) {
            this.logger.warn(
              `[ScalpingWatchdog] ${position.symbol}: no live position - canceling ${algoOrders.length} algo orders`,
            );
            await this.okxService.cancelAllAlgoOrders(position.symbol);
          }
          this.positionService.removePosition(position.symbol);
          this.positionService.removePendingOrder(position.symbol);
          this.lastRebuildAt.delete(position.symbol);
          this.logger.warn(
            `[ScalpingWatchdog] ${position.symbol}: removed stale position (no live qty)`,
          );
          continue;
        }

        const lastRebuild = this.lastRebuildAt.get(position.symbol) || 0;
        if (Date.now() - lastRebuild < this.rebuildCooldownMs) {
          continue;
        }

        const algoOrders = await this.getOpenAlgoOrdersSafe(position.symbol);
        if (!algoOrders) {
          continue;
        }
        const relevantOrders = algoOrders.filter(
          (o) => o.type === 'STOP_MARKET' || o.type === 'TAKE_PROFIT_MARKET',
        );

        const invalidOrders = relevantOrders.filter((order) => {
          const qty = this.getOrderQuantity(order);
          return order.closePosition || qty <= 0;
        });

        if (invalidOrders.length > 0) {
          this.logger.warn(
            `[ScalpingWatchdog] ${position.symbol}: canceling invalid algo orders (${invalidOrders.length})`,
          );
          for (const order of invalidOrders) {
            await this.okxService.cancelAlgoOrder(position.symbol, order.algoId);
          }
        }

        const orders = relevantOrders.filter((order) => !invalidOrders.includes(order));
        const slOrders = orders.filter((o) => o.type === 'STOP_MARKET');
        const tpOrders = orders.filter((o) => o.type === 'TAKE_PROFIT_MARKET');

        const lotInfo = this.okxService.getLotSizeInfo(position.symbol);
        const lotSz = lotInfo.stepSize;
        const tickSize = this.okxService.getTickSize(position.symbol);

        const expectedSlQty = this.roundQuantity(position.quantity, lotSz);
        const expectedTpQty = this.getExpectedTpQuantity(position, lotSz, expectedSlQty);
        let expectedTpPrice = this.getExpectedTpPrice(position);
        let expectedSlPrice = this.getExpectedSlPrice(position);

        const currentPrice = await this.okxService.getSymbolPrice(position.symbol);
        if (currentPrice > 0) {
          if (position.direction === 'LONG' && expectedTpPrice <= currentPrice) {
            expectedTpPrice = currentPrice * 1.001;
          } else if (position.direction === 'SHORT' && expectedTpPrice >= currentPrice) {
            expectedTpPrice = currentPrice * 0.999;
          }
          if (position.direction === 'LONG' && expectedSlPrice >= currentPrice) {
            expectedSlPrice = currentPrice * 0.999;
          } else if (position.direction === 'SHORT' && expectedSlPrice <= currentPrice) {
            expectedSlPrice = currentPrice * 1.001;
          }
        }

        const shouldRebuild =
          slOrders.length !== 1 ||
          tpOrders.length !== 1 ||
          !this.matchesQuantity(slOrders[0], expectedSlQty, lotSz) ||
          !this.matchesQuantity(tpOrders[0], expectedTpQty, lotSz) ||
          !this.matchesPrice(slOrders[0]?.triggerPrice, expectedSlPrice, tickSize) ||
          !this.matchesPrice(tpOrders[0]?.triggerPrice, expectedTpPrice, tickSize);

        if (!shouldRebuild) {
          continue;
        }

        this.logger.warn(
          `[ScalpingWatchdog] ${position.symbol}: rebuilding TP/SL (sl=${expectedSlQty}, tp=${expectedTpQty})`,
        );

        await this.okxService.cancelAllAlgoOrders(position.symbol);

        const side = position.direction === 'LONG' ? 'SELL' : 'BUY';
        await this.okxService.createTpSlOrder({
          symbol: position.symbol,
          side,
          tpQuantity: expectedTpQty,
          slQuantity: expectedSlQty,
          tpTriggerPrice: expectedTpPrice,
          slTriggerPrice: expectedSlPrice,
          isStrategyPosition: false,
        });

        this.lastRebuildAt.set(position.symbol, Date.now());
      } catch (error: any) {
        this.logger.error(
          `[ScalpingWatchdog] ${position.symbol}: failed to validate TP/SL`,
          error,
        );
      }
    }
  }

  private getOrderQuantity(order: any): number {
    return parseFloat(order.quantity ?? order.origQty ?? order.sz ?? '0');
  }

  private matchesQuantity(order: any, expected: number, lotSz: number): boolean {
    const actual = this.getOrderQuantity(order);
    return Math.abs(actual - expected) <= lotSz / 2;
  }

  private matchesPrice(actualRaw: any, expected: number, tickSize: number): boolean {
    const actual = parseFloat(actualRaw ?? '0');
    if (!actual || !expected) {
      return false;
    }
    return Math.abs(actual - expected) <= tickSize * 1.5;
  }

  private roundQuantity(quantity: number, lotSz: number): number {
    const rounded = Math.floor(quantity / lotSz) * lotSz;
    return rounded > 0 ? rounded : 0;
  }

  private getExpectedTpQuantity(position: any, lotSz: number, fullQty: number): number {
    const baseQty = position.tp1Filled ? position.quantity : position.quantity * 0.5;
    let tpQty = this.roundQuantity(baseQty, lotSz);
    if (tpQty < lotSz) {
      tpQty = fullQty;
    }
    return tpQty;
  }

  private getExpectedTpPrice(position: any): number {
    if (position.tp1Filled) {
      return position.tp2Price || position.tpPrice;
    }
    return position.tp1Price || position.tpPrice;
  }

  private getExpectedSlPrice(position: any): number {
    return position.slPrice;
  }

  private async getOpenAlgoOrdersSafe(symbol: string): Promise<any[] | null> {
    const retryUntil = this.algoOrderFailUntil.get(symbol);
    if (retryUntil && Date.now() < retryUntil) {
      return null;
    }
    try {
      return await this.okxService.getOpenAlgoOrders(symbol);
    } catch (error: any) {
      this.algoOrderFailUntil.set(symbol, Date.now() + this.algoOrderRetryMs);
      this.logger.error(
        `[ScalpingWatchdog] ${symbol}: failed to get open algo orders (cooldown ${Math.round(this.algoOrderRetryMs / 1000)}s)`,
        error,
      );
      return null;
    }
  }
}
