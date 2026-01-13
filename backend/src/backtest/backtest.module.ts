import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { DataDownloaderService } from './data-downloader.service';
import { BacktestEngineService } from './backtest-engine.service';
import { PerformanceAnalyzerService } from './performance-analyzer.service';
import { DataPreprocessorService } from './data-preprocessor.service';
import { ReportGeneratorService } from './report-generator.service';
import { MarketRegimeFilter } from './filters/market-regime.filter';
import { DatabaseModule } from '../database/database.module';
import { OkxModule } from '../okx/okx.module';
import { CacheModule } from '../cache/cache.module';
import { StrategiesModule } from '../strategies/strategies.module';

/**
 * Backtest Module
 *
 * SimpleTrueOB Strategy (tb1에서 가져옴):
 * - ORB (Opening Range Breakout) 메서드
 * - 동적 minAwayMult 설정 (변동성 기반)
 * - Partial TP: TP1=1.5x (80%), TP2=2.5x (20%)
 * - SMA 50 (1시간봉 기준) 필터
 *
 * 전략은 StrategiesModule에서 가져옴 (백테스트와 실시간이 동일한 로직)
 */
@Module({
  imports: [
    DatabaseModule,
    OkxModule,
    CacheModule,
    StrategiesModule,
  ],
  controllers: [BacktestController],
  providers: [
    BacktestService,
    DataDownloaderService,
    BacktestEngineService,
    PerformanceAnalyzerService,
    DataPreprocessorService,
    ReportGeneratorService,
    MarketRegimeFilter,
  ],
  exports: [BacktestService],
})
export class BacktestModule {}
