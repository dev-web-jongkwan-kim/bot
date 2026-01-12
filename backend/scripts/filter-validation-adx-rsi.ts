/**
 * ADX & RSI 필터 검증 백테스트
 * - ADX: 추세 강도 필터
 * - RSI: 과매수/과매도 필터
 * - data.binance.vision 월별 데이터 사용
 * - 2025년 전체 데이터 대상
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip = require('adm-zip');
import { ATR, SMA, RSI, ADX } from 'technicalindicators';

// ═══════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════

interface OHLCV {
  timestamp: number;
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
  adxValue?: number;
  rsiValue?: number;
  filterScore?: number;
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
  adxValue: number;
  rsiValue: number;
  filters: {
    adxStrong: boolean;
    adxWeak: boolean;
    rsiOversold: boolean;
    rsiOverbought: boolean;
    rsiNeutral: boolean;
  };
}

interface BacktestResult {
  symbol: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  trades: Trade[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════════════════════════════════════

const DATA_DIR = path.join(process.cwd(), 'backtest_data', 'monthly');
const RESULTS_DIR = path.join(process.cwd(), 'backtest-results', 'filter-validation');

// 50개 심볼
const SYMBOLS_50 = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'INJUSDT',
  'SEIUSDT', 'TIAUSDT', 'LDOUSDT', 'AAVEUSDT', 'FILUSDT',
  'FTMUSDT', 'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'GALAUSDT',
  'GMXUSDT', 'DYDXUSDT', 'RUNEUSDT', 'CRVUSDT', 'SNXUSDT',
  '1000PEPEUSDT', '1000SHIBUSDT', 'WIFUSDT', 'BOMEUSDT', 'MEMEUSDT',
  'ORDIUSDT', 'FETUSDT', 'PENDLEUSDT', 'STXUSDT', 'WLDUSDT',
  'PYTHUSDT', 'BLURUSDT', 'CFXUSDT', 'MAGICUSDT', 'BEAMXUSDT'
];

// 백테스트 설정
const CONFIG = {
  // 기본 전략 파라미터
  orbAtr: 1.5,
  orbVol: 2.0,
  minBodyRatio: 0.5,
  rrRatio: 4.0,
  tp1Ratio: 1.2,
  leverage: 15,
  makerFee: 0.0004,
  takerFee: 0.00075,
  slBuffer: 0.01,
  obMaxBars: 60,
  // ADX 파라미터
  adxPeriod: 14,
  adxStrongThreshold: 25,   // 강한 추세
  adxWeakThreshold: 20,     // 약한 추세 (횡보)
  // RSI 파라미터
  rsiPeriod: 14,
  rsiOverbought: 70,        // 과매수
  rsiOversold: 30,          // 과매도
};

// ═══════════════════════════════════════════════════════════════════════════
// 데이터 로더 (이전과 동일)
// ═══════════════════════════════════════════════════════════════════════════

function loadCsvFile(filepath: string): OHLCV[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const candles: OHLCV[] = [];

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 6) {
      const timestamp = parseInt(parts[0]);
      const open = parseFloat(parts[1]);
      const high = parseFloat(parts[2]);
      const low = parseFloat(parts[3]);
      const close = parseFloat(parts[4]);
      const volume = parseFloat(parts[5]);

      if (!isNaN(timestamp) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
        candles.push({ timestamp, open, high, low, close, volume });
      }
    }
  }

  return candles;
}

async function downloadMonthlyData(
  symbol: string,
  interval: string,
  yearMonth: string
): Promise<OHLCV[]> {
  const filename = `${symbol}-${interval}-${yearMonth}.csv`;
  const filepath = path.join(DATA_DIR, filename);

  if (fs.existsSync(filepath)) {
    return loadCsvFile(filepath);
  }

  const url = `https://data.binance.vision/data/futures/um/monthly/klines/${symbol}/${interval}/${symbol}-${interval}-${yearMonth}.zip`;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const zip = new AdmZip(response.data);
    const entries = zip.getEntries();

    if (entries.length === 0) return [];

    const csvContent = entries[0].getData().toString('utf8');
    fs.writeFileSync(filepath, csvContent);

    return loadCsvFile(filepath);
  } catch (error: any) {
    return [];
  }
}

async function loadAllData(
  symbols: string[],
  interval: string,
  months: string[]
): Promise<Map<string, OHLCV[]>> {
  console.log(`\n📥 데이터 로드 중... (${symbols.length}개 심볼)`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dataMap = new Map<string, OHLCV[]>();

  for (const symbol of symbols) {
    const allCandles: OHLCV[] = [];

    for (const month of months) {
      const candles = await downloadMonthlyData(symbol, interval, month);
      allCandles.push(...candles);
      await sleep(50);
    }

    if (allCandles.length > 0) {
      const uniqueCandles = Array.from(
        new Map(allCandles.map(c => [c.timestamp, c])).values()
      ).sort((a, b) => a.timestamp - b.timestamp);

      dataMap.set(symbol, uniqueCandles);
      console.log(`  ✅ ${symbol}: ${uniqueCandles.length} candles`);
    }
  }

  return dataMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// 필터 구현
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ADX 필터 체크
 * - adxStrong: ADX > 25 (강한 추세)
 * - adxWeak: ADX < 20 (약한 추세/횡보)
 */
