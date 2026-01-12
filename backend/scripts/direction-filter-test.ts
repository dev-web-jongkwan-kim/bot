/**
 * 방향 확인 필터 테스트 스크립트
 * 5개 필터 각각에 대해 백테스트 수행
 *
 * 1. MTF (Multi-Timeframe): 상위 타임프레임 추세 확인
 * 2. Market Structure: 고점/저점 패턴 (HH/HL, LH/LL)
 * 3. RSI: 과매수/과매도 구간 필터
 * 4. Volume Spike: 볼륨 급증 시에만 진입
 * 5. BTC Correlation: BTC 추세와 동일 방향만 진입
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ATR, SMA, RSI } from 'technicalindicators';
import { SimpleTrueOBBacktest } from '../src/backtest/simple-true-ob-backtest';

// 심볼 목록
const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'MATICUSDT', 'ATOMUSDT', 'UNIUSDT', 'LTCUSDT', 'ETCUSDT',
  'XLMUSDT', 'ALGOUSDT', 'NEARUSDT', 'FILUSDT', 'ICPUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'SEIUSDT',
  'AAVEUSDT', 'MKRUSDT', 'SNXUSDT', 'CRVUSDT', 'LDOUSDT',
  'INJUSDT', 'FETUSDT', 'RENDERUSDT', 'AGIXUSDT', 'WLDUSDT',
  'PEOPLEUSDT'
];

interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FilterTestResult {
  filterName: string;
  enabled: boolean;
  totalTrades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  improvement: number;  // baseline 대비 개선율
}

// 캔들 데이터 가져오기
async function fetchCandles(symbol: string, interval: string, limit: number): Promise<OHLCV[]> {
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await axios.get(url);

  return response.data.map((kline: any[]) => ({
    timestamp: new Date(kline[0]),
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
  }));
}

// 필터 함수들

/**
 * 1. MTF (Multi-Timeframe) 필터
 * 1시간봉 SMA200 위/아래로 추세 판단
 */
function checkMTFFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', index: number): boolean {
  // 5분봉 기준으로 1시간봉 데이터 시뮬레이션 (12개 = 1시간)
  const hourlyCandles: OHLCV[] = [];
  const hourlyPeriod = 12;  // 5분 * 12 = 1시간

  for (let i = hourlyPeriod - 1; i <= index; i += hourlyPeriod) {
    const slice = candles.slice(i - hourlyPeriod + 1, i + 1);
    if (slice.length < hourlyPeriod) continue;

    hourlyCandles.push({
      timestamp: slice[slice.length - 1].timestamp,
      open: slice[0].open,
      high: Math.max(...slice.map(c => c.high)),
      low: Math.min(...slice.map(c => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  if (hourlyCandles.length < 50) return true;  // 데이터 부족시 통과

  const closes = hourlyCandles.map(c => c.close);
  const sma50 = SMA.calculate({ period: 50, values: closes });

  if (sma50.length === 0) return true;

  const currentPrice = hourlyCandles[hourlyCandles.length - 1].close;
  const currentSMA = sma50[sma50.length - 1];

  if (obType === 'LONG') {
    return currentPrice > currentSMA;  // 가격이 SMA 위에 있어야 LONG
  } else {
    return currentPrice < currentSMA;  // 가격이 SMA 아래 있어야 SHORT
  }
}

/**
 * 2. Market Structure 필터
 * LONG: Higher High, Higher Low
 * SHORT: Lower High, Lower Low
 */
function checkMarketStructureFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', index: number): boolean {
  if (index < 100) return true;

  const lookback = 50;
  const slice = candles.slice(Math.max(0, index - lookback), index + 1);

  // Swing High/Low 찾기
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];

  for (let i = 2; i < slice.length - 2; i++) {
    if (slice[i].high > slice[i-1].high && slice[i].high > slice[i-2].high &&
        slice[i].high > slice[i+1].high && slice[i].high > slice[i+2].high) {
      swingHighs.push({ index: i, price: slice[i].high });
    }
    if (slice[i].low < slice[i-1].low && slice[i].low < slice[i-2].low &&
        slice[i].low < slice[i+1].low && slice[i].low < slice[i+2].low) {
      swingLows.push({ index: i, price: slice[i].low });
    }
  }

  if (swingHighs.length < 2 || swingLows.length < 2) return true;

  const lastTwoHighs = swingHighs.slice(-2);
  const lastTwoLows = swingLows.slice(-2);

  const higherHigh = lastTwoHighs[1].price > lastTwoHighs[0].price;
  const higherLow = lastTwoLows[1].price > lastTwoLows[0].price;
  const lowerHigh = lastTwoHighs[1].price < lastTwoHighs[0].price;
  const lowerLow = lastTwoLows[1].price < lastTwoLows[0].price;

  if (obType === 'LONG') {
    return higherHigh && higherLow;  // 상승 구조
  } else {
    return lowerHigh && lowerLow;    // 하락 구조
  }
}

/**
 * 3. RSI 필터
 * LONG: RSI < 70 (과매수 아님)
 * SHORT: RSI > 30 (과매도 아님)
 */
function checkRSIFilter(candles: OHLCV[], obType: 'LONG' | 'SHORT', index: number): boolean {
  if (index < 50) return true;

  const slice = candles.slice(Math.max(0, index - 50), index + 1);
  const closes = slice.map(c => c.close);

  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  if (rsiValues.length === 0) return true;

  const currentRSI = rsiValues[rsiValues.length - 1];

  if (obType === 'LONG') {
    return currentRSI < 70;  // 과매수가 아닐 때만 LONG
  } else {
    return currentRSI > 30;  // 과매도가 아닐 때만 SHORT
  }
}

/**
 * 4. Volume Spike 필터
 * 현재 볼륨이 20MA 대비 1.5배 이상
 */
function checkVolumeSpikeFilter(candles: OHLCV[], index: number): boolean {
  if (index < 30) return true;

  const slice = candles.slice(Math.max(0, index - 30), index + 1);
  const volumes = slice.map(c => c.volume);

  const volSMA = SMA.calculate({ period: 20, values: volumes });
  if (volSMA.length === 0) return true;

  const currentVolume = slice[slice.length - 1].volume;
  const avgVolume = volSMA[volSMA.length - 1];

  return currentVolume > avgVolume * 1.5;  // 볼륨 1.5배 이상
}

/**
 * 5. BTC Correlation 필터
 * BTC 추세와 동일한 방향으로만 진입
 */
let btcCandles: OHLCV[] | null = null;

async function loadBTCCandles(): Promise<void> {
  if (!btcCandles) {
    btcCandles = await fetchCandles('BTCUSDT', '5m', 1500);
  }
}

function checkBTCCorrelationFilter(currentTimestamp: Date, obType: 'LONG' | 'SHORT'): boolean {
  if (!btcCandles || btcCandles.length < 100) return true;

  // 현재 시간과 가장 가까운 BTC 캔들 찾기
  const targetTime = currentTimestamp.getTime();
  let closestIndex = btcCandles.length - 1;

  for (let i = btcCandles.length - 1; i >= 0; i--) {
    if (btcCandles[i].timestamp.getTime() <= targetTime) {
      closestIndex = i;
      break;
    }
  }

  if (closestIndex < 50) return true;

  // BTC의 SMA50 계산
  const slice = btcCandles.slice(Math.max(0, closestIndex - 100), closestIndex + 1);
  const closes = slice.map(c => c.close);
  const sma50 = SMA.calculate({ period: 50, values: closes });

  if (sma50.length === 0) return true;

  const btcPrice = slice[slice.length - 1].close;
  const btcSMA = sma50[sma50.length - 1];
  const btcTrend = btcPrice > btcSMA ? 'LONG' : 'SHORT';

  return btcTrend === obType;  // BTC 추세와 동일한 방향만
}

// 필터 적용 백테스트
async function runFilterTest(
  filterName: string,
  filterFn: ((candles: OHLCV[], obType: 'LONG' | 'SHORT', index: number) => boolean) | null
): Promise<FilterTestResult> {
  console.log(`\n📊 Testing filter: ${filterName}`);

  const backtest = new SimpleTrueOBBacktest();
  let totalTrades = 0;
  let totalWins = 0;
  let totalPnl = 0;
  let capital = 500;
  let maxCapital = 500;
  let maxDrawdown = 0;

  // 백테스트 설정 (v11 최적화된 값)
  backtest.setConfig({
    orbAtr: 1.0,
    orbVol: 1.5,
    tp1Ratio: 0.8,
    atrFilterMin: 0.4,
    leverage: 20,
  });

  for (const symbol of SYMBOLS) {
    try {
      const candles = await fetchCandles(symbol, '5m', 1500);

      // 백테스트 실행
      const result = await backtest.runBacktest(
        candles,
        capital,
        false,
        undefined,
        undefined,
        '5m',
        false
      );

      // 필터 적용된 결과만 집계
      let filteredTrades = result.trades;

      if (filterFn) {
        filteredTrades = result.trades.filter(trade => {
          // 해당 트레이드의 진입 시점 인덱스 찾기
          const entryIndex = candles.findIndex(c =>
            c.timestamp.getTime() >= trade.entryTime.getTime()
          );

          if (entryIndex < 0) return true;  // 찾지 못하면 통과

          return filterFn(candles, trade.direction, entryIndex);
        });
      }

      for (const trade of filteredTrades) {
        totalTrades++;
        if (trade.isWin) totalWins++;
        totalPnl += trade.pnl;
        capital += trade.pnl;

        if (capital > maxCapital) maxCapital = capital;
        const drawdown = (maxCapital - capital) / maxCapital * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      process.stdout.write('.');
    } catch (error) {
      console.error(`Error testing ${symbol}: ${error}`);
    }
  }

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

  return {
    filterName,
    enabled: filterFn !== null,
    totalTrades,
    wins: totalWins,
    winRate,
    totalPnl,
    avgPnl,
    maxDrawdown,
    improvement: 0,  // baseline과 비교 후 계산
  };
}

// 메인 함수
async function main() {
  console.log('🚀 Direction Filter Test Started');
  console.log(`📅 Testing ${SYMBOLS.length} symbols`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // BTC 데이터 미리 로드
  await loadBTCCandles();

  const results: FilterTestResult[] = [];

  // 1. Baseline (필터 없음)
  const baseline = await runFilterTest('Baseline (No Filter)', null);
  results.push(baseline);

  // 2. MTF 필터
  const mtfResult = await runFilterTest('MTF (1H SMA50)', checkMTFFilter);
  mtfResult.improvement = baseline.totalPnl > 0
    ? ((mtfResult.totalPnl - baseline.totalPnl) / baseline.totalPnl) * 100
    : 0;
  results.push(mtfResult);

  // 3. Market Structure 필터
  const msResult = await runFilterTest('Market Structure (HH/HL, LH/LL)', checkMarketStructureFilter);
  msResult.improvement = baseline.totalPnl > 0
    ? ((msResult.totalPnl - baseline.totalPnl) / baseline.totalPnl) * 100
    : 0;
  results.push(msResult);

  // 4. RSI 필터
  const rsiResult = await runFilterTest('RSI (30/70)', checkRSIFilter);
  rsiResult.improvement = baseline.totalPnl > 0
    ? ((rsiResult.totalPnl - baseline.totalPnl) / baseline.totalPnl) * 100
    : 0;
  results.push(rsiResult);

  // 5. Volume Spike 필터
  const volResult = await runFilterTest('Volume Spike (1.5x)', checkVolumeSpikeFilter as any);
  volResult.improvement = baseline.totalPnl > 0
    ? ((volResult.totalPnl - baseline.totalPnl) / baseline.totalPnl) * 100
    : 0;
  results.push(volResult);

  // 6. BTC Correlation 필터
  const btcResult = await runFilterTest('BTC Correlation', (candles, obType, index) => {
    const timestamp = candles[index]?.timestamp || new Date();
    return checkBTCCorrelationFilter(timestamp, obType);
  });
  btcResult.improvement = baseline.totalPnl > 0
    ? ((btcResult.totalPnl - baseline.totalPnl) / baseline.totalPnl) * 100
    : 0;
  results.push(btcResult);

  // 결과 출력
  console.log('\n\n📊 FILTER TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Filter                        | Trades | WinRate | Total PnL | Avg PnL | MDD   | Improvement |');
  console.log('|-------------------------------|--------|---------|-----------|---------|-------|-------------|');

  for (const r of results) {
    console.log(
      `| ${r.filterName.padEnd(29)} | ${String(r.totalTrades).padStart(6)} | ${r.winRate.toFixed(1).padStart(6)}% | $${r.totalPnl.toFixed(2).padStart(8)} | $${r.avgPnl.toFixed(2).padStart(6)} | ${r.maxDrawdown.toFixed(1).padStart(4)}% | ${r.improvement >= 0 ? '+' : ''}${r.improvement.toFixed(1).padStart(6)}% |`
    );
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 결과 파일 저장
  const outputDir = path.join(__dirname, '../backtest-results/direction-filter');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(outputDir, `filter-test-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    symbols: SYMBOLS,
    results,
  }, null, 2));

  console.log(`📁 Results saved to: ${outputPath}`);

  // 추천 필터 출력
  const bestFilter = results.slice(1).sort((a, b) => b.improvement - a.improvement)[0];
  if (bestFilter && bestFilter.improvement > 0) {
    console.log(`\n🏆 Best Filter: ${bestFilter.filterName}`);
    console.log(`   Improvement: +${bestFilter.improvement.toFixed(1)}%`);
    console.log(`   Win Rate: ${bestFilter.winRate.toFixed(1)}%`);
  } else {
    console.log('\n⚠️ No filter showed improvement over baseline');
  }
}

main().catch(console.error);
