/**
 * 주문 흐름 필터 30일 백테스트
 * 실제 OI, L/S Ratio 히스토리 데이터 사용
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ATR, SMA } from 'technicalindicators';

const FUTURES_URL = 'https://fapi.binance.com';

// 상위 20개 심볼
const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'ATOMUSDT', 'UNIUSDT', 'LTCUSDT', 'ETCUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'AAVEUSDT', 'INJUSDT',
];

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OIData {
  timestamp: number;
  openInterest: number;
}

interface LSData {
  timestamp: number;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
}

interface Trade {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryTime: number;
  exitTime: number;
  entry: number;
  exit: number;
  pnl: number;
  pnlPercent: number;
  isWin: boolean;
  oiPassed?: boolean;
  lsPassed?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 30일 5분봉 캔들 (30 * 24 * 12 = 8640개, 최대 1500개씩 요청)
async function fetchCandles30d(symbol: string): Promise<OHLCV[]> {
  const allCandles: OHLCV[] = [];
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let endTime = now;

  while (endTime > thirtyDaysAgo) {
    const response = await axios.get(`${FUTURES_URL}/fapi/v1/klines`, {
      params: {
        symbol,
        interval: '5m',
        limit: 1500,
        endTime,
      },
      timeout: 15000,
    });

    if (response.data.length === 0) break;

    const candles = response.data.map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    allCandles.unshift(...candles);
    endTime = candles[0].timestamp - 1;

    await sleep(100);
  }

  // 30일 이내 데이터만
  return allCandles.filter(c => c.timestamp >= thirtyDaysAgo);
}

// OI 히스토리 (5분 간격, 최대 500개 = ~1.7일, 여러번 요청 필요)
async function fetchOIHistory(symbol: string): Promise<OIData[]> {
  const allData: OIData[] = [];
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let startTime = thirtyDaysAgo;

  while (startTime < now) {
    try {
      const response = await axios.get(`${FUTURES_URL}/futures/data/openInterestHist`, {
        params: {
          symbol,
          period: '5m',
          limit: 500,
          startTime,
        },
        timeout: 15000,
      });

      if (response.data.length === 0) break;

      const data = response.data.map((item: any) => ({
        timestamp: item.timestamp,
        openInterest: parseFloat(item.sumOpenInterest),
      }));

      allData.push(...data);
      startTime = data[data.length - 1].timestamp + 1;

      await sleep(200);
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('  Rate limited, waiting 60s...');
        await sleep(60000);
        continue;
      }
      throw error;
    }
  }

  return allData;
}

// L/S Ratio 히스토리
async function fetchLSHistory(symbol: string): Promise<LSData[]> {
  const allData: LSData[] = [];
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let startTime = thirtyDaysAgo;

  while (startTime < now) {
    try {
      const response = await axios.get(`${FUTURES_URL}/futures/data/topLongShortPositionRatio`, {
        params: {
          symbol,
          period: '5m',
          limit: 500,
          startTime,
        },
        timeout: 15000,
      });

      if (response.data.length === 0) break;

      const data = response.data.map((item: any) => ({
        timestamp: item.timestamp,
        longShortRatio: parseFloat(item.longShortRatio),
        longAccount: parseFloat(item.longAccount),
        shortAccount: parseFloat(item.shortAccount),
      }));

      allData.push(...data);
      startTime = data[data.length - 1].timestamp + 1;

      await sleep(200);
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('  Rate limited, waiting 60s...');
        await sleep(60000);
        continue;
      }
      throw error;
    }
  }

  return allData;
}

// OI 필터 체크
function checkOIFilter(
  oiData: OIData[],
  candles: OHLCV[],
  timestamp: number,
  obType: 'LONG' | 'SHORT'
): boolean {
  // 해당 시간 전후의 OI 데이터 찾기
  const nearestOI = oiData.filter(d => Math.abs(d.timestamp - timestamp) < 5 * 60 * 1000);
  if (nearestOI.length < 10) return true; // 데이터 부족 시 통과

  // 최근 10개 OI로 변화율 계산
  const idx = oiData.findIndex(d => d.timestamp >= timestamp);
  if (idx < 10) return true;

  const recent = oiData.slice(idx - 10, idx);
  const oiStart = recent[0].openInterest;
  const oiEnd = recent[recent.length - 1].openInterest;
  const oiChange = (oiEnd - oiStart) / oiStart * 100;

  // 가격 변화
  const candleIdx = candles.findIndex(c => c.timestamp >= timestamp);
  if (candleIdx < 10) return true;

  const priceStart = candles[candleIdx - 10].close;
  const priceEnd = candles[candleIdx].close;
  const priceChange = (priceEnd - priceStart) / priceStart * 100;

  // OI 증가 (>1%) + 가격 방향 일치 = 통과
  if (oiChange > 1) {
    if (obType === 'LONG' && priceChange > 0) return true;
    if (obType === 'SHORT' && priceChange < 0) return true;
    return false; // OI 증가하지만 방향 불일치
  }

  // OI 감소 (< -1%) = 추세 약화
  if (oiChange < -1) return false;

  // OI 안정 = 통과
  return true;
}

// L/S Ratio 필터 체크 (역추세)
function checkLSFilter(
  lsData: LSData[],
  timestamp: number,
  obType: 'LONG' | 'SHORT'
): boolean {
  // 해당 시간의 L/S Ratio 찾기
  const nearestLS = lsData.find(d => Math.abs(d.timestamp - timestamp) < 5 * 60 * 1000);
  if (!nearestLS) return true; // 데이터 없으면 통과

  const ratio = nearestLS.longShortRatio;

  // 롱 과열 (ratio > 2) = SHORT 유리
  if (ratio > 2.0) {
    return obType === 'SHORT';
  }

  // 숏 과열 (ratio < 0.5) = LONG 유리
  if (ratio < 0.5) {
    return obType === 'LONG';
  }

  // 중립 = 통과
  return true;
}

// 간단한 ORB 백테스트
function runSimpleBacktest(
  candles: OHLCV[],
  oiData: OIData[],
  lsData: LSData[],
  useOIFilter: boolean,
  useLSFilter: boolean,
  initialCapital: number
): { trades: Trade[]; finalCapital: number } {
  const trades: Trade[] = [];
  let capital = initialCapital;

  // ATR, Volume SMA 계산
  const atrValues = ATR.calculate({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    period: 14,
  });

  const volSMA = SMA.calculate({
    period: 50,
    values: candles.map(c => c.volume),
  });

  const sma600 = SMA.calculate({
    period: 600,
    values: candles.map(c => c.close),
  });

  let position: {
    direction: 'LONG' | 'SHORT';
    entry: number;
    sl: number;
    tp: number;
    entryTime: number;
    entryIdx: number;
    oiPassed: boolean;
    lsPassed: boolean;
  } | null = null;

  let lastExitIdx = -100;
  const COOLDOWN = 6;

  for (let i = 650; i < candles.length; i++) {
    const candle = candles[i];
    const atr = atrValues[i - (candles.length - atrValues.length)];
    const avgVol = volSMA[i - (candles.length - volSMA.length)];
    const sma = sma600[i - (candles.length - sma600.length)];

    if (!atr || !avgVol || !sma) continue;

    // 포지션 청산 체크
    if (position) {
      let exitPrice: number | null = null;
      let isWin = false;

      if (position.direction === 'LONG') {
        if (candle.high >= position.tp) {
          exitPrice = position.tp;
          isWin = true;
        } else if (candle.low <= position.sl) {
          exitPrice = position.sl;
          isWin = false;
        }
      } else {
        if (candle.low <= position.tp) {
          exitPrice = position.tp;
          isWin = true;
        } else if (candle.high >= position.sl) {
          exitPrice = position.sl;
          isWin = false;
        }
      }

      // 최대 보유 시간 (48캔들 = 4시간)
      if (!exitPrice && i - position.entryIdx >= 48) {
        exitPrice = candle.close;
        isWin = position.direction === 'LONG'
          ? exitPrice > position.entry
          : exitPrice < position.entry;
      }

      if (exitPrice) {
        const pnlPercent = position.direction === 'LONG'
          ? (exitPrice - position.entry) / position.entry * 100
          : (position.entry - exitPrice) / position.entry * 100;

        const margin = 15;
        const leverage = 20;
        const pnl = margin * leverage * (pnlPercent / 100) * 0.997; // 수수료

        capital += pnl;

        trades.push({
          symbol: '',
          direction: position.direction,
          entryTime: position.entryTime,
          exitTime: candle.timestamp,
          entry: position.entry,
          exit: exitPrice,
          pnl,
          pnlPercent,
          isWin,
          oiPassed: position.oiPassed,
          lsPassed: position.lsPassed,
        });

        lastExitIdx = i;
        position = null;
      }
      continue;
    }

    // 쿨다운 체크
    if (i - lastExitIdx < COOLDOWN) continue;

    // ORB 감지
    const candleRange = candle.high - candle.low;
    const body = Math.abs(candle.close - candle.open);
    const bodyRatio = candleRange > 0 ? body / candleRange : 0;
    const volRatio = candle.volume / avgVol;

    // v11 파라미터
    if (candleRange > atr * 1.0 && volRatio > 1.5 && bodyRatio > 0.5) {
      const obType: 'LONG' | 'SHORT' = candle.close > candle.open ? 'LONG' : 'SHORT';

      // SMA 필터
      if (obType === 'LONG' && candle.close < sma) continue;
      if (obType === 'SHORT' && candle.close > sma) continue;

      // OI 필터
      const oiPassed = !useOIFilter || checkOIFilter(oiData, candles, candle.timestamp, obType);

      // L/S Ratio 필터
      const lsPassed = !useLSFilter || checkLSFilter(lsData, candle.timestamp, obType);

      // 필터 적용
      if (!oiPassed || !lsPassed) continue;

      // 진입
      const entry = (candle.close + candle.open) / 2;
      const slBuffer = 0.005;
      const tpRatio = 0.8;

      let sl: number, tp: number;
      if (obType === 'LONG') {
        sl = candle.open * (1 - slBuffer);
        const risk = entry - sl;
        tp = entry + risk * tpRatio;
      } else {
        sl = candle.open * (1 + slBuffer);
        const risk = sl - entry;
        tp = entry - risk * tpRatio;
      }

      position = {
        direction: obType,
        entry,
        sl,
        tp,
        entryTime: candle.timestamp,
        entryIdx: i,
        oiPassed,
        lsPassed,
      };
    }
  }

  return { trades, finalCapital: capital };
}

async function main() {
  console.log('🚀 Order Flow Filter 30-Day Backtest');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: {
    symbol: string;
    baseline: { trades: number; wins: number; pnl: number };
    withOI: { trades: number; wins: number; pnl: number };
    withLS: { trades: number; wins: number; pnl: number };
    withBoth: { trades: number; wins: number; pnl: number };
  }[] = [];

  let totalBaseline = { trades: 0, wins: 0, pnl: 0 };
  let totalWithOI = { trades: 0, wins: 0, pnl: 0 };
  let totalWithLS = { trades: 0, wins: 0, pnl: 0 };
  let totalWithBoth = { trades: 0, wins: 0, pnl: 0 };

  for (const symbol of SYMBOLS) {
    console.log(`\n📊 ${symbol}`);

    try {
      // 데이터 수집
      console.log('  Fetching candles...');
      const candles = await fetchCandles30d(symbol);
      console.log(`  Got ${candles.length} candles`);

      console.log('  Fetching OI history...');
      const oiData = await fetchOIHistory(symbol);
      console.log(`  Got ${oiData.length} OI records`);

      console.log('  Fetching L/S ratio history...');
      const lsData = await fetchLSHistory(symbol);
      console.log(`  Got ${lsData.length} L/S records`);

      // 4가지 테스트
      console.log('  Running backtests...');

      const baseline = runSimpleBacktest(candles, oiData, lsData, false, false, 500);
      const withOI = runSimpleBacktest(candles, oiData, lsData, true, false, 500);
      const withLS = runSimpleBacktest(candles, oiData, lsData, false, true, 500);
      const withBoth = runSimpleBacktest(candles, oiData, lsData, true, true, 500);

      const r = {
        symbol,
        baseline: {
          trades: baseline.trades.length,
          wins: baseline.trades.filter(t => t.isWin).length,
          pnl: baseline.finalCapital - 500,
        },
        withOI: {
          trades: withOI.trades.length,
          wins: withOI.trades.filter(t => t.isWin).length,
          pnl: withOI.finalCapital - 500,
        },
        withLS: {
          trades: withLS.trades.length,
          wins: withLS.trades.filter(t => t.isWin).length,
          pnl: withLS.finalCapital - 500,
        },
        withBoth: {
          trades: withBoth.trades.length,
          wins: withBoth.trades.filter(t => t.isWin).length,
          pnl: withBoth.finalCapital - 500,
        },
      };

      results.push(r);

      // 집계
      totalBaseline.trades += r.baseline.trades;
      totalBaseline.wins += r.baseline.wins;
      totalBaseline.pnl += r.baseline.pnl;

      totalWithOI.trades += r.withOI.trades;
      totalWithOI.wins += r.withOI.wins;
      totalWithOI.pnl += r.withOI.pnl;

      totalWithLS.trades += r.withLS.trades;
      totalWithLS.wins += r.withLS.wins;
      totalWithLS.pnl += r.withLS.pnl;

      totalWithBoth.trades += r.withBoth.trades;
      totalWithBoth.wins += r.withBoth.wins;
      totalWithBoth.pnl += r.withBoth.pnl;

      console.log(`  Baseline: ${r.baseline.trades} trades, ${r.baseline.wins} wins, $${r.baseline.pnl.toFixed(2)}`);
      console.log(`  +OI:      ${r.withOI.trades} trades, ${r.withOI.wins} wins, $${r.withOI.pnl.toFixed(2)}`);
      console.log(`  +LS:      ${r.withLS.trades} trades, ${r.withLS.wins} wins, $${r.withLS.pnl.toFixed(2)}`);
      console.log(`  +Both:    ${r.withBoth.trades} trades, ${r.withBoth.wins} wins, $${r.withBoth.pnl.toFixed(2)}`);

      await sleep(1000);

    } catch (error: any) {
      console.log(`  Error: ${error.message}`);
      await sleep(2000);
    }
  }

  // 최종 결과
  console.log('\n\n📊 FINAL RESULTS (30-Day Backtest)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Filter      | Trades | Wins | Win Rate | Total PnL | vs Baseline |');
  console.log('|-------------|--------|------|----------|-----------|-------------|');

  const baselineWR = totalBaseline.trades > 0 ? (totalBaseline.wins / totalBaseline.trades * 100) : 0;
  const oiWR = totalWithOI.trades > 0 ? (totalWithOI.wins / totalWithOI.trades * 100) : 0;
  const lsWR = totalWithLS.trades > 0 ? (totalWithLS.wins / totalWithLS.trades * 100) : 0;
  const bothWR = totalWithBoth.trades > 0 ? (totalWithBoth.wins / totalWithBoth.trades * 100) : 0;

  console.log(`| Baseline    | ${String(totalBaseline.trades).padStart(6)} | ${String(totalBaseline.wins).padStart(4)} | ${baselineWR.toFixed(1).padStart(7)}% | $${totalBaseline.pnl.toFixed(2).padStart(8)} | -           |`);

  const oiImprove = totalBaseline.pnl !== 0 ? ((totalWithOI.pnl - totalBaseline.pnl) / Math.abs(totalBaseline.pnl) * 100) : 0;
  console.log(`| +OI Filter  | ${String(totalWithOI.trades).padStart(6)} | ${String(totalWithOI.wins).padStart(4)} | ${oiWR.toFixed(1).padStart(7)}% | $${totalWithOI.pnl.toFixed(2).padStart(8)} | ${oiImprove >= 0 ? '+' : ''}${oiImprove.toFixed(1)}%      |`);

  const lsImprove = totalBaseline.pnl !== 0 ? ((totalWithLS.pnl - totalBaseline.pnl) / Math.abs(totalBaseline.pnl) * 100) : 0;
  console.log(`| +LS Filter  | ${String(totalWithLS.trades).padStart(6)} | ${String(totalWithLS.wins).padStart(4)} | ${lsWR.toFixed(1).padStart(7)}% | $${totalWithLS.pnl.toFixed(2).padStart(8)} | ${lsImprove >= 0 ? '+' : ''}${lsImprove.toFixed(1)}%      |`);

  const bothImprove = totalBaseline.pnl !== 0 ? ((totalWithBoth.pnl - totalBaseline.pnl) / Math.abs(totalBaseline.pnl) * 100) : 0;
  console.log(`| +OI+LS Both | ${String(totalWithBoth.trades).padStart(6)} | ${String(totalWithBoth.wins).padStart(4)} | ${bothWR.toFixed(1).padStart(7)}% | $${totalWithBoth.pnl.toFixed(2).padStart(8)} | ${bothImprove >= 0 ? '+' : ''}${bothImprove.toFixed(1)}%      |`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 결과 저장
  const outputDir = path.join(__dirname, '../backtest-results/orderflow-filter');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(outputDir, `orderflow-30d-backtest-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    period: '30 days',
    symbols: SYMBOLS,
    summary: {
      baseline: { ...totalBaseline, winRate: baselineWR },
      withOI: { ...totalWithOI, winRate: oiWR, improvement: oiImprove },
      withLS: { ...totalWithLS, winRate: lsWR, improvement: lsImprove },
      withBoth: { ...totalWithBoth, winRate: bothWR, improvement: bothImprove },
    },
    results,
  }, null, 2));

  console.log(`📁 Results saved to: ${outputPath}`);

  // 추천
  console.log('\n💡 RECOMMENDATION');
  if (bothImprove > 10) {
    console.log('  ✅ OI + L/S 필터 조합 적용 권장');
  } else if (oiImprove > 10 || lsImprove > 10) {
    const best = oiImprove > lsImprove ? 'OI' : 'L/S Ratio';
    console.log(`  ✅ ${best} 필터 단독 적용 권장`);
  } else {
    console.log('  ⚠️ 필터 효과 미미 - 추가 검증 필요');
  }
}

main().catch(console.error);
