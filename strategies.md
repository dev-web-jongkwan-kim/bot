# 암호화폐 선물 스캘핑 전략 구현 가이드

## 📋 개요

이 문서는 Binance Futures에서 140개 종목을 실시간 모니터링하며 30분 이내 청산을 목표로 하는 초단타 스캘핑 전략의 구현 가이드입니다.

### 목표
- **거래 스타일**: 초단타 스캘핑 (30분 이내 청산)
- **대상 종목**: 140개 암호화폐 선물
- **진입 방식**: Limit 주문 (슬리피지 최소화)
- **목표 수익**: TP 0.25-0.40%, SL 0.12-0.20% (RR 2:1)
- **예상 거래 빈도**: 일 30-50회

### 기술 스택
- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Data Source**: Binance Futures WebSocket + REST API

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA COLLECTION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  WebSocket Streams (이미 구독 중)                                │
│  ├── kline_5m (140개 종목)                                      │
│  ├── kline_15m (140개 종목)                                     │
│  └── ticker/price (140개 종목)                                  │
│                                                                  │
│  REST API Polling (추가 필요)                                    │
│  ├── Funding Rate (1분마다, 전체 종목 1회 호출)                  │
│  ├── Open Interest (1분마다, 관심 종목)                         │
│  └── Book Ticker (스프레드 확인용)                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        REDIS CACHE                               │
├─────────────────────────────────────────────────────────────────┤
│  candles:5m:{symbol}    → 최근 20개 5분봉                       │
│  candles:15m:{symbol}   → 최근 10개 15분봉                      │
│  price:{symbol}         → 현재가                                 │
│  funding:{symbol}       → Funding Rate 정보                      │
│  oi:{symbol}            → Open Interest 정보                     │
│  spread:{symbol}        → 현재 스프레드                          │
│  atr:5m:{symbol}        → 5분봉 ATR                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     SIGNAL GENERATION                            │
├─────────────────────────────────────────────────────────────────┤
│  ScalpingSignalService (매 1분마다 실행)                         │
│  ├── STEP 1: 데이터 로드 (Redis에서)                            │
│  ├── STEP 2: 1차 필터 (Funding, 스프레드, 거래량)               │
│  ├── STEP 3: 2차 필터 (15분봉 추세)                             │
│  ├── STEP 4: 3차 필터 (5분봉 모멘텀 + CVD)                      │
│  ├── STEP 5: 시그널 생성                                         │
│  └── STEP 6: 리스크 필터                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ORDER EXECUTION                              │
├─────────────────────────────────────────────────────────────────┤
│  ScalpingOrderService                                            │
│  ├── STEP 7: 주문 실행 (Limit + TP/SL)                          │
│  └── STEP 8: 포지션 관리 (시간 기반 청산)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 파일 구조

```
backend/src/
├── scalping/
│   ├── scalping.module.ts              # 모듈 정의
│   ├── services/
│   │   ├── scalping-data.service.ts    # 데이터 수집 (Funding, OI)
│   │   ├── scalping-signal.service.ts  # 시그널 생성 (STEP 1-6)
│   │   ├── scalping-order.service.ts   # 주문 실행 (STEP 7-8)
│   │   └── scalping-position.service.ts # 포지션 관리
│   ├── strategies/
│   │   ├── trend-analyzer.ts           # 15분봉 추세 분석
│   │   ├── momentum-analyzer.ts        # 5분봉 모멘텀 분석
│   │   ├── cvd-calculator.ts           # CVD 계산
│   │   └── atr-calculator.ts           # ATR 계산
│   ├── interfaces/
│   │   ├── signal.interface.ts         # 시그널 타입 정의
│   │   ├── position.interface.ts       # 포지션 타입 정의
│   │   └── config.interface.ts         # 설정 타입 정의
│   └── constants/
│       └── scalping.config.ts          # 전략 파라미터
```

---

## ⚙️ STEP 0: 설정 파일

### `scalping/constants/scalping.config.ts`

