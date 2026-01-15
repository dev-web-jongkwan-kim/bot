import { Module } from '@nestjs/common';
import { SymbolSelectionService } from './symbol-selection.service';
import { SymbolUpdateScheduler } from './symbol-update.scheduler';
import { SymbolSectorService } from './symbol-sector.service';
import { OkxModule } from '../okx/okx.module';
import { BinanceModule } from '../binance/binance.module';
import { CacheModule } from '../cache/cache.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [OkxModule, BinanceModule, CacheModule, WebSocketModule],
  providers: [SymbolSelectionService, SymbolUpdateScheduler, SymbolSectorService],
  exports: [SymbolSelectionService, SymbolUpdateScheduler, SymbolSectorService],
})
export class SymbolSelectionModule {}
