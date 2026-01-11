import { Injectable } from '@nestjs/common';
import { BacktestResults } from './interfaces/backtest.interface';

@Injectable()
export class PerformanceAnalyzerService {
  calculateMetrics(results: BacktestResults): any {
    const wins = results.tradesLog.filter((t) => t.pnl > 0);
    const losses = results.tradesLog.filter((t) => t.pnl < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (wins.reduce((sum, t) => sum + t.pnl, 0) / Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))) : 0;

    const returns = results.equityCurve.map((eq) => (eq.equity - results.initialBalance) / results.initialBalance);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdReturn = this.calculateStdDev(returns);
    const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(365) : 0;

    const drawdowns = this.calculateDrawdowns(results.equityCurve);
    const maxDrawdown = drawdowns.length > 0 ? Math.min(...drawdowns) : 0;

    return {
      basic: {
        totalTrades: results.totalTrades,
        wins: results.wins,
        losses: results.losses,
        winRate: results.winRate,
        avgWin,
        avgLoss,
        profitFactor: profitFactor || 0,
        largestWin: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0,
        largestLoss: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0,
      },
      risk: {
        sharpeRatio: sharpe,
        maxDrawdownPercent: maxDrawdown,
        volatilityAnnual: stdReturn * Math.sqrt(365) * 100,
      },
    };
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateDrawdowns(equityCurve: Array<{ timestamp: Date; balance: number; equity: number }>): number[] {
    if (equityCurve.length === 0) return [];
    const equityValues = equityCurve.map((eq) => eq.equity);
    const runningMax = equityValues.map((_, i) => Math.max(...equityValues.slice(0, i + 1)));
    return equityValues.map((eq, i) => ((eq - runningMax[i]) / runningMax[i]) * 100);
  }
}
