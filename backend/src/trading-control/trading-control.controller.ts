import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { TradingControlService } from './trading-control.service';

@Controller('api/trading')
export class TradingControlController {
  private readonly logger = new Logger(TradingControlController.name);

  constructor(private tradingControlService: TradingControlService) {}

  /**
   * ✅ 현재 매매 상태 조회
   */
  @Get('status')
  getStatus() {
    const state = this.tradingControlService.getState();
    return {
      status: state.status,
      isRunning: this.tradingControlService.isRunning(),
      startedAt: state.startedAt,
      stoppedAt: state.stoppedAt,
      reason: state.reason,
    };
  }

  /**
   * ✅ 실시간 매매 시작
   */
  @Post('start')
  async start() {
    this.logger.log('Received start trading request');
    const result = await this.tradingControlService.start();
    return {
      ...result,
      status: this.tradingControlService.getStatus(),
    };
  }

  /**
   * ✅ 실시간 매매 종료
   */
  @Post('stop')
  async stop(@Body() body?: { reason?: string }) {
    this.logger.log('Received stop trading request');
    const result = await this.tradingControlService.stop(body?.reason);
    return {
      ...result,
      status: this.tradingControlService.getStatus(),
    };
  }

  /**
   * ✅ 매매 상태 토글
   */
  @Post('toggle')
  async toggle() {
    this.logger.log('Received toggle trading request');
    return this.tradingControlService.toggle();
  }
}
