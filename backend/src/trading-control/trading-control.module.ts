import { Module, Global } from '@nestjs/common';
import { TradingControlService } from './trading-control.service';
import { TradingControlController } from './trading-control.controller';

@Global()
@Module({
  controllers: [TradingControlController],
  providers: [TradingControlService],
  exports: [TradingControlService],
})
export class TradingControlModule {}
