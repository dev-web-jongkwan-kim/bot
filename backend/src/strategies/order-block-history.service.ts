import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderBlockHistory } from '../database/entities/order-block-history.entity';

/**
 * Order Block History Service
 *
 * OB 감지/진행 이력 저장 및 분석
 */
@Injectable()
export class OrderBlockHistoryService {
  private readonly logger = new Logger(OrderBlockHistoryService.name);

  constructor(
    @InjectRepository(OrderBlockHistory)
    private obHistoryRepo: Repository<OrderBlockHistory>,
  ) {}

  /**
   * OB 감지 시 저장
   */
  async recordOBDetected(params: {
    symbol: string;
    timeframe: string;
    type: 'LONG' | 'SHORT';
    method: string;
    top: number;
    bottom: number;
    atr: number;
    atrPercent: number;
    volRatio: number;
    bodyRatio: number;
    marketRegime?: string;
    barsAboveSMA?: number;
    barsBelowSMA?: number;
    sma50Value?: number;
    barIndex: number;
  }): Promise<OrderBlockHistory> {
    const midpoint = (params.top + params.bottom) / 2;

    const record = this.obHistoryRepo.create({
      symbol: params.symbol,
      timeframe: params.timeframe,
      type: params.type,
      method: params.method,
      top: params.top,
      bottom: params.bottom,
      midpoint,
      atr: params.atr,
      atrPercent: params.atrPercent,
      volRatio: params.volRatio,
      bodyRatio: params.bodyRatio,
      marketRegime: params.marketRegime,
      barsAboveSMA: params.barsAboveSMA,
      barsBelowSMA: params.barsBelowSMA,
      sma50Value: params.sma50Value,
      detectedAt: new Date(),
      detectedBarIndex: params.barIndex,
      status: 'ACTIVE',
    });

    const saved = await this.obHistoryRepo.save(record);
    this.logger.debug(`[OB HISTORY] Recorded: ${params.symbol} ${params.type} @ ${midpoint.toFixed(6)}`);
    return saved;
  }

  /**
   * OB 거부 시 저장 (필터에 의해 거부됨)
   */
  async recordOBRejected(params: {
    symbol: string;
    timeframe: string;
    type: 'LONG' | 'SHORT';
    method: string;
    top: number;
    bottom: number;
    atr: number;
    atrPercent: number;
    volRatio: number;
    bodyRatio: number;
    rejectionReason: string;
    barIndex: number;
  }): Promise<OrderBlockHistory> {
    const midpoint = (params.top + params.bottom) / 2;

    const record = this.obHistoryRepo.create({
      symbol: params.symbol,
      timeframe: params.timeframe,
      type: params.type,
      method: params.method,
      top: params.top,
      bottom: params.bottom,
      midpoint,
      atr: params.atr,
      atrPercent: params.atrPercent,
      volRatio: params.volRatio,
      bodyRatio: params.bodyRatio,
      detectedAt: new Date(),
      detectedBarIndex: params.barIndex,
      status: 'REJECTED',
      rejectionReason: params.rejectionReason,
    });

    const saved = await this.obHistoryRepo.save(record);
    this.logger.debug(`[OB HISTORY] Rejected: ${params.symbol} ${params.type} - ${params.rejectionReason}`);
    return saved;
  }

  /**
   * OB 상태 업데이트 - 가격 이탈
   */
  async updatePriceMovedAway(id: number): Promise<void> {
    await this.obHistoryRepo.update(id, {
      status: 'PRICE_MOVED_AWAY',
      priceMovedAwayAt: new Date(),
    });
  }

  /**
   * OB 상태 업데이트 - 신호 생성
   */
  async updateSignalGenerated(id: number): Promise<void> {
    await this.obHistoryRepo.update(id, {
      status: 'SIGNAL_GENERATED',
      signalGeneratedAt: new Date(),
    });
  }

  /**
   * OB 상태 업데이트 - 체결
   */
  async updateFilled(id: number, positionId: number, filledPrice: number): Promise<void> {
    await this.obHistoryRepo.update(id, {
      status: 'FILLED',
      filledAt: new Date(),
      positionId,
      filledPrice,
    });
  }

  /**
   * OB 상태 업데이트 - 무효화 (영역 이탈)
   */
  async updateInvalidated(id: number, reason: string): Promise<void> {
    await this.obHistoryRepo.update(id, {
      status: 'INVALIDATED',
      invalidatedAt: new Date(),
      invalidationReason: reason,
    });
  }

  /**
   * OB 상태 업데이트 - 만료
   */
  async updateExpired(id: number): Promise<void> {
    await this.obHistoryRepo.update(id, {
      status: 'EXPIRED',
      expiredAt: new Date(),
    });
  }

