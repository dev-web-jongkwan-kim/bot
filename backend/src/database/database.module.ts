import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signal } from './entities/signal.entity';
import { Position } from './entities/position.entity';
import { OrderBlockHistory } from './entities/order-block-history.entity';

/**
 * Database Module
 *
 * 범용 엔티티만 유지:
 * - Signal: 전략 시그널 저장
 * - Position: 포지션 관리
 * - OrderBlockHistory: OB 감지/진행 이력 (분석용)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Signal,
      Position,
      OrderBlockHistory,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


