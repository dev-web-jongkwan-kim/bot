import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './database/entities/position.entity';
import { Signal } from './database/entities/signal.entity';

@Controller('api')
export class AppController {
  constructor(
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    @InjectRepository(Signal)
    private signalRepo: Repository<Signal>,
  ) {}

  @Get('stats/daily')
  async getDailyStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.positionRepo
      .createQueryBuilder('position')
      .select('COUNT(*)', 'totalTrades')
      .addSelect('SUM(CASE WHEN position.realizedPnl > 0 THEN 1 ELSE 0 END)', 'wins')
      .addSelect('SUM(CASE WHEN position.realizedPnl < 0 THEN 1 ELSE 0 END)', 'losses')
      .addSelect('SUM(position.realizedPnl)', 'totalPnl')
      .addSelect('AVG(position.realizedPnl)', 'avgPnl')
      .where('DATE(position.closedAt) = CURRENT_DATE')
      .andWhere('position.status = :status', { status: 'CLOSED' })
      .getRawOne();

    return {
      totalTrades: parseInt(result?.totalTrades || '0'),
      wins: parseInt(result?.wins || '0'),
      losses: parseInt(result?.losses || '0'),
      totalPnl: parseFloat(result?.totalPnl || '0'),
      avgPnl: parseFloat(result?.avgPnl || '0'),
    };
  }

  @Get('positions')
  async getPositions() {
    return this.positionRepo.find({
      where: { status: 'OPEN' },
      order: { openedAt: 'DESC' },
    });
  }

  @Get('signals')
  async getSignals(@Query('symbol') symbol?: string) {
    const query = this.signalRepo
      .createQueryBuilder('signal')
      .orderBy('signal.timestamp', 'DESC')
      .take(50);

    if (symbol) {
      query.where('signal.symbol = :symbol', { symbol });
    }

    return query.getMany();
  }

  @Get('performance')
  async getPerformance() {
    const positions = await this.positionRepo.find({
      where: { status: 'CLOSED' },
      order: { closedAt: 'ASC' },
    });

    let cumulative = 0;
    const chartData = positions.map((pos) => {
      cumulative += parseFloat(pos.realizedPnl?.toString() || '0');
      return {
        date: pos.closedAt?.toISOString().split('T')[0] || '',
        pnl: parseFloat(pos.realizedPnl?.toString() || '0'),
        cumulative,
      };
    });

    return { chartData };
  }
}