function checkADX(adxValue: number): { adxStrong: boolean; adxWeak: boolean } {
  return {
    adxStrong: adxValue >= CONFIG.adxStrongThreshold,
    adxWeak: adxValue < CONFIG.adxWeakThreshold,
  };
}

/**
 * RSI 필터 체크
 * - LONG 진입 시: RSI가 과매수(70+)가 아니어야 함
 * - SHORT 진입 시: RSI가 과매도(30-)가 아니어야 함
 * - 역추세 진입: RSI 극단값에서 반전 진입 (과매도에서 LONG, 과매수에서 SHORT)
 */
function checkRSI(rsiValue: number, direction: 'LONG' | 'SHORT'): {
  rsiOversold: boolean;
  rsiOverbought: boolean;
  rsiNeutral: boolean;
  allowEntry: boolean;
  contrarian: boolean;
} {
  const rsiOversold = rsiValue <= CONFIG.rsiOversold;
  const rsiOverbought = rsiValue >= CONFIG.rsiOverbought;
  const rsiNeutral = !rsiOversold && !rsiOverbought;

  // 기본: 추세 방향과 맞는지 체크
  let allowEntry = true;
  if (direction === 'LONG' && rsiOverbought) {
    allowEntry = false; // 과매수에서 LONG 금지
  }
  if (direction === 'SHORT' && rsiOversold) {
    allowEntry = false; // 과매도에서 SHORT 금지
  }

  // 역추세: 극단값에서 반전 진입
  const contrarian = (direction === 'LONG' && rsiOversold) ||
                     (direction === 'SHORT' && rsiOverbought);

  return { rsiOversold, rsiOverbought, rsiNeutral, allowEntry, contrarian };
}

// ═══════════════════════════════════════════════════════════════════════════
// 백테스트 엔진
// ═══════════════════════════════════════════════════════════════════════════

