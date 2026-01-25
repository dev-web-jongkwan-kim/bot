/**
 * BTC Safety Guard Service - v12
 *
 * 비트코인 변동성을 실시간 모니터링하여 알트코인 리버스 진입을 제어
 *
 * 차단 조건:
 * 1. BTC가 1분 내에 0.5% 이상 급등락
 * 2. BTC의 ADX가 40 이상 (강한 원웨이 추세)
 *
 * 차단 시 1분간 리버스 진입 일시 중단
 */

import { Injectable, Logger } from '@nestjs/common';
import { ADX } from 'technicalindicators';

interface BtcCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class BtcSafetyGuardService {
  private readonly logger = new Logger(BtcSafetyGuardService.name);

  // BTC 1분봉 버퍼 (ADX 계산용, 최근 50개)
  private btc1mCandles: BtcCandle[] = [];

  // 가드 상태
  private guardActiveUntil: number = 0;  // 가드 활성화 종료 시간 (timestamp)
  private lastGuardReason: string = '';

  // 설정값
  private readonly VOLATILITY_THRESHOLD = 0.005;  // 0.5%
  private readonly ADX_THRESHOLD = 40;
  private readonly GUARD_DURATION_MS = 60 * 1000;  // 1분

  constructor() {
    this.logger.log('BTC Safety Guard Service initialized');
  }

  /**
   * BTC 1분봉 데이터 추가
   * OkxWebSocketService에서 호출
   */
  addBtcCandle(candle: BtcCandle): void {
    this.btc1mCandles.push(candle);

    // 최대 50개 유지
    if (this.btc1mCandles.length > 50) {
      this.btc1mCandles.shift();
    }

    // 변동성 체크
    this.checkVolatility();
  }

  /**
   * BTC 변동성 체크 및 가드 활성화
   */
  private checkVolatility(): void {
    if (this.btc1mCandles.length < 2) return;

    const latest = this.btc1mCandles[this.btc1mCandles.length - 1];
    const prev = this.btc1mCandles[this.btc1mCandles.length - 2];

    // 1. 1분 내 변동성 체크
    const volatility = Math.abs(latest.close - prev.close) / prev.close;
    if (volatility >= this.VOLATILITY_THRESHOLD) {
      this.activateGuard(`BTC 1min volatility ${(volatility * 100).toFixed(2)}% >= ${this.VOLATILITY_THRESHOLD * 100}%`);
      return;
    }

    // 2. ADX 체크 (최소 20개 캔들 필요)
    if (this.btc1mCandles.length >= 20) {
      const adx = this.calculateADX();
      if (adx >= this.ADX_THRESHOLD) {
        this.activateGuard(`BTC ADX ${adx.toFixed(1)} >= ${this.ADX_THRESHOLD}`);
        return;
      }
    }
  }

  /**
   * ADX 계산
   */
  private calculateADX(): number {
    if (this.btc1mCandles.length < 20) return 0;

    const adxResult = ADX.calculate({
      high: this.btc1mCandles.map(c => c.high),
      low: this.btc1mCandles.map(c => c.low),
      close: this.btc1mCandles.map(c => c.close),
      period: 14,
    });

    if (adxResult.length === 0) return 0;
    return adxResult[adxResult.length - 1].adx;
  }

  /**
   * 가드 활성화
   */
  private activateGuard(reason: string): void {
    const now = Date.now();

    // 이미 활성화 중이면 연장만
    if (this.guardActiveUntil > now) {
      this.guardActiveUntil = now + this.GUARD_DURATION_MS;
      return;
    }

    this.guardActiveUntil = now + this.GUARD_DURATION_MS;
    this.lastGuardReason = reason;

    this.logger.warn(
      `\n🛡️ [BTC SAFETY GUARD] ACTIVATED\n` +
      `  Reason: ${reason}\n` +
      `  Duration: ${this.GUARD_DURATION_MS / 1000}s\n` +
      `  → All altcoin REVERSE entries paused`
    );
  }

  /**
   * 리버스 진입 허용 여부 확인
   * @returns { allowed: boolean, reason?: string }
   */
  isReverseAllowed(): { allowed: boolean; reason?: string } {
    const now = Date.now();

    if (this.guardActiveUntil > now) {
      const remainingMs = this.guardActiveUntil - now;
      return {
        allowed: false,
        reason: `BTC Safety Guard active (${Math.ceil(remainingMs / 1000)}s remaining) - ${this.lastGuardReason}`,
      };
    }

    return { allowed: true };
  }

  /**
   * 현재 상태 조회
   */
  getStatus(): {
    isGuardActive: boolean;
    remainingSeconds: number;
    lastReason: string;
    btcCandleCount: number;
    latestBtcPrice?: number;
  } {
    const now = Date.now();
    const isActive = this.guardActiveUntil > now;

    return {
      isGuardActive: isActive,
      remainingSeconds: isActive ? Math.ceil((this.guardActiveUntil - now) / 1000) : 0,
      lastReason: this.lastGuardReason,
      btcCandleCount: this.btc1mCandles.length,
      latestBtcPrice: this.btc1mCandles.length > 0
        ? this.btc1mCandles[this.btc1mCandles.length - 1].close
        : undefined,
    };
  }

  /**
   * 수동 가드 해제 (테스트용)
   */
  deactivateGuard(): void {
    this.guardActiveUntil = 0;
    this.logger.log('[BTC SAFETY GUARD] Manually deactivated');
  }

  /**
   * 초기화
   */
  reset(): void {
    this.btc1mCandles = [];
    this.guardActiveUntil = 0;
    this.lastGuardReason = '';
  }
}
