/**
 * 필터 검증 백테스트
 * - 4개 필터 (BOS, Liquidity Sweep, EMA, FVG) 검증
 * - data.binance.vision 월별 데이터 사용
 * - 2025년 전체 데이터 대상
 * - 50개 심볼 (주요 코인 포함)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip = require('adm-zip');
import { ATR, SMA, EMA } from 'technicalindicators';

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
  trades?: number;
  takerBuyVolume?: number;
}

interface OrderBlock {
  top: number;
  bottom: number;
  type: 'LONG' | 'SHORT';
  method: string;
  barIndex: number;
  age: number;
  pricedMovedAway: boolean;
  // 필터 점수
  hasBOS?: boolean;
  hasLiquiditySweep?: boolean;
  hasEMAAlignment?: boolean;
  hasFVG?: boolean;
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
  filterScore: number;
  filters: {
    bos: boolean;
    liquiditySweep: boolean;
    ema: boolean;
    fvg: boolean;
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

interface FilterTestResult {
  filterName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════════════════════════════════════

const DATA_DIR = path.join(process.cwd(), 'backtest_data', 'monthly');
const RESULTS_DIR = path.join(process.cwd(), 'backtest-results', 'filter-validation');

// 50개 심볼 (주요 코인 포함)
const SYMBOLS_50 = [
  // 메이저 (15개)
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT', 'NEARUSDT',
  // 중형 (20개)
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'INJUSDT',
  'SEIUSDT', 'TIAUSDT', 'LDOUSDT', 'AAVEUSDT', 'FILUSDT',
  'FTMUSDT', 'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'GALAUSDT',
  'GMXUSDT', 'DYDXUSDT', 'RUNEUSDT', 'CRVUSDT', 'SNXUSDT',
  // 밈/신규 (15개)
  '1000PEPEUSDT', '1000SHIBUSDT', 'WIFUSDT', 'BOMEUSDT', 'MEMEUSDT',
  'ORDIUSDT', 'FETUSDT', 'PENDLEUSDT', 'STXUSDT', 'WLDUSDT',
  'PYTHUSDT', 'BLURUSDT', 'CFXUSDT', 'MAGICUSDT', 'BEAMXUSDT'
];

// 백테스트 설정
const CONFIG = {
  // 기본 전략 파라미터 (기존과 동일)
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
  // 필터 파라미터
  swingLookback: 5,       // 스윙 포인트 감지용
  bosLookback: 20,        // BOS 확인용
  fvgMinGap: 0.001,       // FVG 최소 갭 (0.1%)
};

// ═══════════════════════════════════════════════════════════════════════════
// 데이터 다운로더 (월별)
// ═══════════════════════════════════════════════════════════════════════════

async function downloadMonthlyData(
  symbol: string,
  interval: string,
  yearMonth: string // YYYY-MM 형식
): Promise<OHLCV[]> {
  const filename = `${symbol}-${interval}-${yearMonth}.csv`;
  const filepath = path.join(DATA_DIR, filename);

  // 이미 다운로드된 경우 로드
  if (fs.existsSync(filepath)) {
    return loadCsvFile(filepath);
  }

  const url = `https://data.binance.vision/data/futures/um/monthly/klines/${symbol}/${interval}/${symbol}-${interval}-${yearMonth}.zip`;

  try {
    console.log(`  Downloading ${symbol} ${yearMonth}...`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const zip = new AdmZip(response.data);
    const entries = zip.getEntries();

    if (entries.length === 0) {
      console.log(`  ⚠️ Empty zip for ${symbol} ${yearMonth}`);
      return [];
    }

    const csvContent = entries[0].getData().toString('utf8');
    fs.writeFileSync(filepath, csvContent);

    return loadCsvFile(filepath);
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`  ⚠️ Not found: ${symbol} ${yearMonth}`);
    } else {
      console.log(`  ❌ Error: ${symbol} ${yearMonth} - ${error.message}`);
    }
    return [];
  }
}

function loadCsvFile(filepath: string): OHLCV[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const candles: OHLCV[] = [];

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 11) {
      const timestamp = parseInt(parts[0]);
      const open = parseFloat(parts[1]);
      const high = parseFloat(parts[2]);
      const low = parseFloat(parts[3]);
      const close = parseFloat(parts[4]);
      const volume = parseFloat(parts[5]);
      const trades = parseInt(parts[8]) || 0;
      const takerBuyVolume = parseFloat(parts[9]) || 0;

      if (!isNaN(timestamp) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
        candles.push({ timestamp, open, high, low, close, volume, trades, takerBuyVolume });
      }
    }
  }

  return candles;
}

async function loadAllData(
  symbols: string[],
  interval: string,
  months: string[]
): Promise<Map<string, OHLCV[]>> {
  console.log(`\n📥 데이터 다운로드 중... (${symbols.length}개 심볼, ${months.length}개월)`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dataMap = new Map<string, OHLCV[]>();

  for (const symbol of symbols) {
    const allCandles: OHLCV[] = [];

    for (const month of months) {
      const candles = await downloadMonthlyData(symbol, interval, month);
      allCandles.push(...candles);
      await sleep(100); // Rate limit 방지
    }

    if (allCandles.length > 0) {
      // 중복 제거 및 정렬
      const uniqueCandles = Array.from(
        new Map(allCandles.map(c => [c.timestamp, c])).values()
      ).sort((a, b) => a.timestamp - b.timestamp);

      dataMap.set(symbol, uniqueCandles);
      console.log(`  ✅ ${symbol}: ${uniqueCandles.length} candles loaded`);
    }
  }

  return dataMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// 필터 구현
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 스윙 포인트 감지
 */
