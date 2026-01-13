# Trading Bot - Real-Time Trading Flow Documentation (v18)

## Overview

이 문서는 Trading Bot의 실시간 매매 플로우를 코드 레벨에서 상세히 설명합니다.
모든 수치와 파라미터는 실제 코드에서 추출된 정확한 값입니다.

**전략 버전**: SimpleTrueOB v18 (MTF EMA + 15m Strict Filter)
**마지막 업데이트**: 2026-01-13

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TRADING BOT FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [FLOW-0] Symbol Selection                                                      │
│       │   └── Top 80 symbols by 24h volume (MIN: $1M)                          │
│       ▼                                                                         │
│  [FLOW-1] WebSocket Connection                                                  │
│       │   └── Binance Futures (kline_5m, kline_15m, markPrice)                 │
│       ▼                                                                         │
│  [FLOW-2] Candle Aggregator                                                     │
│       │   └── Redis Buffer (50 candles, 15min TTL)                             │
│       ▼                                                                         │
│  [FLOW-3] Strategy Analysis (SimpleTrueOB v18)                                 │
│       │   └── OB Detection → ATR Filter → MTF EMA → Signal Generation          │
│       ▼                                                                         │
│  [FLOW-4] Signal Processor                                                      │
│       │   └── FIFO Queue (100 max) → Duplicate Check (15min)                   │
│       ▼                                                                         │
│  [FLOW-5] Risk Management                                                       │
│       │   └── Daily Loss → Position Limit → Correlation → Candle Entry         │
│       ▼                                                                         │
│  [FLOW-6] Order Execution                                                       │
│       │   └── LIMIT Order → SL/TP (Algo Order API)                             │
│       ▼                                                                         │
│  [FLOW-7] Position Sync                                                         │
│       │   └── TP1 Detection → SL Breakeven → Force Close                       │
│       ▼                                                                         │
│  [RESULT] Trade Closed                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. FLOW-0: Symbol Selection

**파일**: `src/symbol-selection/symbol-selection.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| MIN_VOLUME_USDT | $1,000,000 | 24시간 최소 거래량 |
| Symbol Count | 80 | 상위 거래량 종목 수 |
| CACHE_TTL | 86,400초 (24시간) | 종목 리스트 갱신 주기 |

### 핵심 종목 (항상 포함)

```typescript
private readonly CORE_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT'
];
```

### 선택 로직

1. Binance Futures에서 24시간 거래 통계 조회
2. quoteVolume (USDT 거래량) 기준 정렬
3. $1M 미만 필터링
4. 상위 80개 선택 (Core symbols 보장)

---

## 3. FLOW-1: WebSocket Connection

**파일**: `src/websocket/websocket.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| SAFE_STREAMS_PER_CONNECTION | 100 | 연결당 안전 스트림 수 |
| MAX_STREAMS_PER_CONNECTION | 1,024 | Binance 최대 제한 |
| RECONNECT_DELAY | 1,000ms | 재연결 기본 딜레이 |
| MAX_RECONNECT_ATTEMPTS | 5 | 최대 재연결 시도 |

### 스트림 구성

각 심볼당 3개 스트림:
- `{symbol}@kline_5m` - 5분봉 캔들
- `{symbol}@kline_15m` - 15분봉 캔들
- `{symbol}@markPrice` - 실시간 마크 가격

**총 스트림 수**: 80 symbols × 3 = 240 streams
**연결 수**: ceil(240 / 100) = 3 connections

### 연결 URL 형식

```
wss://fstream.binance.com/stream?streams={stream1}/{stream2}/...
```

### 재연결 로직

- Exponential backoff: `delay × 2^attempt`
- 최대 5회 시도 후 포기

---

## 4. FLOW-2: Candle Aggregator

