import { Module, forwardRef } from '@nestjs/common';
import { OkxWebSocketService } from '../okx/okx-websocket.service';
import { CandleAggregatorService } from './candle-aggregator.service';
import { AppWebSocketGateway } from './websocket.gateway';
import { CacheModule } from '../cache/cache.module';

// Original Binance WebSocket (kept for reference)
// import { WebSocketService } from './websocket.service';

@Module({
  imports: [CacheModule],
  providers: [
    OkxWebSocketService,
    CandleAggregatorService,
    AppWebSocketGateway,
    // Provide OkxWebSocketService as 'WebSocketService' for compatibility
    {
      provide: 'WebSocketService',
      useExisting: OkxWebSocketService,
    },
  ],
  exports: [OkxWebSocketService, CandleAggregatorService, AppWebSocketGateway, 'WebSocketService'],
})
export class WebSocketModule {}