```typescript
/**
 * 스캘핑 전략 설정
 * 
 * 이 설정들은 백테스트와 실전 테스트를 통해 조정해야 합니다.
 * 각 값의 의미와 권장 범위를 주석으로 설명합니다.
 */
export const SCALPING_CONFIG = {
  // ============================================
  // 스캔 설정
  // ============================================
  scan: {
    /**
     * 스캔 주기 (밀리초)
     * - 1분(60000ms)마다 전체 종목 스캔
     * - 너무 짧으면 CPU 부하, 너무 길면 기회 놓침
     */
    intervalMs: 60000,

    /**
     * 모니터링 종목 수
     * - Binance USDT 무기한 선물 전체
     */
    maxSymbols: 140,
  },

  // ============================================
  // 1차 필터: 거시적 조건
  // ============================================
  filter1: {
    /**
     * Funding Rate 필터
     * 
     * 롱 진입 시: Funding < maxForLong (0.05% = 0.0005)
     * - 높은 Funding = 롱 과열 = 롱 위험
     * - 0.05% 이상이면 롱 진입 금지
     * 
     * 숏 진입 시: Funding > minForShort (0.03% = 0.0003)
     * - 낮은 Funding = 숏 과열 = 숏 위험
     * - 0.03% 이하면 숏 진입 금지
     * 
     * 극단값에서는 역방향만 허용:
     * - Funding > 0.1%: 숏만 허용
     * - Funding < -0.1%: 롱만 허용
     */
    funding: {
      maxForLong: 0.0005,      // 0.05%
      minForShort: 0.0003,     // 0.03%
      extremeHigh: 0.001,      // 0.1% (극단적 롱 과열)
      extremeLow: -0.001,      // -0.1% (극단적 숏 과열)
    },

    /**
     * 스프레드 필터
     * 
     * 스프레드 = (ask - bid) / mid_price
     * - 0.05% 이상이면 슬리피지 위험으로 제외
     * - BTC/ETH는 보통 0.01% 미만
     * - 소형 알트는 0.1% 이상일 수 있음
     */
    maxSpreadPercent: 0.0005,  // 0.05%

    /**
     * 24시간 거래량 필터
     * 
     * 하위 20% 거래량 종목 제외
     * - 유동성 부족 = 체결 어려움 + 슬리피지
     * - 동적으로 계산하거나 고정값 사용
     */
    minVolumeRank: 0.2,  // 하위 20% 제외
  },

  // ============================================
  // 2차 필터: 15분봉 추세
  // ============================================
  filter2: {
    /**
     * 고저점 비교 봉 수
     * 
     * 최근 N개 봉의 고점/저점 구조로 추세 판단
     * - 4개 = 최근 1시간
     */
    trendBars: 4,

    /**
     * OI 변화율 임계값
     * 
     * OI 증가 = 신규 포지션 진입 (추세 강화)
     * OI 감소 = 포지션 청산 (추세 약화)
     * - 1% 이상 증가를 "신규 진입"으로 판단
     */
    oiChangeThreshold: 0.01,  // 1%
  },

  // ============================================
  // 3차 필터: 5분봉 모멘텀
  // ============================================
  filter3: {
    /**
     * 모멘텀 분석 봉 수
     * 
     * 최근 N개 5분봉으로 모멘텀 상태 판단
     * - 5개 = 최근 25분
     */
    momentumBars: 5,

    /**
     * 봉 크기 비율 임계값
     * 
     * 마지막 봉 크기 / 평균 봉 크기
     * - < 0.5 = 소진 (EXHAUSTED)
     * - > 0.8 = 모멘텀 진행 중 (MOMENTUM)
     * - 0.5~0.8 = 풀백 (PULLBACK) ← 진입 기회
     */
    bodySizeRatio: {
      exhausted: 0.5,   // 이 미만이면 소진
      momentum: 0.8,    // 이 이상이면 모멘텀 강함
    },

    /**
     * 거래량 감소 임계값
     * 
     * 마지막 봉 거래량 / 평균 거래량
     * - 0.7 미만이면 거래량 감소 = 소진 신호
     */
    volumeDecreaseRatio: 0.7,

    /**
     * CVD 분석 봉 수
     * 
     * 최근 N개 봉의 CVD 합산
     * - 양수 = 매수 체결 우세
     * - 음수 = 매도 체결 우세
     */
    cvdBars: 3,
  },

  // ============================================
  // 주문 설정
  // ============================================
  order: {
    /**
     * 진입 오프셋 (ATR 배수)
     * 
     * Limit 주문 가격 = 현재가 ± (ATR × offset)
     * - 0.15 = ATR의 15% 정도 유리하게 진입 시도
     * - 너무 크면 체결 안 됨, 너무 작으면 의미 없음
     */
    entryOffsetAtr: 0.15,

    /**
     * TP (Take Profit) 거리 (ATR 배수)
     * 
     * TP 가격 = 진입가 ± (ATR × tpAtr)
     * - 0.6 = ATR의 60%
     * - 변동성에 따라 0.25~0.40% 정도 됨
     */
    tpAtr: 0.6,

    /**
     * SL (Stop Loss) 거리 (ATR 배수)
     * 
     * SL 가격 = 진입가 ∓ (ATR × slAtr)
     * - 0.3 = ATR의 30%
     * - TP:SL = 2:1 비율 유지
     */
    slAtr: 0.3,

    /**
     * ATR 계산 기간
     * 
     * 최근 N개 봉의 ATR 평균
     */
    atrPeriod: 14,

    /**
     * 미체결 타임아웃 (초)
     * 
     * Limit 주문 후 N초 내 체결 안 되면 취소
     * - 300초 = 5분
     */
    unfillTimeoutSec: 300,
  },

  // ============================================
  // 포지션 관리
  // ============================================
  position: {
    /**
     * 최대 보유 시간 (초)
     * 
     * 30분 = 1800초
     * - 이 시간 초과 시 무조건 시장가 청산
     */
    maxHoldTimeSec: 1800,

    /**
     * TP 축소 시작 시간 (초)
     * 
     * 20분 = 1200초
     * - 이 시간 이후 TP를 50%로 축소
     */
    tpReduceTimeSec: 1200,

    /**
     * TP 축소 비율
     * 
     * 0.5 = 50%로 축소
     * - 원래 TP가 0.3%였다면 0.15%로
     */
    tpReduceRatio: 0.5,

    /**
     * 본전 청산 시작 시간 (초)
     * 
     * 25분 = 1500초
     * - 이 시간 이후 본전 이상이면 청산
     */
    breakevenTimeSec: 1500,
  },

  // ============================================
  // 리스크 관리
  // ============================================
  risk: {
    /**
     * 동시 최대 포지션 수
     * 
     * - 5개 초과 시 신규 진입 금지
     * - 리스크 분산 목적
     */
    maxPositions: 5,

    /**
     * 동일 방향 최대 포지션 수
     * 
     * - 롱 3개 이상이면 추가 롱 금지
     * - 숏 3개 이상이면 추가 숏 금지
     * - 방향 편중 방지
     */
    maxSameDirection: 3,

    /**
     * 거래당 리스크 비율
     * 
     * - 계좌의 0.5%를 1회 거래에 리스크
     * - Kelly Criterion 적용 가능
     */
    riskPerTrade: 0.005,  // 0.5%

    /**
     * 일일 최대 손실
     * 
     * - 당일 손실이 2% 초과 시 거래 중단
     */
    maxDailyLoss: 0.02,  // 2%

    /**
     * 연속 손실 후 휴식
     * 
     * - 연속 3회 손실 시 30분 휴식
     */
    consecutiveLossLimit: 3,
    cooldownMinutes: 30,

    /**
     * 레버리지
     * 
     * - 5배 고정 (20x 이상은 청산 위험)
     */
    leverage: 5,
  },
};

/**
 * 종목별 ATR 기준값 (참고용)
 * 
 * 실제로는 실시간 계산해야 하지만,
 * 대략적인 기준으로 사용 가능
 */
export const SYMBOL_ATR_REFERENCE = {
  BTC: { typical5mAtrPercent: 0.15 },   // 0.15%
  ETH: { typical5mAtrPercent: 0.25 },   // 0.25%
  SOL: { typical5mAtrPercent: 0.40 },   // 0.40%
  XRP: { typical5mAtrPercent: 0.35 },   // 0.35%
  DOGE: { typical5mAtrPercent: 0.45 },  // 0.45%
  // 소형 알트는 0.5~1.0% 범위
};
```

---

## 📊 STEP 1: 데이터 수집

### `scalping/services/scalping-data.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { BinanceService } from '../../binance/binance.service';

/**
 * 스캘핑 전략에 필요한 추가 데이터 수집
 * 
 * 기존에 WebSocket으로 받는 데이터:
 * - 5분봉, 15분봉, 실시간 가격
 * 
 * 이 서비스에서 추가로 수집하는 데이터:
 * - Funding Rate (REST API, 1분마다)
 * - Open Interest (REST API, 1분마다)
 * - Book Ticker / Spread (REST API 또는 WebSocket)
 */
@Injectable()
export class ScalpingDataService implements OnModuleInit {
  private readonly logger = new Logger(ScalpingDataService.name);
  
  // 모니터링할 심볼 목록 (동적으로 갱신)
  private symbols: string[] = [];

  constructor(
    private readonly redis: RedisService,
    private readonly binance: BinanceService,
  ) {}

  async onModuleInit() {
    // 초기 심볼 목록 로드
    await this.loadSymbolList();
    
    // 초기 데이터 수집
    await this.collectAllData();
  }

  /**
   * 심볼 목록 로드
   * 
   * Binance USDT-M 선물 중 거래량 상위 종목
   */
  private async loadSymbolList(): Promise<void> {
    try {
      // exchangeInfo에서 USDT 페어 필터링
      const exchangeInfo = await this.binance.getExchangeInfo();
      
      this.symbols = exchangeInfo.symbols
        .filter(s => 
          s.quoteAsset === 'USDT' && 
          s.status === 'TRADING' &&
          s.contractType === 'PERPETUAL'
        )
        .map(s => s.symbol);
      
      this.logger.log(`Loaded ${this.symbols.length} symbols for monitoring`);
    } catch (error) {
      this.logger.error('Failed to load symbol list', error);
    }
  }

  /**
   * 1분마다 실행: Funding Rate + OI 수집
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectAllData(): Promise<void> {
    await Promise.all([
      this.collectFundingRates(),
      this.collectOpenInterest(),
      this.collectSpreads(),
    ]);
  }

  /**
   * Funding Rate 수집
   * 
   * API: GET /fapi/v1/premiumIndex
   * - 1회 호출로 전체 종목 조회 가능
   * - Rate Limit: 매우 낮음 (weight 1)
   * 
   * 저장 데이터:
   * - lastFundingRate: 마지막 확정된 Funding Rate
   * - predictedFundingRate: 예상 Funding Rate (실시간 변동)
   * - nextFundingTime: 다음 정산 시간
   */
  private async collectFundingRates(): Promise<void> {
    try {
      // 전체 종목 Funding 조회 (1 API call)
      const premiumIndex = await this.binance.getPremiumIndex();
      
      // 파이프라인으로 Redis 일괄 저장
      const pipeline = this.redis.pipeline();
      
      for (const item of premiumIndex) {
        const data = {
          symbol: item.symbol,
          lastFundingRate: parseFloat(item.lastFundingRate),
          predictedFundingRate: parseFloat(item.interestRate) || 0,
          nextFundingTime: item.nextFundingTime,
          markPrice: parseFloat(item.markPrice),
          indexPrice: parseFloat(item.indexPrice),
          updatedAt: Date.now(),
        };
        
        pipeline.set(
          `funding:${item.symbol}`,
          JSON.stringify(data),
          'EX',
          120  // 2분 TTL
        );
      }
      
      await pipeline.exec();
      this.logger.debug(`Updated funding rates for ${premiumIndex.length} symbols`);
      
    } catch (error) {
      this.logger.error('Failed to collect funding rates', error);
    }
  }