**파일**: `src/websocket/candle-aggregator.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| bufferSize | 50 | 캔들 버퍼 크기 |
| TTL | 900초 (15분) | Redis 키 만료 시간 |

### 데이터 저장

- **저장소**: Redis (Lua script로 원자적 연산)
- **키 형식**: `candles:{symbol}:{timeframe}`
- **연산**: LPUSH + LTRIM + EXPIRE (단일 트랜잭션)

### 브로드캐스트

캔들 종료(close) 시 등록된 모든 전략에 비동기 브로드캐스트:
```typescript
await Promise.allSettled(promises);
```

---

## 5. FLOW-3: Strategy Analysis (SimpleTrueOB v18)

**파일**: `src/strategies/simple-true-ob.strategy.ts`

### 전략 버전 히스토리

| Version | Key Changes |
|---------|-------------|
| v17 | ATR range filter, OB size filter, Mitigation check |
| v18 | MTF EMA filter, 15m strict filter, Margin limits |

### 핵심 파라미터 (v18)

#### Order Block Detection

| Parameter | Value | Description |
|-----------|-------|-------------|
| obMaxBars5m | 12 | 5분봉 OB 최대 나이 (1시간) |
| obMaxBars15m | 8 | 15분봉 OB 최대 나이 (2시간) |
| orbAtr | 1.5 | ORB ATR 배수 (변동성 필터) |
| orbVol | 2.0 | ORB Volume 배수 |
| maxOBSizePercent | 0.5% | 최대 OB 크기 (가격 대비) |

#### ATR Filter (Volatility)

| Parameter | Value | Description |
|-----------|-------|-------------|
| atrPeriod | 14 | ATR 계산 기간 |
| atrFilterMin | 0.5% | 최소 ATR% (너무 낮으면 스킵) |
| atrFilterMax | 0.8% | 최대 ATR% (너무 높으면 스킵) |

#### MTF EMA Filter (v18)

| Parameter | Value | Description |
|-----------|-------|-------------|
| useMTFFilter | true | MTF 필터 활성화 |
| emaFastPeriod | 9 | EMA9 (Fast) |
| emaMidPeriod | 21 | EMA21 (Mid) |
| emaSlowPeriod | 50 | EMA50 (Slow) |

**EMA 정렬 조건**:
- LONG: EMA9 > EMA21 > EMA50
- SHORT: EMA9 < EMA21 < EMA50

#### 15분봉 Strict Filter (v18)

| Parameter | Value | Description |
|-----------|-------|-------------|
| use15mStrictFilter | true | 15m strict 필터 활성화 |
| strict15mAtrMax | 0.6% | 15분봉 최대 ATR% |
| strict15mOBSizeMax | 0.3% | 15분봉 최대 OB 크기% |

#### Entry & Exit

| Parameter | Value | Description |
|-----------|-------|-------------|
| entryPoint | MIDPOINT | OB 중간점 진입 |
| slBuffer | 0.3% | SL 버퍼 (ATR 대비) |
| rrRatio | 4.0 | Risk:Reward 비율 |
| tp1Percent | 70% | TP1 청산 비율 |
| tp2Percent | 30% | TP2 청산 비율 |

#### Leverage

| Parameter | Value | Description |
|-----------|-------|-------------|
| baseLeverage | 15 | 기본 레버리지 |

**Dynamic Leverage (ATR% 기반)**:
```typescript
private getDynamicLeverage(atrPercent: number): number {
  if (atrPercent < 1.5) return 15;  // 저변동성
  if (atrPercent <= 3.0) return 10; // 중변동성
  return 5;                          // 고변동성
}
```

#### Signal Scoring

| Parameter | Value | Description |
|-----------|-------|-------------|
| tier2ScoreThreshold | 75 | TIER2 최소 점수 |
| cvdDivergenceBars | 5 | CVD 다이버전스 체크 봉 수 |

### 신호 생성 조건 (전체 플로우)

```
1. OB Detection (ORB Method)
   - 가격 변동 > ATR × 1.5
   - 거래량 > 평균 × 2.0
   - OB 크기 < 가격의 0.5%

2. Mitigation Check
   - 이미 터치된 OB는 제외

3. ATR Filter
   - 0.5% <= ATR% <= 0.8% (5분봉)
   - ATR% <= 0.6% (15분봉)

4. MTF EMA Filter (5분봉 진입 시)
   - 15분봉 EMA 정렬 확인
   - LONG: EMA9 > EMA21 > EMA50
   - SHORT: EMA9 < EMA21 < EMA50

5. CVD Direction Check
   - LONG: CVD 상승 추세
   - SHORT: CVD 하락 추세

