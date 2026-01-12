/**
 * Pine Script True OB Retest 전략을 그대로 구현한 백테스트
 * 트레이딩뷰에서 실제 매매하는 것과 동일하게 동작
 * tb1 프로젝트에서 가져옴
 */

import { ATR, SMA } from 'technicalindicators';
import {
  OHLCV,
  PineConfig,
  OrderBlock,
  LimitOrder,
  Trade,
  RiskManagementState,
  SimpleTrueOBBacktestResult,
} from '../strategies/simple-true-ob.interface';

export class SimpleTrueOBBacktest {
  private config: PineConfig;

  // ✅ 실시간 매매와 동일한 설정값
  private readonly REALISTIC_CONFIG = {
    // MIDPOINT 전략: 지정가 주문만 사용 (가격 위치 무관)

    // 주문 유효시간 (캔들 수 기준) - 실시간과 동일하게 3캔들
    orderValidityBars5m: 3,         // 5분봉: 3캔들 (15분)
    orderValidityBars15m: 3,        // 15분봉: 3캔들 (45분)

    // 슬리피지 (실시간과 동일)
    makerSlippage: 0.0001,          // 메이커: 0.01%
    takerSlippage: 0.0005,          // 테이커: 0.05%

    // SL 본전 이동 (실시간과 동일 - 정확히 Entry로)
    slBreakevenOffset: 0,           // 0 = 정확히 Entry 가격
  };

  // ✅ 통계 수집
  private stats = {
    totalSignals: 0,
    skippedDeviation: 0,
    skippedOBExit: 0,
    skippedTimeout: 0,
    skippedATRCVD: 0,  // v10: ATR+CVD 필터로 스킵된 신호
    filled: 0,
  };

  constructor() {
    // *** 최적화된 설정값 (2026-01-08 Phase 1 + Phase 2) ***
    // 실시간 전략과 100% 동일
    this.config = {
      lookback: 2,
      minBodyRatio: 0.5,        // Phase 1 최적화: 0.65 → 0.5
      minVolume: 2.0,
      maxAtrMult: 2.0,
      useBodyOnly: true,
      minAwayMult: 1.5,         // 기본값 (동적 조정으로 대체됨)
      requireReversal: true,
      sweepWickMin: 0.6,
      sweepPenMin: 0.1,
      sweepPenMax: 1.0,
      orbAtr: 1.0,              // v11 최적화: 1.5 → 1.0 (더 많은 OB 감지)
      orbVol: 1.5,              // v11 최적화: 2.0 → 1.5 (더 많은 OB 감지)
      londonHour: 7,
      nyHour: 14,
      rrRatio: 4.0,             // v4 최적화: 3.0 → 4.0
      obMaxBars: 60,            // 원복: 60봉 유지
      makerFee: 0.0004,         // 0.04%
      takerFee: 0.00075,        // 0.075% - 실시간과 동일
      leverage: 20,             // v11 최적화: 15 → 20
      capitalUsage: 0.1,
      slippage: 0.0002,
      maxHoldingBars: 48,       // v5 최적화: 72 → 48 (4시간)
      preventSameCandleExit: true,
      // v4 최적화: 동적 minAwayMult
      minAwayMultRangebound: 0.2,   // v4 최적화: 0.3 → 0.2 (횡보장)
      minAwayMultNormal: 0.8,       // (동일)
      minAwayMultTrending: 2.0,     // (동일)
      // v11 최적화: TP 설정
      tp1Ratio: 0.8,                // v11 최적화: 1.2 → 0.8 (TP1 = 0.8R)
      tp1Percent: 1.0,              // v4 최적화: 0.9 → 1.0 (100% 청산)
      // OB 교체 설정
      enableOBReplacement: true,    // 기본값: 강한 OB가 나오면 교체
      // 리스크 캡 설정 (v16 테스트)
      enableRiskCap: false,         // 기본값: false (기존 로직)
      maxRiskAtr: 2.0,              // 최대 리스크 = 2 ATR
      // v10: ATR + CVD 방향 필터 (기본 활성화)
      useATRCVDFilter: true,        // 활성화
      atrFilterMin: 0.4,            // v11 최적화: 0.5 → 0.4
      atrFilterMax: 3.0,            // ATR% 최대 3.0%
      cvdLookback: 20,              // CVD 20캔들 기준
    };
  }

  /**
   * ✅ 통계 반환 (신뢰도 분석용)
   */
  getStats() {
    return {
      ...this.stats,
      fillRate: this.stats.totalSignals > 0
        ? (this.stats.filled / this.stats.totalSignals * 100).toFixed(1) + '%'
        : 'N/A',
    };
  }