  /**
   * Open Interest 수집
   * 
   * API: GET /fapi/v1/openInterest
   * - 종목별로 개별 호출 필요
   * - Rate Limit: weight 1 per call
   * - 140개 호출 = weight 140 (분당 1200 제한 내)
   * 
   * 최적화:
   * - 상위 50개만 매 분 조회
   * - 나머지는 5분마다 조회
   * 
   * 저장 데이터:
   * - openInterest: 현재 OI
   * - oiChange: 이전 대비 변화량
   * - oiChangePercent: 변화율
   */
  private async collectOpenInterest(): Promise<void> {
    try {
      // 상위 거래량 50개만 우선 처리 (Rate Limit 고려)
      const prioritySymbols = this.symbols.slice(0, 50);
      
      const pipeline = this.redis.pipeline();
      
      for (const symbol of prioritySymbols) {
        try {
          const oiResponse = await this.binance.getOpenInterest(symbol);
          const currentOi = parseFloat(oiResponse.openInterest);
          
          // 이전 OI 조회
          const prevData = await this.redis.get(`oi:${symbol}`);
          const prevOi = prevData ? JSON.parse(prevData).openInterest : currentOi;
          
          // 변화율 계산
          const oiChange = currentOi - prevOi;
          const oiChangePercent = prevOi > 0 ? (oiChange / prevOi) : 0;
          
          const data = {
            symbol,
            openInterest: currentOi,
            oiChange,
            oiChangePercent,
            direction: oiChangePercent > 0 ? 'UP' : oiChangePercent < 0 ? 'DOWN' : 'FLAT',
            updatedAt: Date.now(),
          };
          
          pipeline.set(
            `oi:${symbol}`,
            JSON.stringify(data),
            'EX',
            120  // 2분 TTL
          );
          
        } catch (symbolError) {
          // 개별 심볼 에러는 무시하고 계속
          this.logger.warn(`Failed to get OI for ${symbol}`);
        }
      }
      
      await pipeline.exec();
      this.logger.debug(`Updated OI for ${prioritySymbols.length} symbols`);
      
    } catch (error) {
      this.logger.error('Failed to collect open interest', error);
    }
  }

  /**
   * 스프레드 수집
   * 
   * API: GET /fapi/v1/ticker/bookTicker
   * - 1회 호출로 전체 종목 조회 가능
   * 
   * 저장 데이터:
   * - bidPrice, askPrice
   * - spread: ask - bid
   * - spreadPercent: spread / midPrice
   */
  private async collectSpreads(): Promise<void> {
    try {
      const bookTickers = await this.binance.getBookTicker();
      
      const pipeline = this.redis.pipeline();
      
      for (const ticker of bookTickers) {
        const bidPrice = parseFloat(ticker.bidPrice);
        const askPrice = parseFloat(ticker.askPrice);
        const midPrice = (bidPrice + askPrice) / 2;
        const spread = askPrice - bidPrice;
        const spreadPercent = midPrice > 0 ? spread / midPrice : 0;
        
        const data = {
          symbol: ticker.symbol,
          bidPrice,
          askPrice,
          midPrice,
          spread,
          spreadPercent,
          updatedAt: Date.now(),
        };
        
        pipeline.set(
          `spread:${ticker.symbol}`,
          JSON.stringify(data),
          'EX',
          30  // 30초 TTL (스프레드는 빠르게 변함)
        );
      }
      
      await pipeline.exec();
      
    } catch (error) {
      this.logger.error('Failed to collect spreads', error);
    }
  }

  /**
   * CVD 계산을 위한 헬퍼
   * 
   * 캔들 데이터에서 CVD 추출
   * - Binance 캔들: [openTime, open, high, low, close, volume, closeTime, 
   *                  quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume, ignore]
   * - Index 9 = takerBuyBaseVolume (매수 체결량)
   * 
   * CVD = takerBuyVolume - takerSellVolume
   *     = takerBuyVolume - (totalVolume - takerBuyVolume)
   *     = 2 * takerBuyVolume - totalVolume
   */
  calculateCvdFromCandle(candle: any[]): number {
    const totalVolume = parseFloat(candle[5]);      // index 5 = volume
    const takerBuyVolume = parseFloat(candle[9]);   // index 9 = taker buy volume
    const takerSellVolume = totalVolume - takerBuyVolume;
    return takerBuyVolume - takerSellVolume;
  }

  /**
   * ATR 계산
   * 
   * ATR = Average True Range
   * TR = max(high - low, |high - prevClose|, |low - prevClose|)
   * ATR = SMA(TR, period)
   */
  calculateAtr(candles: any[], period: number = 14): number {
    if (candles.length < period + 1) {
      // 데이터 부족 시 최근 봉의 high-low 평균 사용
      const ranges = candles.map(c => parseFloat(c[2]) - parseFloat(c[3]));
      return ranges.reduce((a, b) => a + b, 0) / ranges.length;
    }

    const trueRanges: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const high = parseFloat(candles[i][2]);
      const low = parseFloat(candles[i][3]);
      const prevClose = parseFloat(candles[i - 1][4]);
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    // 최근 period개의 평균
    const recentTr = trueRanges.slice(-period);
    return recentTr.reduce((a, b) => a + b, 0) / recentTr.length;
  }

  /**
   * ATR을 퍼센트로 변환
   * 
   * 가격 대비 ATR 비율
   */
  calculateAtrPercent(candles: any[], period: number = 14): number {
    const atr = this.calculateAtr(candles, period);
    const currentPrice = parseFloat(candles[candles.length - 1][4]);  // 최근 종가
    return currentPrice > 0 ? (atr / currentPrice) : 0;
  }
}
```

---

## 📈 STEP 2-6: 시그널 생성

### `scalping/services/scalping-signal.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { ScalpingDataService } from './scalping-data.service';
import { TrendAnalyzer } from '../strategies/trend-analyzer';
import { MomentumAnalyzer } from '../strategies/momentum-analyzer';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { ScalpingSignal, SignalDirection } from '../interfaces/signal.interface';

@Injectable()
export class ScalpingSignalService {
  private readonly logger = new Logger(ScalpingSignalService.name);
  
  // 현재 유효한 시그널들
  private activeSignals: ScalpingSignal[] = [];

  constructor(
    private readonly redis: RedisService,
    private readonly dataService: ScalpingDataService,
    private readonly trendAnalyzer: TrendAnalyzer,
    private readonly momentumAnalyzer: MomentumAnalyzer,
  ) {}