6. Score Calculation
   - 기본 점수 + 보너스 (MTF, Volume 등)
   - TIER1: Score >= 85
   - TIER2: Score >= 75
```

---

## 6. FLOW-4: Signal Processor

**파일**: `src/signal/signal-processor.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| MAX_QUEUE_SIZE | 100 | 최대 큐 크기 |
| Duplicate Window | 15분 | 동일 신호 중복 체크 시간 |
| Rate Limit Delay | 2,000ms | 주문 간 딜레이 |
| Max Retries | 2 | Rate limit 재시도 횟수 |

### 처리 플로우

```
1. Trading Control 체크
   └── isRunning() == false → 신호 무시

2. Duplicate Check
   └── 15분 내 동일 심볼+방향 → SKIP

3. DB 저장 (PENDING 상태)
   └── Signal 테이블에 저장

4. WebSocket 브로드캐스트
   └── 프론트엔드에 PENDING 상태 전달

5. Mutex Queue 추가
   └── FIFO 순서, 크기 초과 시 oldest 제거

6. Queue 처리 (무한 루프)
   └── Risk Check → Order Execution
```

### 중복 체크 로직

```typescript
// 최근 15분 내 동일 종목의 같은 방향 신호 확인
const recentSignals = await this.signalRepo
  .createQueryBuilder('signal')
  .where('signal.symbol = :symbol', { symbol })
  .andWhere('signal.timestamp > :time', {
    time: new Date(Date.now() - 15 * 60 * 1000)
  })
  .orderBy('signal.timestamp', 'DESC')
  .getMany();

// 같은 방향 신호가 있으면 SKIP
const sameDirection = recentSignals.filter(s => s.side === signal.side);
if (sameDirection.length > 0) return { action: 'skip' };
```

---

## 7. FLOW-5: Risk Management

**파일**: `src/risk/risk.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| MIN_MARGIN | $15 | 최소 마진 |
| MAX_MARGIN | $30 | 최대 마진 |
| ABNORMAL_MARGIN_THRESHOLD | $35 | 비정상 마진 기준 |
| MAX_SAME_DIRECTION_PER_CANDLE | 2 | 캔들당 동일 방향 최대 진입 |
| BALANCE_CACHE_TTL | 60,000ms | 잔액 캐시 TTL |
| MAX_DAILY_SYMBOL_LOSSES | 2 | 심볼 블랙리스트 기준 |

### 체크 순서

```
1. Daily Loss Limit Check
   └── 당일 손실 >= dailyLossLimit% → REJECT

2. Position Limit Check
   └── (OPEN + PENDING) >= maxPositions → REJECT
   └── Direction Limit: LONG/SHORT 개별 제한

3. Symbol Blacklist Check (v13)
   └── 당일 2회 이상 손실 → REJECT

4. Correlation Check (v12)
   └── BTC-ETH 동시 같은 방향 → REJECT
   └── 동일 섹터 제한 초과 → REJECT

5. Candle Entry Limit Check
   └── 같은 캔들 내 같은 방향 2개 초과 → REJECT

6. Position Size Calculation
   └── Margin = clamp($15, calculated, $30)
   └── Position = Margin × Leverage
```

### Daily Loss Limit 계산

```typescript
// 당일 시작 잔액 기준
const dailyPnl = (당일 청산 포지션 realizedPnl 합계);
const dailyLossPct = dailyPnl / dailyStartBalance;
const dailyLossThreshold = -dailyLossLimit; // .env에서 설정

if (dailyLossPct <= dailyLossThreshold) {
  // 일일 손실 한도 도달 - 거래 중단
  return false;
}
```

### Position Size 계산 (소자본 모드)

```typescript
// 잔액 $1000 미만 시 소자본 모드
const capitalUsage = 0.1;  // 10%
const calculatedMargin = Math.max(balance * capitalUsage, minPositionSize);

// v16: 마진 범위 제한
const marginUsdt = Math.min(Math.max(calculatedMargin, MIN_MARGIN), MAX_MARGIN);
// $15 <= margin <= $30