  /**
   * ✅ config 설정 (비교 테스트용)
   */
  setConfig(newConfig: Partial<PineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * ✅ 통계 초기화
   */
  resetStats() {
    this.stats = {
      totalSignals: 0,
      skippedDeviation: 0,
      skippedOBExit: 0,
      skippedTimeout: 0,
      skippedATRCVD: 0,
      filled: 0,
    };
  }

  /**
   * ✅ 현재 설정 반환
   */
  getConfig(): PineConfig {
    return { ...this.config };
  }

  /**
   * 백테스트 실행 (Pine Script 로직 그대로)
   */
  async runBacktest(
    candles: OHLCV[],
    initialCapital: number,
    debug: boolean = false,
    backtestStartDate?: Date,
    backtestEndDate?: Date,
    timeframe: string = '5m',
    enableRiskManagement: boolean = false,
    riskManagementState?: RiskManagementState
  ): Promise<SimpleTrueOBBacktestResult> {
    const trades: Trade[] = [];
    let capital = initialCapital;

    // 연속 손실 관리 - 이전 상태가 있으면 사용, 없으면 초기화
    let consecutiveLosses = riskManagementState?.consecutiveLosses ?? 0;
    let consecutiveWins = riskManagementState?.consecutiveWins ?? 0;
    let positionSizeMultiplier = riskManagementState?.positionSizeMultiplier ?? 1.0;

    if (debug) {
      console.log('[SimpleTrueOBBacktest] 디버그 모드 활성화');
      console.log(`[SimpleTrueOBBacktest] 캔들 수: ${candles.length}`);
      console.log(`[SimpleTrueOBBacktest] 초기 자본: $${initialCapital}`);
      if (enableRiskManagement) {
        console.log('[SimpleTrueOBBacktest] 리스크 관리 활성화: 연속 손실 관리');
      }
    }

    // ATR 계산
    const atrValues = ATR.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period: 14,
    });

    // 볼륨 평균
    const volumeAvg = SMA.calculate({
      period: 20,
      values: candles.map(c => c.volume),
    });

    const volumeAvg50 = SMA.calculate({
      period: 50,
      values: candles.map(c => c.volume),
    });

    // SMA 50 (1시간봉 기준) = 600개 5분봉 (추세 필터용)
    const sma50_1h = SMA.calculate({
      period: 600,
      values: candles.map(c => c.close),
    });

    // Swing 포인트 계산
    const swingHighs = this.findSwingHighs(candles);
    const swingLows = this.findSwingLows(candles);

    let activeOB: OrderBlock | null = null;
    let limitOrder: LimitOrder | null = null;
    let position: {
      entry: number;
      sl: number;
      tp1: number;
      tp2: number;
      direction: 'LONG' | 'SHORT';
      entryTime: Date;
      method: string;
      entryCapital: number;
      margin: number;
      entryBarIndex: number;
      remainingSize: number;
      partialExitDone: boolean;
    } | null = null;
    let failedOBs: Array<{ price: number; barIndex: number }> = [];

    // ✅ v11: 재진입 쿨다운 (라이브 전략과 동일)
    const REENTRY_COOLDOWN_BARS = 6;  // v11 최적화: 12 → 6 (5분봉 30분, 15분봉 1.5시간)
    let lastExitBarIndex: number = -999;  // 마지막 청산 캔들 인덱스

