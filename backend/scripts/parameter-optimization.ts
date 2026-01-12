/**
 * 전체 파라미터 최적화 스크립트
 *
 * Phase 1: 각 파라미터별 개별 최적화
 * Phase 2: 최적값 조합 테스트
 */

import * as fs from 'fs';
import * as path from 'path';
import { ATR, SMA } from 'technicalindicators';

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

interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  profitFactor: number;
}

interface ParameterTest {
  paramName: string;
  value: number;
  result: BacktestResult;
}

// ============================================================
// 기본 설정 (현재 라이브 전략과 동일)
// ============================================================

const BASELINE_CONFIG = {
  // OB 감지
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
  maxPriceDeviation: 0.02,

  // 리스크/리워드
  slBuffer: 0.01,
  tp1Ratio: 1.2,
  rrRatio: 4.0,
  tp1Percent: 1.0,
  leverage: 15,

  // 시간 관리
  maxHoldingBars: 48,
  retryCooldown: 12,

  // ATR + CVD 필터
  useATRCVDFilter: true,
  atrFilterMin: 0.5,
  atrFilterMax: 3.0,
  cvdLookback: 20,

  // 수수료
  makerFee: 0.0004,
  takerFee: 0.00075,
  slippage: 0.0002,
};

// 테스트할 파라미터 범위
const PARAMETER_RANGES: Record<string, number[]> = {
  // ATR + CVD 필터
  atrFilterMin: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  atrFilterMax: [2.0, 2.5, 3.0, 3.5, 4.0],
  cvdLookback: [10, 15, 20, 25, 30],

  // 리스크/리워드
  rrRatio: [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0],
  tp1Ratio: [1.0, 1.2, 1.5, 1.8, 2.0],
  tp1Percent: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  slBuffer: [0.005, 0.0075, 0.01, 0.0125, 0.015, 0.02],

  // 레버리지
  leverage: [10, 12, 15, 18, 20, 25],

  // OB 감지
  orbAtr: [1.0, 1.2, 1.5, 1.8, 2.0],
  orbVol: [1.5, 1.8, 2.0, 2.5, 3.0],
  minBodyRatio: [0.4, 0.45, 0.5, 0.55, 0.6, 0.65],

  // 시간 관리
  orderValidityBars: [2, 3, 4, 5, 6],
  maxHoldingBars: [24, 36, 48, 60, 72],
  retryCooldown: [6, 9, 12, 15, 18, 24],

  // 진입 설정
  minAwayMultRangebound: [0.1, 0.2, 0.3, 0.4, 0.5],
  minAwayMultNormal: [0.6, 0.8, 1.0, 1.2],
  minAwayMultTrending: [1.5, 2.0, 2.5, 3.0],
};

// 50개 심볼
const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT',
  'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT', 'FILUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'NEARUSDT', 'SUIUSDT',
  'ICPUSDT', 'INJUSDT', 'STXUSDT', 'SEIUSDT', 'TIAUSDT',
  'LDOUSDT', 'WLDUSDT', 'AAVEUSDT', 'ALGOUSDT', 'AXSUSDT',
  'SANDUSDT', 'MANAUSDT', 'GALAUSDT', 'APEUSDT', 'GMXUSDT',
  'ROSEUSDT', 'CHZUSDT', 'ENJUSDT', 'FTMUSDT', 'ZILUSDT',
  'ONEUSDT', 'RUNEUSDT', 'CRVUSDT', 'SNXUSDT', 'COMPUSDT',
  'MKRUSDT', 'SUSHIUSDT', 'YFIUSDT', '1INCHUSDT', 'LRCUSDT',
];

// ============================================================
// 데이터 로딩
// ============================================================

function loadMonthlyData(symbol: string): OHLCV[] {
  const dataDir = path.join(process.cwd(), 'backtest_data', 'monthly');
  const allCandles: OHLCV[] = [];

  // 2025년 1월 ~ 11월 데이터 로드
  const months = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'
  ];

  for (const month of months) {
    const filePath = path.join(dataDir, `${symbol}-5m-${month}.csv`);

    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 6) {
        const timestamp = parseInt(parts[0]);
        if (!isNaN(timestamp)) {
          allCandles.push({
            timestamp: new Date(timestamp),
            open: parseFloat(parts[1]),
            high: parseFloat(parts[2]),
            low: parseFloat(parts[3]),
            close: parseFloat(parts[4]),
            volume: parseFloat(parts[5]),
          });
        }
      }
    }
  }

  // 시간순 정렬 및 중복 제거
  allCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const uniqueCandles: OHLCV[] = [];
  let lastTimestamp = 0;

  for (const candle of allCandles) {
    if (candle.timestamp.getTime() !== lastTimestamp) {
      uniqueCandles.push(candle);
      lastTimestamp = candle.timestamp.getTime();
    }
  }

  return uniqueCandles;
}

