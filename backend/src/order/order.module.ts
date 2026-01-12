import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderMonitorService } from './order-monitor.service';
import { BinanceModule } from '../binance/binance.module';
import { DatabaseModule } from '../database/database.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    BinanceModule,
    DatabaseModule,
    forwardRef(() => WebSocketModule),
  ],
  providers: [OrderService, OrderMonitorService],
  exports: [OrderService, OrderMonitorService],
})
export class OrderModule {}


