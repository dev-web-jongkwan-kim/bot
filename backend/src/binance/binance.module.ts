import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceMarketDataService } from './binance-market-data.service';
import { BinanceLevelCalculatorService } from './binance-level-calculator.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    BinanceService,
    BinanceMarketDataService,
    BinanceLevelCalculatorService,
  ],
  exports: [
    BinanceService,
    BinanceMarketDataService,
    BinanceLevelCalculatorService,
  ],
})
export class BinanceModule {}