const positionSizeUsdt = marginUsdt * leverage;
```

---

## 8. FLOW-6: Order Execution

**파일**: `src/order/order.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| Order Type | LIMIT | 지정가 주문만 사용 |
| Entry Point | MIDPOINT | OB 중간점 |
| Order Validity (5m) | 900초 (15분) | 3캔들 |
| Order Validity (15m) | 2,700초 (45분) | 3캔들 |
| TP1_RATIO | 1.2 | TP1 = 1.2R |
| TP2_RATIO | 4.0 | TP2 = 4.0R |
| MIN_TP_NOTIONAL | $10 | 최소 TP 주문 금액 |

### 주문 실행 플로우

```
1. Duplicate Prevention Check
   └── 바이낸스 기존 포지션/주문 확인

2. Leverage Setting (with fallback)
   └── 시도: 요청 레버리지 → 20x → 15x → 10x → 5x

3. Margin Type Setting
   └── ISOLATED 고정

4. LIMIT Order Creation
   └── Price: OB Midpoint
   └── TimeInForce: GTC

5. Order Monitoring
   └── 체결 대기 (최대 15분/45분)
   └── OB Zone 이탈 시 취소

6. SL Order (Algo Order API)
   └── Type: STOP_MARKET
   └── closePosition: true (전체 포지션 청산)

7. TP Orders (Algo Order API)
   └── TP1: 70% at 1.2R
   └── TP2: 30% at 4.0R
   └── Type: TAKE_PROFIT_MARKET

8. Position DB 저장
   └── planned values + actual values + slippage
```

### SL/TP 슬리피지 보정

```typescript
// 진입 슬리피지 계산
const entrySlippageAmount = actualEntry - plannedEntry;

// SL 조정 (슬리피지 반영)
const actualStopLoss = plannedStopLoss + entrySlippageAmount;

// Risk 재계산
const actualRisk = Math.abs(actualEntry - actualStopLoss);

// TP 재계산 (R:R 비율 유지)
const actualTP1 = side === 'LONG'
  ? actualEntry + (actualRisk * 1.2)
  : actualEntry - (actualRisk * 1.2);

const actualTP2 = side === 'LONG'
  ? actualEntry + (actualRisk * 4.0)
  : actualEntry - (actualRisk * 4.0);
```

### TP Notional 검증

```typescript
const tp1Qty = executedQty * (tp1Percent / 100);  // 70%
const tp2Qty = executedQty * (tp2Percent / 100);  // 30%
const tp1Notional = tp1Qty * entryPrice;
const tp2Notional = tp2Qty * entryPrice;

if (tp1Notional < 10 || tp2Notional < 10) {
  // 분할 TP 불가 → 단일 TP (100%) 사용
  const singleTP = await createAlgoOrder({
    type: 'TAKE_PROFIT_MARKET',
    triggerPrice: tp1Price,
    quantity: executedQty,  // 전체 수량
  });
}
```

---

## 9. FLOW-6.5: Order Monitor Service

**파일**: `src/order/order-monitor.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| MONITOR_INTERVAL | 2,000ms | 모니터링 주기 |
| MAX_SLTP_RETRIES | 3 | SL/TP 생성 최대 재시도 |
| Position Wait | 2,000ms | Binance 포지션 인식 대기 |
| Sync Interval | 60초 | Binance 동기화 주기 |

### 비동기 주문 모니터링 플로우

```
1. LIMIT 주문 등록 (OrderService에서 호출)
   └── PendingLimitOrder로 저장

2. 2초 간격 모니터링 루프
   ├── CASE 1: FILLED
   │   └── SL/TP 생성 → Position DB 저장
   ├── CASE 2: CANCELED/EXPIRED
   │   └── Signal 상태 업데이트
   └── CASE 3: NEW (대기 중)
       ├── Timeout 체크 (15분/45분)
       └── OB Zone 이탈 체크

3. SL/TP 생성 (체결 시)
   └── 2초 대기 (Binance 포지션 인식)
   └── 최대 3회 재시도
   └── 실패 시 긴급 청산
```

### OB Zone 이탈 체크

```typescript
const buffer = (obTop - obBottom) * 0.5;  // 50% 버퍼

const isOutOfZone = side === 'LONG'
  ? currentPrice < obBottom - buffer  // 하단 이탈
  : currentPrice > obTop + buffer;     // 상단 이탈