  /**
   * 포지션 종료 시 결과 업데이트
   */
  async updatePositionResult(positionId: number, pnl: number, isWin: boolean): Promise<void> {
    await this.obHistoryRepo.update(
      { positionId },
      { realizedPnl: pnl, isWin }
    );
  }

  /**
   * 심볼의 활성 OB 조회
   */
  async getActiveOB(symbol: string, timeframe: string): Promise<OrderBlockHistory | null> {
    return this.obHistoryRepo.findOne({
      where: {
        symbol,
        timeframe,
        status: 'ACTIVE',
      },
      order: { detectedAt: 'DESC' },
    });
  }

  /**
   * 통계: OB 체결률 조회
   */
  async getOBStats(days: number = 7): Promise<{
    total: number;
    filled: number;
    invalidated: number;
    expired: number;
    rejected: number;
    fillRate: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.obHistoryRepo
      .createQueryBuilder('ob')
      .select('ob.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ob.detectedAt >= :since', { since })
      .groupBy('ob.status')
      .getRawMany();

    const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const filled = parseInt(stats.find(s => s.status === 'FILLED')?.count || '0');
    const invalidated = parseInt(stats.find(s => s.status === 'INVALIDATED')?.count || '0');
    const expired = parseInt(stats.find(s => s.status === 'EXPIRED')?.count || '0');
    const rejected = parseInt(stats.find(s => s.status === 'REJECTED')?.count || '0');

    return {
      total,
      filled,
      invalidated,
      expired,
      rejected,
      fillRate: total > 0 ? (filled / total) * 100 : 0,
    };
  }

  /**
   * 통계: 거부 사유별 분포
   */
  async getRejectionStats(days: number = 7): Promise<Record<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.obHistoryRepo
      .createQueryBuilder('ob')
      .select('ob.rejectionReason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('ob.detectedAt >= :since', { since })
      .andWhere('ob.status = :status', { status: 'REJECTED' })
      .groupBy('ob.rejectionReason')
      .getRawMany();

    return stats.reduce((acc, s) => {
      acc[s.reason || 'unknown'] = parseInt(s.count);
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 통계: 승률 by OB 조건
   */
  async getWinRateByCondition(days: number = 30): Promise<{
    byType: Record<string, { total: number; wins: number; winRate: number }>;
    byTimeframe: Record<string, { total: number; wins: number; winRate: number }>;
    byMarketRegime: Record<string, { total: number; wins: number; winRate: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const filledOBs = await this.obHistoryRepo.find({
      where: {
        status: 'FILLED',
      },
      select: ['type', 'timeframe', 'marketRegime', 'isWin'],
    });

    const recentFilledOBs = filledOBs.filter(ob => {
      // isWin이 설정된 것만 (포지션 종료된 것)
      return ob.isWin !== null;
    });

    // 타입별 승률
    const byType: Record<string, { total: number; wins: number; winRate: number }> = {};
    for (const ob of recentFilledOBs) {
      if (!byType[ob.type]) {
        byType[ob.type] = { total: 0, wins: 0, winRate: 0 };
      }
      byType[ob.type].total++;
      if (ob.isWin) byType[ob.type].wins++;
    }
    for (const type in byType) {
      byType[type].winRate = (byType[type].wins / byType[type].total) * 100;
    }

    // 타임프레임별 승률
    const byTimeframe: Record<string, { total: number; wins: number; winRate: number }> = {};
    for (const ob of recentFilledOBs) {
      if (!byTimeframe[ob.timeframe]) {
        byTimeframe[ob.timeframe] = { total: 0, wins: 0, winRate: 0 };
      }
      byTimeframe[ob.timeframe].total++;
      if (ob.isWin) byTimeframe[ob.timeframe].wins++;
    }
    for (const tf in byTimeframe) {
      byTimeframe[tf].winRate = (byTimeframe[tf].wins / byTimeframe[tf].total) * 100;
    }

    // 마켓 레짐별 승률
    const byMarketRegime: Record<string, { total: number; wins: number; winRate: number }> = {};
    for (const ob of recentFilledOBs) {
      const regime = ob.marketRegime || 'UNKNOWN';
      if (!byMarketRegime[regime]) {
        byMarketRegime[regime] = { total: 0, wins: 0, winRate: 0 };
      }
      byMarketRegime[regime].total++;
      if (ob.isWin) byMarketRegime[regime].wins++;
    }
    for (const regime in byMarketRegime) {
      byMarketRegime[regime].winRate = (byMarketRegime[regime].wins / byMarketRegime[regime].total) * 100;
    }

    return { byType, byTimeframe, byMarketRegime };
  }
}