    // 캔들 순회 (Pine Script처럼)
    for (let i = 100; i < candles.length; i++) {
      const currentCandle = candles[i];
      const atr = atrValues[i - (candles.length - atrValues.length)] || 0;
      const volAvg = volumeAvg[i - (candles.length - volumeAvg.length)] || 0;
      const volAvg50 = volumeAvg50[i - (candles.length - volumeAvg50.length)] || 0;
      const sma = sma50_1h[i - (candles.length - sma50_1h.length)] || currentCandle.close;

      // 오래된 실패한 OB 정리 (50캔들 이상 지난 것)
      failedOBs = failedOBs.filter(failed => i - failed.barIndex < 50);

      // 포지션이 있으면 청산 체크부터
      if (position) {
        const sameCandleExit = this.config.preventSameCandleExit && i === position.entryBarIndex;
        const holdingBars = i - position.entryBarIndex;
        const maxHoldingExceeded = holdingBars >= this.config.maxHoldingBars;

        const exitResult = sameCandleExit ? null : this.checkExit(currentCandle, position);

        // 최대 유지 시간 초과 시 강제 청산
        if (maxHoldingExceeded && !exitResult) {
          const forcedExitResult = {
            price: currentCandle.open,
            pnl: position.direction === 'LONG'
              ? (currentCandle.open - position.entry)
              : (position.entry - currentCandle.open)
          };

          const margin = position.margin;
          const positionSize = (margin * this.config.leverage) / position.entry;
          const positionValue = positionSize * position.entry;
          const priceDiff = position.direction === 'LONG'
            ? (forcedExitResult.price - position.entry)
            : (position.entry - forcedExitResult.price);
          const pnlBeforeFee = positionSize * priceDiff;
          const exitValue = positionSize * forcedExitResult.price;
          const exitFee = exitValue * this.config.takerFee;
          const entryFee = positionValue * this.config.makerFee;
          const actualPnl = pnlBeforeFee - exitFee - entryFee;
          const pnlPercent = (priceDiff / position.entry) * 100;

          const isWithinBacktestPeriod = !backtestStartDate || !backtestEndDate ||
            (position.entryTime.getTime() >= backtestStartDate.getTime() &&
             position.entryTime.getTime() <= backtestEndDate.getTime());

          if (isWithinBacktestPeriod) {
            trades.push({
              entryTime: position.entryTime,
              exitTime: new Date(currentCandle.timestamp),
              direction: position.direction,
              entry: position.entry,
              exit: forcedExitResult.price,
              stopLoss: position.sl,
              takeProfit: position.partialExitDone ? position.tp2 : position.tp1,
              positionSize,
              positionValue,
              margin,
              capital: position.entryCapital,
              entryFee,
              exitFee,
              pnl: actualPnl,
              pnlPercent,
              isWin: actualPnl > 0,
              method: position.method,
            });
          }

          if (actualPnl < 0) {
            failedOBs.push({ price: position.entry, barIndex: i });
          }

          capital += actualPnl;

          // 리스크 관리: 연속 손실/수익 관리
          if (enableRiskManagement && isWithinBacktestPeriod) {
            if (actualPnl > 0) {
              consecutiveWins++;
              consecutiveLosses = 0;
              if (consecutiveWins >= 3) {
                positionSizeMultiplier = 1.0;
              }
            } else {
              consecutiveLosses++;
              consecutiveWins = 0;
              if (consecutiveLosses >= 10 && positionSizeMultiplier > 0.25) {
                positionSizeMultiplier = 0.25;
              } else if (consecutiveLosses >= 5 && positionSizeMultiplier > 0.5) {
                positionSizeMultiplier = 0.5;
              }
            }
          }

          position = null;
          activeOB = null;
          lastExitBarIndex = i;  // ✅ v8: 재진입 쿨다운 시작
        }
        else if (exitResult) {
          const margin = position.margin;
          const fullPositionSize = (margin * this.config.leverage) / position.entry;
          const exitSize = exitResult.exitSize || position.remainingSize;
          const exitPositionSize = fullPositionSize * exitSize;
          const exitPositionValue = exitPositionSize * position.entry;

          const priceDiff = position.direction === 'LONG'
            ? (exitResult.price - position.entry)
            : (position.entry - exitResult.price);
          const pnlBeforeFee = exitPositionSize * priceDiff;
          const exitValue = exitPositionSize * exitResult.price;
          const exitFee = exitValue * this.config.takerFee;
          const totalEntryFee = fullPositionSize * position.entry * this.config.makerFee;
          const entryFee = totalEntryFee * exitSize;
          const actualPnl = pnlBeforeFee - exitFee - entryFee;
          const pnlPercent = (priceDiff / position.entry) * 100;

          const isWithinBacktestPeriod = !backtestStartDate || !backtestEndDate ||
            (position.entryTime.getTime() >= backtestStartDate.getTime() &&
             position.entryTime.getTime() <= backtestEndDate.getTime());

          if (isWithinBacktestPeriod) {
            trades.push({
              entryTime: position.entryTime,
              exitTime: new Date(currentCandle.timestamp),
              direction: position.direction,
              entry: position.entry,
              exit: exitResult.price,
              stopLoss: position.sl,
              takeProfit: exitResult.isPartial ? position.tp1 : position.tp2,
              positionSize: exitPositionSize,
              positionValue: exitPositionValue,
              margin: margin * exitSize,
              capital: position.entryCapital,
              entryFee,
              exitFee,
              pnl: actualPnl,
              pnlPercent,
              isWin: actualPnl > 0,
              method: `${position.method}${exitResult.isPartial ? '-TP1' : position.partialExitDone ? '-TP2' : '-SL'}`,
            });
          }

          capital += actualPnl;

          if (exitResult.isPartial) {
            position.remainingSize = 1 - this.config.tp1Percent;  // 남은 포지션 비율
            position.partialExitDone = true;
            // ✅ SL 본전 이동: 실시간과 동일하게 정확히 Entry 가격으로
            position.sl = position.entry;
          } else {
            if (actualPnl < 0) {
              failedOBs.push({ price: position.entry, barIndex: i });
            }

            if (enableRiskManagement && isWithinBacktestPeriod) {
              if (actualPnl > 0) {
                consecutiveWins++;
                consecutiveLosses = 0;
                if (consecutiveWins >= 3) {
                  positionSizeMultiplier = 1.0;
                }
              } else {
                consecutiveLosses++;
                consecutiveWins = 0;
                if (consecutiveLosses >= 10 && positionSizeMultiplier > 0.25) {
                  positionSizeMultiplier = 0.25;
                } else if (consecutiveLosses >= 5 && positionSizeMultiplier > 0.5) {
                  positionSizeMultiplier = 0.5;
                }
              }
            }

            position = null;
            activeOB = null;
            lastExitBarIndex = i;  // ✅ v8: 재진입 쿨다운 시작
          }
        }
      }

      // 포지션이 없을 때만 OB 감지 및 진입
      if (!position) {
        // ✅ v8: 재진입 쿨다운 체크 (라이브 전략과 동일)
        const barsSinceLastExit = i - lastExitBarIndex;
        if (barsSinceLastExit < REENTRY_COOLDOWN_BARS) {
          continue;  // 쿨다운 중에는 진입 스킵
        }
        if (activeOB) {
          activeOB.age = i - activeOB.barIndex;

          if (activeOB.age > this.config.obMaxBars) {
            activeOB = null;
          }
          else if (activeOB.type === 'LONG' && currentCandle.low < activeOB.bottom) {
            activeOB = null;
          }
          else if (activeOB.type === 'SHORT' && currentCandle.high > activeOB.top) {
            activeOB = null;
          }
        }

        // OB 감지 (ORB만 활성화) - 개선: 더 강한 OB가 나오면 교체
        const newOB = this.detectORB(candles, i, atr, volAvg50);

        if (newOB) {
          // 기존 OB가 없거나, 새 OB가 더 강하면 교체
          let shouldReplace = !activeOB;

          // enableOBReplacement가 true일 때만 강한 OB 교체 로직 실행
          if (activeOB && !shouldReplace && this.config.enableOBReplacement) {
            // 새 OB의 강도 비교 (볼륨 비율 기준)
            const oldOBCandle = candles[activeOB.barIndex];
            const newOBCandle = candles[newOB.barIndex];
            const oldVolRatio = oldOBCandle ? oldOBCandle.volume / volAvg50 : 0;
            const newVolRatio = newOBCandle.volume / volAvg50;

            // 새 OB의 볼륨이 기존 OB보다 1.5배 이상 크면 교체
            if (newVolRatio > oldVolRatio * 1.5) {
              shouldReplace = true;
            }
          }

          if (shouldReplace) {
            activeOB = newOB;
          }
        }

        // OB 필터 적용
        if (activeOB && activeOB.barIndex === i) {  // 새로 감지된 OB만 필터 적용
          const obSize = activeOB.top - activeOB.bottom;
          const obMidpoint = (activeOB.top + activeOB.bottom) / 2;
          let shouldReject = false;
          let rejectReason = '';

          // 필터 1: OB 크기 (ATR의 50% 이상)
          if (obSize < atr * 0.5) {
            shouldReject = true;
            rejectReason = 'OB too small';
          }

          // 필터 2: 추세 필터 (SMA 200)
          if (!shouldReject) {
            const distanceFromSMA = Math.abs(currentCandle.close - sma) / sma;
            const minDistanceFromSMA = 0.02;

            const smaIndex = i - (candles.length - sma50_1h.length);
            let marketRegime = 'SIDEWAYS';

            if (smaIndex >= 20) {
              const sma20BarsAgo = sma50_1h[smaIndex - 20];
              const smaSlope = (sma - sma20BarsAgo) / sma20BarsAgo;

              if (smaSlope > 0.02) {
                marketRegime = 'UPTREND';
              } else if (smaSlope < -0.02) {
                marketRegime = 'DOWNTREND';
              }
            }

            if (activeOB.type === 'LONG') {
              if (currentCandle.close < sma) {
                shouldReject = true;
                rejectReason = 'LONG: price below SMA 50 (1h)';
              }
              else if (distanceFromSMA < minDistanceFromSMA) {
                shouldReject = true;
                rejectReason = 'LONG: too close to SMA 50 (1h)';
              }
              else if (marketRegime === 'DOWNTREND') {
                shouldReject = true;
                rejectReason = 'LONG: market in DOWNTREND';
              }
              else {
                let barsAboveSMA = 0;
                for (let j = i; j >= Math.max(0, i - 20); j--) {
                  const candleClose = candles[j].close;
                  const smaValue = sma50_1h[j - (candles.length - sma50_1h.length)];

                  if (candleClose > smaValue) {
                    barsAboveSMA++;
                  } else {
                    break;
                  }
                }

                if (barsAboveSMA < 10) {
                  shouldReject = true;
                  rejectReason = `LONG: only ${barsAboveSMA} bars above SMA (need 10+)`;
                }
              }
            } else if (activeOB.type === 'SHORT') {
              if (currentCandle.close > sma) {
                shouldReject = true;
                rejectReason = 'SHORT: price above SMA 50 (1h)';
              }
              else if (distanceFromSMA < minDistanceFromSMA) {
                shouldReject = true;
                rejectReason = 'SHORT: too close to SMA 50 (1h)';
              }
              else if (marketRegime === 'UPTREND') {
                shouldReject = true;
                rejectReason = 'SHORT: market in UPTREND';
              }
              else {
                // ✅ barsBelowSMA 체크 (라이브 전략과 동일하게 추가)
                let barsBelowSMA = 0;
                for (let j = i; j >= Math.max(0, i - 20); j--) {
                  const candleClose = candles[j].close;
                  const smaValue = sma50_1h[j - (candles.length - sma50_1h.length)];

                  if (candleClose < smaValue) {
                    barsBelowSMA++;
                  } else {
                    break;
                  }
                }

                if (barsBelowSMA < 10) {
                  shouldReject = true;
                  rejectReason = `SHORT: only ${barsBelowSMA} bars below SMA (need 10+)`;
                }
              }
            }
          }

          // 필터 3: 실패한 OB 재진입 방지
          if (!shouldReject) {
            const recentFailedOB = failedOBs.find(
              failed => Math.abs(failed.price - obMidpoint) < obSize * 0.5 && i - failed.barIndex < 20
            );
            if (recentFailedOB) {
              shouldReject = true;
              rejectReason = `Failed OB retry (${i - recentFailedOB.barIndex} bars ago)`;
            }
          }

          if (shouldReject) {
            activeOB = null;
          } else {
            // 가격이 OB에서 충분히 떨어져 나갔는지 체크
            if (!activeOB.pricedMovedAway) {
              const obMid = activeOB.top / 2 + activeOB.bottom / 2;

              // Phase 2 최적화: 동적 minAwayMult (config 값 사용)
              const atrPercent = (atr / currentCandle.close) * 100;
              let adjustedMinAwayMult = this.config.minAwayMult;

              if (atrPercent < 1.0) {
                adjustedMinAwayMult = this.config.minAwayMultRangebound;  // 0.3
              } else if (atrPercent >= 1.0 && atrPercent <= 2.0) {
                adjustedMinAwayMult = this.config.minAwayMultNormal;      // 0.8
              } else if (atrPercent > 2.0) {
                adjustedMinAwayMult = this.config.minAwayMultTrending;    // 2.0
              }

              const minDist = obSize * adjustedMinAwayMult;
              let movedAway = false;

              if (activeOB.type === 'LONG') {
                movedAway = currentCandle.close > obMid + minDist;
              } else {
                movedAway = currentCandle.close < obMid - minDist;
              }

              if (movedAway) {
                activeOB.pricedMovedAway = true;
              }
            }

            // 가격이 충분히 이탈한 후에만 Limit Order 생성
            if (activeOB.pricedMovedAway && !limitOrder) {
              const obMid = (activeOB.top + activeOB.bottom) / 2;
              const currentPrice = currentCandle.close;

              // ✅ 지정가 주문 생성 (현재 가격 위치와 무관하게)
              // - LONG: midpoint에 매수 지정가 → 가격이 내려오면 체결
              // - SHORT: midpoint에 매도 지정가 → 가격이 올라오면 체결
              // - 체결 안 되면 타임아웃으로 자동 취소
              limitOrder = {
                type: activeOB.type,
                limitPrice: obMid,
                ob: activeOB,
                createdBarIndex: i,
              };
            }
          }
        }

        // ✅ 실시간과 동일한 리밋 오더 체결 시뮬레이션
        if (limitOrder && !position) {
          const limitPrice = limitOrder.limitPrice;
          const obTop = limitOrder.ob.top;
          const obBottom = limitOrder.ob.bottom;
          const obMid = (obTop + obBottom) / 2;
          const orderAge = i - limitOrder.createdBarIndex;
          const currentPrice = currentCandle.close;

          // 1️⃣ OB 영역 이탈 체크 (실시간과 동일)
          // 편차 체크는 주문 생성 시점에만 수행 (위에서 처리됨)
          const buffer = (obTop - obBottom) * 0.5; // 50% 버퍼
          const isOutOfOBZone = limitOrder.type === 'LONG'
            ? currentCandle.close < obBottom - buffer
            : currentCandle.close > obTop + buffer;

          if (isOutOfOBZone && orderAge > 0) {
            // OB 영역을 벗어남 → 주문 취소
            this.stats.totalSignals++;
            this.stats.skippedOBExit++;
            failedOBs.push({
              price: limitOrder.limitPrice,
              barIndex: limitOrder.createdBarIndex,
            });
            limitOrder = null;
            activeOB = null;
            continue;
          }

          // 3️⃣ 가격이 리밋가에 도달했는지 먼저 확인 (타임아웃 전에 체결 기회 제공)
          const priceHitLimit = currentCandle.low <= limitPrice && limitPrice <= currentCandle.high;

          // 4️⃣ 주문 유효시간 체크 - 가격 미도달 시에만 타임아웃 적용
          const maxOrderAge = timeframe === '15m'
            ? this.REALISTIC_CONFIG.orderValidityBars15m
            : this.REALISTIC_CONFIG.orderValidityBars5m;

          // 가격이 도달하지 않았고 유효시간 초과 시 타임아웃
          if (!priceHitLimit && orderAge >= maxOrderAge) {
            // 유효시간 초과 → 주문 타임아웃
            this.stats.totalSignals++;
            this.stats.skippedTimeout++;
            limitOrder = null;
            activeOB = null;
            continue;
          }

          if (priceHitLimit) {
            // 5️⃣ Reversal 체크 (실시간과 동일)
            if (this.config.requireReversal) {
              if (limitOrder.type === 'LONG') {
                // LONG: 양봉이어야 함
                if (currentCandle.close <= currentCandle.open) {
                  continue; // 양봉이 아니면 이번 캔들에서는 진입 스킵 (다음 캔들에서 재시도)
                }
              } else {
                // SHORT: 음봉이어야 함
                if (currentCandle.close >= currentCandle.open) {
                  continue; // 음봉이 아니면 이번 캔들에서는 진입 스킵
                }
              }
            }

            // 6️⃣ v10: ATR + CVD 필터 체크 (진입 직전)
            if (this.config.useATRCVDFilter) {
              const filterPassed = this.checkATRCVDFilter(candles, limitOrder.type, i);
              if (!filterPassed) {
                this.stats.skippedATRCVD++;
                continue; // 필터 실패 → 다음 캔들에서 재시도
              }
            }

            // 7️⃣ 진입 가격 결정 (MIDPOINT 전략: OB 중간가 + maker 슬리피지)
            const slippageFactor = limitOrder.type === 'LONG'
              ? (1 + this.REALISTIC_CONFIG.makerSlippage)
              : (1 - this.REALISTIC_CONFIG.makerSlippage);
            const entry = limitPrice * slippageFactor;

            // ✅ 체결 성공 기록
            this.stats.totalSignals++;
            this.stats.filled++;
            const entryBarIndex = i;
            const entryTime = new Date(currentCandle.timestamp);

            let sl: number;
            let tp1: number;
            let tp2: number;
            let riskWasCapped = false;

            const slBuffer = 0.005;  // v11 최적화: 0.01 → 0.005 (1.0% → 0.5%)

            if (limitOrder.type === 'LONG') {
              const obBasedSL = limitOrder.ob.bottom * (1 - slBuffer);
              let risk = entry - obBasedSL;

              // ✅ 리스크 캡 적용 (v16 테스트)
              if (this.config.enableRiskCap) {
                const maxRisk = atr * this.config.maxRiskAtr;
                if (risk > maxRisk) {
                  risk = maxRisk;
                  sl = entry - maxRisk;
                  riskWasCapped = true;
                } else {
                  sl = obBasedSL;
                }
              } else {
                sl = obBasedSL;
              }

              tp1 = entry + (risk * this.config.tp1Ratio);  // Phase 2 최적화
              tp2 = entry + (risk * this.config.rrRatio);  // Phase 1 optimized: 2.5 → 3.0
            } else {
              const obBasedSL = limitOrder.ob.top * (1 + slBuffer);
              let risk = obBasedSL - entry;

              // ✅ 리스크 캡 적용 (v16 테스트)
              if (this.config.enableRiskCap) {
                const maxRisk = atr * this.config.maxRiskAtr;
                if (risk > maxRisk) {
                  risk = maxRisk;
                  sl = entry + maxRisk;
                  riskWasCapped = true;
                } else {
                  sl = obBasedSL;
                }
              } else {
                sl = obBasedSL;
              }

              tp1 = entry - (risk * this.config.tp1Ratio);  // Phase 2 최적화
              tp2 = entry - (risk * this.config.rrRatio);  // Phase 1 optimized: 2.5 → 3.0
            }

            const capitalUsage = this.config.capitalUsage;
            let margin: number;
            const leverage = this.config.leverage;  // v5 최적화: 하드코딩 제거

            if (capital < 1000) {
              margin = 15;
            } else {
              margin = capital * capitalUsage;
              if (margin < 15) {
                margin = 15;
              }
            }

            if (enableRiskManagement) {
              margin = margin * positionSizeMultiplier;
              if (margin < 15) {
                margin = 15;
              }
            }

            const positionValue = margin * leverage;
            const positionSize = positionValue / entry;

            position = {
              entry,
              sl,
              tp1,
              tp2,
              direction: limitOrder.type,
              entryTime: entryTime!,
              method: limitOrder.ob.method,
              entryCapital: capital,
              margin,
              entryBarIndex: entryBarIndex,
              remainingSize: 1.0,
              partialExitDone: false,
            };

            limitOrder = null;
            activeOB = null;
          }
          // else: 가격이 리밋에 도달하지 않음 → 다음 캔들에서 재시도
          // (타임아웃 체크는 위에서 이미 처리됨)
        }
      }
    }

