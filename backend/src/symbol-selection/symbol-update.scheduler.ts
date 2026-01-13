import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SymbolSelectionService } from './symbol-selection.service';
import { OkxWebSocketService } from '../okx/okx-websocket.service';

@Injectable()
export class SymbolUpdateScheduler {
  private readonly logger = new Logger(SymbolUpdateScheduler.name);
  private isUpdating = false;

  constructor(
    private symbolSelection: SymbolSelectionService,
    private wsService: OkxWebSocketService,
  ) {}

  /**
   * 매일 00:00 UTC (09:00 KST)에 종목 업데이트
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledUpdate() {
    await this.updateSymbols();
  }

  /**
   * 종목 업데이트 실행
   */
  async updateSymbols() {
    if (this.isUpdating) {
      this.logger.warn('Symbol update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('STARTING DAILY SYMBOL UPDATE');
    this.logger.log('='.repeat(80));

    try {
      const startTime = Date.now();

      // 1. 현재 구독 중인 종목
      const currentSymbols = this.symbolSelection.getSelectedSymbols();
      this.logger.log(`Current symbols: ${currentSymbols.length}`);

      // 2. 새로운 종목 선택 (하이브리드: 코어 5 + 동적 165)
      const newSymbols = await this.symbolSelection.selectHybridSymbols(170);

      // 3. 변경사항 확인
      const added = newSymbols.filter(s => !currentSymbols.includes(s));
      const removed = currentSymbols.filter(s => !newSymbols.includes(s));
      const unchanged = newSymbols.filter(s => currentSymbols.includes(s));

      this.logger.log('\n' + '-'.repeat(80));
      this.logger.log('SYMBOL CHANGES:');
      this.logger.log('-'.repeat(80));
      this.logger.log(`Unchanged: ${unchanged.length}`);
      this.logger.log(`Added: ${added.length}`);
      if (added.length > 0) {
        this.logger.log(`  → ${added.slice(0, 10).join(', ')}${added.length > 10 ? `, ... +${added.length - 10} more` : ''}`);
      }
      this.logger.log(`Removed: ${removed.length}`);
      if (removed.length > 0) {
        this.logger.log(`  → ${removed.slice(0, 10).join(', ')}${removed.length > 10 ? `, ... +${removed.length - 10} more` : ''}`);
      }

      // 4. WebSocket 재구독 (변경이 있을 경우만)
      if (added.length > 0 || removed.length > 0) {
        this.logger.log('\n' + '-'.repeat(80));
        this.logger.log('RESUBSCRIBING WEBSOCKET...');
        this.logger.log('-'.repeat(80));

        await this.wsService.resubscribe(newSymbols);

        this.logger.log(`WebSocket resubscribed to ${newSymbols.length} symbols`);
      } else {
        this.logger.log('\nNo symbol changes detected, skipping WebSocket resubscription');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log('\n' + '='.repeat(80));
      this.logger.log(`SYMBOL UPDATE COMPLETE (took ${duration}s)`);
      this.logger.log('='.repeat(80) + '\n');

    } catch (error) {
      this.logger.error('Symbol update failed:', error);
      this.logger.error('Will retry on next schedule...');
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 수동 업데이트 트리거 (API 호출용)
   */
  async manualUpdate() {
    this.logger.log('Manual symbol update triggered');
    await this.updateSymbols();
  }

  /**
   * 업데이트 상태 확인
   */
  isUpdateInProgress(): boolean {
    return this.isUpdating;
  }
}
