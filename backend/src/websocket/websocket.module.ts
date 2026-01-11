import { Module, forwardRef } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { CandleAggregatorService } from './candle-aggregator.service';
import { AppWebSocketGateway } from './websocket.gateway';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [WebSocketService, CandleAggregatorService, AppWebSocketGateway],
  exports: [WebSocketService, CandleAggregatorService, AppWebSocketGateway],
})
export class WebSocketModule {}