  /**
   * 메인 스캔 루프
   * 
   * 매 1분마다 실행
   * - 140개 종목 스캔
   * - 조건 충족 종목에 시그널 생성
   * 
   * 실행 시간: 약 100-200ms (메모리 연산만)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanForSignals(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 전체 심볼 목록 가져오기
      const symbols = await this.getMonitoredSymbols();
      
      const candidates: ScalpingSignal[] = [];
      
      for (const symbol of symbols) {
        const signal = await this.analyzeSymbol(symbol);
        if (signal) {
          candidates.push(signal);
        }
      }
      
      // 강도순 정렬
      this.activeSignals = candidates.sort((a, b) => b.strength - a.strength);
      
      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Scan completed: ${symbols.length} symbols, ` +
        `${this.activeSignals.length} signals, ${elapsed}ms`
      );
      
    } catch (error) {
      this.logger.error('Scan failed', error);
    }
  }

  /**
   * 단일 종목 분석
   * 
   * STEP 2 → 3 → 4 → 5 순서로 필터링
   * 모든 조건 통과 시에만 시그널 반환
   */
  private async analyzeSymbol(symbol: string): Promise<ScalpingSignal | null> {
    try {
      // ========================================
      // 데이터 로드 (Redis에서)
      // ========================================
      const [
        candles5m,
        candles15m,
        fundingData,
        oiData,
        spreadData,
        priceData,
      ] = await Promise.all([
        this.getCandles(symbol, '5m', 20),
        this.getCandles(symbol, '15m', 10),
        this.getFunding(symbol),
        this.getOi(symbol),
        this.getSpread(symbol),
        this.getPrice(symbol),
      ]);
      
      // 데이터 누락 체크
      if (!candles5m || candles5m.length < 10 || !candles15m || candles15m.length < 4) {
        return null;  // 데이터 부족
      }
      
      // ========================================
      // STEP 2: 1차 필터 (거시적 조건)
      // ========================================
      
      // 2-1. 스프레드 필터
      if (spreadData && spreadData.spreadPercent > SCALPING_CONFIG.filter1.maxSpreadPercent) {
        return null;  // 스프레드 과다
      }
      
      // ========================================
      // STEP 3: 2차 필터 (15분봉 추세)
      // ========================================
      const trend = this.trendAnalyzer.analyzeTrend(candles15m);
      
      if (trend.direction === 'NEUTRAL') {
        return null;  // 추세 없음
      }
      
      // OI 방향 확인 (선택적)
      if (oiData && oiData.direction === 'DOWN') {
        // OI 감소 = 청산 랠리 = 지속력 약함
        // 완전 제외하지 않고 강도 감점
      }
      
      // ========================================
      // STEP 4: 3차 필터 (5분봉 모멘텀)
      // ========================================
      const momentum = this.momentumAnalyzer.analyzeMomentum(candles5m);
      
      // 소진 상태면 진입 금지
      if (momentum.state === 'EXHAUSTED') {
        return null;
      }
      
      // 모멘텀 진행 중이면 대기 (풀백 아님)
      if (momentum.state === 'MOMENTUM') {
        return null;
      }
      
      // PULLBACK 상태만 통과
      if (momentum.state !== 'PULLBACK') {
        return null;
      }
      
      // CVD 계산
      const cvdSum = this.calculateCvdSum(candles5m, SCALPING_CONFIG.filter3.cvdBars);
      
      // ========================================
      // STEP 5: 시그널 생성
      // ========================================
      let direction: SignalDirection | null = null;
      
      // 롱 조건
      if (trend.direction === 'UP' && momentum.direction === 'UP') {
        // Funding 체크
        const fundingRate = fundingData?.lastFundingRate || 0;
        
        if (fundingRate > SCALPING_CONFIG.filter1.funding.maxForLong) {
          return null;  // Funding 과열
        }
        
        // CVD 체크
        if (cvdSum <= 0) {
          return null;  // 매도 체결 우세
        }
        
        direction = 'LONG';
      }
      
      // 숏 조건
      else if (trend.direction === 'DOWN' && momentum.direction === 'DOWN') {
        const fundingRate = fundingData?.lastFundingRate || 0;
        
        if (fundingRate < SCALPING_CONFIG.filter1.funding.minForShort) {
          return null;  // Funding 역방향 과열
        }
        
        // CVD 체크
        if (cvdSum >= 0) {
          return null;  // 매수 체결 우세
        }
        
        direction = 'SHORT';
      }
      
      if (!direction) {
        return null;  // 방향 조건 불충족
      }
      
      // ========================================
      // ATR 및 가격 계산
      // ========================================
      const atr = this.dataService.calculateAtr(candles5m, SCALPING_CONFIG.order.atrPeriod);
      const atrPercent = this.dataService.calculateAtrPercent(candles5m);
      const currentPrice = priceData?.price || parseFloat(candles5m[candles5m.length - 1][4]);
      
      // 진입가 계산
      const entryOffset = atr * SCALPING_CONFIG.order.entryOffsetAtr;
      const entryPrice = direction === 'LONG' 
        ? currentPrice - entryOffset 
        : currentPrice + entryOffset;
      
      // TP/SL 계산
      const tpDistance = atr * SCALPING_CONFIG.order.tpAtr;
      const slDistance = atr * SCALPING_CONFIG.order.slAtr;
      
      const tpPrice = direction === 'LONG'
        ? entryPrice + tpDistance
        : entryPrice - tpDistance;
      
      const slPrice = direction === 'LONG'
        ? entryPrice - slDistance
        : entryPrice + slDistance;
      
      // 강도 계산
      const strength = this.calculateStrength({
        trendStrength: trend.strength,
        momentumStrength: momentum.strength,
        cvdStrength: Math.abs(cvdSum),
        fundingFavorable: this.isFundingFavorable(fundingData?.lastFundingRate, direction),
        oiIncreasing: oiData?.direction === 'UP',
      });
      
      // ========================================
      // 시그널 객체 생성
      // ========================================
      const signal: ScalpingSignal = {
        symbol,
        direction,
        strength,
        
        // 가격 정보
        currentPrice,
        entryPrice,
        tpPrice,
        slPrice,
        
        // ATR 정보
        atr,
        atrPercent,
        
        // 지표 정보
        trend: trend.direction,
        momentum: momentum.state,
        cvd: cvdSum,
        fundingRate: fundingData?.lastFundingRate || 0,
        oiChange: oiData?.oiChangePercent || 0,
        
        // 메타 정보
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,  // 1분 후 만료
      };
      
      return signal;
      
    } catch (error) {
      this.logger.warn(`Failed to analyze ${symbol}`, error);
      return null;
    }
  }

  /**
   * CVD 합계 계산
   */
  private calculateCvdSum(candles: any[], periods: number): number {
    const recentCandles = candles.slice(-periods);
    return recentCandles.reduce((sum, candle) => {
      return sum + this.dataService.calculateCvdFromCandle(candle);
    }, 0);
  }

  /**
   * Funding이 유리한지 판단
   */
  private isFundingFavorable(fundingRate: number | undefined, direction: SignalDirection): boolean {
    if (fundingRate === undefined) return true;
    
    if (direction === 'LONG') {
      // 롱: Funding 낮을수록 유리 (숏이 비용 부담)
      return fundingRate < SCALPING_CONFIG.filter1.funding.maxForLong;
    } else {
      // 숏: Funding 높을수록 유리 (롱이 비용 부담)
      return fundingRate > SCALPING_CONFIG.filter1.funding.minForShort;
    }
  }

  /**
   * 시그널 강도 계산
   * 
   * 각 요소에 가중치를 부여하여 0-100 점수로 변환
   */
  private calculateStrength(factors: {
    trendStrength: number;
    momentumStrength: number;
    cvdStrength: number;
    fundingFavorable: boolean;
    oiIncreasing: boolean;
  }): number {
    let score = 0;
    
    // 추세 강도 (0-30점)
    score += Math.min(factors.trendStrength * 30, 30);
    
    // 모멘텀 강도 (0-25점)
    score += Math.min(factors.momentumStrength * 25, 25);
    
    // CVD 강도 (0-20점)
    score += Math.min(factors.cvdStrength * 2, 20);  // 정규화 필요
    
    // Funding 유리 (0-15점)
    score += factors.fundingFavorable ? 15 : 0;
    
    // OI 증가 (0-10점)
    score += factors.oiIncreasing ? 10 : 0;
    
    return Math.min(score, 100);
  }

  // ========================================
  // Redis 헬퍼 메서드들
  // ========================================

