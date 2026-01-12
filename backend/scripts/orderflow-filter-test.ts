/**
 * 주문 흐름 필터 테스트 스크립트
 * 바이낸스 실제 데이터 기반
 *
 * 1. Open Interest: OI 변화율로 추세 강도 판단
 * 2. Order Book Imbalance: 매수/매도 벽 비율
 * 3. Taker Buy/Sell Ratio: 실제 체결 방향
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ATR, SMA } from 'technicalindicators';

const FUTURES_URL = 'https://fapi.binance.com';

// 심볼 목록 (Rate Limit 고려하여 상위 20개만)
const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'MATICUSDT', 'ATOMUSDT', 'UNIUSDT', 'LTCUSDT', 'ETCUSDT',
  'XLMUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
];

interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OpenInterestData {
  symbol: string;
  openInterest: number;
  timestamp: number;
}

interface OrderBookData {
  symbol: string;
  bidTotal: number;  // 총 매수 대기
  askTotal: number;  // 총 매도 대기
  imbalance: number; // (bid - ask) / (bid + ask)
  timestamp: number;
}

interface TakerRatioData {
  symbol: string;
  buySellRatio: number;  // >1 = 매수 우세, <1 = 매도 우세
  buyVol: number;
  sellVol: number;
  timestamp: number;
}

interface FilterTestResult {
  filterName: string;
  totalSignals: number;
  passedSignals: number;
  passRate: number;
  avgWinRateEstimate: number;  // 필터 통과 신호의 예상 승률
  recommendation: string;
}

// 유틸리티: sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 캔들 데이터 가져오기
async function fetchCandles(symbol: string, interval: string, limit: number): Promise<OHLCV[]> {
  const url = `${FUTURES_URL}/fapi/v1/klines`;
  const response = await axios.get(url, {
    params: { symbol, interval, limit },
    timeout: 10000,
  });

  return response.data.map((kline: any[]) => ({
    timestamp: new Date(kline[0]),
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
  }));
}

// 1. Open Interest 현재값 조회
async function getOpenInterest(symbol: string): Promise<OpenInterestData> {
  const response = await axios.get(`${FUTURES_URL}/fapi/v1/openInterest`, {
    params: { symbol },
    timeout: 10000,
  });

  return {
    symbol,
    openInterest: parseFloat(response.data.openInterest),
    timestamp: response.data.time,
  };
}

// 1-1. Open Interest 히스토리 조회
async function getOpenInterestHistory(
  symbol: string,
  period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' = '5m',
  limit: number = 100
): Promise<OpenInterestData[]> {
  const response = await axios.get(`${FUTURES_URL}/futures/data/openInterestHist`, {
    params: { symbol, period, limit },
    timeout: 10000,
  });

  return response.data.map((item: any) => ({
    symbol,
    openInterest: parseFloat(item.sumOpenInterest),
    timestamp: item.timestamp,
  }));
}

// 2. Order Book Depth 조회
async function getOrderBookDepth(symbol: string, limit: number = 100): Promise<OrderBookData> {
  const response = await axios.get(`${FUTURES_URL}/fapi/v1/depth`, {
    params: { symbol, limit },
    timeout: 10000,
  });

  // 상위 N개 레벨의 총 물량 합산
  const bidTotal = response.data.bids
    .slice(0, 20)
    .reduce((sum: number, [price, qty]: [string, string]) => sum + parseFloat(qty) * parseFloat(price), 0);

  const askTotal = response.data.asks
    .slice(0, 20)
    .reduce((sum: number, [price, qty]: [string, string]) => sum + parseFloat(qty) * parseFloat(price), 0);

  const imbalance = (bidTotal - askTotal) / (bidTotal + askTotal);

  return {
    symbol,
    bidTotal,
    askTotal,
    imbalance,  // -1 to 1, 양수면 매수 우세
    timestamp: Date.now(),
  };
}

// 3. Taker Buy/Sell Volume 조회
async function getTakerBuySellRatio(
  symbol: string,
  period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' = '5m',
  limit: number = 1
): Promise<TakerRatioData> {
  const response = await axios.get(`${FUTURES_URL}/futures/data/takerlongshortRatio`, {
    params: { symbol, period, limit },
    timeout: 10000,
  });

  if (response.data.length === 0) {
    throw new Error(`No taker ratio data for ${symbol}`);
  }

  const latest = response.data[0];
  return {
    symbol,
    buySellRatio: parseFloat(latest.buySellRatio),
    buyVol: parseFloat(latest.buyVol),
    sellVol: parseFloat(latest.sellVol),
    timestamp: latest.timestamp,
  };
}

// Long/Short Ratio 조회 (이미 구현된 것 재사용)
async function getLongShortRatio(symbol: string): Promise<{ ratio: number; longAccount: number; shortAccount: number }> {
  const response = await axios.get(`${FUTURES_URL}/futures/data/topLongShortPositionRatio`, {
    params: { symbol, period: '5m', limit: 1 },
    timeout: 10000,
  });

  if (response.data.length === 0) {
    throw new Error(`No long/short ratio data for ${symbol}`);
  }

  const latest = response.data[0];
  return {
    ratio: parseFloat(latest.longShortRatio),
    longAccount: parseFloat(latest.longAccount),
    shortAccount: parseFloat(latest.shortAccount),
  };
}

// 종합 시장 데이터 수집
async function collectMarketData(symbol: string): Promise<{
  candles: OHLCV[];
  oiHistory: OpenInterestData[];
  orderBook: OrderBookData;
  takerRatio: TakerRatioData;
  longShortRatio: { ratio: number; longAccount: number; shortAccount: number };
}> {
  // Rate limit 고려하여 순차 요청
  const candles = await fetchCandles(symbol, '5m', 200);
  await sleep(100);

  const oiHistory = await getOpenInterestHistory(symbol, '5m', 50);
  await sleep(100);

  const orderBook = await getOrderBookDepth(symbol, 100);
  await sleep(100);

  const takerRatio = await getTakerBuySellRatio(symbol, '5m', 1);
  await sleep(100);

  const longShortRatio = await getLongShortRatio(symbol);

  return { candles, oiHistory, orderBook, takerRatio, longShortRatio };
}

// OB 감지 (간단 버전 - ORB만)
function detectOB(candles: OHLCV[]): { type: 'LONG' | 'SHORT'; index: number } | null {
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

  // 최근 50개 캔들에서 OB 찾기
  for (let i = candles.length - 1; i >= candles.length - 50 && i >= 14; i--) {
    const candle = candles[i];
    const atr = atrValues[i - (candles.length - atrValues.length)];
    const avgVol = volSMA[i - (candles.length - volSMA.length)];

    if (!atr || !avgVol) continue;

    const candleRange = candle.high - candle.low;
    const body = Math.abs(candle.close - candle.open);
    const bodyRatio = candleRange > 0 ? body / candleRange : 0;
    const volRatio = candle.volume / avgVol;

    // ORB 조건 (v11 파라미터)
    if (candleRange > atr * 1.0 && volRatio > 1.5 && bodyRatio > 0.5) {
      if (candle.close > candle.open) {
        return { type: 'LONG', index: i };
      } else {
        return { type: 'SHORT', index: i };
      }
    }
  }

  return null;
}

// 필터 테스트 함수들

/**
 * 1. Open Interest 필터
 * OI 증가 + 가격 상승 = LONG 강화
 * OI 증가 + 가격 하락 = SHORT 강화
 * OI 감소 = 추세 약화 (신호 제외)
 */
