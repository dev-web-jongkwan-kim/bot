import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signal } from '../database/entities/signal.entity';
import { Position } from '../database/entities/position.entity';
import { OrderBlockHistory } from '../database/entities/order-block-history.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { CacheModule } from '../cache/cache.module';
import { OkxModule } from '../okx/okx.module';
import { SimpleTrueOBStrategy } from './simple-true-ob.strategy';
import { OrderBlockHistoryService } from './order-block-history.service';

/**
 * Strategies Module
 *
 * SimpleTrueOB Strategy (tb1에서 가져옴):
 * - ORB (Opening Range Breakout) 메서드
 * - 동적 minAwayMult 설정 (변동성 기반)
 * - Partial TP: TP1=1.5x (80%), TP2=2.5x (20%)
 * - SMA 50 (1시간봉 기준) 필터
 * - 리스크 관리 (연속 손실/수익 관리)
 *
 * 백테스트와 실시간 매매가 완전히 동일한 로직 사용
 *
 * OrderBlockHistoryService: OB 감지/진행 이력 저장 (분석용)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Signal, Position, OrderBlockHistory]),
    WebSocketModule,
    CacheModule,
    OkxModule,
  ],
  providers: [
    SimpleTrueOBStrategy,
    OrderBlockHistoryService,
  ],
  exports: [
    SimpleTrueOBStrategy,
    OrderBlockHistoryService,
  ],
})
export class StrategiesModule {}