  private async getCandles(symbol: string, interval: string, limit: number): Promise<any[] | null> {
    const key = `candles:${interval}:${symbol}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    const candles = JSON.parse(data);
    return candles.slice(-limit);
  }

  private async getFunding(symbol: string): Promise<any | null> {
    const data = await this.redis.get(`funding:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  private async getOi(symbol: string): Promise<any | null> {
    const data = await this.redis.get(`oi:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  private async getSpread(symbol: string): Promise<any | null> {
    const data = await this.redis.get(`spread:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  private async getPrice(symbol: string): Promise<any | null> {
    const data = await this.redis.get(`price:${symbol}`);
    return data ? JSON.parse(data) : null;
  }

  private async getMonitoredSymbols(): Promise<string[]> {
    // 캐시된 심볼 목록 또는 기본 목록 반환
    const data = await this.redis.get('monitored_symbols');
    return data ? JSON.parse(data) : [];
  }

  // ========================================
  // 외부 접근 메서드
  // ========================================

  /**
   * 현재 유효한 시그널 목록 반환
   */
  getActiveSignals(): ScalpingSignal[] {
    return this.activeSignals.filter(s => s.expiresAt > Date.now());
  }

  /**
   * 상위 N개 시그널 반환
   */
  getTopSignals(count: number): ScalpingSignal[] {
    return this.getActiveSignals().slice(0, count);
  }
}
```

---

## 📐 STEP 2-4: 분석 전략 클래스들

### `scalping/strategies/trend-analyzer.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';

export interface TrendResult {
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number;  // 0-1
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
}

/**
 * 15분봉 추세 분석기
 * 
 * 고저점 구조로 추세 판단
 * - Higher Highs + Higher Lows = 상승 추세
 * - Lower Highs + Lower Lows = 하락 추세
 * - Mixed = 중립 (횡보)
 */
@Injectable()
export class TrendAnalyzer {
  
  /**
   * 추세 분석 메인 함수
   * 
   * @param candles - 15분봉 캔들 배열 (최소 4개)
   * @returns TrendResult - 추세 방향과 강도
   */
  analyzeTrend(candles: any[]): TrendResult {
    const barsToAnalyze = SCALPING_CONFIG.filter2.trendBars;
    
    if (candles.length < barsToAnalyze) {
      return this.neutralResult();
    }
    
    const recentCandles = candles.slice(-barsToAnalyze);
    
    // 고점/저점 추출
    const highs = recentCandles.map(c => parseFloat(c[2]));  // index 2 = high
    const lows = recentCandles.map(c => parseFloat(c[3]));   // index 3 = low
    
    // 고저점 패턴 분석
    const higherHighs = this.isHigherHighs(highs);
    const higherLows = this.isHigherLows(lows);
    const lowerHighs = this.isLowerHighs(highs);
    const lowerLows = this.isLowerLows(lows);
    
    // 추세 판단
    let direction: 'UP' | 'DOWN' | 'NEUTRAL';
    let strength: number;
    
    if (higherHighs && higherLows) {
      // 명확한 상승 추세
      direction = 'UP';
      strength = this.calculateTrendStrength(candles, 'UP');
    } else if (lowerHighs && lowerLows) {
      // 명확한 하락 추세
      direction = 'DOWN';
      strength = this.calculateTrendStrength(candles, 'DOWN');
    } else if (higherLows && !lowerHighs) {
      // 약한 상승 (저점만 높아짐)
      direction = 'UP';
      strength = 0.5;
    } else if (lowerHighs && !higherLows) {
      // 약한 하락 (고점만 낮아짐)
      direction = 'DOWN';
      strength = 0.5;
    } else {
      // 횡보
      direction = 'NEUTRAL';
      strength = 0;
    }
    
    return {
      direction,
      strength,
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
    };
  }
  
  /**
   * Higher Highs 체크
   * 
   * 연속적으로 고점이 높아지는지 확인
   */
  private isHigherHighs(highs: number[]): boolean {
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] <= highs[i - 1]) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Higher Lows 체크
   */
  private isHigherLows(lows: number[]): boolean {
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] <= lows[i - 1]) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Lower Highs 체크
   */
  private isLowerHighs(highs: number[]): boolean {
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] >= highs[i - 1]) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Lower Lows 체크
   */
  private isLowerLows(lows: number[]): boolean {
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] >= lows[i - 1]) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * 추세 강도 계산
   * 
   * 가격 변화율 기반
   */
  private calculateTrendStrength(candles: any[], direction: 'UP' | 'DOWN'): number {
    const firstClose = parseFloat(candles[0][4]);
    const lastClose = parseFloat(candles[candles.length - 1][4]);
    
    const changePercent = Math.abs((lastClose - firstClose) / firstClose);
    
    // 0.5% 변화 = 강도 0.5, 1% 변화 = 강도 1.0 (최대)
    return Math.min(changePercent * 100, 1);
  }
  
  private neutralResult(): TrendResult {
    return {
      direction: 'NEUTRAL',
      strength: 0,
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
    };
  }
}
```

### `scalping/strategies/momentum-analyzer.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { SCALPING_CONFIG } from '../constants/scalping.config';

export type MomentumState = 'MOMENTUM' | 'PULLBACK' | 'EXHAUSTED' | 'NEUTRAL';

export interface MomentumResult {
  state: MomentumState;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number;  // 0-1
  bodySizeRatio: number;
  volumeRatio: number;
}

/**
 * 5분봉 모멘텀 분석기
 * 
 * 모멘텀 상태 판단:
 * - MOMENTUM: 강하게 진행 중 → 진입 대기
 * - PULLBACK: 쉬어가는 중 → 진입 기회!
 * - EXHAUSTED: 소진됨 → 진입 금지
 * - NEUTRAL: 방향 없음 → 스킵
 */
@Injectable()
export class MomentumAnalyzer {
  
  /**
   * 모멘텀 분석 메인 함수
   * 
   * @param candles - 5분봉 캔들 배열 (최소 5개)
   * @returns MomentumResult - 모멘텀 상태와 방향
   */
  analyzeMomentum(candles: any[]): MomentumResult {
    const barsToAnalyze = SCALPING_CONFIG.filter3.momentumBars;
    
    if (candles.length < barsToAnalyze) {
      return this.neutralResult();
    }
    
    const recentCandles = candles.slice(-barsToAnalyze);
    
    // 1. 전체 방향 판단 (가격 변화)
    const direction = this.determineDirection(recentCandles);
    
    if (direction === 'NEUTRAL') {
      return this.neutralResult();
    }
    
    // 2. 봉 크기 비율 계산
    const bodySizeRatio = this.calculateBodySizeRatio(recentCandles);
    
    // 3. 거래량 비율 계산
    const volumeRatio = this.calculateVolumeRatio(recentCandles);
    
    // 4. 모멘텀 상태 판단
    const state = this.determineState(bodySizeRatio, volumeRatio, direction, recentCandles);
    
    // 5. 강도 계산
    const strength = this.calculateStrength(bodySizeRatio, volumeRatio);
    
    return {
      state,
      direction,
      strength,
      bodySizeRatio,
      volumeRatio,
    };
  }
  
  /**
   * 방향 판단
   * 
   * 최근 캔들들의 전체 가격 변화로 방향 결정
   */
  private determineDirection(candles: any[]): 'UP' | 'DOWN' | 'NEUTRAL' {
    const firstOpen = parseFloat(candles[0][1]);   // index 1 = open
    const lastClose = parseFloat(candles[candles.length - 1][4]);  // index 4 = close
    
    const changePercent = (lastClose - firstOpen) / firstOpen;
    
    // 0.1% 이상 변화가 있어야 방향으로 인정
    if (changePercent > 0.001) {
      return 'UP';
    } else if (changePercent < -0.001) {
      return 'DOWN';
    }
    return 'NEUTRAL';
  }
  
  /**
   * 봉 크기 비율 계산
   * 
   * 마지막 봉 크기 / 이전 봉들 평균 크기
   * - < 0.5: 소진
   * - 0.5-0.8: 풀백
   * - > 0.8: 모멘텀 진행
   */
  private calculateBodySizeRatio(candles: any[]): number {
    const bodySizes = candles.map(c => {
      const open = parseFloat(c[1]);
      const close = parseFloat(c[4]);
      return Math.abs(close - open);
    });
    
    const lastBodySize = bodySizes[bodySizes.length - 1];
    const avgBodySize = bodySizes.slice(0, -1).reduce((a, b) => a + b, 0) / (bodySizes.length - 1);
    
    return avgBodySize > 0 ? lastBodySize / avgBodySize : 0;
  }
  
  /**
   * 거래량 비율 계산
   * 
   * 마지막 봉 거래량 / 이전 봉들 평균 거래량
   */
  private calculateVolumeRatio(candles: any[]): number {
    const volumes = candles.map(c => parseFloat(c[5]));  // index 5 = volume
    
    const lastVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
    
    return avgVolume > 0 ? lastVolume / avgVolume : 0;
  }
  