if (isOutOfZone) {
  await cancelOrder(symbol, orderId);
}
```

---

## 10. FLOW-7: Position Sync Service

**파일**: `src/sync/position-sync.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| Sync Interval | 10초 | 동기화 주기 |
| MAX_SLTP_RETRIES | 3 | SL/TP 생성 최대 재시도 |
| MAX_TIME_WITHOUT_SL | 5분 | SL 없이 허용 최대 시간 |
| MAX_MARGIN_PERCENT | 10% | 비정상 마진 기준 (자본 대비) |
| ABSOLUTE_MAX_MARGIN | $35 | 절대 마진 한도 |

### 최대 보유 시간 (v15)

| Timeframe | Max Holding | Candles |
|-----------|-------------|---------|
| 5분봉 | 2시간 (120분) | 24캔들 |
| 15분봉 | 4시간 (240분) | 16캔들 |

### TP1 감지 로직

```typescript
// DB 원래 수량 vs 바이낸스 현재 수량 비교
const originalQty = dbPosition.quantity;
const currentQty = Math.abs(binancePosition.positionAmt);
const remainingRatio = currentQty / originalQty;

// TP1 (70%) 체결 → 남은 비율 약 30% (±5% 오차 허용)
if (remainingRatio > 0.25 && remainingRatio < 0.40 && currentQty > 0) {
  // TP1 체결 감지 → SL 본전 이동
  await modifyStopLoss(symbol, side, entryPrice, existingSlAlgoId);
}
```

### 방어 로직

#### 1. 미인식 포지션 감지 및 청산

```
조건:
- DB에 없음
- 매칭 PENDING 신호 없음 (30분 이내)
- OrderService 처리 중 아님

→ 즉시 시장가 청산
```

#### 2. 비정상 마진 포지션 청산

```
조건:
- margin > totalCapital × 10%, 또는
- margin >= $35 (절대값)

→ 즉시 시장가 청산
```

#### 3. SL 없는 포지션 처리

```
- SL 없이 5분 경과 → 강제 청산
- SL/TP 생성 3회 실패 → 강제 청산
```

#### 4. 최대 보유 시간 초과

```
- 5분봉: 2시간 초과 → 강제 청산
- 15분봉: 4시간 초과 → 강제 청산
```

### 청산 타입 감지

```typescript
// 청산가와 각 목표가 간 거리 계산
const slDistance = Math.abs(closePrice - plannedSL);
const tp1Distance = Math.abs(closePrice - plannedTP1);
const tp2Distance = Math.abs(closePrice - plannedTP2);

// 가장 가까운 목표가로 청산 타입 결정 (5% 오차 허용)
const tolerance = entryPrice * 0.05;

if (slDistance < tolerance) closeType = 'SL';
else if (tp1Distance < tolerance) closeType = 'TP1';
else if (tp2Distance < tolerance) closeType = 'TP2';
else closeType = 'MANUAL';
```

---

## 11. Binance Service

**파일**: `src/binance/binance.service.ts`

### 핵심 파라미터

| Parameter | Value | Description |
|-----------|-------|-------------|
| MAX_RETRIES | 5 | 최대 재시도 횟수 |
| MAX_RETRY_DELAY | 30,000ms | 최대 재시도 딜레이 |

### Circuit Breaker 설정

#### Order Circuit Breaker

| Parameter | Value |
|-----------|-------|
| timeout | 30,000ms |
| errorThresholdPercentage | 50% |
| resetTimeout | 60,000ms |
| volumeThreshold | 5 |

#### Query Circuit Breaker

| Parameter | Value |
|-----------|-------|
| timeout | 15,000ms |
| errorThresholdPercentage | 60% |
| resetTimeout | 30,000ms |
| volumeThreshold | 10 |

### Algo Order API (2025-12-09 변경)

STOP_MARKET, TAKE_PROFIT_MARKET 등 조건부 주문은 Algo Order API 필수:

```typescript
// SL 생성 (전체 포지션 청산)
await createAlgoOrder({
  symbol,
  side: 'SELL',  // LONG 청산 시
  type: 'STOP_MARKET',
  triggerPrice: slPrice,
  closePosition: true,  // 전체 포지션
});

// TP 생성 (부분 청산)
await createAlgoOrder({
  symbol,
  side: 'SELL',
  type: 'TAKE_PROFIT_MARKET',
  triggerPrice: tpPrice,
  quantity: tpQuantity,  // 부분 수량
});
```