function checkOpenInterestFilter(
  oiHistory: OpenInterestData[],
  candles: OHLCV[],
  obType: 'LONG' | 'SHORT'
): { passed: boolean; reason: string; oiChange: number } {
  if (oiHistory.length < 10) {
    return { passed: true, reason: 'Insufficient OI data', oiChange: 0 };
  }

  // 최근 10개 OI 변화율
  const recent = oiHistory.slice(-10);
  const oiStart = recent[0].openInterest;
  const oiEnd = recent[recent.length - 1].openInterest;
  const oiChange = (oiEnd - oiStart) / oiStart * 100;

  // 가격 변화
  const priceStart = candles[candles.length - 10]?.close || candles[candles.length - 1].close;
  const priceEnd = candles[candles.length - 1].close;
  const priceChange = (priceEnd - priceStart) / priceStart * 100;

  // OI 증가 (>1%) + 가격 방향 일치 = 강한 신호
  if (oiChange > 1) {
    if (obType === 'LONG' && priceChange > 0) {
      return { passed: true, reason: 'OI up + Price up = Strong LONG', oiChange };
    }
    if (obType === 'SHORT' && priceChange < 0) {
      return { passed: true, reason: 'OI up + Price down = Strong SHORT', oiChange };
    }
    // OI 증가하지만 방향 불일치 = 약한 신호
    return { passed: false, reason: 'OI up but price direction mismatch', oiChange };
  }

  // OI 감소 (< -1%) = 추세 약화
  if (oiChange < -1) {
    return { passed: false, reason: 'OI decreasing = Weak trend', oiChange };
  }

  // OI 변화 미미 = 통과
  return { passed: true, reason: 'OI stable', oiChange };
}

