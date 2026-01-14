import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ScalpingPosition } from '../interfaces/position.interface';
import { ScalpingSignal, SignalDirection } from '../interfaces/signal.interface';
import { BinanceService } from '../../binance/binance.service';
import { SCALPING_CONFIG } from '../constants/scalping.config';

/**
 * 스캘핑 포지션 관리 서비스
 *
 * 활성 포지션 추적 및 상태 관리
 * - 서버 시작 시 바이낸스 포지션 동기화
 */
@Injectable()
export class ScalpingPositionService implements OnModuleInit {
  private readonly logger = new Logger(ScalpingPositionService.name);

  // 활성 포지션 (symbol → position)
  private activePositions: Map<string, ScalpingPosition> = new Map();

  constructor(private readonly binance: BinanceService) {
    this.logger.log('[POSITION] 포지션 관리 서비스 초기화');
  }

  async onModuleInit() {
    await this.syncFromBinance();
  }

  /**
   * 바이낸스 실제 포지션을 동기화
   * - 서버 재시작 시에도 기존 포지션 관리 가능
   */
  async syncFromBinance(): Promise<void> {
    try {
      this.logger.log('[POSITION SYNC] 바이낸스 포지션 동기화 시작...');

      const positions = await this.binance.getOpenPositions();
      const activePositions = positions.filter(
        (p: any) => Math.abs(parseFloat(p.positionAmt)) > 0,
      );

      if (activePositions.length === 0) {
        this.logger.log('[POSITION SYNC] 활성 포지션 없음');
        return;
      }

      for (const pos of activePositions) {
        const symbol = pos.symbol;
        const positionAmt = parseFloat(pos.positionAmt);
        const entryPrice = parseFloat(pos.entryPrice);
        const direction: SignalDirection = positionAmt > 0 ? 'LONG' : 'SHORT';
        const quantity = Math.abs(positionAmt);

        // 이미 등록된 포지션이면 스킵
        if (this.activePositions.has(symbol)) {
          continue;
        }

        // ATR 추정 (현재가의 0.5% 기준)
        const estimatedAtr = entryPrice * 0.005;

        // TP/SL 추정 (ATR 기반)
        const tpDistance = estimatedAtr * SCALPING_CONFIG.order.tpAtr;
        const slDistance = estimatedAtr * SCALPING_CONFIG.order.slAtr;

        const tpPrice =
          direction === 'LONG'
            ? entryPrice + tpDistance
            : entryPrice - tpDistance;
        const slPrice =
          direction === 'LONG'
            ? entryPrice - slDistance
            : entryPrice + slDistance;

        // 진입 시간 추정 (현재 - 5분)
        // updateTime이 있으면 사용
        const enteredAt = pos.updateTime
          ? (typeof pos.updateTime === 'string' ? parseInt(pos.updateTime) : pos.updateTime)
          : Date.now() - 5 * 60 * 1000;

        // 더미 시그널 생성
        const dummySignal: ScalpingSignal = {
          symbol,
          direction,
          strength: 50,
          currentPrice: entryPrice,
          entryPrice,
          tpPrice,
          slPrice,
          atr: estimatedAtr,
          atrPercent: 0.005,
          trend: direction === 'LONG' ? 'UP' : 'DOWN',
          momentum: 'PULLBACK',
          cvd: 0,
          fundingRate: 0,
          oiChange: 0,
          createdAt: enteredAt,
          expiresAt: Date.now() + 60000,
          filtersPassed: {
            spread: true,
            funding: true,
            trend: true,
            momentum: true,
            cvd: true,
          },
        };

        const scalpingPosition: ScalpingPosition = {
          symbol,
          direction,
          entryPrice,
          quantity,
          tpPrice,
          slPrice,
          originalTpPrice: tpPrice,
          enteredAt,
          signal: dummySignal,
          tpReduced: false,
        };

        this.activePositions.set(symbol, scalpingPosition);

        const holdTimeMin = (Date.now() - enteredAt) / 60000;
        this.logger.log(
          `[POSITION SYNC] ✅ ${symbol} ${direction} 동기화 | ` +
            `진입: ${entryPrice.toFixed(6)} | 수량: ${quantity} | ` +
            `보유시간: ${holdTimeMin.toFixed(1)}분`,
        );
      }

      this.logger.log(
        `[POSITION SYNC] 완료: ${this.activePositions.size}개 포지션 동기화됨`,
      );
    } catch (error: any) {
      this.logger.error(`[POSITION SYNC] ❌ 실패: ${error.message}`);
    }
  }