function findSwingPoints(candles: OHLCV[], lookback: number = 5): {
  swingHighs: Map<number, number>;
  swingLows: Map<number, number>;
} {
  const swingHighs = new Map<number, number>();
  const swingLows = new Map<number, number>();

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high >= currentHigh) {
        isSwingHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low <= currentLow) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) swingHighs.set(i, currentHigh);
    if (isSwingLow) swingLows.set(i, currentLow);
  }

  return { swingHighs, swingLows };
}

/**
 * 필터 1: BOS (Break of Structure) 확인
 * - LONG: 최근에 이전 스윙 고점을 돌파한 경우
 * - SHORT: 최근에 이전 스윙 저점을 돌파한 경우
 */
function checkBOS(
  candles: OHLCV[],
  index: number,
  direction: 'LONG' | 'SHORT',
  swingHighs: Map<number, number>,
  swingLows: Map<number, number>,
  lookback: number = 20
): boolean {
  const startIdx = Math.max(0, index - lookback);

  if (direction === 'LONG') {
    // 최근 lookback 내에서 이전 스윙 고점을 돌파했는지 확인
    const recentSwingHighs: { idx: number; price: number }[] = [];

    for (let i = startIdx; i < index - 5; i++) {
      if (swingHighs.has(i)) {
        recentSwingHighs.push({ idx: i, price: swingHighs.get(i)! });
      }
    }

    if (recentSwingHighs.length < 2) return false;

    // 가장 최근 스윙 고점
    const lastSwingHigh = recentSwingHighs[recentSwingHighs.length - 1];

    // 그 이후 캔들 중 하나라도 해당 고점을 돌파했는지 확인
    for (let i = lastSwingHigh.idx + 1; i <= index; i++) {
      if (candles[i].high > lastSwingHigh.price) {
        return true; // BOS 확인
      }
    }
  } else {
    // SHORT: 이전 스윙 저점을 돌파했는지 확인
    const recentSwingLows: { idx: number; price: number }[] = [];

    for (let i = startIdx; i < index - 5; i++) {
      if (swingLows.has(i)) {
        recentSwingLows.push({ idx: i, price: swingLows.get(i)! });
      }
    }

    if (recentSwingLows.length < 2) return false;

    const lastSwingLow = recentSwingLows[recentSwingLows.length - 1];

    for (let i = lastSwingLow.idx + 1; i <= index; i++) {
      if (candles[i].low < lastSwingLow.price) {
        return true; // BOS 확인
      }
    }
  }

  return false;
}