### Circuit Breaker 예외 처리

```typescript
// 이 에러들은 실패로 카운트하지 않음
errorFilter: (err) => {
  // -4509: TIF GTE can only be used with open positions
  // -4130: 이미 동일한 주문 존재
  if (err?.code === -4509 || err?.code === -4130) {
    return true;  // 성공 취급
  }
  return false;  // 실패로 카운트
}
```

---

## 12. Environment Variables

### 필수 설정 (.env)

```bash
# Binance API
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/trading

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Risk Management
ACCOUNT_BALANCE=500              # 초기 자본 ($)
RISK_PER_TRADE=0.01              # 거래당 리스크 (1%)
DAILY_LOSS_LIMIT=0.10            # 일일 손실 한도 (10%)
MAX_POSITIONS=10                 # 최대 포지션 수
MAX_LONG_POSITIONS=5             # 최대 LONG 포지션
MAX_SHORT_POSITIONS=5            # 최대 SHORT 포지션
MIN_POSITION_SIZE=15             # 최소 포지션 크기 ($15)
FIXED_LEVERAGE=15                # 고정 레버리지 (0이면 동적)
USE_DYNAMIC_BALANCE=true         # 복리 재투자 활성화
```

---

## 13. Logging Flow Tags

각 로그는 플로우 태그로 식별 가능:

| Tag | Component | Description |
|-----|-----------|-------------|
| [FLOW-1] | WebSocket | 캔들 수신 |
| [FLOW-2] | CandleAggregator | Redis 저장 및 브로드캐스트 |
| [FLOW-3] | Strategy | 전략 분석 |
| [FLOW-4] | SignalProcessor | 신호 큐 처리 |
| [FLOW-5] | RiskService | 리스크 체크 |
| [FLOW-6] | OrderService | 주문 실행 |
| [FLOW-7] | PositionSync | 포지션 동기화 |

---

## 14. Summary: 전체 수치 요약

### Strategy v18

| Category | Parameter | Value |
|----------|-----------|-------|
| OB Detection | obMaxBars5m | 12 (1시간) |
| OB Detection | obMaxBars15m | 8 (2시간) |
| OB Detection | maxOBSizePercent | 0.5% |
| ATR Filter | atrFilterMin | 0.5% |
| ATR Filter | atrFilterMax | 0.8% |
| MTF EMA | EMA periods | 9, 21, 50 |
| 15m Strict | atrMax | 0.6% |
| 15m Strict | obSizeMax | 0.3% |
| Entry/Exit | entryPoint | MIDPOINT |
| Entry/Exit | rrRatio | 1:4 |
| Entry/Exit | tp1Percent | 70% |
| Entry/Exit | tp2Percent | 30% |
| Leverage | base | 15x |
| Leverage | dynamic (<1.5% ATR) | 15x |
| Leverage | dynamic (1.5-3% ATR) | 10x |
| Leverage | dynamic (>3% ATR) | 5x |

### Risk Management

| Category | Parameter | Value |
|----------|-----------|-------|
| Margin | MIN_MARGIN | $15 |
| Margin | MAX_MARGIN | $30 |
| Margin | ABNORMAL | $35 |
| Daily | Loss Limit | 10% |
| Position | Max Total | 10 |
| Position | Max LONG | 5 |
| Position | Max SHORT | 5 |
| Symbol | Blacklist Threshold | 2 losses |
| Candle | Same Direction Limit | 2 |

### Timing

| Category | Parameter | Value |
|----------|-----------|-------|
| Order | 5m Validity | 15분 (3캔들) |
| Order | 15m Validity | 45분 (3캔들) |
| Holding | 5m Max | 2시간 |
| Holding | 15m Max | 4시간 |
| Sync | Position Sync | 10초 |
| Sync | Order Monitor | 2초 |
| Sync | Binance Sync | 60초 |
| Cache | Balance Cache | 60초 |

---

**Document Version**: 1.0
**Strategy Version**: SimpleTrueOB v18
**Last Updated**: 2026-01-13
