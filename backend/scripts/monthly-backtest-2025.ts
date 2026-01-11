/**
 * 2025년 월별 백테스트 (170개 심볼)
 * - 실시간 전략과 동일한 SimpleTrueOBBacktest 사용
 * - 바이낸스 과거 데이터 다운로드 후 로컬 저장
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { OHLCV } from '../src/strategies/simple-true-ob.interface';
import { SimpleTrueOBBacktest } from '../src/backtest/simple-true-ob-backtest';

const DATA_DIR = path.join(process.cwd(), 'backtest_data');

// 170개 심볼 목록 (거래량 기준 상위)
const SYMBOLS_170 = [
  // Tier 1: 메이저
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT',
  'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT', 'FILUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'NEARUSDT', 'SUIUSDT',
  // Tier 2: 중형
  'ICPUSDT', 'INJUSDT', 'STXUSDT', 'SEIUSDT', 'TIAUSDT', 'LDOUSDT', 'WLDUSDT', 'AAVEUSDT', 'ALGOUSDT', 'AXSUSDT',
  'SANDUSDT', 'MANAUSDT', 'GALAUSDT', 'APEUSDT', 'GMXUSDT', 'ROSEUSDT', 'CHZUSDT', 'ENJUSDT', 'FTMUSDT', 'ZILUSDT',
  'ONEUSDT', 'RUNEUSDT', 'CRVUSDT', 'SNXUSDT', 'COMPUSDT', 'MKRUSDT', 'SUSHIUSDT', 'YFIUSDT', '1INCHUSDT', 'LRCUSDT',
  'KSMUSDT', 'CELOUSDT', 'QNTUSDT', 'FLOWUSDT', 'IMXUSDT', 'BLURUSDT', 'ORDIUSDT', 'PYTHUSDT', 'MAGICUSDT', 'GMTUSDT',
  // Tier 3: 소형
  'TRXUSDT', 'XLMUSDT', 'VETUSDT', 'EOSUSDT', 'XTZUSDT', 'THETAUSDT', 'NEOUSDT', 'IOSTUSDT', 'ONTUSDT', 'ZECUSDT',
  'DASHUSDT', 'BATUSDT', 'KAVAUSDT', 'IOTAUSDT', 'HOTUSDT', 'ANKRUSDT', 'RVNUSDT', 'STORJUSDT', 'COTIUSDT', 'BANDUSDT',
  'RSRUSDT', 'SFPUSDT', 'CTSIUSDT', 'DENTUSDT', 'SKLUSDT', 'OGNUSDT', 'BELUSDT', 'DYDXUSDT', 'TLMUSDT', 'MASKUSDT',
  'GTCUSDT', 'PEOPLEUSDT', 'LPTUSDT', 'ENSUSDT', 'JASMYUSDT', 'ARPAUSDT', 'PHBUSDT', 'WOOUSDT', 'HIGHUSDT', 'MINAUSDT',
  'ASTRUSDT', 'FETUSDT', 'ACHUSDT', 'HOOKUSDT', 'EDUUSDT', 'MAVUSDT', 'PENDLEUSDT', 'ARKMUSDT', 'IDUSDT', 'NMRUSDT',
  'CFXUSDT', 'STGUSDT', 'CKBUSDT', 'ICXUSDT', 'TRUUSDT', 'API3USDT', 'GASUSDT', 'PROMUSDT', 'QTUMUSDT', 'FXSUSDT',
  'RDNTUSDT', 'SSVUSDT', 'FLMUSDT', 'MTLUSDT', 'ALPHAUSDT', 'DUSKUSDT', 'IDEXUSDT', 'SPELLUSDT', 'JOEUSDT', 'CELRUSDT',
  'NULSUSDT', 'ARUSDT', 'LQTYUSDT', 'AGLDUSDT', 'BONDUSDT', 'YGGUSDT', 'POWRUSDT', 'CVXUSDT', 'MBOXUSDT', 'HFTUSDT',
  'BICOUSDT', 'HIFIUSDT', 'BNXUSDT', 'CYBERUSDT', 'ARKUSDT', 'GLMRUSDT', 'XVGUSDT', 'OXTUSDT', 'ZENUSDT', 'EGLDUSDT',
  // Tier 4: 밈/신규
  '1000PEPEUSDT', '1000FLOKIUSDT', '1000SHIBUSDT', '1000BONKUSDT', 'WIFUSDT', 'BOMEUSDT', 'MEMEUSDT', 'SUPERUSDT',
  'BIGTIMEUSDT', 'BEAMXUSDT', 'KASUSDT', 'NTRNUSDT', 'CAKEUSDT', 'TWTUSDT', 'ILVUSDT', 'STEEMUSDT', 'RIFUSDT',
  'POLYXUSDT', 'TUSDT', 'XVSUSDT'
];

interface MonthlyResult {
  month: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  roi: number;
  symbolResults: { symbol: string; trades: number; winRate: number; pnl: number }[];
}

// 바이낸스에서 데이터 다운로드
async function downloadCandle(symbol: string, interval: string, date: string): Promise<boolean> {
  const filename = `${symbol}-${interval}-${date}.csv`;
  const filepath = path.join(DATA_DIR, filename);

  // 이미 존재하면 스킵
  if (fs.existsSync(filepath)) {
    return true;
  }

  const url = `https://data.binance.vision/data/futures/um/daily/klines/${symbol}/${interval}/${symbol}-${interval}-${date}.zip`;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(response.data);
    const entries = zip.getEntries();

    if (entries.length === 0) return false;

    const csvContent = entries[0].getData().toString('utf8');

    // CSV 헤더 추가
    const lines = csvContent.trim().split('\n');
    const header = 'open_time,open,high,low,close,volume,close_time,quote_volume,count,taker_buy_volume,taker_buy_quote_volume,ignore';
    const contentWithHeader = [header, ...lines].join('\n');

    fs.writeFileSync(filepath, contentWithHeader);
    return true;
  } catch {
    return false;
  }
}

// 특정 기간의 데이터 다운로드
async function downloadDataForPeriod(
  symbols: string[],
  interval: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  console.log(`\n📥 데이터 다운로드 중... (${symbols.length}개 심볼)`);

  const dates: string[] = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() - 10); // 지표 계산을 위해 10일 전부터

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  let downloaded = 0;
  let failed = 0;

  for (const symbol of symbols) {
    process.stdout.write(`\r  ${symbol.padEnd(15)} `);

    for (const date of dates) {
      const success = await downloadCandle(symbol, interval, date);
      if (success) downloaded++;
      else failed++;
    }
  }

  console.log(`\n  완료: ${downloaded}개 다운로드, ${failed}개 실패\n`);
}

// 로컬 CSV에서 데이터 로드
function loadCandlesFromCSV(symbol: string, interval: string, startDate: Date, endDate: Date): OHLCV[] {
  const allCandles: OHLCV[] = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() - 10);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const filename = `${symbol}-${interval}-${dateStr}.csv`;
    const filepath = path.join(DATA_DIR, filename);

    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.trim().split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && line.includes('open_time')) continue;

        const parts = line.split(',');
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

    current.setDate(current.getDate() + 1);
  }

  return allCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// 월별 백테스트 실행
async function runMonthlyBacktest(
  year: number,
  month: number,
  symbols: string[],
  interval: string,
  initialCapital: number
): Promise<MonthlyResult> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 해당 월의 마지막 날
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📅 ${monthStr} 백테스트`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`기간: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);

  // 데이터 다운로드
  await downloadDataForPeriod(symbols, interval, startDate, endDate);

  let totalTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalPnl = 0;
  let successfulSymbols = 0;
  const symbolResults: { symbol: string; trades: number; winRate: number; pnl: number }[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    process.stdout.write(`\r  [${i + 1}/${symbols.length}] ${symbol.padEnd(15)} `);

    try {
      const candles = loadCandlesFromCSV(symbol, interval, startDate, endDate);

      if (candles.length < 500) {
        continue;
      }

      const backtest = new SimpleTrueOBBacktest();
      backtest.resetStats();

      const result = await backtest.runBacktest(
        candles,
        initialCapital,
        false,
        startDate,
        endDate,
        interval,
        true
      );

      if (result.totalTrades > 0) {
        totalTrades += result.totalTrades;
        totalWins += result.winningTrades;
        totalLosses += result.losingTrades;
        const pnl = result.finalCapital - initialCapital;
        totalPnl += pnl;
        successfulSymbols++;

        symbolResults.push({
          symbol,
          trades: result.totalTrades,
          winRate: result.winRate,
          pnl
        });
      }
    } catch {
      // 에러 무시
    }
  }

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const roi = successfulSymbols > 0 ? (totalPnl / (initialCapital * successfulSymbols)) * 100 : 0;

  console.log(`\n\n📊 ${monthStr} 결과:`);
  console.log(`   심볼: ${successfulSymbols}/${symbols.length}개`);
  console.log(`   총 거래: ${totalTrades}건`);
  console.log(`   승/패: ${totalWins}/${totalLosses}`);
  console.log(`   승률: ${winRate.toFixed(2)}%`);
  console.log(`   총 PnL: $${totalPnl.toFixed(2)}`);
  console.log(`   ROI: ${roi.toFixed(2)}%`);

  return {
    month: monthStr,
    totalTrades,
    wins: totalWins,
    losses: totalLosses,
    winRate,
    totalPnl,
    roi,
    symbolResults
  };
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 2025년 월별 백테스트 (170개 심볼)');
  console.log('═'.repeat(70));
  console.log('설정:');
  console.log('  - 심볼 수: ' + SYMBOLS_170.length + '개');
  console.log('  - 타임프레임: 5분봉');
  console.log('  - 초기 자본: $100 (각 심볼별)');
  console.log('  - 전략: SimpleTrueOB (실시간과 동일)');
  console.log('');

  // 데이터 디렉토리 생성
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const allResults: MonthlyResult[] = [];
  const initialCapital = 100;

  // 2025년 1월~12월 (데이터 있는 달만)
  // 현재 2026년 1월이므로 2025년 전체 데이터가 있을 것
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  for (const month of months) {
    try {
      const result = await runMonthlyBacktest(2025, month, SYMBOLS_170, '5m', initialCapital);
      allResults.push(result);
    } catch (error: any) {
      console.error(`\n❌ ${2025}-${month} 백테스트 실패:`, error.message);
    }
  }

  // 전체 요약
  console.log('\n\n' + '═'.repeat(90));
  console.log('📈 2025년 월별 성과 요약');
  console.log('═'.repeat(90));
  console.log('');
  console.log('| 월      | 거래 | 승  | 패  | 승률    | PnL         | ROI      |');
  console.log('|---------|------|-----|-----|---------|-------------|----------|');

  let grandTotalTrades = 0;
  let grandTotalWins = 0;
  let grandTotalLosses = 0;
  let grandTotalPnl = 0;

  for (const result of allResults) {
    console.log(
      `| ${result.month} | ${String(result.totalTrades).padStart(4)} | ${String(result.wins).padStart(3)} | ${String(result.losses).padStart(3)} | ${result.winRate.toFixed(2).padStart(6)}% | $${result.totalPnl.toFixed(2).padStart(10)} | ${result.roi.toFixed(2).padStart(7)}% |`
    );

    grandTotalTrades += result.totalTrades;
    grandTotalWins += result.wins;
    grandTotalLosses += result.losses;
    grandTotalPnl += result.totalPnl;
  }

  const grandWinRate = grandTotalTrades > 0 ? (grandTotalWins / grandTotalTrades) * 100 : 0;
  const grandRoi = allResults.length > 0 ? grandTotalPnl / (initialCapital * SYMBOLS_170.length * allResults.length) * 100 : 0;

  console.log('|---------|------|-----|-----|---------|-------------|----------|');
  console.log(
    `| 합계    | ${String(grandTotalTrades).padStart(4)} | ${String(grandTotalWins).padStart(3)} | ${String(grandTotalLosses).padStart(3)} | ${grandWinRate.toFixed(2).padStart(6)}% | $${grandTotalPnl.toFixed(2).padStart(10)} | ${grandRoi.toFixed(2).padStart(7)}% |`
  );
  console.log('═'.repeat(90));

  // 결과 저장
  const resultPath = path.join(process.cwd(), 'reports', `monthly-backtest-2025-${new Date().toISOString().split('T')[0]}.json`);
  if (!fs.existsSync(path.dirname(resultPath))) {
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  }
  fs.writeFileSync(resultPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      symbols: SYMBOLS_170.length,
      interval: '5m',
      initialCapital,
      year: 2025
    },
    monthlyResults: allResults,
    summary: {
      totalTrades: grandTotalTrades,
      totalWins: grandTotalWins,
      totalLosses: grandTotalLosses,
      winRate: grandWinRate,
      totalPnl: grandTotalPnl,
      roi: grandRoi
    }
  }, null, 2));

  console.log(`\n결과 저장: ${resultPath}`);
}

main().catch(console.error);