  /**
   * 모멘텀 상태 판단
   * 
   * 봉 크기와 거래량을 종합하여 상태 결정
   */
  private determineState(
    bodySizeRatio: number,
    volumeRatio: number,
    direction: 'UP' | 'DOWN',
    candles: any[]
  ): MomentumState {
    const config = SCALPING_CONFIG.filter3;
    
    // 1. 소진 체크 (봉 작아지고 + 거래량 감소)
    if (bodySizeRatio < config.bodySizeRatio.exhausted && 
        volumeRatio < config.volumeDecreaseRatio) {
      return 'EXHAUSTED';
    }
    
    // 2. 강한 모멘텀 체크 (봉 크고 + 거래량 유지/증가)
    if (bodySizeRatio > config.bodySizeRatio.momentum && 
        volumeRatio >= config.volumeDecreaseRatio) {
      return 'MOMENTUM';
    }
    
    // 3. 풀백 체크 (마지막 봉이 반대 방향이거나 작음)
    const lastCandle = candles[candles.length - 1];
    const lastOpen = parseFloat(lastCandle[1]);
    const lastClose = parseFloat(lastCandle[4]);
    const lastDirection = lastClose > lastOpen ? 'UP' : 'DOWN';
    
    // 마지막 봉이 반대 방향이거나 몸통이 작으면 풀백
    if (lastDirection !== direction || bodySizeRatio < config.bodySizeRatio.momentum) {
      // 추가 검증: 풀백이 너무 깊지 않은지
      if (this.isPullbackValid(candles, direction)) {
        return 'PULLBACK';
      }
    }
    
    return 'NEUTRAL';
  }
  
  /**
   * 풀백 유효성 검증
   * 
   * 너무 깊은 되돌림은 추세 반전일 수 있음
   * - 상승 추세: 최근 저점이 이전 저점보다 높아야 함
   * - 하락 추세: 최근 고점이 이전 고점보다 낮아야 함
   */
  private isPullbackValid(candles: any[], direction: 'UP' | 'DOWN'): boolean {
    const prevCandles = candles.slice(0, -1);
    const lastCandle = candles[candles.length - 1];
    
    if (direction === 'UP') {
      // 상승 추세: 현재 저점이 이전 봉들의 최저점보다 높아야 함
      const prevLow = Math.min(...prevCandles.map(c => parseFloat(c[3])));
      const currentLow = parseFloat(lastCandle[3]);
      return currentLow > prevLow * 0.995;  // 0.5% 여유
    } else {
      // 하락 추세: 현재 고점이 이전 봉들의 최고점보다 낮아야 함
      const prevHigh = Math.max(...prevCandles.map(c => parseFloat(c[2])));
      const currentHigh = parseFloat(lastCandle[2]);
      return currentHigh < prevHigh * 1.005;  // 0.5% 여유
    }
  }
  
  /**
   * 강도 계산
   * 
   * 봉 크기와 거래량 비율을 종합
   */
  private calculateStrength(bodySizeRatio: number, volumeRatio: number): number {
    // 봉 크기 비율 50% + 거래량 비율 50%
    const bodyScore = Math.min(bodySizeRatio, 2) / 2;  // 0-1 정규화
    const volScore = Math.min(volumeRatio, 2) / 2;     // 0-1 정규화
    
    return (bodyScore + volScore) / 2;
  }
  
  private neutralResult(): MomentumResult {
    return {
      state: 'NEUTRAL',
      direction: 'NEUTRAL',
      strength: 0,
      bodySizeRatio: 0,
      volumeRatio: 0,
    };
  }
}
```

---

## 💰 STEP 7-8: 주문 실행 및 포지션 관리

### `scalping/services/scalping-order.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../../binance/binance.service';
import { ScalpingSignalService } from './scalping-signal.service';
import { ScalpingPositionService } from './scalping-position.service';
import { SCALPING_CONFIG } from '../constants/scalping.config';
import { ScalpingSignal } from '../interfaces/signal.interface';
import { ScalpingPosition } from '../interfaces/position.interface';

@Injectable()
export class ScalpingOrderService {
  private readonly logger = new Logger(ScalpingOrderService.name);
  
  // 대기 중인 주문 (미체결)
  private pendingOrders: Map<string, PendingOrder> = new Map();
  
  // 오늘 손실 추적
  private dailyLoss: number = 0;
  private lastResetDate: string = '';
  
  // 연속 손실 추적
  private consecutiveLosses: number = 0;
  private cooldownUntil: number = 0;

  constructor(
    private readonly binance: BinanceService,
    private readonly signalService: ScalpingSignalService,
    private readonly positionService: ScalpingPositionService,
  ) {}

  /**
   * 메인 실행 루프
   * 
   * 매 10초마다 실행:
   * 1. 새 시그널 확인 및 주문
   * 2. 미체결 주문 관리
   * 3. 포지션 관리
   */
  @Cron('*/10 * * * * *')  // 매 10초
  async executeLoop(): Promise<void> {
    try {
      // 일일 손실 리셋 체크
      this.checkDailyReset();
      
      // 쿨다운 체크
      if (Date.now() < this.cooldownUntil) {
        return;
      }
      
      // 일일 손실 한도 체크
      if (this.dailyLoss >= SCALPING_CONFIG.risk.maxDailyLoss) {
        this.logger.warn('Daily loss limit reached, stopping trading');
        return;
      }
      
      // 1. 새 시그널 처리
      await this.processNewSignals();
      
      // 2. 미체결 주문 관리
      await this.managePendingOrders();
      
      // 3. 포지션 관리
      await this.managePositions();
      
    } catch (error) {
      this.logger.error('Execute loop failed', error);
    }
  }

  /**
   * STEP 6: 리스크 필터 + STEP 7: 주문 실행
   */
  private async processNewSignals(): Promise<void> {
    // 현재 포지션 수 체크
    const positions = this.positionService.getActivePositions();
    
    if (positions.length >= SCALPING_CONFIG.risk.maxPositions) {
      return;  // 최대 포지션 도달
    }
    
    // 방향별 포지션 수 체크
    const longCount = positions.filter(p => p.direction === 'LONG').length;
    const shortCount = positions.filter(p => p.direction === 'SHORT').length;
    
    // 새 시그널 가져오기
    const signals = this.signalService.getActiveSignals();
    
    for (const signal of signals) {
      // 이미 해당 종목 포지션 있으면 스킵
      if (positions.some(p => p.symbol === signal.symbol)) {
        continue;
      }
      
      // 이미 해당 종목 대기 주문 있으면 스킵
      if (this.pendingOrders.has(signal.symbol)) {
        continue;
      }
      
      // 방향 편중 체크
      if (signal.direction === 'LONG' && longCount >= SCALPING_CONFIG.risk.maxSameDirection) {
        continue;
      }
      if (signal.direction === 'SHORT' && shortCount >= SCALPING_CONFIG.risk.maxSameDirection) {
        continue;
      }
      
      // 주문 실행
      await this.placeOrder(signal);
      
      // 최대 포지션 도달 시 중단
      if (positions.length + this.pendingOrders.size >= SCALPING_CONFIG.risk.maxPositions) {
        break;
      }
    }
  }

  /**
   * 주문 실행
   * 
   * Limit 주문 + TP/SL 설정
   */
  private async placeOrder(signal: ScalpingSignal): Promise<void> {
    try {
      // 포지션 사이즈 계산
      const accountBalance = await this.getAccountBalance();
      const positionSize = this.calculatePositionSize(
        accountBalance,
        signal.entryPrice,
        signal.slPrice,
        signal.direction
      );
      
      if (positionSize <= 0) {
        this.logger.warn(`Invalid position size for ${signal.symbol}`);
        return;
      }
      
      // 1. 메인 Limit 주문
      const side = signal.direction === 'LONG' ? 'BUY' : 'SELL';
      
      const mainOrder = await this.binance.createOrder({
        symbol: signal.symbol,
        side,
        type: 'LIMIT',
        quantity: positionSize,
        price: signal.entryPrice,
        timeInForce: 'GTC',  // Good Till Cancel
      });
      
      this.logger.log(
        `Order placed: ${signal.symbol} ${side} @ ${signal.entryPrice}, ` +
        `qty: ${positionSize}, orderId: ${mainOrder.orderId}`
      );
      
      // 대기 주문 등록
      this.pendingOrders.set(signal.symbol, {
        symbol: signal.symbol,
        orderId: mainOrder.orderId,
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        tpPrice: signal.tpPrice,
        slPrice: signal.slPrice,
        quantity: positionSize,
        createdAt: Date.now(),
        signal,
      });
      
    } catch (error) {
      this.logger.error(`Failed to place order for ${signal.symbol}`, error);
    }
  }