    // 결과 계산
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.isWin).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalReturn = ((capital - initialCapital) / initialCapital) * 100;

    return {
      trades,
      initialCapital,
      finalCapital: capital,
      totalReturn,
      winRate,
      totalTrades,
      winningTrades,
      losingTrades,
      riskManagementState: {
        consecutiveLosses,
        consecutiveWins,
        positionSizeMultiplier,
      },
    };
  }

  private findSwingHighs(candles: OHLCV[]): Map<number, number> {
    const swingHighs = new Map<number, number>();
    const lookback = this.config.lookback;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const high = candles[i].high;
      let isSwingHigh = true;

      for (let j = 1; j <= lookback; j++) {
        if (candles[i - j].high >= high || candles[i + j].high >= high) {
          isSwingHigh = false;
          break;
        }
      }

      if (isSwingHigh) {
        swingHighs.set(i, high);
      }
    }

    return swingHighs;
  }

  private findSwingLows(candles: OHLCV[]): Map<number, number> {
    const swingLows = new Map<number, number>();
    const lookback = this.config.lookback;

    for (let i = lookback; i < candles.length - lookback; i++) {
      const low = candles[i].low;
      let isSwingLow = true;

      for (let j = 1; j <= lookback; j++) {
        if (candles[i - j].low <= low || candles[i + j].low <= low) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        swingLows.set(i, low);
      }
    }

    return swingLows;
  }

  private detectORB(
    candles: OHLCV[],
    index: number,
    atr: number,
    volAvg50: number
  ): OrderBlock | null {
    if (index < 1) return null;
    const currentCandle = candles[index];

    const candleRange = currentCandle.high - currentCandle.low;
    const body = Math.abs(currentCandle.close - currentCandle.open);
    const bodyRatio = candleRange > 0 ? body / candleRange : 0;
    const volRatio = volAvg50 > 0 ? currentCandle.volume / volAvg50 : 1;

    // Bullish ORB
    if (
      currentCandle.close > currentCandle.open &&
      candleRange > atr * this.config.orbAtr &&
      volRatio > this.config.orbVol &&
      bodyRatio > this.config.minBodyRatio  // Phase 1 최적화: 0.65 → config 사용
    ) {
      return {
        top: this.config.useBodyOnly ? currentCandle.close : currentCandle.high,
        bottom: this.config.useBodyOnly ? currentCandle.open : currentCandle.low,
        type: 'LONG',
        method: 'ORB',
        barIndex: index,
        age: 0,
        pricedMovedAway: false,
      };
    }

    // Bearish ORB
    if (
      currentCandle.close < currentCandle.open &&
      candleRange > atr * this.config.orbAtr &&
      volRatio > this.config.orbVol &&
      bodyRatio > this.config.minBodyRatio  // Phase 1 최적화: 0.65 → config 사용
    ) {
      return {
        top: this.config.useBodyOnly ? currentCandle.open : currentCandle.high,
        bottom: this.config.useBodyOnly ? currentCandle.close : currentCandle.low,
        type: 'SHORT',
        method: 'ORB',
        barIndex: index,
        age: 0,
        pricedMovedAway: false,
      };
    }

    return null;
  }

  /**
   * v10: ATR 변동성 필터 - 적정 변동성 범위 확인 (0.5% ~ 3.0%)
   */
  private checkATRVolatilityFilter(candles: OHLCV[], currentIndex: number): boolean {
    if (currentIndex < 100) return true;  // 데이터 부족시 통과

    const slice = candles.slice(Math.max(0, currentIndex - 100), currentIndex + 1);

    // ATR 계산
    const atrValues = ATR.calculate({
      high: slice.map(c => c.high),
      low: slice.map(c => c.low),
      close: slice.map(c => c.close),
      period: 14,
    });

    if (atrValues.length === 0) return true;

    const currentATR = atrValues[atrValues.length - 1];
    const currentPrice = slice[slice.length - 1].close;
    const atrPercent = (currentATR / currentPrice) * 100;

    const minATR = this.config.atrFilterMin ?? 0.5;
    const maxATR = this.config.atrFilterMax ?? 3.0;

    // 적정 변동성 범위
    return atrPercent >= minATR && atrPercent <= maxATR;
  }

  /**
   * v10: CVD (Cumulative Volume Delta) 필터 - 매수/매도 압력 분석
   */
  private checkCVDFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', currentIndex: number): boolean {
    if (currentIndex < 50) return true;  // 데이터 부족시 통과

    const lookback = this.config.cvdLookback ?? 20;
    const slice = candles.slice(Math.max(0, currentIndex - lookback), currentIndex + 1);

    if (slice.length < lookback) return true;

    // Delta 계산 (캔들 기반 근사치)
    const deltas: number[] = [];

    for (const candle of slice) {
      const range = candle.high - candle.low;
      if (range === 0) {
        deltas.push(0);
        continue;
      }

      const buyRatio = (candle.close - candle.low) / range;
      const sellRatio = (candle.high - candle.close) / range;
      const delta = candle.volume * (buyRatio - sellRatio);
      deltas.push(delta);
    }

    // CVD 계산 (누적 델타)
    let cvd = 0;
    const cvdValues: number[] = [];
    for (const delta of deltas) {
      cvd += delta;
      cvdValues.push(cvd);
    }

    // CVD 추세 판단 (최근 10개 캔들)
    const recentCVD = cvdValues.slice(-10);
    const cvdStart = recentCVD[0];
    const cvdEnd = recentCVD[recentCVD.length - 1];
    const cvdTrend = cvdEnd - cvdStart;

    // LONG: CVD 상승 (매수 압력 증가)
    // SHORT: CVD 하락 (매도 압력 증가)
    if (obType === 'LONG') {
      return cvdTrend > 0;
    } else {
      return cvdTrend < 0;
    }
  }

  /**
   * v10: ATR + CVD 조합 필터
   */
  private checkATRCVDFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', currentIndex: number): boolean {
    const atrPassed = this.checkATRVolatilityFilter(candles, currentIndex);
    const cvdPassed = this.checkCVDFilter(candles, obType, currentIndex);
    return atrPassed && cvdPassed;
  }

  private checkExit(
    candle: OHLCV,
    position: { entry: number; sl: number; tp1: number; tp2: number; direction: 'LONG' | 'SHORT'; remainingSize: number; partialExitDone: boolean }
  ): { price: number; pnl: number; isPartial?: boolean; exitSize?: number } | null {
    if (position.direction === 'LONG') {
      // TP1 체크 - Phase 2 최적화
      if (!position.partialExitDone && candle.high >= position.tp1) {
        return {
          price: position.tp1,
          pnl: position.tp1 - position.entry,
          isPartial: true,
          exitSize: this.config.tp1Percent,  // Phase 2 최적화: config에서 읽음
        };
      }

      // TP2 체크 (10% 청산) - TP1 이후 남은 포지션
      const tp2Hit = candle.high >= position.tp2;
      const slHit = candle.low <= position.sl;

      if (tp2Hit && slHit) {
        const distToTP = Math.abs(candle.open - position.tp2);
        const distToSL = Math.abs(candle.open - position.sl);

        if (distToSL < distToTP) {
          return { price: position.sl, pnl: position.sl - position.entry };
        } else {
          return { price: position.tp2, pnl: position.tp2 - position.entry };
        }
      }

      if (tp2Hit) {
        return { price: position.tp2, pnl: position.tp2 - position.entry };
      }
      if (slHit) {
        return { price: position.sl, pnl: position.sl - position.entry };
      }
    } else {
      // SHORT
      // TP1 체크 - Phase 2 최적화
      if (!position.partialExitDone && candle.low <= position.tp1) {
        return {
          price: position.tp1,
          pnl: position.entry - position.tp1,
          isPartial: true,
          exitSize: this.config.tp1Percent,  // Phase 2 최적화: config에서 읽음
        };
      }

      const tp2Hit = candle.low <= position.tp2;
      const slHit = candle.high >= position.sl;

      if (tp2Hit && slHit) {
        const distToTP = Math.abs(candle.open - position.tp2);
        const distToSL = Math.abs(candle.open - position.sl);

        if (distToSL < distToTP) {
          return { price: position.sl, pnl: position.entry - position.sl };
        } else {
          return { price: position.tp2, pnl: position.entry - position.tp2 };
        }
      }

      if (tp2Hit) {
        return { price: position.tp2, pnl: position.entry - position.tp2 };
      }
      if (slHit) {
        return { price: position.sl, pnl: position.entry - position.sl };
      }
    }

    return null;
  }
}
