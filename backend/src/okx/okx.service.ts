import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BinanceService } from '../binance/binance.service';

/**
 * Binance-backed OKX service shim.
 *
 * 목표:
 * - 기존 OkxService 주입 코드를 유지하면서 실제 동작은 Binance로 전환
 * - 최소한의 인터페이스 호환 제공
 */
@Injectable()
export class OkxService extends BinanceService {
  constructor(configService: ConfigService) {
    super(configService);
    const logger = new Logger(OkxService.name);
    logger.warn('[OkxService] Binance shim enabled (OKX disabled)');
  }

  /**
   * Binance는 TP/SL 결합 주문이 없으므로 개별 Algo 주문으로 생성
   */
  async createTpSlOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity?: number;
    tpQuantity?: number;
    slQuantity?: number;
    tpTriggerPrice: number;
    slTriggerPrice: number;
    isStrategyPosition?: boolean;
  }): Promise<{ tpAlgoId: string; slAlgoId: string }> {
    const tpQty = params.tpQuantity ?? params.quantity;
    const slQty = params.slQuantity ?? params.quantity;
    if (!tpQty || !slQty) {
      throw new Error(`[TP/SL] quantity missing for ${params.symbol} (tp=${tpQty}, sl=${slQty})`);
    }
    const formattedTp = this.formatPrice(params.symbol, params.tpTriggerPrice);
    const formattedSl = this.formatPrice(params.symbol, params.slTriggerPrice);
    const formattedTpQty = this.formatQuantity(params.symbol, tpQty);
    const formattedSlQty = this.formatQuantity(params.symbol, slQty);
    const logger = new Logger(OkxService.name);
    logger.log(
      `[TP/SL] Creating TP/SL for ${params.symbol} | side=${params.side} ` +
      `tp=${formattedTp} sl=${formattedSl} tpQty=${formattedTpQty} slQty=${formattedSlQty}`,
    );

    let tpTriggerPrice = params.tpTriggerPrice;
    try {
      const lastPrice = await this.getSymbolPrice(params.symbol);
      if (params.side === 'SELL' && tpTriggerPrice <= lastPrice) {
        tpTriggerPrice = lastPrice * 1.001;
        logger.warn(
          `[TP/SL] TP would trigger immediately, adjust TP: ` +
            `${this.formatPrice(params.symbol, tpTriggerPrice)} (last=${lastPrice})`,
        );
      } else if (params.side === 'BUY' && tpTriggerPrice >= lastPrice) {
        tpTriggerPrice = lastPrice * 0.999;
        logger.warn(
          `[TP/SL] TP would trigger immediately, adjust TP: ` +
            `${this.formatPrice(params.symbol, tpTriggerPrice)} (last=${lastPrice})`,
        );
      }
    } catch (priceError) {
      logger.warn(`[TP/SL] Failed to fetch price for TP adjust: ${params.symbol}`);
    }

    const tpOrder = await this.createAlgoOrder({
      symbol: params.symbol,
      side: params.side,
      type: 'TAKE_PROFIT_MARKET',
      triggerPrice: tpTriggerPrice,
      quantity: tpQty,
      workingType: 'CONTRACT_PRICE',
    });

    let slOrder: any;
    try {
      slOrder = await this.createAlgoOrder({
        symbol: params.symbol,
        side: params.side,
        type: 'STOP_MARKET',
        triggerPrice: params.slTriggerPrice,
        quantity: slQty,
        workingType: 'CONTRACT_PRICE',
      });
      } catch (error: any) {
      if (error?.code === -2021 || error?.message?.includes('immediately trigger')) {
        const lastPrice = await this.getSymbolPrice(params.symbol);
        const adjustedSl = params.side === 'SELL'
          ? lastPrice * 0.98
          : lastPrice * 1.02;
        logger.warn(
          `[TP/SL] SL would trigger immediately, retry with adjusted SL: ` +
          `${this.formatPrice(params.symbol, adjustedSl)} (last=${lastPrice})`,
        );
        slOrder = await this.createAlgoOrder({
          symbol: params.symbol,
          side: params.side,
          type: 'STOP_MARKET',
          triggerPrice: adjustedSl,
          quantity: slQty,
          workingType: 'CONTRACT_PRICE',
        });
      } else {
        throw error;
      }
    }

    logger.log(
      `[TP/SL] ✅ Created for ${params.symbol} | tpAlgoId=${tpOrder.algoId} slAlgoId=${slOrder.algoId}`,
    );

        return {
      tpAlgoId: String(tpOrder.algoId),
      slAlgoId: String(slOrder.algoId),
    };
  }

  /**
   * OKX 시그니처용 createOrder 호환
   * - Binance createOrder로 필터링 전달
   */
  async createOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    quantity?: number;
    price?: number;
    stopPrice?: number;
    closePosition?: boolean;
    reduceOnly?: boolean;
    timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
    clientOrderId?: string;
    // OKX 전용 옵션 무시
    reverseEntry?: boolean;
    quantityInContracts?: boolean;
  }) {
    return super.createOrder({
        symbol: params.symbol,
      side: params.side,
        type: params.type,
      quantity: params.quantity,
      price: params.price,
      stopPrice: params.stopPrice,
      closePosition: params.closePosition,
      reduceOnly: params.reduceOnly,
      timeInForce: params.timeInForce,
      clientOrderId: params.clientOrderId,
    });
  }

  /**
   * OKX 시그니처용 createAlgoOrder 호환
   */
  async createAlgoOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'STOP' | 'TAKE_PROFIT' | 'TRAILING_STOP_MARKET';
    triggerPrice: number;
    quantity?: number;
    closePosition?: boolean;
    workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
    priceProtect?: boolean;
    callbackRate?: number;
    activatePrice?: number;
    // OKX 전용 옵션 무시
    isStrategyPosition?: boolean;
    quantityInContracts?: boolean;
  }): Promise<any> {
    return super.createAlgoOrder({
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      triggerPrice: params.triggerPrice,
      quantity: params.quantity,
      closePosition: params.closePosition,
      workingType: params.workingType,
      priceProtect: params.priceProtect,
      callbackRate: params.callbackRate,
      activatePrice: params.activatePrice,
    });
  }

  /**
   * OKX 전용 포지션 히스토리는 Binance에서 미지원 → null 반환
   */
  async getLastClosedPosition(_symbol: string): Promise<any | null> {
    const logger = new Logger(OkxService.name);
    logger.warn('[OkxService] getLastClosedPosition not supported on Binance');
    return null;
  }
}