/**
 * 필터 2: Liquidity Sweep 확인
 * - LONG OB: 형성 전에 이전 스윙 저점 아래로 wick이 내려갔다가 반전
 * - SHORT OB: 형성 전에 이전 스윙 고점 위로 wick이 올라갔다가 반전
 */
function checkLiquiditySweep(
  candles: OHLCV[],
  obIndex: number,
  direction: 'LONG' | 'SHORT',
  swingHighs: Map<number, number>,
  swingLows: Map<number, number>,
  lookback: number = 30
): boolean {
  const obCandle = candles[obIndex];
  const startIdx = Math.max(0, obIndex - lookback);

  if (direction === 'LONG') {
    // OB 캔들 이전의 스윙 저점들을 찾음
    let nearestSwingLow: { idx: number; price: number } | null = null;

    for (let i = obIndex - 5; i >= startIdx; i--) {
      if (swingLows.has(i)) {
        nearestSwingLow = { idx: i, price: swingLows.get(i)! };
        break;
      }
    }

    if (!nearestSwingLow) return false;

    // OB 캔들 또는 직전 몇 개 캔들이 스윙 저점 아래로 wick을 찍었는지 확인
    for (let i = obIndex; i >= Math.max(startIdx, obIndex - 3); i--) {
      if (candles[i].low < nearestSwingLow.price && candles[i].close > nearestSwingLow.price) {
        return true; // 유동성 스윕 후 반전
      }
    }
  } else {
    // SHORT: 스윙 고점 위로 wick 후 반전
    let nearestSwingHigh: { idx: number; price: number } | null = null;

    for (let i = obIndex - 5; i >= startIdx; i--) {
      if (swingHighs.has(i)) {
        nearestSwingHigh = { idx: i, price: swingHighs.get(i)! };
        break;
      }
    }

    if (!nearestSwingHigh) return false;

    for (let i = obIndex; i >= Math.max(startIdx, obIndex - 3); i--) {
      if (candles[i].high > nearestSwingHigh.price && candles[i].close < nearestSwingHigh.price) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 필터 3: EMA 정배열/역배열 확인
 * - LONG: EMA8 > EMA21 > EMA55 (정배열)
 * - SHORT: EMA8 < EMA21 < EMA55 (역배열)
 */
function checkEMAAlignment(
  ema8: number[],
  ema21: number[],
  ema55: number[],
  index: number,
  direction: 'LONG' | 'SHORT'
): boolean {
  const ema8Idx = index - (ema8.length < index + 1 ? index + 1 - ema8.length : 0);
  const ema21Idx = index - (ema21.length < index + 1 ? index + 1 - ema21.length : 0);
  const ema55Idx = index - (ema55.length < index + 1 ? index + 1 - ema55.length : 0);

  if (ema8Idx < 0 || ema21Idx < 0 || ema55Idx < 0) return false;

  const e8 = ema8[ema8Idx];
  const e21 = ema21[ema21Idx];
  const e55 = ema55[ema55Idx];

  if (!e8 || !e21 || !e55) return false;

  if (direction === 'LONG') {
    return e8 > e21 && e21 > e55; // 정배열
  } else {
    return e8 < e21 && e21 < e55; // 역배열
  }
}

/**
 * 필터 4: FVG (Fair Value Gap) 확인
 * - OB 근처에 FVG가 존재하는지 확인
 * - Bullish FVG: candle[i-2].high < candle[i].low
 * - Bearish FVG: candle[i-2].low > candle[i].high
 */
function checkFVG(
  candles: OHLCV[],
  obIndex: number,
  obTop: number,
  obBottom: number,
  direction: 'LONG' | 'SHORT',
  lookback: number = 10
): boolean {
  const startIdx = Math.max(2, obIndex - lookback);

  for (let i = startIdx; i <= obIndex; i++) {
    if (direction === 'LONG') {
      // Bullish FVG: candle[i-2].high < candle[i].low
      const fvgBottom = candles[i - 2].high;
      const fvgTop = candles[i].low;

      if (fvgTop > fvgBottom) {
        const gap = (fvgTop - fvgBottom) / candles[i].close;
        if (gap >= CONFIG.fvgMinGap) {
          // FVG가 OB 영역과 겹치는지 확인
          const overlapTop = Math.min(fvgTop, obTop);
          const overlapBottom = Math.max(fvgBottom, obBottom);
          if (overlapTop > overlapBottom) {
            return true; // FVG와 OB가 겹침
          }
        }
      }
    } else {
      // Bearish FVG: candle[i-2].low > candle[i].high
      const fvgTop = candles[i - 2].low;
      const fvgBottom = candles[i].high;

      if (fvgTop > fvgBottom) {
        const gap = (fvgTop - fvgBottom) / candles[i].close;
        if (gap >= CONFIG.fvgMinGap) {
          const overlapTop = Math.min(fvgTop, obTop);
          const overlapBottom = Math.max(fvgBottom, obBottom);
          if (overlapTop > overlapBottom) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 백테스트 엔진
// ═══════════════════════════════════════════════════════════════════════════

function runBacktest(
  symbol: string,
  candles: OHLCV[],
  enabledFilters: {
    bos: boolean;
    liquiditySweep: boolean;
    ema: boolean;
    fvg: boolean;
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

  // EMA 계산
  const ema8 = EMA.calculate({ period: 8, values: closes });
  const ema21 = EMA.calculate({ period: 21, values: closes });
  const ema55 = EMA.calculate({ period: 55, values: closes });

  // 스윙 포인트 계산
  const { swingHighs, swingLows } = findSwingPoints(candles, CONFIG.swingLookback);

  let activeOB: OrderBlock | null = null;
  let position: {
    entry: number;
    sl: number;
    tp: number;
    direction: 'LONG' | 'SHORT';
    entryTime: number;
    entryBarIndex: number;
    filters: { bos: boolean; liquiditySweep: boolean; ema: boolean; fvg: boolean };
    filterScore: number;
  } | null = null;

  // 캔들 순회
  for (let i = MIN_CANDLES; i < candles.length; i++) {
    const currentCandle = candles[i];
    const atrIdx = i - (candles.length - atrValues.length);
    const volIdx = i - (candles.length - volumeAvg50.length);
    const smaIdx = i - (candles.length - sma600.length);

    const atr = atrValues[atrIdx] || 0;
    const volAvg50 = volumeAvg50[volIdx] || 0;
    const sma = sma600[smaIdx] || currentCandle.close;

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
          pnl: pnl * 100, // 퍼센트
          pnlPercent: pnl * 100,
          isWin,
          filterScore: position.filterScore,
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
        currentCandle.close > sma // 추세 필터
      ) {
        newOB = {
          top: currentCandle.close,
          bottom: currentCandle.open,
          type: 'LONG',
          method: 'ORB',
          barIndex: i,
          age: 0,
          pricedMovedAway: false,
        };
      }
      // Bearish ORB
      else if (
        currentCandle.close < currentCandle.open &&
        candleRange > atr * CONFIG.orbAtr &&
        volRatio > CONFIG.orbVol &&
        bodyRatio > CONFIG.minBodyRatio &&
        currentCandle.close < sma // 추세 필터
      ) {
        newOB = {
          top: currentCandle.open,
          bottom: currentCandle.close,
          type: 'SHORT',
          method: 'ORB',
          barIndex: i,
          age: 0,
          pricedMovedAway: false,
        };
      }

      if (newOB && !activeOB) {
        // 필터 적용
        const hasBOS = checkBOS(candles, i, newOB.type, swingHighs, swingLows, CONFIG.bosLookback);
        const hasLiquiditySweep = checkLiquiditySweep(candles, i, newOB.type, swingHighs, swingLows);
        const hasEMAAlignment = checkEMAAlignment(ema8, ema21, ema55, i, newOB.type);
        const hasFVG = checkFVG(candles, i, newOB.top, newOB.bottom, newOB.type);

        // 필터 점수 계산
        let filterScore = 0;
        if (hasBOS) filterScore += 25;
        if (hasLiquiditySweep) filterScore += 25;
        if (hasEMAAlignment) filterScore += 25;
        if (hasFVG) filterScore += 25;

        // 활성화된 필터 통과 여부 확인
        let passFilters = true;
        if (enabledFilters.bos && !hasBOS) passFilters = false;
        if (enabledFilters.liquiditySweep && !hasLiquiditySweep) passFilters = false;
        if (enabledFilters.ema && !hasEMAAlignment) passFilters = false;
        if (enabledFilters.fvg && !hasFVG) passFilters = false;

        if (passFilters) {
          newOB.hasBOS = hasBOS;
          newOB.hasLiquiditySweep = hasLiquiditySweep;
          newOB.hasEMAAlignment = hasEMAAlignment;
          newOB.hasFVG = hasFVG;
          newOB.filterScore = filterScore;
          activeOB = newOB;
        }
      }

      // 리테스트 체크 및 진입
      if (activeOB && activeOB.pricedMovedAway) {
        const obMid = (activeOB.top + activeOB.bottom) / 2;

        // 가격이 OB 중간에 도달했는지 확인
        if (currentCandle.low <= obMid && obMid <= currentCandle.high) {
          // Reversal 확인
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

            position = {
              entry,
              sl,
              tp,
              direction: activeOB.type,
              entryTime: currentCandle.timestamp,
              entryBarIndex: i,
              filters: {
                bos: activeOB.hasBOS || false,
                liquiditySweep: activeOB.hasLiquiditySweep || false,
                ema: activeOB.hasEMAAlignment || false,
                fvg: activeOB.hasFVG || false,
              },
              filterScore: activeOB.filterScore || 0,
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
  console.log('필터 검증 백테스트');
  console.log('═'.repeat(80));
  console.log(`심볼: ${SYMBOLS_50.length}개`);
  console.log(`기간: 2025년 전체 (1월~12월)`);
  console.log(`필터: BOS, Liquidity Sweep, EMA, FVG`);
  console.log('═'.repeat(80));

  // 결과 디렉토리 생성
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // 2025년 월별 데이터 (1월~11월, 12월은 아직 완료 안됨)
  const months = [
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'
  ];

  // 데이터 로드
  const dataMap = await loadAllData(SYMBOLS_50, '5m', months);

  console.log(`\n✅ 데이터 로드 완료: ${dataMap.size}개 심볼`);

  // 필터 조합 정의
  const filterCombinations: {
    name: string;
    filters: { bos: boolean; liquiditySweep: boolean; ema: boolean; fvg: boolean };
  }[] = [
    // 기본 (필터 없음)
    { name: 'Baseline (No Filters)', filters: { bos: false, liquiditySweep: false, ema: false, fvg: false } },
    // 개별 필터
    { name: 'BOS Only', filters: { bos: true, liquiditySweep: false, ema: false, fvg: false } },
    { name: 'Liquidity Sweep Only', filters: { bos: false, liquiditySweep: true, ema: false, fvg: false } },
    { name: 'EMA Only', filters: { bos: false, liquiditySweep: false, ema: true, fvg: false } },
    { name: 'FVG Only', filters: { bos: false, liquiditySweep: false, ema: false, fvg: true } },
    // 2개 조합
    { name: 'BOS + Liquidity Sweep', filters: { bos: true, liquiditySweep: true, ema: false, fvg: false } },
    { name: 'BOS + EMA', filters: { bos: true, liquiditySweep: false, ema: true, fvg: false } },
    { name: 'BOS + FVG', filters: { bos: true, liquiditySweep: false, ema: false, fvg: true } },
    { name: 'Liquidity Sweep + EMA', filters: { bos: false, liquiditySweep: true, ema: true, fvg: false } },
    { name: 'Liquidity Sweep + FVG', filters: { bos: false, liquiditySweep: true, ema: false, fvg: true } },
    { name: 'EMA + FVG', filters: { bos: false, liquiditySweep: false, ema: true, fvg: true } },
    // 3개 조합
    { name: 'BOS + Liquidity Sweep + EMA', filters: { bos: true, liquiditySweep: true, ema: true, fvg: false } },
    { name: 'BOS + Liquidity Sweep + FVG', filters: { bos: true, liquiditySweep: true, ema: false, fvg: true } },
    { name: 'BOS + EMA + FVG', filters: { bos: true, liquiditySweep: false, ema: true, fvg: true } },
    { name: 'Liquidity Sweep + EMA + FVG', filters: { bos: false, liquiditySweep: true, ema: true, fvg: true } },
    // 전체 필터
    { name: 'All Filters', filters: { bos: true, liquiditySweep: true, ema: true, fvg: true } },
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
      const result = runBacktest(symbol, candles, combo.filters);
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
  console.log('📊 필터 검증 결과 요약');
  console.log('═'.repeat(80));
  console.log('\n승률 기준 정렬:\n');
  console.log('| 순위 | 필터 조합 | 거래수 | 승 | 패 | 승률 | 총 PnL | 평균 PnL |');
  console.log('|------|----------|--------|-----|-----|------|--------|----------|');

  allResults.forEach((r, idx) => {
    console.log(
      `| ${(idx + 1).toString().padStart(4)} | ${r.combination.padEnd(30)} | ${r.totalTrades.toString().padStart(6)} | ${r.wins.toString().padStart(3)} | ${r.losses.toString().padStart(3)} | ${r.winRate.toFixed(1).padStart(4)}% | ${r.totalPnl.toFixed(1).padStart(6)}% | ${r.avgPnl.toFixed(2).padStart(7)}% |`
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

    console.log(
      `| ${r.combination.padEnd(30)} | ${(winRateChange >= 0 ? '+' : '') + winRateChange.toFixed(1).padStart(5)}% | ${(pnlChange >= 0 ? '+' : '') + pnlChange.toFixed(1).padStart(6)}% | ${tradeReduction.toFixed(1).padStart(5)}% |`
    );
  });

  // 결과 파일 저장
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resultFile = path.join(RESULTS_DIR, `filter-validation-${timestamp}.json`);

  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    symbols: SYMBOLS_50,
    months,
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

  // 승률 10% 이상 개선 + 거래 수 유지 (50% 이상)
  const recommended = allResults.filter(r => {
    if (r.combination === 'Baseline (No Filters)') return false;
    const winRateImprovement = r.winRate - baseline.winRate;
    const tradeRetention = baseline.totalTrades > 0 ? r.totalTrades / baseline.totalTrades : 0;
    return winRateImprovement >= 3 && tradeRetention >= 0.3;
  });

  if (recommended.length > 0) {
    console.log('\n조건: 승률 3%p 이상 개선 + 거래 30% 이상 유지\n');
    recommended.slice(0, 5).forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.combination}`);
      console.log(`   승률: ${r.winRate.toFixed(1)}% (+${(r.winRate - baseline.winRate).toFixed(1)}%p)`);
      console.log(`   거래: ${r.totalTrades}건 (${((r.totalTrades / baseline.totalTrades) * 100).toFixed(0)}% 유지)`);
      console.log(`   PnL: ${r.totalPnl.toFixed(1)}%`);
    });
  } else {
    console.log('\n조건을 만족하는 필터 조합이 없습니다.');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('백테스트 완료');
  console.log('═'.repeat(80));
}

main().catch(console.error);
