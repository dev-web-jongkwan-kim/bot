import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BacktestResults } from './interfaces/backtest.interface';

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);
  private readonly reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'backtest_reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generateReport(results: BacktestResults, metrics: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backtest_report_${timestamp}.txt`;
    const filepath = path.join(this.reportsDir, filename);

    const report = this.formatReport(results, metrics);
    fs.writeFileSync(filepath, report);

    this.logger.log(`Report saved to ${filepath}`);
    return filepath;
  }

  private formatReport(results: BacktestResults, metrics: any): string {
    let report = '='.repeat(80) + '\n';
    report += 'BACKTEST PERFORMANCE REPORT\n';
    report += '='.repeat(80) + '\n\n';

    report += 'BASIC METRICS\n';
    report += '-'.repeat(80) + '\n';
    report += `Initial Balance:    $${results.initialBalance.toLocaleString()}\n`;
    report += `Final Balance:      $${results.finalBalance.toLocaleString()}\n`;
    report += `Total PnL:          $${results.totalPnl.toFixed(2)}\n`;
    report += `ROI:                ${results.roi >= 0 ? '+' : ''}${results.roi.toFixed(2)}%\n`;
    report += `Total Trades:       ${results.totalTrades}\n`;
    report += `Wins:               ${results.wins} (${results.winRate.toFixed(1)}%)\n`;
    report += `Losses:             ${results.losses}\n`;

    if (metrics?.basic) {
      report += `Avg Win:            $${metrics.basic.avgWin.toFixed(2)}\n`;
      report += `Avg Loss:          $${metrics.basic.avgLoss.toFixed(2)}\n`;
      report += `Profit Factor:      ${metrics.basic.profitFactor.toFixed(2)}\n`;
    }

    report += '\nRISK METRICS\n';
    report += '-'.repeat(80) + '\n';
    if (metrics?.risk) {
      report += `Sharpe Ratio:       ${metrics.risk.sharpeRatio.toFixed(2)}\n`;
      report += `Max Drawdown:       ${metrics.risk.maxDrawdownPercent.toFixed(2)}%\n`;
      report += `Volatility (Annual): ${metrics.risk.volatilityAnnual.toFixed(2)}%\n`;
    }

    report += '\n' + '='.repeat(80) + '\n';

    return report;
  }
}