// ============================================================
// 필터 함수들
// ============================================================

function checkATRVolatilityFilter(
  candles: OHLCV[],
  currentIndex: number,
  config: typeof BASELINE_CONFIG
): boolean {
  if (currentIndex < 100) return true;

  const slice = candles.slice(currentIndex - 100, currentIndex + 1);

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

  return atrPercent >= config.atrFilterMin && atrPercent <= config.atrFilterMax;
}

function checkCVDFilter(
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT',
  currentIndex: number,
  config: typeof BASELINE_CONFIG
): boolean {
  if (currentIndex < 50) return true;

  const lookback = config.cvdLookback;
  const slice = candles.slice(currentIndex - lookback, currentIndex + 1);

  if (slice.length < lookback) return true;

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

  let cvd = 0;
  const cvdValues: number[] = [];
  for (const delta of deltas) {
    cvd += delta;
    cvdValues.push(cvd);
  }

  const recentCVD = cvdValues.slice(-10);
  const cvdTrend = recentCVD[recentCVD.length - 1] - recentCVD[0];

  if (obType === 'LONG') {
    return cvdTrend > 0;
  } else {
    return cvdTrend < 0;
  }
}

// ============================================================
// 백테스트 엔진
// ============================================================

function runBacktest(candles: OHLCV[], config: typeof BASELINE_CONFIG): BacktestResult {
  const trades: Trade[] = [];
  let capital = 10000;
  let maxCapital = capital;
  let maxDrawdown = 0;

  // 지표 계산
  const atrValues = ATR.calculate({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    period: 14,
  });

  const volAvg50 = SMA.calculate({
    period: 50,
    values: candles.map(c => c.volume),
  });

  const sma600 = SMA.calculate({
    period: 600,
    values: candles.map(c => c.close),
  });

  let activeOB: OrderBlock | null = null;
  let position: {
    entry: number;
    sl: number;
    tp1: number;
    direction: 'LONG' | 'SHORT';
    entryTime: Date;
    entryBarIndex: number;
  } | null = null;

  let lastExitBarIndex = -999;

  for (let i = 700; i < candles.length; i++) {
    const currentCandle = candles[i];
    const atrIdx = i - (candles.length - atrValues.length);
    const volIdx = i - (candles.length - volAvg50.length);
    const smaIdx = i - (candles.length - sma600.length);

    const atr = atrIdx >= 0 ? atrValues[atrIdx] : 0;
    const vol50 = volIdx >= 0 ? volAvg50[volIdx] : 0;
    const sma = smaIdx >= 0 ? sma600[smaIdx] : currentCandle.close;

    if (atr === 0 || vol50 === 0) continue;

    // 포지션 청산 체크
    if (position) {
      const holdingBars = i - position.entryBarIndex;
      let exitPrice: number | null = null;
      let exitReason = '';

      if (position.direction === 'LONG') {
        if (currentCandle.low <= position.sl) {
          exitPrice = position.sl;
          exitReason = 'SL';
        } else if (currentCandle.high >= position.tp1) {
          exitPrice = position.tp1;
          exitReason = 'TP';
        } else if (holdingBars >= config.maxHoldingBars) {
          exitPrice = currentCandle.close;
          exitReason = 'TIMEOUT';
        }
      } else {
        if (currentCandle.high >= position.sl) {
          exitPrice = position.sl;
          exitReason = 'SL';
        } else if (currentCandle.low <= position.tp1) {
          exitPrice = position.tp1;
          exitReason = 'TP';
        } else if (holdingBars >= config.maxHoldingBars) {
          exitPrice = currentCandle.close;
          exitReason = 'TIMEOUT';
        }
      }

      if (exitPrice !== null) {
        const priceDiff = position.direction === 'LONG'
          ? exitPrice - position.entry
          : position.entry - exitPrice;

        const margin = Math.max(15, capital * 0.1);
        const positionSize = (margin * config.leverage) / position.entry;
        const pnlBeforeFee = positionSize * priceDiff;
        const fees = positionSize * position.entry * config.makerFee +
                     positionSize * exitPrice * config.takerFee;
        const pnl = pnlBeforeFee - fees;
        const pnlPercent = (priceDiff / position.entry) * 100;

        trades.push({
          entryTime: position.entryTime,
          exitTime: currentCandle.timestamp,
          direction: position.direction,
          entry: position.entry,
          exit: exitPrice,
          pnl,
          pnlPercent,
          isWin: pnl > 0,
        });

        capital += pnl;
        maxCapital = Math.max(maxCapital, capital);
        const drawdown = (maxCapital - capital) / maxCapital * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);

        lastExitBarIndex = i;
        position = null;
        activeOB = null;
      }

      continue;
    }

    // 재진입 쿨다운 체크
    if (i - lastExitBarIndex < config.retryCooldown) continue;

    // OB 에이징 및 무효화
    if (activeOB) {
      activeOB.age = i - activeOB.barIndex;

      if (activeOB.age > config.obMaxBars) {
        activeOB = null;
      } else if (activeOB.type === 'LONG' && currentCandle.low < activeOB.bottom) {
        activeOB = null;
      } else if (activeOB.type === 'SHORT' && currentCandle.high > activeOB.top) {
        activeOB = null;
      }
    }

    // OB 감지 (ORB)
    if (!activeOB) {
      const candleRange = currentCandle.high - currentCandle.low;
      const body = Math.abs(currentCandle.close - currentCandle.open);
      const bodyRatio = candleRange > 0 ? body / candleRange : 0;
      const volRatio = currentCandle.volume / vol50;

      if (currentCandle.close > currentCandle.open &&
          candleRange > atr * config.orbAtr &&
          volRatio > config.orbVol &&
          bodyRatio > config.minBodyRatio) {
        // SMA 필터
        if (currentCandle.close > sma) {
          activeOB = {
            top: config.useBodyOnly ? currentCandle.close : currentCandle.high,
            bottom: config.useBodyOnly ? currentCandle.open : currentCandle.low,
            type: 'LONG',
            method: 'ORB',
            barIndex: i,
            age: 0,
            pricedMovedAway: false,
          };
        }
      } else if (currentCandle.close < currentCandle.open &&
                 candleRange > atr * config.orbAtr &&
                 volRatio > config.orbVol &&
                 bodyRatio > config.minBodyRatio) {
        if (currentCandle.close < sma) {
          activeOB = {
            top: config.useBodyOnly ? currentCandle.open : currentCandle.high,
            bottom: config.useBodyOnly ? currentCandle.close : currentCandle.low,
            type: 'SHORT',
            method: 'ORB',
            barIndex: i,
            age: 0,
            pricedMovedAway: false,
          };
        }
      }
    }

    if (!activeOB) continue;

    // Price moved away 체크
    if (!activeOB.pricedMovedAway) {
      const obMid = (activeOB.top + activeOB.bottom) / 2;
      const obSize = activeOB.top - activeOB.bottom;

      const atrPercent = (atr / currentCandle.close) * 100;
      let adjustedMinAwayMult = config.minAwayMultNormal;

      if (atrPercent < 1.0) {
        adjustedMinAwayMult = config.minAwayMultRangebound;
      } else if (atrPercent > 2.0) {
        adjustedMinAwayMult = config.minAwayMultTrending;
      }

      const minDist = obSize * adjustedMinAwayMult;

      if (activeOB.type === 'LONG' && currentCandle.close > obMid + minDist) {
        activeOB.pricedMovedAway = true;
      } else if (activeOB.type === 'SHORT' && currentCandle.close < obMid - minDist) {
        activeOB.pricedMovedAway = true;
      }
    }

    if (!activeOB.pricedMovedAway) continue;

    // 주문 유효시간 체크
    const orderAge = i - activeOB.barIndex;
    if (orderAge > config.orderValidityBars) {
      activeOB = null;
      continue;
    }

    // Retest 체크
    const obMidpoint = (activeOB.top + activeOB.bottom) / 2;
    const priceHitMidpoint = currentCandle.low <= obMidpoint && obMidpoint <= currentCandle.high;

    if (!priceHitMidpoint) continue;

    // Reversal 체크
    if (config.requireReversal) {
      if (activeOB.type === 'LONG' && currentCandle.close <= currentCandle.open) continue;
      if (activeOB.type === 'SHORT' && currentCandle.close >= currentCandle.open) continue;
    }

    // ATR + CVD 필터
    if (config.useATRCVDFilter) {
      const atrPassed = checkATRVolatilityFilter(candles, i, config);
      const cvdPassed = checkCVDFilter(candles, activeOB.type, i, config);

      if (!atrPassed || !cvdPassed) continue;
    }

    // 진입
    const slippageFactor = activeOB.type === 'LONG'
      ? (1 + config.slippage)
      : (1 - config.slippage);
    const entry = obMidpoint * slippageFactor;

    let sl: number, tp1: number;

    if (activeOB.type === 'LONG') {
      sl = activeOB.bottom * (1 - config.slBuffer);
      const risk = entry - sl;
      tp1 = entry + (risk * config.tp1Ratio);
    } else {
      sl = activeOB.top * (1 + config.slBuffer);
      const risk = sl - entry;
      tp1 = entry - (risk * config.tp1Ratio);
    }

    position = {
      entry,
      sl,
      tp1,
      direction: activeOB.type,
      entryTime: currentCandle.timestamp,
      entryBarIndex: i,
    };

    activeOB = null;
  }

  // 결과 계산
  const wins = trades.filter(t => t.isWin).length;
  const losses = trades.length - wins;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    totalPnl,
    avgPnl,
    maxDrawdown,
    profitFactor,
  };
}