  /**
   * 미체결 주문 관리
   * 
   * - 체결 확인 → 포지션 등록 + TP/SL 설정
   * - 타임아웃 → 주문 취소
   */
  private async managePendingOrders(): Promise<void> {
    const now = Date.now();
    const timeout = SCALPING_CONFIG.order.unfillTimeoutSec * 1000;
    
    for (const [symbol, pending] of this.pendingOrders) {
      try {
        // 주문 상태 확인
        const orderStatus = await this.binance.getOrder({
          symbol,
          orderId: pending.orderId,
        });
        
        if (orderStatus.status === 'FILLED') {
          // 체결됨 → 포지션 등록 + TP/SL
          await this.onOrderFilled(pending, orderStatus);
          this.pendingOrders.delete(symbol);
          
        } else if (orderStatus.status === 'CANCELED' || orderStatus.status === 'EXPIRED') {
          // 취소됨
          this.pendingOrders.delete(symbol);
          
        } else if (now - pending.createdAt > timeout) {
          // 타임아웃 → 취소
          await this.binance.cancelOrder({
            symbol,
            orderId: pending.orderId,
          });
          this.logger.log(`Order timeout, canceled: ${symbol}`);
          this.pendingOrders.delete(symbol);
        }
        
      } catch (error) {
        this.logger.error(`Failed to manage pending order ${symbol}`, error);
      }
    }
  }

  /**
   * 주문 체결 시 처리
   * 
   * TP/SL 주문 설정 + 포지션 등록
   */
  private async onOrderFilled(pending: PendingOrder, orderStatus: any): Promise<void> {
    const filledPrice = parseFloat(orderStatus.avgPrice || orderStatus.price);
    const filledQty = parseFloat(orderStatus.executedQty);
    
    // TP 주문 (Limit)
    const tpSide = pending.direction === 'LONG' ? 'SELL' : 'BUY';
    
    try {
      await this.binance.createOrder({
        symbol: pending.symbol,
        side: tpSide,
        type: 'TAKE_PROFIT_MARKET',
        quantity: filledQty,
        stopPrice: pending.tpPrice,
        closePosition: true,
        workingType: 'MARK_PRICE',
      });
    } catch (e) {
      this.logger.warn(`Failed to set TP for ${pending.symbol}`, e);
    }
    
    // SL 주문 (Stop Market)
    try {
      await this.binance.createOrder({
        symbol: pending.symbol,
        side: tpSide,
        type: 'STOP_MARKET',
        quantity: filledQty,
        stopPrice: pending.slPrice,
        closePosition: true,
        workingType: 'MARK_PRICE',
      });
    } catch (e) {
      this.logger.warn(`Failed to set SL for ${pending.symbol}`, e);
    }
    
    // 포지션 등록
    this.positionService.addPosition({
      symbol: pending.symbol,
      direction: pending.direction,
      entryPrice: filledPrice,
      quantity: filledQty,
      tpPrice: pending.tpPrice,
      slPrice: pending.slPrice,
      originalTpPrice: pending.tpPrice,
      enteredAt: Date.now(),
      signal: pending.signal,
    });
    
    this.logger.log(
      `Position opened: ${pending.symbol} ${pending.direction} @ ${filledPrice}, ` +
      `TP: ${pending.tpPrice}, SL: ${pending.slPrice}`
    );
  }

  /**
   * STEP 8: 포지션 관리
   * 
   * 시간 기반 청산 규칙 적용
   */
  private async managePositions(): Promise<void> {
    const positions = this.positionService.getActivePositions();
    const now = Date.now();
    
    for (const position of positions) {
      const elapsedSec = (now - position.enteredAt) / 1000;
      
      try {
        // 현재 가격 조회
        const currentPrice = await this.getCurrentPrice(position.symbol);
        const pnlPercent = this.calculatePnlPercent(position, currentPrice);
        
        // 1. TP/SL 도달 체크 (거래소에서 자동 처리되지만 백업)
        if (this.isTpReached(position, currentPrice) || this.isSlReached(position, currentPrice)) {
          // 거래소 TP/SL이 처리할 것임
          continue;
        }
        
        // 2. 시간 기반 TP 축소 (20분 경과)
        if (elapsedSec >= SCALPING_CONFIG.position.tpReduceTimeSec && !position.tpReduced) {
          await this.reduceTp(position);
        }
        
        // 3. 본전 청산 (25분 경과)
        if (elapsedSec >= SCALPING_CONFIG.position.breakevenTimeSec && pnlPercent >= 0) {
          await this.closePosition(position, 'BREAKEVEN_TIMEOUT');
          continue;
        }
        
        // 4. 강제 청산 (30분 경과)
        if (elapsedSec >= SCALPING_CONFIG.position.maxHoldTimeSec) {
          await this.closePosition(position, 'MAX_TIME_TIMEOUT');
          continue;
        }
        
      } catch (error) {
        this.logger.error(`Failed to manage position ${position.symbol}`, error);
      }
    }
  }

  /**
   * TP 축소
   * 
   * 기존 TP 주문 취소 → 새 TP 주문 설정
   */
  private async reduceTp(position: ScalpingPosition): Promise<void> {
    const newTpPrice = this.calculateReducedTp(position);
    
    // 기존 TP 주문 취소
    await this.binance.cancelAllOpenOrders({ symbol: position.symbol });
    
    // 새 TP 설정
    const tpSide = position.direction === 'LONG' ? 'SELL' : 'BUY';
    
    await this.binance.createOrder({
      symbol: position.symbol,
      side: tpSide,
      type: 'TAKE_PROFIT_MARKET',
      quantity: position.quantity,
      stopPrice: newTpPrice,
      closePosition: true,
      workingType: 'MARK_PRICE',
    });
    
    // SL 재설정 (변경 없음)
    await this.binance.createOrder({
      symbol: position.symbol,
      side: tpSide,
      type: 'STOP_MARKET',
      quantity: position.quantity,
      stopPrice: position.slPrice,
      closePosition: true,
      workingType: 'MARK_PRICE',
    });
    
    // 포지션 업데이트
    position.tpPrice = newTpPrice;
    position.tpReduced = true;
    
    this.logger.log(`TP reduced for ${position.symbol}: ${newTpPrice}`);
  }

  /**
   * 축소된 TP 계산
   */
  private calculateReducedTp(position: ScalpingPosition): number {
    const originalTpDistance = Math.abs(position.originalTpPrice - position.entryPrice);
    const reducedDistance = originalTpDistance * SCALPING_CONFIG.position.tpReduceRatio;
    
    if (position.direction === 'LONG') {
      return position.entryPrice + reducedDistance;
    } else {
      return position.entryPrice - reducedDistance;
    }
  }

  /**
   * 포지션 청산
   */
  private async closePosition(position: ScalpingPosition, reason: string): Promise<void> {
    try {
      // 모든 관련 주문 취소
      await this.binance.cancelAllOpenOrders({ symbol: position.symbol });
      
      // 시장가 청산
      const side = position.direction === 'LONG' ? 'SELL' : 'BUY';
      
      await this.binance.createOrder({
        symbol: position.symbol,
        side,
        type: 'MARKET',
        quantity: position.quantity,
        reduceOnly: true,
      });
      
      // 손익 계산
      const currentPrice = await this.getCurrentPrice(position.symbol);
      const pnlPercent = this.calculatePnlPercent(position, currentPrice);
      
      // 손익 기록
      this.recordPnl(pnlPercent);
      
      // 포지션 제거
      this.positionService.removePosition(position.symbol);
      
      this.logger.log(
        `Position closed: ${position.symbol}, reason: ${reason}, ` +
        `PnL: ${(pnlPercent * 100).toFixed(2)}%`
      );
      
    } catch (error) {
      this.logger.error(`Failed to close position ${position.symbol}`, error);
    }
  }

