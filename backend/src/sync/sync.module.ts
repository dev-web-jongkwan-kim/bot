import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionSyncService } from './position-sync.service';
import { PositionTimeManagerService } from './position-time-manager.service';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { BinanceModule } from '../binance/binance.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, Signal]),
    BinanceModule,
    RiskModule,  // v13: 블랙리스트 기록용
  ],
  providers: [PositionSyncService, PositionTimeManagerService],
  exports: [PositionSyncService, PositionTimeManagerService],
})
export class SyncModule {}