// ============================================================
// 메인 최적화 함수
// ============================================================

async function runOptimization() {
  console.log('='.repeat(70));
  console.log('📊 파라미터 최적화 시작');
  console.log('='.repeat(70));

  // 데이터 로딩
  console.log('\n📥 데이터 로딩 중...');
  const allData: Map<string, OHLCV[]> = new Map();
  let loadedSymbols = 0;

  for (const symbol of SYMBOLS) {
    const candles = loadMonthlyData(symbol);
    if (candles.length > 1000) {
      allData.set(symbol, candles);
      loadedSymbols++;
    }
  }

  console.log(`✅ ${loadedSymbols}개 심볼 로드 완료\n`);

  // Baseline 테스트
  console.log('📈 Baseline 테스트 중...');
  let baselineResult: BacktestResult = {
    totalTrades: 0, wins: 0, losses: 0, winRate: 0,
    totalPnl: 0, avgPnl: 0, maxDrawdown: 0, profitFactor: 0,
  };

  for (const [symbol, candles] of allData) {
    const result = runBacktest(candles, BASELINE_CONFIG);
    baselineResult.totalTrades += result.totalTrades;
    baselineResult.wins += result.wins;
    baselineResult.losses += result.losses;
    baselineResult.totalPnl += result.totalPnl;
    baselineResult.maxDrawdown = Math.max(baselineResult.maxDrawdown, result.maxDrawdown);
  }

  baselineResult.winRate = baselineResult.totalTrades > 0
    ? (baselineResult.wins / baselineResult.totalTrades) * 100 : 0;
  baselineResult.avgPnl = baselineResult.totalTrades > 0
    ? baselineResult.totalPnl / baselineResult.totalTrades : 0;

  console.log(`\n${'─'.repeat(70)}`);
  console.log('📊 BASELINE 결과:');
  console.log(`   거래: ${baselineResult.totalTrades}건, 승률: ${baselineResult.winRate.toFixed(1)}%`);
  console.log(`   총 PnL: ${baselineResult.totalPnl.toFixed(1)}%, 평균: ${baselineResult.avgPnl.toFixed(3)}%`);
  console.log(`${'─'.repeat(70)}\n`);

  // Phase 1: 개별 파라미터 최적화
  const optimizedParams: Record<string, { value: number; result: BacktestResult }> = {};
  const allResults: ParameterTest[] = [];

  const paramNames = Object.keys(PARAMETER_RANGES);
  let currentParam = 0;

  for (const [paramName, values] of Object.entries(PARAMETER_RANGES)) {
    currentParam++;
    console.log(`\n[${currentParam}/${paramNames.length}] 🔍 ${paramName} 최적화 중...`);

    let bestValue = (BASELINE_CONFIG as any)[paramName];
    let bestResult = baselineResult;
    let bestScore = baselineResult.avgPnl;

    for (const value of values) {
      const testConfig = { ...BASELINE_CONFIG, [paramName]: value };

      let totalResult: BacktestResult = {
        totalTrades: 0, wins: 0, losses: 0, winRate: 0,
        totalPnl: 0, avgPnl: 0, maxDrawdown: 0, profitFactor: 0,
      };

      for (const [symbol, candles] of allData) {
        const result = runBacktest(candles, testConfig);
        totalResult.totalTrades += result.totalTrades;
        totalResult.wins += result.wins;
        totalResult.losses += result.losses;
        totalResult.totalPnl += result.totalPnl;
        totalResult.maxDrawdown = Math.max(totalResult.maxDrawdown, result.maxDrawdown);
      }

      totalResult.winRate = totalResult.totalTrades > 0
        ? (totalResult.wins / totalResult.totalTrades) * 100 : 0;
      totalResult.avgPnl = totalResult.totalTrades > 0
        ? totalResult.totalPnl / totalResult.totalTrades : 0;

      allResults.push({ paramName, value, result: totalResult });

      // 최적값 선택 기준: totalPnl (총 누적 수익률)
      const score = totalResult.totalPnl;

      if (score > bestScore) {
        bestScore = score;
        bestValue = value;
        bestResult = totalResult;
      }

      const marker = score > baselineResult.totalPnl ? '✅' : '  ';
      process.stdout.write(`${marker} ${value}: 총PnL ${totalResult.totalPnl.toFixed(1)}% (${totalResult.totalTrades}건, WR ${totalResult.winRate.toFixed(1)}%, avg ${totalResult.avgPnl.toFixed(3)}%)\n`);
    }

    optimizedParams[paramName] = { value: bestValue, result: bestResult };

    const improvement = ((bestResult.totalPnl - baselineResult.totalPnl) / Math.abs(baselineResult.totalPnl) * 100);
    console.log(`   → 최적값: ${bestValue} (총PnL: ${bestResult.totalPnl.toFixed(1)}%, ${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%)`);
  }

  // Phase 1 결과 정리
  console.log('\n' + '='.repeat(70));
  console.log('📊 PHASE 1 결과: 개별 파라미터 최적값');
  console.log('='.repeat(70));

  const sortedParams = Object.entries(optimizedParams)
    .sort((a, b) => b[1].result.totalPnl - a[1].result.totalPnl);

  console.log('\n| 파라미터 | 기존값 | 최적값 | Baseline 총PnL | 최적 총PnL | 개선 |');
  console.log('|----------|--------|--------|----------------|------------|------|');

  for (const [paramName, data] of sortedParams) {
    const baselineValue = (BASELINE_CONFIG as any)[paramName];
    const improvement = data.result.totalPnl - baselineResult.totalPnl;
    const improvementPct = (improvement / baselineResult.totalPnl * 100).toFixed(1);
    console.log(`| ${paramName.padEnd(20)} | ${String(baselineValue).padEnd(6)} | ${String(data.value).padEnd(6)} | ${baselineResult.totalPnl.toFixed(0).padStart(14)}% | ${data.result.totalPnl.toFixed(0).padStart(10)}% | ${(improvement >= 0 ? '+' : '') + improvementPct.padStart(5)}% |`);
  }

  // Phase 2: 조합 최적화
  console.log('\n' + '='.repeat(70));
  console.log('📊 PHASE 2: 최적값 조합 테스트');
  console.log('='.repeat(70));

  // 상위 개선 파라미터만 선택 (총 PnL 기준)
  const topParams = sortedParams
    .filter(([, data]) => data.result.totalPnl > baselineResult.totalPnl)
    .slice(0, 8)
    .map(([name, data]) => ({ name, value: data.value }));

  console.log(`\n상위 개선 파라미터 ${topParams.length}개 조합 테스트:`);
  topParams.forEach(p => console.log(`  - ${p.name}: ${p.value}`));

  // 조합 테스트
  const combinedConfig = { ...BASELINE_CONFIG };
  const combinationResults: { params: string[]; result: BacktestResult }[] = [];

  // 누적 조합 테스트
  console.log('\n누적 조합 테스트:');

  for (let n = 1; n <= topParams.length; n++) {
    const paramsToApply = topParams.slice(0, n);
    const testConfig = { ...BASELINE_CONFIG };

    for (const p of paramsToApply) {
      (testConfig as any)[p.name] = p.value;
    }

    let totalResult: BacktestResult = {
      totalTrades: 0, wins: 0, losses: 0, winRate: 0,
      totalPnl: 0, avgPnl: 0, maxDrawdown: 0, profitFactor: 0,
    };

    for (const [, candles] of allData) {
      const result = runBacktest(candles, testConfig);
      totalResult.totalTrades += result.totalTrades;
      totalResult.wins += result.wins;
      totalResult.totalPnl += result.totalPnl;
      totalResult.maxDrawdown = Math.max(totalResult.maxDrawdown, result.maxDrawdown);
    }

    totalResult.winRate = totalResult.totalTrades > 0
      ? (totalResult.wins / totalResult.totalTrades) * 100 : 0;
    totalResult.avgPnl = totalResult.totalTrades > 0
      ? totalResult.totalPnl / totalResult.totalTrades : 0;

    combinationResults.push({
      params: paramsToApply.map(p => p.name),
      result: totalResult,
    });

    const improvement = totalResult.totalPnl - baselineResult.totalPnl;
    const improvementPct = (improvement / baselineResult.totalPnl * 100).toFixed(1);
    console.log(`  [${n}개 조합] 총PnL: ${totalResult.totalPnl.toFixed(0)}% (${improvement >= 0 ? '+' : ''}${improvementPct}%), 거래: ${totalResult.totalTrades}건, WR: ${totalResult.winRate.toFixed(1)}%`);
    console.log(`     파라미터: ${paramsToApply.map(p => `${p.name}=${p.value}`).join(', ')}`);
  }

  // 최적 조합 찾기 (총 PnL 기준)
  const bestCombination = combinationResults.reduce((best, current) =>
    current.result.totalPnl > best.result.totalPnl ? current : best
  );

  // 결과 저장
  const outputDir = path.join(process.cwd(), 'backtest-results', 'optimization');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(outputDir, `param-optimization-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    baseline: {
      config: BASELINE_CONFIG,
      result: baselineResult,
    },
    phase1: {
      description: '개별 파라미터 최적화 결과',
      results: sortedParams.map(([name, data]) => ({
        paramName: name,
        baselineValue: (BASELINE_CONFIG as any)[name],
        optimizedValue: data.value,
        baselineAvgPnl: baselineResult.avgPnl,
        optimizedAvgPnl: data.result.avgPnl,
        improvement: data.result.avgPnl - baselineResult.avgPnl,
        fullResult: data.result,
      })),
    },
    phase2: {
      description: '조합 최적화 결과',
      combinations: combinationResults.map(c => ({
        params: c.params,
        result: c.result,
      })),
      bestCombination: {
        params: bestCombination.params,
        result: bestCombination.result,
        improvement: bestCombination.result.avgPnl - baselineResult.avgPnl,
      },
    },
    recommendedConfig: (() => {
      const config = { ...BASELINE_CONFIG };
      for (const paramName of bestCombination.params) {
        const opt = optimizedParams[paramName];
        if (opt) (config as any)[paramName] = opt.value;
      }
      return config;
    })(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // 최종 결과 출력
  console.log('\n' + '='.repeat(70));
  console.log('🏆 최종 결과');
  console.log('='.repeat(70));

  console.log('\n📊 Baseline vs 최적화:');
  console.log(`   Baseline:  ${baselineResult.totalTrades}건, WR ${baselineResult.winRate.toFixed(1)}%, 총PnL ${baselineResult.totalPnl.toFixed(0)}%`);
  console.log(`   최적화:    ${bestCombination.result.totalTrades}건, WR ${bestCombination.result.winRate.toFixed(1)}%, 총PnL ${bestCombination.result.totalPnl.toFixed(0)}%`);

  const finalImprovement = bestCombination.result.totalPnl - baselineResult.totalPnl;
  const finalImprovementPct = (finalImprovement / baselineResult.totalPnl * 100).toFixed(1);
  console.log(`\n   개선:      ${finalImprovement >= 0 ? '+' : ''}${finalImprovement.toFixed(0)}% (${finalImprovement >= 0 ? '+' : ''}${finalImprovementPct}%)`);

  console.log('\n📝 최적 파라미터 조합:');
  for (const paramName of bestCombination.params) {
    const opt = optimizedParams[paramName];
    if (opt) {
      console.log(`   ${paramName}: ${(BASELINE_CONFIG as any)[paramName]} → ${opt.value}`);
    }
  }

  console.log(`\n💾 결과 저장: ${outputPath}`);
  console.log('='.repeat(70));
}

// 실행
runOptimization().catch(console.error);
