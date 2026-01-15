import { Module, forwardRef } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { CandleAggregatorService } from './candle-aggregator.service';
import { AppWebSocketGateway } from './websocket.gateway';
import { CacheModule } from '../cache/cache.module';

// Original Binance WebSocket (kept for reference)
// import { WebSocketService } from './websocket.service';

@Module({
  imports: [CacheModule],
  providers: [
    WebSocketService,
    CandleAggregatorService,
    AppWebSocketGateway,
    {
      provide: 'WebSocketService',
      useExisting: WebSocketService,
    },
  ],
  exports: [WebSocketService, CandleAggregatorService, AppWebSocketGateway, 'WebSocketService'],
})
export class WebSocketModule {}
