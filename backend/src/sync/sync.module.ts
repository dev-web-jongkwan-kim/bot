import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionSyncService } from './position-sync.service';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { OkxModule } from '../okx/okx.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { RiskModule } from '../risk/risk.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, Signal]),
    OkxModule,
    forwardRef(() => StrategiesModule),
    RiskModule,  // v13: 블랙리스트 기록용
    OrderModule,
  ],
  providers: [PositionSyncService],
  exports: [PositionSyncService],
})
export class SyncModule {}
