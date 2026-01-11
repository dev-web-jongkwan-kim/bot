import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '@nestjs/config';
import { BinanceModule } from '../binance/binance.module';
import { SymbolSelectionModule } from '../symbol-selection/symbol-selection.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    BinanceModule,              // v10: Dynamic balance
    SymbolSelectionModule,      // v12: Sector management
  ],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}


