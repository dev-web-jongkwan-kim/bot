/**
 * 방향 확인 필터 검증 백테스트
 *
 * 테스트 필터:
 * 1. MTF (Multi-Timeframe) - 1시간봉 추세 확인
 * 2. VWAP Premium/Discount - 가격 위치 확인
 * 3. ATR Volatility Filter - 변동성 범위 확인
 * 4. All Combined - 모든 필터 종합
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip = require('adm-zip');
import { ATR, SMA, EMA } from 'technicalindicators';

// ============================================================
// 타입 정의
// ============================================================

interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OrderBlock {
  top: number;
  bottom: number;
  type: 'LONG' | 'SHORT';
  method: string;
  barIndex: number;
  age: number;
  pricedMovedAway: boolean;
}

interface Trade {
  entryTime: Date;
  exitTime: Date;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  pnl: number;
  pnlPercent: number;
  isWin: boolean;
}

interface FilterResult {
  filterName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
}

// ============================================================
// 설정
// ============================================================

const CONFIG = {
  // OB 감지 설정 (백테스트와 동일)
  lookback: 2,
  minBodyRatio: 0.5,
  orbAtr: 1.5,
  orbVol: 2.0,
  useBodyOnly: true,
  obMaxBars: 60,

  // 진입 설정
  minAwayMultRangebound: 0.2,
  minAwayMultNormal: 0.8,
  minAwayMultTrending: 2.0,
  requireReversal: true,
  orderValidityBars: 3,

  // 리스크/리워드 설정
  slBuffer: 0.01,
  tp1Ratio: 1.2,
  rrRatio: 4.0,
  leverage: 15,

  // 수수료
  makerFee: 0.0004,
  takerFee: 0.00075,
};

// ============================================================
// 필터 함수들
// ============================================================

/**
 * MTF 필터: 1시간봉 추세 확인
 */