function runBacktest(
  symbol: string,
  candles: OHLCV[],
  filterConfig: {
    useADXStrong: boolean;      // ADX > 25에서만 진입
    useADXWeak: boolean;        // ADX < 20에서만 진입 (횡보장)
    useRSIFilter: boolean;      // RSI 과매수/과매도 필터
    useRSIContrarian: boolean;  // RSI 역추세 진입
  }
): BacktestResult {
  const trades: Trade[] = [];
  const MIN_CANDLES = 700;

  if (candles.length < MIN_CANDLES) {
    return { symbol, totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, trades: [] };
  }

  // 지표 계산
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const volumeAvg50 = SMA.calculate({ period: 50, values: volumes });
  const sma600 = SMA.calculate({ period: 600, values: closes });

  // ADX 계산
  const adxValues = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: CONFIG.adxPeriod,
  });

  // RSI 계산
  const rsiValues = RSI.calculate({
    values: closes,
    period: CONFIG.rsiPeriod,
  });

  let activeOB: OrderBlock | null = null;
  let position: {
    entry: number;
    sl: number;
    tp: number;
    direction: 'LONG' | 'SHORT';
    entryTime: number;
    entryBarIndex: number;
    adxValue: number;
    rsiValue: number;
    filters: {
      adxStrong: boolean;
      adxWeak: boolean;
      rsiOversold: boolean;
      rsiOverbought: boolean;
      rsiNeutral: boolean;
    };
  } | null = null;

  // 캔들 순회
  for (let i = MIN_CANDLES; i < candles.length; i++) {
    const currentCandle = candles[i];
    const atrIdx = i - (candles.length - atrValues.length);
    const volIdx = i - (candles.length - volumeAvg50.length);
    const smaIdx = i - (candles.length - sma600.length);
    const adxIdx = i - (candles.length - adxValues.length);
    const rsiIdx = i - (candles.length - rsiValues.length);

    const atr = atrValues[atrIdx] || 0;
    const volAvg50 = volumeAvg50[volIdx] || 0;
    const sma = sma600[smaIdx] || currentCandle.close;
    const adxValue = adxValues[adxIdx]?.adx || 0;
    const rsiValue = rsiValues[rsiIdx] || 50;

    if (atr === 0 || volAvg50 === 0) continue;

    // 포지션 청산 체크
    if (position) {
      let exitPrice: number | null = null;
      let isWin = false;

      if (position.direction === 'LONG') {
        if (currentCandle.high >= position.tp) {
          exitPrice = position.tp;
          isWin = true;
        } else if (currentCandle.low <= position.sl) {
          exitPrice = position.sl;
          isWin = false;
        }
      } else {
        if (currentCandle.low <= position.tp) {
          exitPrice = position.tp;
          isWin = true;
        } else if (currentCandle.high >= position.sl) {
          exitPrice = position.sl;
          isWin = false;
        }
      }

      if (exitPrice !== null) {
        const pnl = position.direction === 'LONG'
          ? (exitPrice - position.entry) / position.entry * CONFIG.leverage
          : (position.entry - exitPrice) / position.entry * CONFIG.leverage;

        trades.push({
          entryTime: new Date(position.entryTime),
          exitTime: new Date(currentCandle.timestamp),
          direction: position.direction,
          entry: position.entry,
          exit: exitPrice,
          pnl: pnl * 100,
          pnlPercent: pnl * 100,
          isWin,
          adxValue: position.adxValue,
          rsiValue: position.rsiValue,
          filters: position.filters,
        });

        position = null;
        activeOB = null;
      }
    }

    // 포지션 없을 때만 OB 감지
    if (!position) {
      // OB 에이징 및 무효화
      if (activeOB) {
        activeOB.age = i - activeOB.barIndex;
        if (activeOB.age > CONFIG.obMaxBars) {
          activeOB = null;
        } else if (activeOB.type === 'LONG' && currentCandle.low < activeOB.bottom) {
          activeOB = null;
        } else if (activeOB.type === 'SHORT' && currentCandle.high > activeOB.top) {
          activeOB = null;
        }
      }

      // ORB 감지
      const candleRange = currentCandle.high - currentCandle.low;
      const body = Math.abs(currentCandle.close - currentCandle.open);
      const bodyRatio = candleRange > 0 ? body / candleRange : 0;
      const volRatio = currentCandle.volume / volAvg50;

      let newOB: OrderBlock | null = null;

      // Bullish ORB
      if (
        currentCandle.close > currentCandle.open &&
        candleRange > atr * CONFIG.orbAtr &&
        volRatio > CONFIG.orbVol &&
        bodyRatio > CONFIG.minBodyRatio &&
        currentCandle.close > sma
      ) {
        newOB = {
          top: currentCandle.close,
          bottom: currentCandle.open,
          type: 'LONG',
          method: 'ORB',
          barIndex: i,
          age: 0,
          pricedMovedAway: false,
          adxValue,
          rsiValue,
        };
      }
      // Bearish ORB
      else if (
        currentCandle.close < currentCandle.open &&
        candleRange > atr * CONFIG.orbAtr &&
        volRatio > CONFIG.orbVol &&
        bodyRatio > CONFIG.minBodyRatio &&
        currentCandle.close < sma
      ) {
        newOB = {
          top: currentCandle.open,
          bottom: currentCandle.close,
          type: 'SHORT',
          method: 'ORB',
          barIndex: i,
          age: 0,
          pricedMovedAway: false,
          adxValue,
          rsiValue,
        };
      }

      if (newOB && !activeOB) {
        // ADX 필터 체크
        const adxCheck = checkADX(adxValue);

        // RSI 필터 체크
        const rsiCheck = checkRSI(rsiValue, newOB.type);

        // 필터 적용
        let passFilters = true;

        // ADX 필터
        if (filterConfig.useADXStrong && !adxCheck.adxStrong) {
          passFilters = false;
        }
        if (filterConfig.useADXWeak && !adxCheck.adxWeak) {
          passFilters = false;
        }

        // RSI 필터
        if (filterConfig.useRSIFilter && !rsiCheck.allowEntry) {
          passFilters = false;
        }
        if (filterConfig.useRSIContrarian && !rsiCheck.contrarian) {
          passFilters = false;
        }

        if (passFilters) {
          newOB.filterScore = 0;
          if (adxCheck.adxStrong) newOB.filterScore += 25;
          if (rsiCheck.rsiNeutral) newOB.filterScore += 25;
          activeOB = newOB;
        }
      }

      // 리테스트 체크 및 진입
      if (activeOB && activeOB.pricedMovedAway) {
        const obMid = (activeOB.top + activeOB.bottom) / 2;

        if (currentCandle.low <= obMid && obMid <= currentCandle.high) {
          const isReversal = activeOB.type === 'LONG'
            ? currentCandle.close > currentCandle.open
            : currentCandle.close < currentCandle.open;

          if (isReversal) {
            const entry = obMid;
            let sl: number, tp: number;

            if (activeOB.type === 'LONG') {
              sl = activeOB.bottom * (1 - CONFIG.slBuffer);
              const risk = entry - sl;
              tp = entry + risk * CONFIG.tp1Ratio;
            } else {
              sl = activeOB.top * (1 + CONFIG.slBuffer);
              const risk = sl - entry;
              tp = entry - risk * CONFIG.tp1Ratio;
            }

            const adxCheck = checkADX(activeOB.adxValue || 0);
            const rsiCheck = checkRSI(activeOB.rsiValue || 50, activeOB.type);

            position = {
              entry,
              sl,
              tp,
              direction: activeOB.type,
              entryTime: currentCandle.timestamp,
              entryBarIndex: i,
              adxValue: activeOB.adxValue || 0,
              rsiValue: activeOB.rsiValue || 50,
              filters: {
                adxStrong: adxCheck.adxStrong,
                adxWeak: adxCheck.adxWeak,
                rsiOversold: rsiCheck.rsiOversold,
                rsiOverbought: rsiCheck.rsiOverbought,
                rsiNeutral: rsiCheck.rsiNeutral,
              },
            };
          }
        }
      }

      // 가격이 OB에서 이탈했는지 체크
      if (activeOB && !activeOB.pricedMovedAway) {
        const obMid = (activeOB.top + activeOB.bottom) / 2;
        const obSize = activeOB.top - activeOB.bottom;
        const minDist = obSize * 0.5;

        if (activeOB.type === 'LONG' && currentCandle.close > obMid + minDist) {
          activeOB.pricedMovedAway = true;
        } else if (activeOB.type === 'SHORT' && currentCandle.close < obMid - minDist) {
          activeOB.pricedMovedAway = true;
        }
      }
    }
  }

  const wins = trades.filter(t => t.isWin).length;
  const losses = trades.length - wins;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  return {
    symbol,
    totalTrades: trades.length,
    wins,
    losses,
    winRate,
    totalPnl,
    trades,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('═'.repeat(80));
  console.log('ADX & RSI 필터 검증 백테스트');
  console.log('═'.repeat(80));
  console.log(`심볼: ${SYMBOLS_50.length}개`);
  console.log(`기간: 2025년 1월~11월`);
  console.log(`ADX: Period=${CONFIG.adxPeriod}, Strong≥${CONFIG.adxStrongThreshold}, Weak<${CONFIG.adxWeakThreshold}`);
  console.log(`RSI: Period=${CONFIG.rsiPeriod}, Overbought≥${CONFIG.rsiOverbought}, Oversold≤${CONFIG.rsiOversold}`);
  console.log('═'.repeat(80));

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const months = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'
  ];

  const dataMap = await loadAllData(SYMBOLS_50, '5m', months);
  console.log(`\n✅ 데이터 로드 완료: ${dataMap.size}개 심볼`);

  // 필터 조합 정의
  const filterCombinations: {
    name: string;
    config: { useADXStrong: boolean; useADXWeak: boolean; useRSIFilter: boolean; useRSIContrarian: boolean };
  }[] = [
    // 기본 (필터 없음)
    { name: 'Baseline (No Filters)', config: { useADXStrong: false, useADXWeak: false, useRSIFilter: false, useRSIContrarian: false } },

    // ADX 단독
    { name: 'ADX Strong Only (≥25)', config: { useADXStrong: true, useADXWeak: false, useRSIFilter: false, useRSIContrarian: false } },
    { name: 'ADX Weak Only (<20, 횡보)', config: { useADXStrong: false, useADXWeak: true, useRSIFilter: false, useRSIContrarian: false } },

    // RSI 단독
    { name: 'RSI Filter (과매수/과매도 회피)', config: { useADXStrong: false, useADXWeak: false, useRSIFilter: true, useRSIContrarian: false } },
    { name: 'RSI Contrarian (역추세)', config: { useADXStrong: false, useADXWeak: false, useRSIFilter: false, useRSIContrarian: true } },

    // ADX + RSI 조합
    { name: 'ADX Strong + RSI Filter', config: { useADXStrong: true, useADXWeak: false, useRSIFilter: true, useRSIContrarian: false } },
    { name: 'ADX Strong + RSI Contrarian', config: { useADXStrong: true, useADXWeak: false, useRSIFilter: false, useRSIContrarian: true } },
    { name: 'ADX Weak + RSI Filter', config: { useADXStrong: false, useADXWeak: true, useRSIFilter: true, useRSIContrarian: false } },
    { name: 'ADX Weak + RSI Contrarian', config: { useADXStrong: false, useADXWeak: true, useRSIFilter: false, useRSIContrarian: true } },
  ];

  const allResults: {
    combination: string;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalPnl: number;
    avgPnl: number;
    symbolResults: BacktestResult[];
  }[] = [];

  // 각 필터 조합에 대해 백테스트 실행
  for (const combo of filterCombinations) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 테스트: ${combo.name}`);
    console.log(`${'─'.repeat(60)}`);

    const symbolResults: BacktestResult[] = [];
    let totalTrades = 0;
    let totalWins = 0;
    let totalPnl = 0;

    const entries = Array.from(dataMap.entries());
    for (const [symbol, candles] of entries) {
      const result = runBacktest(symbol, candles, combo.config);
      symbolResults.push(result);

      totalTrades += result.totalTrades;
      totalWins += result.wins;
      totalPnl += result.totalPnl;

      if (result.totalTrades > 0) {
        console.log(`  ${symbol}: ${result.totalTrades} trades, ${result.winRate.toFixed(1)}% WR, ${result.totalPnl.toFixed(2)}% PnL`);
      }
    }

    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

    allResults.push({
      combination: combo.name,
      totalTrades,
      wins: totalWins,
      losses: totalTrades - totalWins,
      winRate,
      totalPnl,
      avgPnl,
      symbolResults,
    });

    console.log(`\n  📈 합계: ${totalTrades} trades, ${winRate.toFixed(1)}% WR, ${totalPnl.toFixed(2)}% PnL`);
  }

  // 결과 정렬 (승률 기준)
  allResults.sort((a, b) => b.winRate - a.winRate);

  // 결과 출력
  console.log('\n' + '═'.repeat(80));
  console.log('📊 ADX & RSI 필터 검증 결과 요약');
  console.log('═'.repeat(80));
  console.log('\n승률 기준 정렬:\n');
  console.log('| 순위 | 필터 조합 | 거래수 | 승 | 패 | 승률 | 총 PnL | 평균 PnL |');
  console.log('|------|----------|--------|-----|-----|------|--------|----------|');

  allResults.forEach((r, idx) => {
    console.log(
      `| ${(idx + 1).toString().padStart(4)} | ${r.combination.padEnd(35)} | ${r.totalTrades.toString().padStart(6)} | ${r.wins.toString().padStart(4)} | ${r.losses.toString().padStart(4)} | ${r.winRate.toFixed(1).padStart(5)}% | ${r.totalPnl.toFixed(1).padStart(8)}% | ${r.avgPnl.toFixed(2).padStart(8)}% |`
    );
  });

  // Baseline 대비 개선도
  const baseline = allResults.find(r => r.combination === 'Baseline (No Filters)')!;
  console.log('\n' + '═'.repeat(80));
  console.log('📈 Baseline 대비 개선도');
  console.log('═'.repeat(80));
  console.log('\n| 필터 조합 | 승률 변화 | PnL 변화 | 거래 감소율 |');
  console.log('|----------|----------|---------|------------|');

  allResults.forEach(r => {
    if (r.combination === 'Baseline (No Filters)') return;

    const winRateChange = r.winRate - baseline.winRate;
    const pnlChange = r.totalPnl - baseline.totalPnl;
    const tradeReduction = baseline.totalTrades > 0
      ? ((baseline.totalTrades - r.totalTrades) / baseline.totalTrades) * 100
      : 0;

    const winRateStr = (winRateChange >= 0 ? '+' : '') + winRateChange.toFixed(1) + '%p';
    const pnlStr = (pnlChange >= 0 ? '+' : '') + pnlChange.toFixed(1) + '%';

    console.log(
      `| ${r.combination.padEnd(35)} | ${winRateStr.padStart(8)} | ${pnlStr.padStart(10)} | ${tradeReduction.toFixed(1).padStart(6)}% |`
    );
  });

  // 결과 파일 저장
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resultFile = path.join(RESULTS_DIR, `adx-rsi-validation-${timestamp}.json`);

  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    symbols: SYMBOLS_50,
    months,
    config: CONFIG,
    results: allResults,
    baseline: {
      totalTrades: baseline.totalTrades,
      winRate: baseline.winRate,
      totalPnl: baseline.totalPnl,
    },
  }, null, 2));

  console.log(`\n✅ 결과 저장: ${resultFile}`);

  // 추천 필터 조합
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 추천 필터 조합');
  console.log('═'.repeat(80));

  const recommended = allResults.filter(r => {
    if (r.combination === 'Baseline (No Filters)') return false;
    const winRateImprovement = r.winRate - baseline.winRate;
    const tradeRetention = baseline.totalTrades > 0 ? r.totalTrades / baseline.totalTrades : 0;
    return winRateImprovement >= 2 && tradeRetention >= 0.2;
  });

  if (recommended.length > 0) {
    console.log('\n조건: 승률 2%p 이상 개선 + 거래 20% 이상 유지\n');
    recommended.forEach((r, idx) => {
      const winRateChange = r.winRate - baseline.winRate;
      const tradeRetention = ((r.totalTrades / baseline.totalTrades) * 100).toFixed(0);
      console.log(`${idx + 1}. ${r.combination}`);
      console.log(`   승률: ${r.winRate.toFixed(1)}% (+${winRateChange.toFixed(1)}%p)`);
      console.log(`   거래: ${r.totalTrades}건 (${tradeRetention}% 유지)`);
      console.log(`   PnL: ${r.totalPnl.toFixed(1)}%`);
      console.log('');
    });
  } else {
    console.log('\n조건을 만족하는 필터 조합이 없습니다.');
    console.log('\n가장 성과가 좋은 필터:');
    const best = allResults.filter(r => r.combination !== 'Baseline (No Filters)')[0];
    if (best) {
      console.log(`  ${best.combination}: ${best.winRate.toFixed(1)}% WR, ${best.totalPnl.toFixed(1)}% PnL`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('백테스트 완료');
  console.log('═'.repeat(80));
}

main().catch(console.error);