/**
 * 2. Order Book Imbalance 필터
 * 매수벽 > 매도벽 = LONG 유리
 * 매도벽 > 매수벽 = SHORT 유리
 */
function checkOrderBookFilter(
  orderBook: OrderBookData,
  obType: 'LONG' | 'SHORT'
): { passed: boolean; reason: string; imbalance: number } {
  const { imbalance } = orderBook;

  // 임계값: ±0.1 (10% 차이)
  const threshold = 0.1;

  if (obType === 'LONG') {
    if (imbalance > threshold) {
      return { passed: true, reason: `Bid wall dominant (${(imbalance * 100).toFixed(1)}%)`, imbalance };
    }
    if (imbalance < -threshold) {
      return { passed: false, reason: `Ask wall dominant, unfavorable for LONG`, imbalance };
    }
  } else {
    if (imbalance < -threshold) {
      return { passed: true, reason: `Ask wall dominant (${(imbalance * 100).toFixed(1)}%)`, imbalance };
    }
    if (imbalance > threshold) {
      return { passed: false, reason: `Bid wall dominant, unfavorable for SHORT`, imbalance };
    }
  }

  // 중립
  return { passed: true, reason: 'Order book balanced', imbalance };
}

/**
 * 3. Taker Buy/Sell Ratio 필터
 * >1.1 = 매수 우세 → LONG 유리
 * <0.9 = 매도 우세 → SHORT 유리
 */
function checkTakerRatioFilter(
  takerRatio: TakerRatioData,
  obType: 'LONG' | 'SHORT'
): { passed: boolean; reason: string; ratio: number } {
  const { buySellRatio } = takerRatio;

  if (obType === 'LONG') {
    if (buySellRatio > 1.1) {
      return { passed: true, reason: `Taker buy dominant (${buySellRatio.toFixed(2)})`, ratio: buySellRatio };
    }
    if (buySellRatio < 0.9) {
      return { passed: false, reason: `Taker sell dominant, unfavorable for LONG`, ratio: buySellRatio };
    }
  } else {
    if (buySellRatio < 0.9) {
      return { passed: true, reason: `Taker sell dominant (${buySellRatio.toFixed(2)})`, ratio: buySellRatio };
    }
    if (buySellRatio > 1.1) {
      return { passed: false, reason: `Taker buy dominant, unfavorable for SHORT`, ratio: buySellRatio };
    }
  }

  // 중립
  return { passed: true, reason: 'Taker ratio balanced', ratio: buySellRatio };
}

/**
 * 4. Long/Short Ratio 필터 (Contrarian)
 * 롱 과열 (ratio > 2) = SHORT 유리 (역추세)
 * 숏 과열 (ratio < 0.5) = LONG 유리 (역추세)
 */