function checkMTFFilter(
  candles5m: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  // 5분봉 12개 = 1시간봉 1개
  // 최근 24시간 (288개 5분봉)의 1시간봉 데이터 생성
  const hourlyCandles: OHLCV[] = [];

  for (let i = Math.max(0, currentIndex - 288); i <= currentIndex; i += 12) {
    if (i + 11 > currentIndex) break;

    const slice = candles5m.slice(i, i + 12);
    if (slice.length < 12) continue;

    hourlyCandles.push({
      timestamp: slice[0].timestamp,
      open: slice[0].open,
      high: Math.max(...slice.map(c => c.high)),
      low: Math.min(...slice.map(c => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  if (hourlyCandles.length < 21) return true; // 데이터 부족시 통과

  // 1시간봉 EMA21 계산
  const closes = hourlyCandles.map(c => c.close);
  const ema21Values = EMA.calculate({ period: 21, values: closes });

  if (ema21Values.length === 0) return true;

  const currentPrice = hourlyCandles[hourlyCandles.length - 1].close;
  const ema21 = ema21Values[ema21Values.length - 1];

  // 추세 방향 확인
  const ema21Prev = ema21Values.length > 1 ? ema21Values[ema21Values.length - 2] : ema21;
  const trendUp = ema21 > ema21Prev && currentPrice > ema21;
  const trendDown = ema21 < ema21Prev && currentPrice < ema21;

  if (obType === 'LONG') {
    return trendUp || currentPrice > ema21; // 상승 추세 또는 EMA 위
  } else {
    return trendDown || currentPrice < ema21; // 하락 추세 또는 EMA 아래
  }
}

/**
 * VWAP 필터: Premium/Discount Zone 확인
 */
function checkVWAPFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  // 최근 288개 (24시간) 캔들로 VWAP 계산
  const lookback = Math.min(288, currentIndex);
  const slice = candles.slice(currentIndex - lookback, currentIndex + 1);

  if (slice.length < 50) return true; // 데이터 부족시 통과

  // VWAP 계산: Σ(TP × Volume) / Σ(Volume)
  let tpvSum = 0;
  let volSum = 0;

  for (const candle of slice) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    tpvSum += typicalPrice * candle.volume;
    volSum += candle.volume;
  }

  if (volSum === 0) return true;

  const vwap = tpvSum / volSum;
  const currentPrice = slice[slice.length - 1].close;

  // Premium/Discount 판단
  // LONG: 현재가 < VWAP (할인 영역에서 매수)
  // SHORT: 현재가 > VWAP (프리미엄 영역에서 매도)
  if (obType === 'LONG') {
    return currentPrice < vwap;
  } else {
    return currentPrice > vwap;
  }
}

/**
 * ATR 변동성 필터: 적정 변동성 범위 확인
 */
function checkATRVolatilityFilter(
  candles: OHLCV[],
  currentIndex: number
): boolean {
  if (currentIndex < 100) return true;

  const slice = candles.slice(currentIndex - 100, currentIndex + 1);

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

  // 적정 변동성 범위: 0.5% ~ 3.0%
  return atrPercent >= 0.5 && atrPercent <= 3.0;
}

/**
 * Market Structure 필터: HH/HL, LH/LL 패턴 확인
 */
function checkMarketStructureFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  if (currentIndex < 50) return true;

  const lookback = 5; // 스윙 포인트 감지용
  const slice = candles.slice(Math.max(0, currentIndex - 100), currentIndex + 1);

  if (slice.length < 50) return true;

  // 스윙 하이/로우 찾기
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];

  for (let i = lookback; i < slice.length - lookback; i++) {
    const high = slice[i].high;
    const low = slice[i].low;

    // 스윙 하이 체크
    let isSwingHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (slice[i - j].high >= high || slice[i + j].high >= high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swingHighs.push({ index: i, price: high });
    }

    // 스윙 로우 체크
    let isSwingLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (slice[i - j].low <= low || slice[i + j].low <= low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swingLows.push({ index: i, price: low });
    }
  }

  if (swingHighs.length < 2 || swingLows.length < 2) return true;

  // 최근 2개의 스윙 포인트로 구조 판단
  const recentHighs = swingHighs.slice(-2);
  const recentLows = swingLows.slice(-2);

  // Bullish Structure: HH + HL (Higher High + Higher Low)
  const isBullishStructure =
    recentHighs[1].price > recentHighs[0].price && // Higher High
    recentLows[1].price > recentLows[0].price;     // Higher Low

  // Bearish Structure: LH + LL (Lower High + Lower Low)
  const isBearishStructure =
    recentHighs[1].price < recentHighs[0].price && // Lower High
    recentLows[1].price < recentLows[0].price;     // Lower Low

  if (obType === 'LONG') {
    return isBullishStructure;
  } else {
    return isBearishStructure;
  }
}

/**
 * CVD (Cumulative Volume Delta) 필터: 매수/매도 압력 분석
 */
function checkCVDFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  if (currentIndex < 50) return true;

  const lookback = 20; // CVD 계산 기간
  const slice = candles.slice(currentIndex - lookback, currentIndex + 1);

  if (slice.length < lookback) return true;

  // Delta 계산 (캔들 기반 근사치)
  // Buy Volume: (Close - Low) / (High - Low) * Volume
  // Sell Volume: (High - Close) / (High - Low) * Volume
  // Delta = Buy Volume - Sell Volume
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

  // 가격 추세와 CVD 추세 비교
  const priceStart = slice[slice.length - 10].close;
  const priceEnd = slice[slice.length - 1].close;
  const priceTrend = priceEnd - priceStart;

  // LONG: CVD 상승 (매수 압력 증가) + 가격과 CVD 방향 일치
  // SHORT: CVD 하락 (매도 압력 증가) + 가격과 CVD 방향 일치
  if (obType === 'LONG') {
    // CVD가 상승하고 있고, 가격도 상승 or CVD가 가격보다 강하게 상승 (divergence)
    return cvdTrend > 0 || (cvdTrend > 0 && priceTrend <= 0); // 매수 압력 있음
  } else {
    // CVD가 하락하고 있고, 가격도 하락 or CVD가 가격보다 강하게 하락 (divergence)
    return cvdTrend < 0 || (cvdTrend < 0 && priceTrend >= 0); // 매도 압력 있음
  }
}

/**
 * 모든 필터 종합
 */
function checkAllFilters(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): { passed: boolean; scores: { mtf: boolean; vwap: boolean; atr: boolean } } {
  const mtf = checkMTFFilter(candles, obType, currentIndex);
  const vwap = checkVWAPFilter(candles, obType, currentIndex);
  const atr = checkATRVolatilityFilter(candles, currentIndex);

  return {
    passed: mtf && vwap && atr,
    scores: { mtf, vwap, atr },
  };
}