  /**
   * 포지션 추가
   */
  addPosition(params: {
    symbol: string;
    direction: SignalDirection;
    entryPrice: number;
    quantity: number;
    tpPrice: number;
    slPrice: number;
    originalTpPrice: number;
    enteredAt: number;
    signal: ScalpingSignal;
    mainOrderId?: number;
  }): void {
    const position: ScalpingPosition = {
      symbol: params.symbol,
      direction: params.direction,
      entryPrice: params.entryPrice,
      quantity: params.quantity,
      tpPrice: params.tpPrice,
      slPrice: params.slPrice,
      originalTpPrice: params.originalTpPrice,
      enteredAt: params.enteredAt,
      signal: params.signal,
      mainOrderId: params.mainOrderId,
      tpReduced: false,
    };

    this.activePositions.set(params.symbol, position);

    this.logger.log(
      `\n[POSITION] ════════════════════════════════════════════════`,
    );
    this.logger.log(`[POSITION] ✅ 포지션 추가: ${params.symbol}`);
    this.logger.log(`  방향:     ${params.direction}`);
    this.logger.log(`  진입가:   ${params.entryPrice.toFixed(6)}`);
    this.logger.log(`  수량:     ${params.quantity}`);
    this.logger.log(`  TP:       ${params.tpPrice.toFixed(6)}`);
    this.logger.log(`  SL:       ${params.slPrice.toFixed(6)}`);
    this.logger.log(`  현재 포지션 수: ${this.activePositions.size}`);
    this.logger.log(`[POSITION] ════════════════════════════════════════════════\n`);
  }

  /**
   * 포지션 제거
   */
  removePosition(symbol: string): void {
    const position = this.activePositions.get(symbol);

    if (position) {
      const holdTimeMin = (Date.now() - position.enteredAt) / 60000;

      this.logger.log(
        `\n[POSITION] ════════════════════════════════════════════════`,
      );
      this.logger.log(`[POSITION] ❌ 포지션 제거: ${symbol}`);
      this.logger.log(`  방향:       ${position.direction}`);
      this.logger.log(`  진입가:     ${position.entryPrice.toFixed(6)}`);
      this.logger.log(`  보유 시간:  ${holdTimeMin.toFixed(1)}분`);
      this.logger.log(`  남은 포지션: ${this.activePositions.size - 1}`);
      this.logger.log(`[POSITION] ════════════════════════════════════════════════\n`);

      this.activePositions.delete(symbol);
    } else {
      this.logger.warn(`[POSITION] ⚠️ 제거할 포지션 없음: ${symbol}`);
    }
  }

  /**
   * 포지션 조회
   */
  getPosition(symbol: string): ScalpingPosition | undefined {
    return this.activePositions.get(symbol);
  }

  /**
   * 활성 포지션 목록 반환
   */
  getActivePositions(): ScalpingPosition[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * 특정 방향의 포지션 수 반환
   */
  getPositionCount(direction?: SignalDirection): number {
    if (!direction) {
      return this.activePositions.size;
    }

    return Array.from(this.activePositions.values()).filter(
      (p) => p.direction === direction,
    ).length;
  }

  /**
   * 심볼의 포지션 존재 여부
   */
  hasPosition(symbol: string): boolean {
    return this.activePositions.has(symbol);
  }

  /**
   * TP 축소 표시
   */
  markTpReduced(symbol: string, newTpPrice: number): void {
    const position = this.activePositions.get(symbol);

    if (position) {
      position.tpPrice = newTpPrice;
      position.tpReduced = true;

      this.logger.log(`[POSITION] 📉 TP 축소: ${symbol}`);
      this.logger.log(`  원래 TP:  ${position.originalTpPrice.toFixed(6)}`);
      this.logger.log(`  새 TP:    ${newTpPrice.toFixed(6)}`);
    }
  }

  /**
   * 포지션 업데이트
   */
  updatePosition(symbol: string, updates: Partial<ScalpingPosition>): void {
    const position = this.activePositions.get(symbol);

    if (position) {
      Object.assign(position, updates);
      this.logger.debug(`[POSITION] 포지션 업데이트: ${symbol}`);
    }
  }

  /**
   * 포지션 상태 요약 로그
   */
  logStatus(): void {
    const positions = this.getActivePositions();

    if (positions.length === 0) {
      this.logger.debug('[POSITION] 활성 포지션 없음');
      return;
    }

    this.logger.log('\n[POSITION STATUS] ────────────────────────────────');
    this.logger.log(`총 포지션: ${positions.length}개`);
    this.logger.log(
      `  LONG: ${this.getPositionCount('LONG')}개`,
    );
    this.logger.log(
      `  SHORT: ${this.getPositionCount('SHORT')}개`,
    );

    for (const pos of positions) {
      const holdTimeMin = (Date.now() - pos.enteredAt) / 60000;
      this.logger.log(
        `  ${pos.symbol} ${pos.direction} | 진입: ${pos.entryPrice.toFixed(6)} | 보유: ${holdTimeMin.toFixed(1)}분 | TP축소: ${pos.tpReduced ? 'Y' : 'N'}`,
      );
    }
    this.logger.log('[POSITION STATUS] ────────────────────────────────\n');
  }

  /**
   * 모든 포지션 초기화 (테스트용)
   */
  clearAll(): void {
    const count = this.activePositions.size;
    this.activePositions.clear();
    this.logger.warn(`[POSITION] ⚠️ 전체 포지션 초기화: ${count}개 제거`);
  }
}
