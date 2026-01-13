import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderMonitorService } from './order-monitor.service';
import { OkxModule } from '../okx/okx.module';
import { DatabaseModule } from '../database/database.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    OkxModule,
    DatabaseModule,
    forwardRef(() => WebSocketModule),
  ],
  providers: [OrderService, OrderMonitorService],
  exports: [OrderService, OrderMonitorService],
})
export class OrderModule {}