function checkLongShortRatioFilter(
  lsRatio: { ratio: number; longAccount: number; shortAccount: number },
  obType: 'LONG' | 'SHORT'
): { passed: boolean; reason: string; ratio: number } {
  const { ratio } = lsRatio;

  // Contrarian 전략: 극단적 포지션 쏠림의 반대로
  if (ratio > 2.0) {  // 롱 과열
    if (obType === 'SHORT') {
      return { passed: true, reason: `Long crowded (${ratio.toFixed(2)}), good for SHORT`, ratio };
    }
    return { passed: false, reason: `Long crowded, risky for LONG`, ratio };
  }

  if (ratio < 0.5) {  // 숏 과열
    if (obType === 'LONG') {
      return { passed: true, reason: `Short crowded (${ratio.toFixed(2)}), good for LONG`, ratio };
    }
    return { passed: false, reason: `Short crowded, risky for SHORT`, ratio };
  }

  // 중립
  return { passed: true, reason: 'Position ratio neutral', ratio };
}

// 메인 테스트 함수
async function main() {
  console.log('🚀 Order Flow Filter Test Started');
  console.log(`📅 Testing ${SYMBOLS.length} symbols with real Binance data`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results: {
    symbol: string;
    obType: 'LONG' | 'SHORT' | null;
    oiFilter: { passed: boolean; reason: string; oiChange: number };
    obFilter: { passed: boolean; reason: string; imbalance: number };
    takerFilter: { passed: boolean; reason: string; ratio: number };
    lsFilter: { passed: boolean; reason: string; ratio: number };
  }[] = [];

  let totalOB = 0;
  let oiPassed = 0;
  let obPassed = 0;
  let takerPassed = 0;
  let lsPassed = 0;
  let allPassed = 0;

  for (const symbol of SYMBOLS) {
    try {
      process.stdout.write(`\nTesting ${symbol}... `);

      const data = await collectMarketData(symbol);

      // OB 감지
      const ob = detectOB(data.candles);

      if (!ob) {
        console.log('No OB detected');
        results.push({
          symbol,
          obType: null,
          oiFilter: { passed: false, reason: 'No OB', oiChange: 0 },
          obFilter: { passed: false, reason: 'No OB', imbalance: 0 },
          takerFilter: { passed: false, reason: 'No OB', ratio: 0 },
          lsFilter: { passed: false, reason: 'No OB', ratio: 0 },
        });
        continue;
      }

      totalOB++;
      console.log(`${ob.type} OB detected`);

      // 각 필터 테스트
      const oiResult = checkOpenInterestFilter(data.oiHistory, data.candles, ob.type);
      const obResult = checkOrderBookFilter(data.orderBook, ob.type);
      const takerResult = checkTakerRatioFilter(data.takerRatio, ob.type);
      const lsResult = checkLongShortRatioFilter(data.longShortRatio, ob.type);

      if (oiResult.passed) oiPassed++;
      if (obResult.passed) obPassed++;
      if (takerResult.passed) takerPassed++;
      if (lsResult.passed) lsPassed++;
      if (oiResult.passed && obResult.passed && takerResult.passed && lsResult.passed) allPassed++;

      results.push({
        symbol,
        obType: ob.type,
        oiFilter: oiResult,
        obFilter: obResult,
        takerFilter: takerResult,
        lsFilter: lsResult,
      });

      // Rate limit 대응
      await sleep(500);

    } catch (error: any) {
      console.log(`Error: ${error.message}`);
      await sleep(1000);  // 에러 시 더 긴 대기
    }
  }

  // 결과 요약
  console.log('\n\n📊 ORDER FLOW FILTER TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`\nTotal OB Signals Detected: ${totalOB}`);
  console.log('\n| Filter                    | Passed | Pass Rate | Description |');
  console.log('|---------------------------|--------|-----------|-------------|');
  console.log(`| Open Interest             | ${String(oiPassed).padStart(6)} | ${((oiPassed / totalOB) * 100).toFixed(1).padStart(8)}% | OI 변화율 + 가격 방향 |`);
  console.log(`| Order Book Imbalance      | ${String(obPassed).padStart(6)} | ${((obPassed / totalOB) * 100).toFixed(1).padStart(8)}% | 매수/매도 벽 비율 |`);
  console.log(`| Taker Buy/Sell Ratio      | ${String(takerPassed).padStart(6)} | ${((takerPassed / totalOB) * 100).toFixed(1).padStart(8)}% | 실제 체결 방향 |`);
  console.log(`| Long/Short Ratio          | ${String(lsPassed).padStart(6)} | ${((lsPassed / totalOB) * 100).toFixed(1).padStart(8)}% | 포지션 쏠림 역추세 |`);
  console.log(`| All Filters Combined      | ${String(allPassed).padStart(6)} | ${((allPassed / totalOB) * 100).toFixed(1).padStart(8)}% | 모든 필터 통과 |`);

  // 상세 결과
  console.log('\n\n📋 DETAILED RESULTS BY SYMBOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const r of results.filter(r => r.obType !== null)) {
    console.log(`\n${r.symbol} (${r.obType}):`);
    console.log(`  OI Filter:     ${r.oiFilter.passed ? '✅' : '❌'} ${r.oiFilter.reason} (${r.oiFilter.oiChange.toFixed(2)}%)`);
    console.log(`  OB Imbalance:  ${r.obFilter.passed ? '✅' : '❌'} ${r.obFilter.reason} (${(r.obFilter.imbalance * 100).toFixed(1)}%)`);
    console.log(`  Taker Ratio:   ${r.takerFilter.passed ? '✅' : '❌'} ${r.takerFilter.reason}`);
    console.log(`  L/S Ratio:     ${r.lsFilter.passed ? '✅' : '❌'} ${r.lsFilter.reason}`);
  }

  // 결과 파일 저장
  const outputDir = path.join(__dirname, '../backtest-results/orderflow-filter');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(outputDir, `orderflow-test-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    symbols: SYMBOLS,
    summary: {
      totalOB,
      oiPassed,
      obPassed,
      takerPassed,
      lsPassed,
      allPassed,
      passRates: {
        oi: ((oiPassed / totalOB) * 100).toFixed(1),
        ob: ((obPassed / totalOB) * 100).toFixed(1),
        taker: ((takerPassed / totalOB) * 100).toFixed(1),
        ls: ((lsPassed / totalOB) * 100).toFixed(1),
        all: ((allPassed / totalOB) * 100).toFixed(1),
      },
    },
    results,
  }, null, 2));

  console.log(`\n📁 Results saved to: ${outputPath}`);

  // 추천
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const bestFilter = [
    { name: 'Open Interest', rate: (oiPassed / totalOB) * 100 },
    { name: 'Order Book Imbalance', rate: (obPassed / totalOB) * 100 },
    { name: 'Taker Buy/Sell Ratio', rate: (takerPassed / totalOB) * 100 },
    { name: 'Long/Short Ratio', rate: (lsPassed / totalOB) * 100 },
  ].sort((a, b) => b.rate - a.rate);

  console.log('\n필터 유용성 순위:');
  bestFilter.forEach((f, i) => {
    const stars = f.rate > 70 ? '⭐⭐⭐' : f.rate > 50 ? '⭐⭐' : '⭐';
    console.log(`  ${i + 1}. ${f.name}: ${f.rate.toFixed(1)}% 통과 ${stars}`);
  });

  console.log('\n적용 권장 방식:');
  console.log('  1. 단일 필터 적용: 가장 높은 통과율의 필터 1개만 사용');
  console.log('  2. OR 조합: 여러 필터 중 하나라도 통과하면 진입');
  console.log('  3. AND 조합: 모든 필터 통과해야 진입 (신호 감소, 정확도 증가)');
}

main().catch(console.error);
