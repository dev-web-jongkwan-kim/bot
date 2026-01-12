import { Injectable, Logger } from '@nestjs/common';

export type TradingStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING';

export interface TradingState {
  status: TradingStatus;
  startedAt: Date | null;
  stoppedAt: Date | null;
  reason?: string;
}

/**
 * TradingControlService - 실시간 매매 시작/종료 제어
 *
 * 역할:
 * 1. 매매 상태 관리 (STOPPED, STARTING, RUNNING, STOPPING)
 * 2. 시작/종료 명령 처리
 * 3. 다른 서비스들이 상태 확인 가능하도록 제공
 */
@Injectable()
export class TradingControlService {
  private readonly logger = new Logger(TradingControlService.name);

  private state: TradingState = {
    status: 'STOPPED',
    startedAt: null,
    stoppedAt: null,
  };

  /**
   * ✅ 현재 매매 상태 반환
   */
  getStatus(): TradingStatus {
    return this.state.status;
  }

  /**
   * ✅ 전체 상태 정보 반환
   */
  getState(): TradingState {
    return { ...this.state };
  }

  /**
   * ✅ 매매가 활성화되어 있는지 확인
   */
  isRunning(): boolean {
    return this.state.status === 'RUNNING';
  }

  /**
   * ✅ 매매가 중지되어 있는지 확인
   */
  isStopped(): boolean {
    return this.state.status === 'STOPPED';
  }

  /**
   * ✅ 실시간 매매 시작
   */
  async start(): Promise<{ success: boolean; message: string }> {
    if (this.state.status === 'RUNNING') {
      return { success: false, message: 'Trading is already running' };
    }

    if (this.state.status === 'STARTING') {
      return { success: false, message: 'Trading is already starting' };
    }

    this.logger.log('🚀 Starting live trading...');
    this.state.status = 'STARTING';

    try {
      // 시작 완료
      this.state.status = 'RUNNING';
      this.state.startedAt = new Date();
      this.state.stoppedAt = null;
      this.state.reason = undefined;

      this.logger.log('✅ Live trading STARTED');
      return { success: true, message: 'Trading started successfully' };

    } catch (error: any) {
      this.logger.error(`Failed to start trading: ${error.message}`);
      this.state.status = 'STOPPED';
      this.state.reason = error.message;
      return { success: false, message: `Failed to start: ${error.message}` };
    }
  }

  /**
   * ✅ 실시간 매매 종료
   */
  async stop(reason?: string): Promise<{ success: boolean; message: string }> {
    if (this.state.status === 'STOPPED') {
      return { success: false, message: 'Trading is already stopped' };
    }

    if (this.state.status === 'STOPPING') {
      return { success: false, message: 'Trading is already stopping' };
    }

    this.logger.log('🛑 Stopping live trading...');
    this.state.status = 'STOPPING';

    try {
      // 종료 완료
      this.state.status = 'STOPPED';
      this.state.stoppedAt = new Date();
      this.state.reason = reason || 'Manual stop';

      this.logger.log('✅ Live trading STOPPED');
      return { success: true, message: 'Trading stopped successfully' };

    } catch (error: any) {
      this.logger.error(`Failed to stop trading: ${error.message}`);
      this.state.status = 'RUNNING';  // 실패 시 원상복구
      return { success: false, message: `Failed to stop: ${error.message}` };
    }
  }

  /**
   * ✅ 매매 상태 토글
   */
  async toggle(): Promise<{ success: boolean; message: string; status: TradingStatus }> {
    if (this.state.status === 'RUNNING') {
      const result = await this.stop();
      return { ...result, status: this.state.status };
    } else if (this.state.status === 'STOPPED') {
      const result = await this.start();
      return { ...result, status: this.state.status };
    } else {
      return {
        success: false,
        message: `Cannot toggle while status is ${this.state.status}`,
        status: this.state.status,
      };
    }
  }
}
