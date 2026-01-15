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
  private readonly logger = new Logger(OkxService.name);

  constructor(configService: ConfigService) {
    super(configService);
    this.logger.warn('[OkxService] Binance shim enabled (OKX disabled)');
  }

  /**
   * Binance는 TP/SL 결합 주문이 없으므로 개별 Algo 주문으로 생성
   */
  async createTpSlOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    tpTriggerPrice: number;
    slTriggerPrice: number;
    isStrategyPosition?: boolean;
  }): Promise<{ tpAlgoId: string; slAlgoId: string }> {
    const tpOrder = await this.createAlgoOrder({
      symbol: params.symbol,
      side: params.side,
      type: 'TAKE_PROFIT_MARKET',
      triggerPrice: params.tpTriggerPrice,
      quantity: params.quantity,
      workingType: 'CONTRACT_PRICE',
    });

    const slOrder = await this.createAlgoOrder({
      symbol: params.symbol,
      side: params.side,
      type: 'STOP_MARKET',
      triggerPrice: params.slTriggerPrice,
      quantity: params.quantity,
      workingType: 'CONTRACT_PRICE',
    });

    return {
      tpAlgoId: tpOrder.algoId,
      slAlgoId: slOrder.algoId,
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
  }) {
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
  async getLastClosedPosition(_symbol: string): Promise<null> {
    this.logger.warn('[OkxService] getLastClosedPosition not supported on Binance');
    return null;
  }
}
