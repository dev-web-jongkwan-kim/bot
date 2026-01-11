import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { BinanceModule } from '../binance/binance.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [BinanceModule, DatabaseModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}


