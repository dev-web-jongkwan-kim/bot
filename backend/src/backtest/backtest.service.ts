import { Injectable, Logger } from '@nestjs/common';
import { DataDownloaderService } from './data-downloader.service';
import { PerformanceAnalyzerService } from './performance-analyzer.service';
import { ReportGeneratorService } from './report-generator.service';
import { SimpleTrueOBBacktest } from './simple-true-ob-backtest';
import { BacktestConfig, BacktestResults } from './interfaces/backtest.interface';
import { OHLCV, Trade } from '../strategies/simple-true-ob.interface';

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);
  private resultsCache: Map<string, BacktestResults> = new Map();
  private simpleTrueOBBacktest: SimpleTrueOBBacktest;

  constructor(
    private dataDownloader: DataDownloaderService,
    private analyzer: PerformanceAnalyzerService,
    private reportGenerator: ReportGeneratorService,
  ) {
    this.simpleTrueOBBacktest = new SimpleTrueOBBacktest();
  }

  async downloadData(
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string,
  ) {
    return this.dataDownloader.loadAndMerge(symbol, interval, startDate, endDate);
  }

  /**
   * ✅ 통합된 백테스트 실행 (SimpleTrueOBBacktest 사용)
   * 최적화 스크립트와 동일한 엔진 사용으로 일관된 결과 보장
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResults> {
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`STARTING UNIFIED BACKTEST (SimpleTrueOBBacktest Engine)`);
    this.logger.log(`${'='.repeat(80)}`);
    this.logger.log(`Symbols: ${config.symbols.length}`);
    this.logger.log(`Period: ${config.startDate} to ${config.endDate}`);
    this.logger.log(`Initial Balance: $${config.initialBalance}`);

    const failedSymbols: string[] = [];
    const successSymbols: string[] = [];
    const symbolResults: Map<string, any> = new Map();

    // 전체 거래 기록
    const allTrades: any[] = [];
    let totalPnl = 0;
    let totalWins = 0;
    let totalLosses = 0;

    // 각 심볼별로 SimpleTrueOBBacktest 실행
    for (const symbol of config.symbols) {
      try {
        this.logger.log(`\n[${symbol}] Downloading data...`);

        // 5분봉 데이터 로드
        const candles5m = await this.dataDownloader.loadAndMerge(
          symbol,
          '5m',
          config.startDate,
          config.endDate,
        );

        if (!candles5m || candles5m.length === 0) {
          throw new Error(`No 5m data available`);
        }

        this.logger.log(`[${symbol}] Loaded ${candles5m.length} candles`);

        // OHLCV 형식으로 변환
        const ohlcvCandles: OHLCV[] = candles5m
          .map((c) => ({
            timestamp: new Date(c.openTime),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }))
          .filter((c) => !isNaN(c.timestamp.getTime()));

        // 심볼별 자본 할당 (균등 분배)
        const symbolCapital = config.initialBalance / config.symbols.length;

        // 백테스트 실행 (새 인스턴스로 상태 초기화)
        const backtester = new SimpleTrueOBBacktest();
        const result = await backtester.runBacktest(
          ohlcvCandles,
          symbolCapital,
          false, // debug
          new Date(config.startDate),
          new Date(config.endDate),
          '5m',
          true, // enableRiskManagement
        );

        // 결과 저장
        symbolResults.set(symbol, result);
        successSymbols.push(symbol);

        // 거래 기록 추가 (심볼 정보 포함)
        const btConfig = backtester.getConfig();
        result.trades.forEach((trade: Trade) => {
          allTrades.push({
            symbol,
            ...trade,
            entryTime: trade.entryTime,
            exitTime: trade.exitTime,
            side: trade.direction,
            entryPrice: trade.entry,
            exitPrice: trade.exit,
            pnl: trade.pnl,
            pnlPercent: trade.pnlPercent,
            exitReason: trade.method,
            leverage: btConfig.leverage,  // v5 최적화: 하드코딩 제거
            quantity: trade.positionSize,
          });
        });

        // 집계
        totalPnl += result.finalCapital - symbolCapital;
        totalWins += result.winningTrades;
        totalLosses += result.losingTrades;

        this.logger.log(
          `[${symbol}] ✅ Trades: ${result.totalTrades} | ` +
          `WR: ${result.winRate.toFixed(1)}% | ` +
          `Return: ${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(2)}%`
        );

      } catch (error: any) {
        failedSymbols.push(symbol);
        this.logger.error(`[${symbol}] ❌ Failed: ${error.message}`);
      }
    }

    // 전체 통계 계산
    const totalTrades = allTrades.length;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const finalBalance = config.initialBalance + totalPnl;
    const roi = (totalPnl / config.initialBalance) * 100;

    // 거래를 시간순으로 정렬
    allTrades.sort((a, b) =>
      new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
    );

    // Equity Curve 계산
    let runningBalance = config.initialBalance;
    const equityCurve = allTrades.map(trade => {
      runningBalance += trade.pnl;
      return {
        timestamp: new Date(trade.exitTime),
        balance: runningBalance,
        equity: runningBalance,
      };
    });

    // Max Drawdown 계산
    let peak = config.initialBalance;
    let maxDrawdown = 0;
    runningBalance = config.initialBalance;
    for (const trade of allTrades) {
      runningBalance += trade.pnl;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // 거래 상세 포맷팅
    const detailedTrades = allTrades.map((trade, index) => {
      const entryValue = trade.entryPrice * trade.quantity;
      const marginInvested = entryValue / trade.leverage;
      const holdingMs = new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime();
      const holdingMinutes = Math.floor(holdingMs / 60000);
      const holdingHours = Math.floor(holdingMinutes / 60);
      const remainingMinutes = holdingMinutes % 60;

      return {
        entryTime: trade.entryTime instanceof Date
          ? trade.entryTime.toISOString()
          : new Date(trade.entryTime).toISOString(),
        exitTime: trade.exitTime instanceof Date
          ? trade.exitTime.toISOString()
          : new Date(trade.exitTime).toISOString(),
        holdingTime: `${holdingHours}h ${remainingMinutes}m`,
        holdingMinutes,
        symbol: trade.symbol,
        strategy: 'Smart Money Concepts',
        side: trade.side === 'long' ? 'LONG' : 'SHORT',
        exitReason: trade.exitReason || trade.method,
        partial: false,
        leverage: trade.leverage,
        quantity: Number(trade.quantity?.toFixed(4) || 0),
        positionSizeUSDT: Number(entryValue?.toFixed(2) || 0),
        entryPrice: Number(trade.entryPrice?.toFixed(6) || 0),
        exitPrice: Number(trade.exitPrice?.toFixed(6) || 0),
        priceChange: Number((trade.exitPrice - trade.entryPrice)?.toFixed(6) || 0),
        priceChangePercent: Number(
          (((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100)?.toFixed(2) || 0
        ),
        pnl: Number(trade.pnl?.toFixed(2) || 0),
        pnlPercent: Number(trade.pnlPercent?.toFixed(2) || 0),
        fee: 0,
        netPnl: Number(trade.pnl?.toFixed(2) || 0),
      };
    });

    // 종목별 통계
    const symbolStats: Record<string, any> = {};
    for (const [symbol, result] of symbolResults) {
      symbolStats[symbol] = {
        totalTrades: result.totalTrades,
        wins: result.winningTrades,
        losses: result.losingTrades,
        winRate: result.winRate,
        totalPnl: result.finalCapital - (config.initialBalance / config.symbols.length),
        roi: result.totalReturn,
      };
    }

    // 결과 로그
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`BACKTEST RESULTS SUMMARY`);
    this.logger.log(`${'='.repeat(80)}`);
    this.logger.log(`Symbols: ${successSymbols.length}/${config.symbols.length} (${failedSymbols.length} failed)`);
    this.logger.log(`Total Trades: ${totalTrades}`);
    this.logger.log(`Win Rate: ${winRate.toFixed(2)}%`);
    this.logger.log(`Total PnL: $${totalPnl.toFixed(2)}`);
    this.logger.log(`ROI: ${roi.toFixed(2)}%`);
    this.logger.log(`Final Balance: $${finalBalance.toFixed(2)}`);
    this.logger.log(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
    this.logger.log(`${'='.repeat(80)}\n`);

    // 통계 출력
    const stats = this.simpleTrueOBBacktest.getStats();
    this.logger.log(`Signal Stats: ${JSON.stringify(stats)}`);

    // 결과 객체 생성
    const results: BacktestResults = {
      totalTrades,
      wins: totalWins,
      losses: totalLosses,
      winRate,
      totalPnl,
      roi,
      initialBalance: config.initialBalance,
      finalBalance,
      maxDrawdown,
      sharpeRatio: 0, // 계산 필요시 추가
      equityCurve,
      tradesLog: detailedTrades as any,
    };

    // 성능 분석
    const metrics = this.analyzer.calculateMetrics(results);

    // 결과 캐시 저장
    const resultId = Date.now().toString();
    this.resultsCache.set(resultId, results);

    return {
      ...results,
      metrics,
      detailedTrades,
      symbolStats,
      dataDownloadSummary: {
        totalRequested: config.symbols.length,
        successCount: successSymbols.length,
        failedCount: failedSymbols.length,
        successSymbols,
        failedSymbols,
      },
      summary: {
        totalTrades,
        wins: totalWins,
        losses: totalLosses,
        winRate: Number(winRate.toFixed(2)),
        totalPnl: Number(totalPnl.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        initialBalance: config.initialBalance,
        finalBalance: Number(finalBalance.toFixed(2)),
        maxDrawdown: Number(maxDrawdown.toFixed(2)),
        sharpeRatio: metrics?.sharpeRatio || 0,
      },
    } as any;
  }

  /**
   * 단일 심볼 백테스트 (기존 메소드 유지)
   */
  async runSimpleTrueOBBacktest(
    symbol: string,
    startDate: string,
    endDate: string,
    initialCapital: number = 10000,
    debug: boolean = false
  ): Promise<any> {
    this.logger.log(`Starting SimpleTrueOB backtest for ${symbol}`);
    this.logger.log(`Period: ${startDate} to ${endDate}`);
    this.logger.log(`Initial Capital: $${initialCapital}`);

    const candles5m = await this.dataDownloader.loadAndMerge(
      symbol,
      '5m',
      startDate,
      endDate,
    );

    if (!candles5m || candles5m.length === 0) {
      throw new Error(`No 5m data available for ${symbol}`);
    }

    const ohlcvCandles: OHLCV[] = candles5m
      .map((c) => ({
        timestamp: new Date(c.openTime),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }))
      .filter((c) => !isNaN(c.timestamp.getTime()));

    const result = await this.simpleTrueOBBacktest.runBacktest(
      ohlcvCandles,
      initialCapital,
      debug,
      new Date(startDate),
      new Date(endDate),
      '5m',
      true,
    );

    return {
      symbol,
      ...result,
      summary: {
        totalTrades: result.totalTrades,
        winRate: result.winRate,
        totalReturn: result.totalReturn,
        initialCapital: result.initialCapital,
        finalCapital: result.finalCapital,
        winningTrades: result.winningTrades,
        losingTrades: result.losingTrades,
      },
    };
  }

  getResults(id: string): BacktestResults | null {
    return this.resultsCache.get(id) || null;
  }

  /**
   * 리스크 캡 로직 A/B 테스트
   * 기존 로직 vs 리스크 캡 적용 로직 비교
   */
  async runRiskCapComparison(config: {
    symbols: string[];
    startDate: string;
    endDate: string;
    initialBalance?: number;
    maxRiskAtr?: number;
  }): Promise<any> {
    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`리스크 캡 로직 A/B 테스트`);
    this.logger.log(`심볼: ${config.symbols.length}개, 기간: ${config.startDate} ~ ${config.endDate}`);
    this.logger.log(`${'='.repeat(60)}\n`);

    const initialBalance = config.initialBalance || 10000;
    const maxRiskAtr = config.maxRiskAtr || 2.0;

    // 결과 저장
    const resultsA: any[] = [];  // 기존 로직
    const resultsB: any[] = [];  // 리스크 캡 로직

    for (const symbol of config.symbols) {
      for (const timeframe of ['5m', '15m']) {
        try {
          // 데이터 다운로드
          const candles = await this.dataDownloader.loadAndMerge(
            symbol,
            timeframe,
            config.startDate,
            config.endDate,
          );

          if (!candles || candles.length < 100) {
            continue;
          }

          const ohlcvCandles: OHLCV[] = candles
            .map((c) => ({
              timestamp: new Date(c.openTime),
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            }))
            .filter((c) => !isNaN(c.timestamp.getTime()));

          const symbolCapital = initialBalance / config.symbols.length / 2;

          // [A] 기존 로직 (리스크 캡 없음)
          const backtesterA = new SimpleTrueOBBacktest();
          backtesterA.setConfig({ enableRiskCap: false });
          const resultA = await backtesterA.runBacktest(
            ohlcvCandles,
            symbolCapital,
            false,
            new Date(config.startDate),
            new Date(config.endDate),
            timeframe as '5m' | '15m',
            true,
          );

          if (resultA.totalTrades > 0) {
            resultsA.push({
              symbol,
              timeframe,
              trades: resultA.totalTrades,
              wins: resultA.winningTrades,
              losses: resultA.losingTrades,
              winRate: resultA.winRate,
              pnl: resultA.finalCapital - symbolCapital,
              roi: resultA.totalReturn,
            });
          }

          // [B] 리스크 캡 로직
          const backtesterB = new SimpleTrueOBBacktest();
          backtesterB.setConfig({ enableRiskCap: true, maxRiskAtr });
          const resultB = await backtesterB.runBacktest(
            ohlcvCandles,
            symbolCapital,
            false,
            new Date(config.startDate),
            new Date(config.endDate),
            timeframe as '5m' | '15m',
            true,
          );

          if (resultB.totalTrades > 0) {
            resultsB.push({
              symbol,
              timeframe,
              trades: resultB.totalTrades,
              wins: resultB.winningTrades,
              losses: resultB.losingTrades,
              winRate: resultB.winRate,
              pnl: resultB.finalCapital - symbolCapital,
              roi: resultB.totalReturn,
            });
          }

          this.logger.log(`[${symbol}/${timeframe}] A: ${resultA.totalTrades} trades, B: ${resultB.totalTrades} trades`);

        } catch (error: any) {
          this.logger.warn(`[${symbol}/${timeframe}] Error: ${error.message}`);
        }
      }
    }

    // 집계
    const aggregateResults = (results: any[]) => {
      const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
      const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
      const totalPnl = results.reduce((sum, r) => sum + r.pnl, 0);
      const avgWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

      return {
        symbolCount: new Set(results.map(r => r.symbol)).size,
        totalTrades,
        totalWins,
        totalLosses: totalTrades - totalWins,
        avgWinRate: Number(avgWinRate.toFixed(2)),
        totalPnl: Number(totalPnl.toFixed(2)),
        avgPnlPerTrade: totalTrades > 0 ? Number((totalPnl / totalTrades).toFixed(4)) : 0,
      };
    };

    const summaryA = aggregateResults(resultsA);
    const summaryB = aggregateResults(resultsB);

    // 차이 계산
    const tradeDiff = summaryB.totalTrades - summaryA.totalTrades;
    const winRateDiff = summaryB.avgWinRate - summaryA.avgWinRate;
    const pnlDiff = summaryB.totalPnl - summaryA.totalPnl;

    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`결과 비교`);
    this.logger.log(`${'='.repeat(60)}`);
    this.logger.log(`[A] 기존 로직: ${summaryA.totalTrades} trades, ${summaryA.avgWinRate}% WR, $${summaryA.totalPnl}`);
    this.logger.log(`[B] 리스크 캡: ${summaryB.totalTrades} trades, ${summaryB.avgWinRate}% WR, $${summaryB.totalPnl}`);
    this.logger.log(`차이: ${tradeDiff > 0 ? '+' : ''}${tradeDiff} trades, ${winRateDiff > 0 ? '+' : ''}${winRateDiff.toFixed(2)}% WR, ${pnlDiff > 0 ? '+' : ''}$${pnlDiff.toFixed(2)}`);

    return {
      config: {
        symbols: config.symbols.length,
        startDate: config.startDate,
        endDate: config.endDate,
        maxRiskAtr,
      },
      resultA: {
        name: '기존 로직 (enableRiskCap: false)',
        ...summaryA,
        details: resultsA,
      },
      resultB: {
        name: `리스크 캡 (maxRiskAtr: ${maxRiskAtr})`,
        ...summaryB,
        details: resultsB,
      },
      comparison: {
        tradeDiff,
        winRateDiff: Number(winRateDiff.toFixed(2)),
        pnlDiff: Number(pnlDiff.toFixed(2)),
        recommendation: pnlDiff > 0 && winRateDiff >= -1
          ? '✅ 리스크 캡 로직 적용 권장'
          : pnlDiff < -5
            ? '❌ 기존 로직 유지 권장'
            : '⚠️ 추가 분석 필요',
      },
    };
  }

  /**
   * maxAtrMult A/B 테스트
   * OB 크기 필터링 강화 효과 비교 (2.5 vs 2.0)
   */
  async runMaxAtrMultComparison(config: {
    symbols: string[];
    startDate: string;
    endDate: string;
    initialBalance?: number;
    maxAtrMultA?: number;  // 기존값 (예: 2.5)
    maxAtrMultB?: number;  // 테스트값 (예: 2.0)
  }): Promise<any> {
    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`maxAtrMult A/B 테스트 (OB 크기 필터링)`);
    this.logger.log(`심볼: ${config.symbols.length}개, 기간: ${config.startDate} ~ ${config.endDate}`);
    this.logger.log(`${'='.repeat(60)}\n`);

    const initialBalance = config.initialBalance || 10000;
    const maxAtrMultA = config.maxAtrMultA || 2.5;  // 기존 (느슨한 필터)
    const maxAtrMultB = config.maxAtrMultB || 2.0;  // 테스트 (엄격한 필터)

    // 결과 저장
    const resultsA: any[] = [];  // 기존값
    const resultsB: any[] = [];  // 테스트값

    for (const symbol of config.symbols) {
      for (const timeframe of ['5m', '15m']) {
        try {
          // 데이터 다운로드
          const candles = await this.dataDownloader.loadAndMerge(
            symbol,
            timeframe,
            config.startDate,
            config.endDate,
          );

          if (!candles || candles.length < 100) {
            continue;
          }

          const ohlcvCandles: OHLCV[] = candles
            .map((c) => ({
              timestamp: new Date(c.openTime),
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            }))
            .filter((c) => !isNaN(c.timestamp.getTime()));

          const symbolCapital = initialBalance / config.symbols.length / 2;

          // [A] 기존값 (maxAtrMult = 2.5)
          const backtesterA = new SimpleTrueOBBacktest();
          backtesterA.setConfig({ maxAtrMult: maxAtrMultA });
          const resultA = await backtesterA.runBacktest(
            ohlcvCandles,
            symbolCapital,
            false,
            new Date(config.startDate),
            new Date(config.endDate),
            timeframe as '5m' | '15m',
            true,
          );

          if (resultA.totalTrades > 0) {
            resultsA.push({
              symbol,
              timeframe,
              trades: resultA.totalTrades,
              wins: resultA.winningTrades,
              losses: resultA.losingTrades,
              winRate: resultA.winRate,
              pnl: resultA.finalCapital - symbolCapital,
              roi: resultA.totalReturn,
            });
          }

          // [B] 테스트값 (maxAtrMult = 2.0)
          const backtesterB = new SimpleTrueOBBacktest();
          backtesterB.setConfig({ maxAtrMult: maxAtrMultB });
          const resultB = await backtesterB.runBacktest(
            ohlcvCandles,
            symbolCapital,
            false,
            new Date(config.startDate),
            new Date(config.endDate),
            timeframe as '5m' | '15m',
            true,
          );

          if (resultB.totalTrades > 0) {
            resultsB.push({
              symbol,
              timeframe,
              trades: resultB.totalTrades,
              wins: resultB.winningTrades,
              losses: resultB.losingTrades,
              winRate: resultB.winRate,
              pnl: resultB.finalCapital - symbolCapital,
              roi: resultB.totalReturn,
            });
          }

          this.logger.log(`[${symbol}/${timeframe}] A(${maxAtrMultA}): ${resultA.totalTrades} trades, B(${maxAtrMultB}): ${resultB.totalTrades} trades`);

        } catch (error: any) {
          this.logger.warn(`[${symbol}/${timeframe}] Error: ${error.message}`);
        }
      }
    }

    // 집계
    const aggregateResults = (results: any[]) => {
      const totalTrades = results.reduce((sum, r) => sum + r.trades, 0);
      const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
      const totalPnl = results.reduce((sum, r) => sum + r.pnl, 0);
      const avgWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

      return {
        symbolCount: new Set(results.map(r => r.symbol)).size,
        totalTrades,
        totalWins,
        totalLosses: totalTrades - totalWins,
        avgWinRate: Number(avgWinRate.toFixed(2)),
        totalPnl: Number(totalPnl.toFixed(2)),
        avgPnlPerTrade: totalTrades > 0 ? Number((totalPnl / totalTrades).toFixed(4)) : 0,
      };
    };

    const summaryA = aggregateResults(resultsA);
    const summaryB = aggregateResults(resultsB);

    // 차이 계산
    const tradeDiff = summaryB.totalTrades - summaryA.totalTrades;
    const winRateDiff = summaryB.avgWinRate - summaryA.avgWinRate;
    const pnlDiff = summaryB.totalPnl - summaryA.totalPnl;

    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`결과 비교`);
    this.logger.log(`${'='.repeat(60)}`);
    this.logger.log(`[A] maxAtrMult=${maxAtrMultA}: ${summaryA.totalTrades} trades, ${summaryA.avgWinRate}% WR, $${summaryA.totalPnl}`);
    this.logger.log(`[B] maxAtrMult=${maxAtrMultB}: ${summaryB.totalTrades} trades, ${summaryB.avgWinRate}% WR, $${summaryB.totalPnl}`);
    this.logger.log(`차이: ${tradeDiff > 0 ? '+' : ''}${tradeDiff} trades, ${winRateDiff > 0 ? '+' : ''}${winRateDiff.toFixed(2)}% WR, ${pnlDiff > 0 ? '+' : ''}$${pnlDiff.toFixed(2)}`);

    return {
      config: {
        symbols: config.symbols.length,
        startDate: config.startDate,
        endDate: config.endDate,
        maxAtrMultA,
        maxAtrMultB,
      },
      resultA: {
        name: `maxAtrMult = ${maxAtrMultA} (기존)`,
        ...summaryA,
        details: resultsA,
      },
      resultB: {
        name: `maxAtrMult = ${maxAtrMultB} (엄격)`,
        ...summaryB,
        details: resultsB,
      },
      comparison: {
        tradeDiff,
        winRateDiff: Number(winRateDiff.toFixed(2)),
        pnlDiff: Number(pnlDiff.toFixed(2)),
        recommendation: pnlDiff > 0 && winRateDiff >= 0
          ? `✅ maxAtrMult=${maxAtrMultB} 적용 권장`
          : pnlDiff > 0 && winRateDiff >= -2
            ? `⚠️ maxAtrMult=${maxAtrMultB} 고려 가능 (승률 약간 하락, 수익 증가)`
            : `❌ maxAtrMult=${maxAtrMultA} 유지 권장`,
      },
    };
  }
}
