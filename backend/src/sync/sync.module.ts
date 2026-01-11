import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionSyncService } from './position-sync.service';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { BinanceModule } from '../binance/binance.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, Signal]),
    BinanceModule,
    forwardRef(() => StrategiesModule),
    RiskModule,  // v13: 블랙리스트 기록용
  ],
  providers: [PositionSyncService],
  exports: [PositionSyncService],
})
export class SyncModule {}
