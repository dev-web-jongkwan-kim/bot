import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { BacktestConfig } from './interfaces/backtest.interface';
import { STRATEGY_NAMES } from '../strategies/strategy.interface';
import { SimpleTrueOBStrategy } from '../strategies/simple-true-ob.strategy';

@Controller('api/backtest')
export class BacktestController {
  constructor(
    private readonly backtestService: BacktestService,
    private readonly simpleTrueOBStrategy: SimpleTrueOBStrategy,
  ) {}

  @Post('run')
  async runBacktest(@Body() config: BacktestConfig) {
    // 기본값 설정
    const defaultConfig: BacktestConfig = {
      symbols: config.symbols && config.symbols.length > 0
        ? config.symbols
        : ['BTCUSDT', 'ETHUSDT'],
      startDate: config.startDate,
      endDate: config.endDate,
      initialBalance: config.initialBalance || 10000,
      // 기본 전략: SimpleTrueOB
      strategies: config.strategies && config.strategies.length > 0
        ? config.strategies
        : [STRATEGY_NAMES.SIMPLE_TRUE_OB],
      riskPerTrade: config.riskPerTrade || 0.02,
      dailyLossLimit: config.dailyLossLimit || 0.02,
      maxPositions: config.maxPositions || 8,
      takerFee: config.takerFee || 0.0004,
      slippage: config.slippage || 0.0002,
    };

    return this.backtestService.runBacktest(defaultConfig);
  }

  /**
   * SimpleTrueOB 전용 백테스트 (tb1 방식)
   */
  @Post('run-simple-true-ob')
  async runSimpleTrueOBBacktest(@Body() config: {
    symbol: string;
    startDate: string;
    endDate: string;
    initialCapital?: number;
    debug?: boolean;
  }) {
    return this.backtestService.runSimpleTrueOBBacktest(
      config.symbol,
      config.startDate,
      config.endDate,
      config.initialCapital || 10000,
      config.debug || false
    );
  }

  @Get('results/:id')
  async getResults(@Param('id') id: string) {
    return this.backtestService.getResults(id);
  }

  @Get('download/:symbol/:interval/:startDate/:endDate')
  async downloadData(
    @Param('symbol') symbol: string,
    @Param('interval') interval: string,
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.backtestService.downloadData(symbol, interval, startDate, endDate);
  }

  @Get('strategy-status')
  async getStrategyStatus() {
    return this.simpleTrueOBStrategy.getStatus();
  }

  /**
   * 리스크 캡 로직 A/B 테스트
   */
  @Post('risk-cap-comparison')
  async runRiskCapComparison(@Body() config: {
    symbols: string[];
    startDate: string;
    endDate: string;
    initialBalance?: number;
    maxRiskAtr?: number;
  }) {
    return this.backtestService.runRiskCapComparison(config);
  }

  /**
   * maxAtrMult A/B 테스트 (OB 크기 필터링)
   */
  @Post('max-atr-mult-comparison')
  async runMaxAtrMultComparison(@Body() config: {
    symbols: string[];
    startDate: string;
    endDate: string;
    initialBalance?: number;
    maxAtrMultA?: number;
    maxAtrMultB?: number;
  }) {
    return this.backtestService.runMaxAtrMultComparison(config);
  }
}