/**
 * ATR + Market Structure 조합 필터
 */
function checkATRStructureFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  const atr = checkATRVolatilityFilter(candles, currentIndex);
  const structure = checkMarketStructureFilter(candles, obType, currentIndex);
  return atr && structure;
}

/**
 * ATR + CVD 조합 필터
 */
function checkATRCVDFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  const atr = checkATRVolatilityFilter(candles, currentIndex);
  const cvd = checkCVDFilter(candles, obType, currentIndex);
  return atr && cvd;
}

/**
 * ATR + CVD + Structure 조합 필터
 */
function checkATRCVDStructureFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number
): boolean {
  const atr = checkATRVolatilityFilter(candles, currentIndex);
  const cvd = checkCVDFilter(candles, obType, currentIndex);
  const structure = checkMarketStructureFilter(candles, obType, currentIndex);
  return atr && cvd && structure;
}

// ============================================================
// 백테스트 엔진
// ============================================================

class DirectionFilterBacktest {
  private config = CONFIG;

  /**
   * ORB 감지 (기존 로직과 동일)
   */
  private detectORB(
    candles: OHLCV[],
    index: number,
    atr: number,
    volAvg50: number
  ): OrderBlock | null {
    if (index < 1 || atr === 0 || volAvg50 === 0) return null;

    const currentCandle = candles[index];
    const candleRange = currentCandle.high - currentCandle.low;
    const body = Math.abs(currentCandle.close - currentCandle.open);
    const bodyRatio = candleRange > 0 ? body / candleRange : 0;
    const volRatio = currentCandle.volume / volAvg50;

    // Bullish ORB
    if (
      currentCandle.close > currentCandle.open &&
      candleRange > atr * this.config.orbAtr &&
      volRatio > this.config.orbVol &&
      bodyRatio > this.config.minBodyRatio
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
      bodyRatio > this.config.minBodyRatio
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
   * 백테스트 실행
   */
  async runBacktest(
    candles: OHLCV[],
    filterType: 'none' | 'mtf' | 'vwap' | 'atr' | 'structure' | 'cvd' | 'atr_structure' | 'atr_cvd' | 'atr_cvd_structure' | 'all'
  ): Promise<{ trades: Trade[]; stats: FilterResult }> {
    const trades: Trade[] = [];

    // 지표 계산
    const atrValues = ATR.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period: 14,
    });

    const volAvg50Values = SMA.calculate({
      period: 50,
      values: candles.map(c => c.volume),
    });

    const sma600Values = SMA.calculate({
      period: 600,
      values: candles.map(c => c.close),
    });

    let activeOB: OrderBlock | null = null;
    let limitOrder: { type: 'LONG' | 'SHORT'; limitPrice: number; ob: OrderBlock; createdBarIndex: number } | null = null;
    let position: {
      entry: number;
      sl: number;
      tp: number;
      direction: 'LONG' | 'SHORT';
      entryTime: Date;
      entryBarIndex: number;
    } | null = null;

    // 캔들 순회
    for (let i = 700; i < candles.length; i++) {
      const currentCandle = candles[i];
      const atr = atrValues[i - (candles.length - atrValues.length)] || 0;
      const volAvg50 = volAvg50Values[i - (candles.length - volAvg50Values.length)] || 0;
      const sma600 = sma600Values[i - (candles.length - sma600Values.length)] || currentCandle.close;

      // 포지션 청산 체크
      if (position) {
        let exitPrice: number | null = null;
        let exitReason = '';

        if (position.direction === 'LONG') {
          if (currentCandle.low <= position.sl) {
            exitPrice = position.sl;
            exitReason = 'SL';
          } else if (currentCandle.high >= position.tp) {
            exitPrice = position.tp;
            exitReason = 'TP';
          }
        } else {
          if (currentCandle.high >= position.sl) {
            exitPrice = position.sl;
            exitReason = 'SL';
          } else if (currentCandle.low <= position.tp) {
            exitPrice = position.tp;
            exitReason = 'TP';
          }
        }

        // 최대 홀딩 시간 (48캔들)
        if (!exitPrice && i - position.entryBarIndex >= 48) {
          exitPrice = currentCandle.close;
          exitReason = 'TIMEOUT';
        }

        if (exitPrice) {
          const pnl = position.direction === 'LONG'
            ? (exitPrice - position.entry) / position.entry * 100
            : (position.entry - exitPrice) / position.entry * 100;

          trades.push({
            entryTime: position.entryTime,
            exitTime: new Date(currentCandle.timestamp),
            direction: position.direction,
            entry: position.entry,
            exit: exitPrice,
            pnl,
            pnlPercent: pnl,
            isWin: pnl > 0,
          });

          position = null;
          activeOB = null;
          limitOrder = null;
        }

        continue; // 포지션 있으면 새 진입 안함
      }

      // OB 에이징 및 무효화
      if (activeOB) {
        activeOB.age = i - activeOB.barIndex;

        if (activeOB.age > this.config.obMaxBars) {
          activeOB = null;
          limitOrder = null;
        } else if (activeOB.type === 'LONG' && currentCandle.low < activeOB.bottom) {
          activeOB = null;
          limitOrder = null;
        } else if (activeOB.type === 'SHORT' && currentCandle.high > activeOB.top) {
          activeOB = null;
          limitOrder = null;
        }
      }

      // 새 OB 감지
      const newOB = this.detectORB(candles, i, atr, volAvg50);

      if (newOB && !activeOB) {
        // 기본 SMA 트렌드 필터
        let passBasicFilter = true;

        if (newOB.type === 'LONG' && currentCandle.close < sma600) {
          passBasicFilter = false;
        } else if (newOB.type === 'SHORT' && currentCandle.close > sma600) {
          passBasicFilter = false;
        }

        if (!passBasicFilter) continue;

        // 방향 확인 필터 적용
        let passDirectionFilter = true;

        switch (filterType) {
          case 'mtf':
            passDirectionFilter = checkMTFFilter(candles, newOB.type, i);
            break;
          case 'vwap':
            passDirectionFilter = checkVWAPFilter(candles, newOB.type, i);
            break;
          case 'atr':
            passDirectionFilter = checkATRVolatilityFilter(candles, i);
            break;
          case 'structure':
            passDirectionFilter = checkMarketStructureFilter(candles, newOB.type, i);
            break;
          case 'cvd':
            passDirectionFilter = checkCVDFilter(candles, newOB.type, i);
            break;
          case 'atr_structure':
            passDirectionFilter = checkATRStructureFilter(candles, newOB.type, i);
            break;
          case 'atr_cvd':
            passDirectionFilter = checkATRCVDFilter(candles, newOB.type, i);
            break;
          case 'atr_cvd_structure':
            passDirectionFilter = checkATRCVDStructureFilter(candles, newOB.type, i);
            break;
          case 'all':
            const allResult = checkAllFilters(candles, newOB.type, i);
            passDirectionFilter = allResult.passed;
            break;
          case 'none':
          default:
            passDirectionFilter = true;
        }

        if (passDirectionFilter) {
          activeOB = newOB;
        }
      }

      // pricedMovedAway 체크
      if (activeOB && !activeOB.pricedMovedAway) {
        const obMid = (activeOB.top + activeOB.bottom) / 2;
        const obSize = activeOB.top - activeOB.bottom;
        const atrPercent = (atr / currentCandle.close) * 100;

        let adjustedMinAwayMult: number;
        if (atrPercent < 1.0) {
          adjustedMinAwayMult = this.config.minAwayMultRangebound;
        } else if (atrPercent <= 2.0) {
          adjustedMinAwayMult = this.config.minAwayMultNormal;
        } else {
          adjustedMinAwayMult = this.config.minAwayMultTrending;
        }

        const minDist = obSize * adjustedMinAwayMult;

        if (activeOB.type === 'LONG' && currentCandle.close > obMid + minDist) {
          activeOB.pricedMovedAway = true;
        } else if (activeOB.type === 'SHORT' && currentCandle.close < obMid - minDist) {
          activeOB.pricedMovedAway = true;
        }
      }

      // Limit Order 생성
      if (activeOB && activeOB.pricedMovedAway && !limitOrder) {
        const obMid = (activeOB.top + activeOB.bottom) / 2;
        limitOrder = {
          type: activeOB.type,
          limitPrice: obMid,
          ob: activeOB,
          createdBarIndex: i,
        };
      }

      // Limit Order 체결 체크
      if (limitOrder && !position) {
        const orderAge = i - limitOrder.createdBarIndex;
        const priceHitLimit = currentCandle.low <= limitOrder.limitPrice && limitOrder.limitPrice <= currentCandle.high;

        // OB 영역 이탈 체크
        const buffer = (limitOrder.ob.top - limitOrder.ob.bottom) * 0.5;
        const isOutOfZone = limitOrder.type === 'LONG'
          ? currentCandle.close < limitOrder.ob.bottom - buffer
          : currentCandle.close > limitOrder.ob.top + buffer;

        if (isOutOfZone && orderAge > 0) {
          limitOrder = null;
          activeOB = null;
          continue;
        }

        // 타임아웃
        if (!priceHitLimit && orderAge >= this.config.orderValidityBars) {
          limitOrder = null;
          activeOB = null;
          continue;
        }

        // 체결
        if (priceHitLimit) {
          // Reversal 체크
          if (this.config.requireReversal) {
            if (limitOrder.type === 'LONG' && currentCandle.close <= currentCandle.open) {
              continue;
            }
            if (limitOrder.type === 'SHORT' && currentCandle.close >= currentCandle.open) {
              continue;
            }
          }

          const entry = limitOrder.limitPrice;
          let sl: number;
          let tp: number;

          if (limitOrder.type === 'LONG') {
            sl = limitOrder.ob.bottom * (1 - this.config.slBuffer);
            const risk = entry - sl;
            tp = entry + (risk * this.config.tp1Ratio);
          } else {
            sl = limitOrder.ob.top * (1 + this.config.slBuffer);
            const risk = sl - entry;
            tp = entry - (risk * this.config.tp1Ratio);
          }

          position = {
            entry,
            sl,
            tp,
            direction: limitOrder.type,
            entryTime: new Date(currentCandle.timestamp),
            entryBarIndex: i,
          };

          limitOrder = null;
          activeOB = null;
        }
      }
    }

    // 통계 계산
    const wins = trades.filter(t => t.isWin).length;
    const losses = trades.length - wins;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    // Max Drawdown 계산
    let peak = 0;
    let maxDrawdown = 0;
    let cumPnl = 0;

    for (const trade of trades) {
      cumPnl += trade.pnl;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const filterName = filterType === 'none' ? 'Baseline (No Filter)' :
                       filterType === 'mtf' ? 'MTF (1H Trend)' :
                       filterType === 'vwap' ? 'VWAP Premium/Discount' :
                       filterType === 'atr' ? 'ATR Volatility' :
                       filterType === 'structure' ? 'Market Structure (HH/HL)' :
                       filterType === 'cvd' ? 'CVD (Order Flow)' :
                       filterType === 'atr_structure' ? 'ATR + Structure' :
                       filterType === 'atr_cvd' ? 'ATR + CVD' :
                       filterType === 'atr_cvd_structure' ? 'ATR + CVD + Structure' :
                       'All Filters Combined';

    return {
      trades,
      stats: {
        filterName,
        totalTrades: trades.length,
        wins,
        losses,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        totalPnl,
        avgPnl: trades.length > 0 ? totalPnl / trades.length : 0,
        maxDrawdown,
      },
    };
  }
}

// ============================================================
// 데이터 로딩
// ============================================================

async function loadMonthlyData(symbol: string, year: number, month: number): Promise<OHLCV[]> {
  const monthStr = month.toString().padStart(2, '0');
  const csvPath = path.join(
    __dirname, '..', 'backtest_data', 'monthly',
    `${symbol}-5m-${year}-${monthStr}.csv`
  );

  if (!fs.existsSync(csvPath)) {
    return [];
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');

    const candles: OHLCV[] = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 6) continue;

      const timestamp = parseInt(parts[0]);
      if (isNaN(timestamp)) continue;

      candles.push({
        timestamp: new Date(timestamp),
        open: parseFloat(parts[1]),
        high: parseFloat(parts[2]),
        low: parseFloat(parts[3]),
        close: parseFloat(parts[4]),
        volume: parseFloat(parts[5]),
      });
    }

