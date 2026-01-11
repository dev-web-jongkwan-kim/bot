import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiController } from './api.controller';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { OrderModule } from '../order/order.module';
import { BinanceModule } from '../binance/binance.module';
import { SymbolSelectionModule } from '../symbol-selection/symbol-selection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, Signal]),
    OrderModule,
    BinanceModule,
    SymbolSelectionModule,
  ],
  controllers: [ApiController],
})
export class ApiModule {}