  /**
   * 손익 기록
   */
  private recordPnl(pnlPercent: number): void {
    if (pnlPercent < 0) {
      this.dailyLoss += Math.abs(pnlPercent);
      this.consecutiveLosses++;
      
      // 연속 손실 체크
      if (this.consecutiveLosses >= SCALPING_CONFIG.risk.consecutiveLossLimit) {
        this.cooldownUntil = Date.now() + SCALPING_CONFIG.risk.cooldownMinutes * 60 * 1000;
        this.consecutiveLosses = 0;
        this.logger.warn(`Consecutive losses reached, cooling down for ${SCALPING_CONFIG.risk.cooldownMinutes} minutes`);
      }
    } else {
      this.consecutiveLosses = 0;  // 리셋
    }
  }

  // ========================================
  // 헬퍼 메서드들
  // ========================================

  private async getAccountBalance(): Promise<number> {
    const account = await this.binance.getAccount();
    const usdtBalance = account.assets.find(a => a.asset === 'USDT');
    return usdtBalance ? parseFloat(usdtBalance.walletBalance) : 0;
  }

  private calculatePositionSize(
    balance: number,
    entryPrice: number,
    slPrice: number,
    direction: string
  ): number {
    const riskAmount = balance * SCALPING_CONFIG.risk.riskPerTrade;
    const slDistance = Math.abs(entryPrice - slPrice);
    const slPercent = slDistance / entryPrice;
    
    // 포지션 사이즈 = 리스크 금액 / (SL% × 레버리지)
    const notionalValue = riskAmount / slPercent;
    const quantity = notionalValue / entryPrice;
    
    return quantity;
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const ticker = await this.binance.getTicker({ symbol });
    return parseFloat(ticker.price);
  }

  private calculatePnlPercent(position: ScalpingPosition, currentPrice: number): number {
    if (position.direction === 'LONG') {
      return (currentPrice - position.entryPrice) / position.entryPrice;
    } else {
      return (position.entryPrice - currentPrice) / position.entryPrice;
    }
  }

  private isTpReached(position: ScalpingPosition, currentPrice: number): boolean {
    if (position.direction === 'LONG') {
      return currentPrice >= position.tpPrice;
    } else {
      return currentPrice <= position.tpPrice;
    }
  }

  private isSlReached(position: ScalpingPosition, currentPrice: number): boolean {
    if (position.direction === 'LONG') {
      return currentPrice <= position.slPrice;
    } else {
      return currentPrice >= position.slPrice;
    }
  }

  private checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.dailyLoss = 0;
      this.lastResetDate = today;
    }
  }
}

interface PendingOrder {
  symbol: string;
  orderId: number;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  quantity: number;
  createdAt: number;
  signal: ScalpingSignal;
}
```

---

## 📝 인터페이스 정의

### `scalping/interfaces/signal.interface.ts`

```typescript
export type SignalDirection = 'LONG' | 'SHORT';

export interface ScalpingSignal {
  // 기본 정보
  symbol: string;
  direction: SignalDirection;
  strength: number;  // 0-100
  
  // 가격 정보
  currentPrice: number;
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  
  // ATR 정보
  atr: number;
  atrPercent: number;
  
  // 지표 정보
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  momentum: string;
  cvd: number;
  fundingRate: number;
  oiChange: number;
  
  // 메타 정보
  createdAt: number;
  expiresAt: number;
}
```

### `scalping/interfaces/position.interface.ts`

```typescript
import { ScalpingSignal, SignalDirection } from './signal.interface';

export interface ScalpingPosition {
  // 기본 정보
  symbol: string;
  direction: SignalDirection;
  
  // 가격/수량
  entryPrice: number;
  quantity: number;
  tpPrice: number;
  slPrice: number;
  originalTpPrice: number;  // TP 축소 전 원본
  
  // 상태
  tpReduced?: boolean;  // TP 축소 여부
  
  // 시간
  enteredAt: number;
  
  // 원본 시그널 (디버깅용)
  signal: ScalpingSignal;
}
```

---

## 🔄 모듈 등록

### `scalping/scalping.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScalpingDataService } from './services/scalping-data.service';
import { ScalpingSignalService } from './services/scalping-signal.service';
import { ScalpingOrderService } from './services/scalping-order.service';
import { ScalpingPositionService } from './services/scalping-position.service';
import { TrendAnalyzer } from './strategies/trend-analyzer';
import { MomentumAnalyzer } from './strategies/momentum-analyzer';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [
    // 서비스
    ScalpingDataService,
    ScalpingSignalService,
    ScalpingOrderService,
    ScalpingPositionService,
    
    // 전략 분석기
    TrendAnalyzer,
    MomentumAnalyzer,
  ],
  exports: [
    ScalpingSignalService,
    ScalpingOrderService,
  ],
})
export class ScalpingModule {}
```

---

## 📋 체크리스트

### 구현 전 확인사항

- [ ] 기존 WebSocket 구독이 5분봉, 15분봉, 실시간 가격을 Redis에 저장하는지 확인
- [ ] Redis 키 구조 확인 (`candles:5m:{symbol}` 등)
- [ ] Binance API 서비스가 필요한 엔드포인트 지원하는지 확인
- [ ] 레버리지 설정 API 확인

### 구현 순서

1. [ ] `scalping.config.ts` - 설정 파일
2. [ ] 인터페이스 파일들
3. [ ] `trend-analyzer.ts` - 15분봉 추세 분석
4. [ ] `momentum-analyzer.ts` - 5분봉 모멘텀 분석
5. [ ] `scalping-data.service.ts` - Funding, OI 수집
6. [ ] `scalping-signal.service.ts` - 시그널 생성
7. [ ] `scalping-position.service.ts` - 포지션 관리
8. [ ] `scalping-order.service.ts` - 주문 실행
9. [ ] `scalping.module.ts` - 모듈 등록

### 테스트 순서

1. [ ] 시그널 생성만 로깅 (주문 없이)
2. [ ] 페이퍼 트레이딩 (테스트넷)
3. [ ] 실전 소액 테스트 (최소 수량)
4. [ ] 파라미터 최적화
5. [ ] 실전 운영

---

## 🔢 핵심 파라미터 요약

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| 스캔 주기 | 1분 | 매 분 140개 스캔 |
| Funding 롱 한도 | 0.05% | 이 이상이면 롱 금지 |
| Funding 숏 한도 | 0.03% | 이 이하면 숏 금지 |
| 스프레드 한도 | 0.05% | 이 이상이면 제외 |
| 진입 오프셋 | ATR × 0.15 | Limit 진입 가격 |
| TP | ATR × 0.6 | 약 0.25-0.40% |
| SL | ATR × 0.3 | 약 0.12-0.20% |
| RR 비율 | 2:1 | TP:SL |
| 최대 보유 | 30분 | 초과 시 강제 청산 |
| TP 축소 | 20분 | 50%로 축소 |
| 본전 청산 | 25분 | 본전 이상 시 |
| 최대 포지션 | 5개 | 동시 보유 |
| 방향 한도 | 3개 | 롱/숏 각각 |
| 리스크/거래 | 0.5% | 계좌 대비 |
| 일일 손실 | 2% | 초과 시 중단 |
| 레버리지 | 5x | 고정 |

---

## 📞 문의사항

이 가이드대로 구현 중 문제가 생기면:

1. 에러 메시지 전체 복사
2. 해당 파일 코드 공유
3. 어떤 단계에서 문제인지 명시

Claude Code에서 이 MD 파일을 참고하여 구현하면 됩니다.