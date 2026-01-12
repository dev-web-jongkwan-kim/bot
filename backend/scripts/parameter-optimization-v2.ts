/**
 * 전체 파라미터 최적화 스크립트 v2
 *
 * 핵심 변경:
 * - 모든 심볼이 하나의 자본($500)을 공유
 * - 시간순 정렬 후 복리 계산
 * - 실제 라이브 트레이딩과 동일한 방식
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

interface Signal {
  symbol: string;
  timestamp: Date;
  direction: 'LONG' | 'SHORT';
  entry: number;
  sl: number;
  tp1: number;
  candleIndex: number;
  candles: OHLCV[];  // 해당 심볼의 캔들 데이터 참조
}

interface Trade {
  symbol: string;
  entryTime: Date;
  exitTime: Date;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  margin: number;
  pnl: number;
  pnlPercent: number;
  capitalBefore: number;
  capitalAfter: number;
  isWin: boolean;
}

interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;  // (finalCapital - initialCapital) / initialCapital * 100
  maxDrawdown: number;
}

// ============================================================
// 기본 설정
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

  // 리스크/리워드
  slBuffer: 0.01,
  tp1Ratio: 1.2,
  leverage: 15,

  // 시간 관리
  maxHoldingBars: 48,
  retryCooldown: 12,

  // ATR + CVD 필터
  useATRCVDFilter: true,
  atrFilterMin: 0.5,
  atrFilterMax: 3.0,
  cvdLookback: 20,

  // 자본 관리
  initialCapital: 500,
  marginPercent: 0.03,  // 자본의 3%를 마진으로 사용
  minMargin: 15,        // 최소 마진 $15
  maxMargin: 50,        // 최대 마진 $50
  maxPositions: 3,      // 동시 최대 포지션 수
  maxCapitalUsage: 0.5, // 전체 자본의 50% 이상 사용 불가

  // 수수료
  makerFee: 0.0004,
  takerFee: 0.00075,
  slippage: 0.0002,
};

// 테스트할 파라미터 범위
const PARAMETER_RANGES: Record<string, number[]> = {
  // ATR + CVD 필터
  atrFilterMin: [0.3, 0.4, 0.5, 0.6, 0.7],
  atrFilterMax: [2.5, 3.0, 3.5, 4.0],
  cvdLookback: [10, 15, 20, 25],

  // 리스크/리워드
  tp1Ratio: [0.8, 1.0, 1.2, 1.5],
  slBuffer: [0.005, 0.0075, 0.01, 0.0125],

  // 레버리지
  leverage: [10, 15, 20],

  // OB 감지
  orbAtr: [1.0, 1.2, 1.5, 1.8],
  orbVol: [1.5, 2.0, 2.5],
  minBodyRatio: [0.4, 0.5, 0.6],

  // 시간 관리
  orderValidityBars: [2, 3, 4, 5],
  maxHoldingBars: [36, 48, 60],
  retryCooldown: [6, 9, 12, 15],

  // 진입 설정
  minAwayMultNormal: [0.5, 0.6, 0.8, 1.0],
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
// 신호 생성 (모든 심볼에서)
// ============================================================

function generateAllSignals(
  allData: Map<string, OHLCV[]>,
  config: typeof BASELINE_CONFIG
): Signal[] {
  const signals: Signal[] = [];

  for (const [symbol, candles] of allData) {
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

    interface OrderBlock {
      top: number;
      bottom: number;
      type: 'LONG' | 'SHORT';
      barIndex: number;
      pricedMovedAway: boolean;
    }

    let activeOB: OrderBlock | null = null;
    let lastSignalIndex = -999;

    for (let i = 700; i < candles.length; i++) {
      const currentCandle = candles[i];
      const atrIdx = i - (candles.length - atrValues.length);
      const volIdx = i - (candles.length - volAvg50.length);
      const smaIdx = i - (candles.length - sma600.length);

      const atr = atrIdx >= 0 ? atrValues[atrIdx] : 0;
      const vol50 = volIdx >= 0 ? volAvg50[volIdx] : 0;
      const sma = smaIdx >= 0 ? sma600[smaIdx] : currentCandle.close;

      if (atr === 0 || vol50 === 0) continue;

      // 쿨다운 체크
      if (i - lastSignalIndex < config.retryCooldown) continue;

      // OB 에이징 및 무효화
      if (activeOB) {
        const age = i - activeOB.barIndex;
        if (age > config.obMaxBars) {
          activeOB = null;
        } else if (activeOB.type === 'LONG' && currentCandle.low < activeOB.bottom) {
          activeOB = null;
        } else if (activeOB.type === 'SHORT' && currentCandle.high > activeOB.top) {
          activeOB = null;
        }
      }

      // OB 감지
      if (!activeOB) {
        const candleRange = currentCandle.high - currentCandle.low;
        const body = Math.abs(currentCandle.close - currentCandle.open);
        const bodyRatio = candleRange > 0 ? body / candleRange : 0;
        const volRatio = currentCandle.volume / vol50;

        if (currentCandle.close > currentCandle.open &&
            candleRange > atr * config.orbAtr &&
            volRatio > config.orbVol &&
            bodyRatio > config.minBodyRatio &&
            currentCandle.close > sma) {
          activeOB = {
            top: config.useBodyOnly ? currentCandle.close : currentCandle.high,
            bottom: config.useBodyOnly ? currentCandle.open : currentCandle.low,
            type: 'LONG',
            barIndex: i,
            pricedMovedAway: false,
          };
        } else if (currentCandle.close < currentCandle.open &&
                   candleRange > atr * config.orbAtr &&
                   volRatio > config.orbVol &&
                   bodyRatio > config.minBodyRatio &&
                   currentCandle.close < sma) {
          activeOB = {
            top: config.useBodyOnly ? currentCandle.open : currentCandle.high,
            bottom: config.useBodyOnly ? currentCandle.close : currentCandle.low,
            type: 'SHORT',
            barIndex: i,
            pricedMovedAway: false,
          };
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

      // 신호 생성
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

      signals.push({
        symbol,
        timestamp: currentCandle.timestamp,
        direction: activeOB.type,
        entry,
        sl,
        tp1,
        candleIndex: i,
        candles,
      });

      lastSignalIndex = i;
      activeOB = null;
    }
  }

  // 시간순 정렬
  signals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return signals;
}

// ============================================================
// 복리 백테스트 실행
// ============================================================

function runCompoundBacktest(
  signals: Signal[],
  config: typeof BASELINE_CONFIG
): BacktestResult {
  const trades: Trade[] = [];
  let capital = config.initialCapital;
  let maxCapital = capital;
  let maxDrawdown = 0;

  // 현재 열린 포지션들 (심볼별)
  const openPositions: Map<string, {
    signal: Signal;
    entryCapital: number;
    margin: number;
  }> = new Map();

  for (const signal of signals) {
    // 먼저 모든 기존 포지션 청산 체크
    for (const [symbol, pos] of openPositions) {
      const exitResult = checkPositionExit(pos.signal, signal.timestamp, config);

      if (exitResult) {
        const pnl = calculatePnL(
          pos.signal,
          exitResult.exitPrice,
          pos.margin,
          config
        );

        const capitalAfter = capital + pnl;

        trades.push({
          symbol,
          entryTime: pos.signal.timestamp,
          exitTime: exitResult.exitTime,
          direction: pos.signal.direction,
          entry: pos.signal.entry,
          exit: exitResult.exitPrice,
          margin: pos.margin,
          pnl,
          pnlPercent: (pnl / pos.margin) * 100,
          capitalBefore: pos.entryCapital,
          capitalAfter,
          isWin: pnl > 0,
        });

        capital = capitalAfter;
        maxCapital = Math.max(maxCapital, capital);
        const drawdown = (maxCapital - capital) / maxCapital * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);

        openPositions.delete(symbol);
      }
    }

    // 이미 해당 심볼에 포지션이 있으면 스킵
    if (openPositions.has(signal.symbol)) continue;

    // 동시 포지션 수 제한
    if (openPositions.size >= config.maxPositions) continue;

    // 마진 계산 (최소/최대 제한)
    let margin = capital * config.marginPercent;
    margin = Math.max(config.minMargin, margin);
    margin = Math.min(config.maxMargin, margin);

    // 사용 중인 총 마진 계산
    let usedMargin = 0;
    for (const [, pos] of openPositions) {
      usedMargin += pos.margin;
    }

    // 전체 자본의 50% 이상 사용 불가
    if (usedMargin + margin > capital * config.maxCapitalUsage) continue;

    // 마진이 자본보다 크면 스킵
    if (margin > capital) continue;

    // 자본이 너무 적으면 스킵
    if (capital < config.minMargin) continue;

    openPositions.set(signal.symbol, {
      signal,
      entryCapital: capital,
      margin,
    });
  }

  // 남은 포지션 강제 청산 (백테스트 종료 시)
  for (const [symbol, pos] of openPositions) {
    const lastCandle = pos.signal.candles[pos.signal.candles.length - 1];
    const exitPrice = lastCandle.close;

    const pnl = calculatePnL(pos.signal, exitPrice, pos.margin, config);
    const capitalAfter = capital + pnl;

    trades.push({
      symbol,
      entryTime: pos.signal.timestamp,
      exitTime: lastCandle.timestamp,
      direction: pos.signal.direction,
      entry: pos.signal.entry,
      exit: exitPrice,
      margin: pos.margin,
      pnl,
      pnlPercent: (pnl / pos.margin) * 100,
      capitalBefore: pos.entryCapital,
      capitalAfter,
      isWin: pnl > 0,
    });

    capital = capitalAfter;
  }

  const wins = trades.filter(t => t.isWin).length;

  return {
    totalTrades: trades.length,
    wins,
    losses: trades.length - wins,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    initialCapital: config.initialCapital,
    finalCapital: capital,
    totalReturn: ((capital - config.initialCapital) / config.initialCapital) * 100,
    maxDrawdown,
  };
}

function checkPositionExit(
  signal: Signal,
  currentTime: Date,
  config: typeof BASELINE_CONFIG
): { exitPrice: number; exitTime: Date } | null {
  const candles = signal.candles;
  const entryIndex = signal.candleIndex;

  // 진입 이후 캔들들 확인
  for (let i = entryIndex + 1; i < candles.length; i++) {
    const candle = candles[i];

    // 현재 시간 이전의 캔들만 확인
    if (candle.timestamp.getTime() > currentTime.getTime()) break;

    const holdingBars = i - entryIndex;

    if (signal.direction === 'LONG') {
      // SL 체크
      if (candle.low <= signal.sl) {
        return { exitPrice: signal.sl, exitTime: candle.timestamp };
      }
      // TP 체크
      if (candle.high >= signal.tp1) {
        return { exitPrice: signal.tp1, exitTime: candle.timestamp };
      }
    } else {
      // SL 체크
      if (candle.high >= signal.sl) {
        return { exitPrice: signal.sl, exitTime: candle.timestamp };
      }
      // TP 체크
      if (candle.low <= signal.tp1) {
        return { exitPrice: signal.tp1, exitTime: candle.timestamp };
      }
    }

    // 타임아웃
    if (holdingBars >= config.maxHoldingBars) {
      return { exitPrice: candle.close, exitTime: candle.timestamp };
    }
  }

  return null;
}

function calculatePnL(
  signal: Signal,
  exitPrice: number,
  margin: number,
  config: typeof BASELINE_CONFIG
): number {
  const positionSize = (margin * config.leverage) / signal.entry;

  const priceDiff = signal.direction === 'LONG'
    ? exitPrice - signal.entry
    : signal.entry - exitPrice;

  const pnlBeforeFee = positionSize * priceDiff;
  const entryFee = positionSize * signal.entry * config.makerFee;
  const exitFee = positionSize * exitPrice * config.takerFee;

  return pnlBeforeFee - entryFee - exitFee;
}

// ============================================================
// 간소화된 백테스트 (파라미터 최적화용)
// ============================================================

function runSimpleBacktest(
  allData: Map<string, OHLCV[]>,
  config: typeof BASELINE_CONFIG
): BacktestResult {
  // 모든 신호 생성
  const signals = generateAllSignals(allData, config);

  // 복리 백테스트 실행
  return runCompoundBacktest(signals, config);
}

// ============================================================
// 메인 최적화 함수
// ============================================================

async function runOptimization() {
  console.log('='.repeat(70));
  console.log('📊 파라미터 최적화 v2 (복리 계산, $500 공유 자본)');
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
  const baselineResult = runSimpleBacktest(allData, BASELINE_CONFIG);

  console.log(`\n${'─'.repeat(70)}`);
  console.log('📊 BASELINE 결과 ($500 시작, 복리):');
  console.log(`   거래: ${baselineResult.totalTrades}건, 승률: ${baselineResult.winRate.toFixed(1)}%`);
  console.log(`   시작: $${baselineResult.initialCapital} → 최종: $${baselineResult.finalCapital.toFixed(2)}`);
  console.log(`   총 수익률: ${baselineResult.totalReturn.toFixed(1)}%, MDD: ${baselineResult.maxDrawdown.toFixed(1)}%`);
  console.log(`${'─'.repeat(70)}\n`);

  // Phase 1: 개별 파라미터 최적화
  const optimizedParams: Record<string, { value: number; result: BacktestResult }> = {};
  const paramNames = Object.keys(PARAMETER_RANGES);
  let currentParam = 0;

  for (const [paramName, values] of Object.entries(PARAMETER_RANGES)) {
    currentParam++;
    console.log(`\n[${currentParam}/${paramNames.length}] 🔍 ${paramName} 최적화 중...`);

    let bestValue = (BASELINE_CONFIG as any)[paramName];
    let bestResult = baselineResult;
    let bestScore = baselineResult.finalCapital;

    for (const value of values) {
      const testConfig = { ...BASELINE_CONFIG, [paramName]: value };
      const result = runSimpleBacktest(allData, testConfig);

      const marker = result.finalCapital > baselineResult.finalCapital ? '✅' : '  ';
      console.log(`${marker} ${value}: $${result.finalCapital.toFixed(0)} (${result.totalTrades}건, WR ${result.winRate.toFixed(1)}%, ROI ${result.totalReturn.toFixed(0)}%)`);

      if (result.finalCapital > bestScore) {
        bestScore = result.finalCapital;
        bestValue = value;
        bestResult = result;
      }
    }

    optimizedParams[paramName] = { value: bestValue, result: bestResult };

    const improvement = ((bestResult.finalCapital - baselineResult.finalCapital) / baselineResult.finalCapital * 100);
    console.log(`   → 최적값: ${bestValue} (최종자본: $${bestResult.finalCapital.toFixed(0)}, ${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%)`);
  }

  // Phase 1 결과 정리
  console.log('\n' + '='.repeat(70));
  console.log('📊 PHASE 1 결과: 개별 파라미터 최적값');
  console.log('='.repeat(70));

  const sortedParams = Object.entries(optimizedParams)
    .sort((a, b) => b[1].result.finalCapital - a[1].result.finalCapital);

  console.log('\n| 파라미터 | 기존값 | 최적값 | Baseline | 최적 | 개선 |');
  console.log('|----------|--------|--------|----------|------|------|');

  for (const [paramName, data] of sortedParams) {
    const baselineValue = (BASELINE_CONFIG as any)[paramName];
    const improvement = ((data.result.finalCapital - baselineResult.finalCapital) / baselineResult.finalCapital * 100);
    console.log(`| ${paramName.padEnd(18)} | ${String(baselineValue).padEnd(6)} | ${String(data.value).padEnd(6)} | $${baselineResult.finalCapital.toFixed(0).padStart(7)} | $${data.result.finalCapital.toFixed(0).padStart(5)} | ${(improvement >= 0 ? '+' : '') + improvement.toFixed(1).padStart(5)}% |`);
  }

  // Phase 2: 조합 최적화
  console.log('\n' + '='.repeat(70));
  console.log('📊 PHASE 2: 최적값 조합 테스트');
  console.log('='.repeat(70));

  const topParams = sortedParams
    .filter(([, data]) => data.result.finalCapital > baselineResult.finalCapital)
    .slice(0, 8)
    .map(([name, data]) => ({ name, value: data.value }));

  console.log(`\n상위 개선 파라미터 ${topParams.length}개 조합 테스트:`);
  topParams.forEach(p => console.log(`  - ${p.name}: ${p.value}`));

  const combinationResults: { params: string[]; result: BacktestResult }[] = [];

  console.log('\n누적 조합 테스트:');

  for (let n = 1; n <= topParams.length; n++) {
    const paramsToApply = topParams.slice(0, n);
    const testConfig = { ...BASELINE_CONFIG };

    for (const p of paramsToApply) {
      (testConfig as any)[p.name] = p.value;
    }

    const result = runSimpleBacktest(allData, testConfig);

    combinationResults.push({
      params: paramsToApply.map(p => p.name),
      result,
    });

    const improvement = ((result.finalCapital - baselineResult.finalCapital) / baselineResult.finalCapital * 100);
    console.log(`  [${n}개] $${result.finalCapital.toFixed(0)} (${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%), ${result.totalTrades}건, WR ${result.winRate.toFixed(1)}%`);
    console.log(`     → ${paramsToApply.map(p => `${p.name}=${p.value}`).join(', ')}`);
  }

  // 최적 조합 찾기
  const bestCombination = combinationResults.reduce((best, current) =>
    current.result.finalCapital > best.result.finalCapital ? current : best
  );

  // 결과 저장
  const outputDir = path.join(process.cwd(), 'backtest-results', 'optimization');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(outputDir, `param-optimization-v2-${timestamp}.json`);

  const recommendedConfig = { ...BASELINE_CONFIG };
  for (const paramName of bestCombination.params) {
    const opt = optimizedParams[paramName];
    if (opt) (recommendedConfig as any)[paramName] = opt.value;
  }

  const output = {
    timestamp: new Date().toISOString(),
    baseline: { config: BASELINE_CONFIG, result: baselineResult },
    phase1: sortedParams.map(([name, data]) => ({
      paramName: name,
      baselineValue: (BASELINE_CONFIG as any)[name],
      optimizedValue: data.value,
      improvement: ((data.result.finalCapital - baselineResult.finalCapital) / baselineResult.finalCapital * 100),
      result: data.result,
    })),
    phase2: {
      combinations: combinationResults,
      bestCombination: {
        params: bestCombination.params,
        result: bestCombination.result,
      },
    },
    recommendedConfig,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // 최종 결과
  console.log('\n' + '='.repeat(70));
  console.log('🏆 최종 결과');
  console.log('='.repeat(70));

  console.log('\n📊 Baseline vs 최적화:');
  console.log(`   Baseline:  $${baselineResult.initialCapital} → $${baselineResult.finalCapital.toFixed(0)} (ROI ${baselineResult.totalReturn.toFixed(0)}%, ${baselineResult.totalTrades}건)`);
  console.log(`   최적화:    $${bestCombination.result.initialCapital} → $${bestCombination.result.finalCapital.toFixed(0)} (ROI ${bestCombination.result.totalReturn.toFixed(0)}%, ${bestCombination.result.totalTrades}건)`);

  const finalImprovement = ((bestCombination.result.finalCapital - baselineResult.finalCapital) / baselineResult.finalCapital * 100);
  console.log(`\n   개선:      $${(bestCombination.result.finalCapital - baselineResult.finalCapital).toFixed(0)} (${finalImprovement >= 0 ? '+' : ''}${finalImprovement.toFixed(1)}%)`);

  console.log('\n📝 최적 파라미터:');
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