    return candles;
  } catch (error) {
    console.error(`Error loading ${csvPath}:`, error);
    return [];
  }
}

async function loadAllData(symbols: string[]): Promise<Map<string, OHLCV[]>> {
  const dataMap = new Map<string, OHLCV[]>();

  // 2025년 1월 ~ 11월 데이터 로드
  const months = [
    { year: 2025, month: 1 },
    { year: 2025, month: 2 },
    { year: 2025, month: 3 },
    { year: 2025, month: 4 },
    { year: 2025, month: 5 },
    { year: 2025, month: 6 },
    { year: 2025, month: 7 },
    { year: 2025, month: 8 },
    { year: 2025, month: 9 },
    { year: 2025, month: 10 },
    { year: 2025, month: 11 },
  ];

  for (const symbol of symbols) {
    console.log(`Loading data for ${symbol}...`);
    const allCandles: OHLCV[] = [];

    for (const { year, month } of months) {
      const monthData = await loadMonthlyData(symbol, year, month);
      allCandles.push(...monthData);
    }

    if (allCandles.length > 0) {
      // 시간순 정렬
      allCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      dataMap.set(symbol, allCandles);
      console.log(`  ${symbol}: ${allCandles.length} candles loaded`);
    }
  }

  return dataMap;
}

// ============================================================
// 메인 실행
// ============================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  방향 확인 필터 검증 백테스트');
  console.log('  Direction Confirmation Filter Validation');
  console.log('='.repeat(70) + '\n');

  // 테스트 심볼 (전체 50개)
  const symbols = [
    // 대형 코인
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
    'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'ETCUSDT', 'FILUSDT',
    // 중형 코인
    'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT',
    'SEIUSDT', 'TIAUSDT', 'NEARUSDT', 'FTMUSDT', 'RUNEUSDT',
    'LDOUSDT', 'STXUSDT', 'WLDUSDT', 'PYTHUSDT', 'PENDLEUSDT',
    // 소형/밈 코인
    '1000PEPEUSDT', '1000SHIBUSDT', 'WIFUSDT', 'BOMEUSDT', 'MEMEUSDT',
    'ORDIUSDT', 'FETUSDT', 'GMXUSDT', 'DYDXUSDT', 'BLURUSDT',
    // 기타
    'AAVEUSDT', 'CRVUSDT', 'SNXUSDT', 'AXSUSDT', 'SANDUSDT',
    'MANAUSDT', 'GALAUSDT', 'MAGICUSDT', 'CFXUSDT', 'BEAMXUSDT',
  ];

  // 데이터 로드
  console.log('Loading historical data...\n');
  const dataMap = await loadAllData(symbols);

  if (dataMap.size === 0) {
    console.error('No data loaded. Make sure data files exist in data/binance-monthly/');
    return;
  }

  console.log(`\nLoaded data for ${dataMap.size} symbols\n`);

  // 필터 타입들
  const filterTypes: Array<'none' | 'mtf' | 'vwap' | 'atr' | 'structure' | 'cvd' | 'atr_structure' | 'atr_cvd' | 'atr_cvd_structure' | 'all'> = [
    'none',
    'atr',
    'atr_cvd',
    'atr_structure',
    'atr_cvd_structure',
  ];

  const backtest = new DirectionFilterBacktest();
  const results: Map<string, FilterResult[]> = new Map();

  // 각 필터별 백테스트 실행
  for (const filterType of filterTypes) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Testing filter: ${filterType.toUpperCase()}`);
    console.log(`${'─'.repeat(50)}`);

    const filterResults: FilterResult[] = [];

    for (const [symbol, candles] of Array.from(dataMap.entries())) {
      process.stdout.write(`  ${symbol}... `);

      try {
        const result = await backtest.runBacktest(candles, filterType);
        filterResults.push(result.stats);
        console.log(`${result.stats.totalTrades} trades, ${result.stats.winRate.toFixed(1)}% WR`);
      } catch (error: any) {
        console.log(`Error: ${error.message}`);
      }
    }

    results.set(filterType, filterResults);
  }

  // 결과 집계 및 출력
  console.log('\n\n' + '='.repeat(70));
  console.log('  결과 요약 (Results Summary)');
  console.log('='.repeat(70) + '\n');

  const summaryTable: Array<{
    filter: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
  }> = [];

  for (const filterType of filterTypes) {
    const filterResults = results.get(filterType) || [];

    const totalTrades = filterResults.reduce((sum, r) => sum + r.totalTrades, 0);
    const totalWins = filterResults.reduce((sum, r) => sum + r.wins, 0);
    const totalLosses = filterResults.reduce((sum, r) => sum + r.losses, 0);
    const totalPnl = filterResults.reduce((sum, r) => sum + r.totalPnl, 0);

    const filterName = filterType === 'none' ? 'Baseline (No Filter)' :
                       filterType === 'mtf' ? 'MTF (1H Trend)' :
                       filterType === 'vwap' ? 'VWAP Premium/Discount' :
                       filterType === 'atr' ? 'ATR Volatility' :
                       filterType === 'structure' ? 'Market Structure (HH/HL)' :
                       filterType === 'cvd' ? 'CVD (Order Flow)' :
                       filterType === 'atr_structure' ? 'ATR + Structure' :
                       filterType === 'atr_cvd' ? 'ATR + CVD' :
                       filterType === 'atr_cvd_structure' ? 'ATR + CVD + Structure' :
                       'All Filters Combined';

    summaryTable.push({
      filter: filterName,
      trades: totalTrades,
      wins: totalWins,
      losses: totalLosses,
      winRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
      totalPnl,
      avgPnl: totalTrades > 0 ? totalPnl / totalTrades : 0,
    });
  }

  // 테이블 출력
  console.log('| Filter                    | Trades | Wins   | Losses | Win Rate | Total PnL  | Avg PnL |');
  console.log('|---------------------------|--------|--------|--------|----------|------------|---------|');

  for (const row of summaryTable) {
    console.log(
      `| ${row.filter.padEnd(25)} | ${row.trades.toString().padStart(6)} | ${row.wins.toString().padStart(6)} | ${row.losses.toString().padStart(6)} | ${row.winRate.toFixed(1).padStart(7)}% | ${row.totalPnl.toFixed(0).padStart(9)}% | ${row.avgPnl.toFixed(2).padStart(6)}% |`
    );
  }

  // Baseline 대비 변화 출력
  const baseline = summaryTable.find(r => r.filter === 'Baseline (No Filter)');

  if (baseline) {
    console.log('\n\n' + '='.repeat(70));
    console.log('  Baseline 대비 변화 (Change from Baseline)');
    console.log('='.repeat(70) + '\n');

    console.log('| Filter                    | WR Change | Trade Reduction | PnL Change |');
    console.log('|---------------------------|-----------|-----------------|------------|');

    for (const row of summaryTable) {
      if (row.filter === 'Baseline (No Filter)') continue;

      const wrChange = row.winRate - baseline.winRate;
      const tradeReduction = ((baseline.trades - row.trades) / baseline.trades) * 100;
      const pnlChange = row.totalPnl - baseline.totalPnl;

      console.log(
        `| ${row.filter.padEnd(25)} | ${(wrChange >= 0 ? '+' : '') + wrChange.toFixed(1).padStart(8)}% | ${tradeReduction.toFixed(1).padStart(14)}% | ${(pnlChange >= 0 ? '+' : '') + pnlChange.toFixed(0).padStart(9)}% |`
      );
    }
  }

  // JSON 결과 저장
  const outputDir = path.join(__dirname, '..', 'backtest-results', 'direction-filter');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(outputDir, `direction-filter-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: CONFIG,
    summary: summaryTable,
    detailedResults: Object.fromEntries(results),
  }, null, 2));

  console.log(`\n\nResults saved to: ${outputPath}`);

  // 권장사항 출력
  console.log('\n\n' + '='.repeat(70));
  console.log('  권장사항 (Recommendations)');
  console.log('='.repeat(70) + '\n');

  const bestFilter = summaryTable
    .filter(r => r.filter !== 'Baseline (No Filter)')
    .sort((a, b) => b.winRate - a.winRate)[0];

  if (bestFilter && baseline) {
    const improvement = bestFilter.winRate - baseline.winRate;

    if (improvement > 0) {
      console.log(`✅ 최고 성능 필터: ${bestFilter.filter}`);
      console.log(`   승률 개선: +${improvement.toFixed(1)}%p (${baseline.winRate.toFixed(1)}% → ${bestFilter.winRate.toFixed(1)}%)`);
      console.log(`   거래 감소: ${((baseline.trades - bestFilter.trades) / baseline.trades * 100).toFixed(1)}%`);
    } else {
      console.log(`⚠️ 모든 필터가 Baseline보다 성능이 낮습니다.`);
      console.log(`   현재 전략을 유지하거나 다른 접근 방식을 고려하세요.`);
    }
  }
}

main().catch(console.error);
