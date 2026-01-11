import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalProcessorService } from './signal-processor.service';
import { StrategyRunnerService } from './strategy-runner.service';
import { Signal } from '../database/entities/signal.entity';
import { Position } from '../database/entities/position.entity';
import { RiskModule } from '../risk/risk.module';
import { OrderModule } from '../order/order.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { BinanceModule } from '../binance/binance.module';
import { SymbolSelectionModule } from '../symbol-selection/symbol-selection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signal, Position]),
    RiskModule,
    OrderModule,
    forwardRef(() => WebSocketModule),
    StrategiesModule,  // Import strategies
    BinanceModule,     // For historical candles
    SymbolSelectionModule, // For selected symbols
  ],
  providers: [SignalProcessorService, StrategyRunnerService],
  exports: [SignalProcessorService],
})
export class SignalModule {}
