# SimpleTrueOB 실시간 매매 시스템 분석

> 분석일: 2026-01-11

---

## 목차

1. [전체 플로우](#1-전체-플로우)
2. [매수 조건 (Entry Conditions)](#2-매수-조건-entry-conditions)
3. [매도 조건 (Exit Conditions)](#3-매도-조건-exit-conditions)
4. [포지션 관리](#4-포지션-관리)
5. [리스크 관리](#5-리스크-관리)
6. [주요 파일 위치](#6-주요-파일-위치)
7. [핵심 수치 요약](#7-핵심-수치-요약)

---

## 1. 전체 플로우

### 1.1 아키텍처

```
backend/src/
├── strategies/              # 매매 전략 로직
│   ├── simple-true-ob.strategy.ts       # 핵심 매매 전략 구현
│   ├── simple-true-ob.interface.ts      # 전략 인터페이스 정의
│   └── order-block-history.service.ts   # OB 히스토리 기록
├── signal/                  # 신호 수신 및 처리
│   ├── strategy-runner.service.ts       # 전략 실행 및 신호 생성
│   └── signal-processor.service.ts      # 신호 큐 처리
├── order/                   # 주문 실행
│   └── order.service.ts                 # 주문 체결 로직
├── sync/                    # 포지션 동기화
│   └── position-sync.service.ts         # 포지션 상태 동기화
├── risk/                    # 리스크 관리
│   └── risk.service.ts                  # 위험도 계산 및 포지션 제한
├── binance/                 # 바이낸스 API 통합
├── websocket/               # 실시간 캔들 데이터 수신
└── database/                # 포지션/신호 저장소
```

### 1.2 데이터 흐름

```
Binance WebSocket → CandleAggregator → SimpleTrueOB Strategy
→ Signal Processor → Risk Service → Order Service → Position DB
→ Position Sync → Binance API → Executed Position
```

### 1.3 캔들 종료 후 상세 플로우

| 단계 | 컴포넌트 | 동작 |
|-----|---------|------|
| 1 | CandleAggregator | WebSocket 1분틱 → 5분/15분봉 집계 → 봉 종료 콜백 |
| 2 | SimpleTrueOB Strategy | 캔들 버퍼 추가 → OB 에이징 → ORB 감지 → OB 필터 → 진입 신호 |
| 3 | SignalProcessor | 신호 저장(PENDING) → 중복 체크 → 신호 큐 추가 |
| 4 | Queue Worker (1초) | 큐 추출 → 리스크 체크 → 포지션 제한 → 블랙리스트 확인 |
| 5 | OrderService | 레버리지 설정 → 지정가 주문 → SL/TP 설정 → 포지션 저장 |
| 6 | PositionSync (10초) | 바이낸스 동기화 → TP1 감지 → SL 본전이동 → 강제청산 체크 |

---

## 2. 매수 조건 (Entry Conditions)

### 2.1 ORB (Opening Range Breakout) 감지

**Bullish ORB (LONG):**
```
1. close > open (양봉)
2. candleRange > ATR × 1.5
3. volume > 50기간 평균 × 2.0
4. bodyRatio > 0.5 (몸통이 전체 범위의 50% 이상)
```

**Bearish ORB (SHORT):**
```
위와 동일하지만 close < open (음봉)
```

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `orbAtr` | 1.5 | ATR 배수 |
| `orbVol` | 2.0 | 볼륨 배수 |
| `minBodyRatio` | 0.5 | 최소 몸통 비율 |

> 코드 위치: `simple-true-ob.strategy.ts:836-869`

### 2.2 OB 필터링

#### 필터 1: OB 크기 검증
```
obSize >= ATR × 0.5
```

#### 필터 2: SMA50 트렌드 필터

SMA50 = 1시간봉 기준 = 600개 5분봉

**LONG 조건:**
| 조건 | 값 |
|-----|-----|
| 가격 위치 | close > SMA50 |
| 최소 거리 | \|close - SMA50\| / SMA50 >= 0.02 (2%) |
| 마켓 레짐 | DOWNTREND가 아님 |
| 캔들 확인 | 최근 20봉 중 10개 이상 SMA50 위 |

**SHORT 조건:**
| 조건 | 값 |
|-----|-----|
| 가격 위치 | close < SMA50 |
| 최소 거리 | \|close - SMA50\| / SMA50 >= 0.02 (2%) |
| 마켓 레짐 | UPTREND가 아님 |
| 캔들 확인 | 최근 20봉 중 10개 이상 SMA50 아래 |

**마켓 레짐 계산:**
```
smaSlope = (currentSMA - sma20BarsAgo) / sma20BarsAgo

smaSlope > 0.02  → UPTREND
smaSlope < -0.02 → DOWNTREND
그 외           → SIDEWAYS
```

#### 필터 3: 실패한 OB 재진입 방지
```
최근 20캔들 내 동일 가격대(OB 크기의 50% 이내) 실패 OB가 없어야 함
```

> 코드 위치: `simple-true-ob.strategy.ts:474-595`

### 2.3 동적 Away 조건 (ATR% 기반)

```
atrPercent = (ATR / close) × 100
```

| ATR% 범위 | minAwayMult | 설명 |
|----------|-------------|------|
| < 1.0% | 0.2 | 횡보장, 가장 민감 |
| 1.0 ~ 2.0% | 0.8 | 보통 |
| > 2.0% | 2.0 | 트렌딩, 가장 보수적 |

**진입 조건:**
```
minDist = obSize × adjustedMinAwayMult

LONG:  close > obMid + minDist
SHORT: close < obMid - minDist
```

> 코드 위치: `simple-true-ob.strategy.ts:604-639`

### 2.4 최종 진입 조건

| 조건 | 값 | 설명 |
|-----|-----|------|
| Retest | 캔들이 OB 중간가 도달 | `candleLow <= obMidpoint <= candleHigh` |
| Reversal | LONG=양봉, SHORT=음봉 | `requireReversal = true` |
| 가격 편차 | 2% 이내 | `\|close - obMidpoint\| / obMidpoint <= 0.02` |
| 주문 유효시간 | 15캔들 | 5분봉: 75분, 15분봉: 225분 |
| 재진입 쿨다운 | 12캔들 | 5분봉: 1시간, 15분봉: 3시간 |

**OB 영역 이탈 체크:**
```
obZoneBuffer = obSize × 0.5

LONG:  price < obBottom - obZoneBuffer → OB 무효화
SHORT: price > obTop + obZoneBuffer → OB 무효화
```

> 코드 위치: `simple-true-ob.strategy.ts:656-718`

### 2.5 진입가 계산

```
slippage = 0.0002 (0.02%)

LONG:  entry = obMidpoint × (1 + 0.0002)
SHORT: entry = obMidpoint × (1 - 0.0002)
```

> 코드 위치: `simple-true-ob.strategy.ts:720-728`

---

## 3. 매도 조건 (Exit Conditions)

### 3.1 손절 (Stop Loss)

| 항목 | 값 | 계산식 |
|-----|-----|-------|
| SL 버퍼 | 1% | OB 경계에서 추가 여유 |
| LONG SL | - | `obBottom × 0.99` |
| SHORT SL | - | `obTop × 1.01` |

> 코드 위치: `simple-true-ob.strategy.ts:729-743`

### 3.2 익절 (Take Profit)

**R:R 기반 계산:**
```
Risk (R) = |entry - stopLoss|

LONG:
  TP1 = entry + (R × 1.2)
  TP2 = entry + (R × 4.0)

SHORT:
  TP1 = entry - (R × 1.2)
  TP2 = entry - (R × 4.0)
```

| TP 레벨 | R:R 비율 | 청산 비율 |
|--------|----------|----------|
| TP1 | 1.2R | 100% |
| TP2 | 4.0R | 0% (미사용) |

**예시:**
```
진입가: $100
SL: $98 (Risk = $2)
TP1: $100 + ($2 × 1.2) = $102.40
```

> 코드 위치: `simple-true-ob.strategy.ts:729-743`

### 3.3 TP1 체결 후 SL 본전 이동

```
TP1 체결 감지 시 (10초 주기 동기화):
→ SL을 진입가로 이동

LONG:  새 SL = entry + (entrySlippage × 1.1) ≈ +0.02% 수익
SHORT: 새 SL = entry - (entrySlippage × 1.1) ≈ +0.02% 수익
```

> 코드 위치: `position-sync.service.ts:70-72`

### 3.4 최대 보유시간 강제 청산

| 타임프레임 | 최대 보유시간 | 초과 시 |
|-----------|-------------|--------|
| 5분봉 | 2시간 (120분) | 시장가 청산 |
| 15분봉 | 4시간 (240분) | 시장가 청산 |

> 코드 위치: `position-sync.service.ts:23-27`

---

## 4. 포지션 관리

### 4.1 포지션 크기 계산

```typescript
capital = accountBalance (기본: $10,000)

if (capital < 1000) {
    margin = 15  // 최소 마진 $15
} else {
    margin = capital × capitalUsage (10%)
    if (margin < 15) margin = 15
}

// 리스크 관리 적용
margin = margin × positionSizeMultiplier
if (margin < 15) margin = 15

// 포지션 크기
positionValue = margin × leverage
positionSize = positionValue / entryPrice
```

### 4.2 동적 레버리지 (ATR% 기반)

```
atrPercent = (ATR / close) × 100
```

| ATR% 범위 | 레버리지 | 설명 |
|----------|---------|------|
| < 1.5% | 15x | 낮은 변동성, 공격적 |
| 1.5 ~ 3.0% | 10x | 보통 변동성 |
| > 3.0% | 5x | 높은 변동성, 방어적 |

> 코드 위치: `simple-true-ob.strategy.ts:751-773`

### 4.3 주문 실행 로직

**주문 타입:** MAKER (지정가만 사용)

| 단계 | 내용 |
|-----|------|
| 1 | 레버리지 설정 (5x ~ 15x) |
| 2 | 마진 모드: ISOLATED |
| 3 | 진입: LIMIT 주문 (OB 중간가) |
| 4 | SL: ALGO ORDER (closePosition=true) |
| 5 | TP: ALGO ORDER (TAKE_PROFIT_MARKET) |

**주문 타임아웃:**
```
5분봉:  15분 (900초)
15분봉: 45분 (2700초)
```

**주문 유효성 검증:**
```
- 최소 Notional: $5 (Binance 최소)
- 안전마진: $10 이상
- 수량/가격: 심볼별 precision/tickSize
```

> 코드 위치: `order.service.ts:222-470`

### 4.4 주문 모니터링 (2초 간격)

```
while (Date.now() - startTime < maxWaitTime):
    1. 주문 상태 확인
       - FILLED: 체결 완료
       - CANCELED/EXPIRED: 취소됨

    2. OB 영역 이탈 체크
       - LONG:  price < obBottom - (obSize × 0.5) → 취소
       - SHORT: price > obTop + (obSize × 0.5) → 취소

    3. 타임아웃 → 취소
```

> 코드 위치: `order.service.ts:338-426`

### 4.5 SL/TP 슬리피지 보정

```
실제 체결가 ≠ 계획 진입가인 경우:

entrySlippageAmount = actualEntry - plannedEntry

actualSL = plannedSL + entrySlippageAmount
actualTP1 = plannedTP1 + entrySlippageAmount
actualTP2 = plannedTP2 + entrySlippageAmount
```

> 코드 위치: `order.service.ts:478-529`

---

## 5. 리스크 관리

### 5.1 포지션 제한

| 설정 | 값 |
|-----|-----|
| 최대 동시 포지션 | 10개 |
| 최대 롱 포지션 | 5개 |
| 최대 숏 포지션 | 5개 |

### 5.2 일일 손실 제한

```
DAILY_LOSS_LIMIT = 10%

당일 누적 손실 > 초기자본 × 10% → 모든 신호 거절
```

### 5.3 심볼 블랙리스트 (v13)

```
MAX_DAILY_SYMBOL_LOSSES = 2

동일 심볼 2회 이상 손실 → 당일 진입 금지
```

### 5.4 연속 손실 시 포지션 축소

| 연속 손실 횟수 | 포지션 크기 |
|--------------|-----------|
| 5회 이상 | 50% |
| 10회 이상 | 25% |
| 연속 승리 3회 | 100% (복구) |

### 5.5 포지션 동기화 (10초 주기)

```
1. 바이낸스 오픈 포지션 조회
2. DB 포지션과 비교
3. TP1 체결 감지 → SL 본전 이동
4. 최대 보유시간 초과 → 강제 청산
5. DB에만 있는 포지션 → CLOSED 처리
6. 바이낸스에만 있는 포지션 → MANUAL 생성
```

### 5.6 청산 타입 자동 감지

```
실제 청산가와 계획된 목표가 거리 비교 (5% 오차 허용):
- SL에 가장 가까움  → 'SL'
- TP1에 가장 가까움 → 'TP1'
- TP2에 가장 가까움 → 'TP2'
- 모두 멀면        → 'MANUAL'
```

### 5.7 수수료 계산

```
진입 수수료 = entryPrice × quantity × 0.0004 (0.04%)
청산 수수료 = 바이낸스 실제 수수료 합산

순 PnL = 바이낸스 손익 - 총 수수료
```

> 코드 위치: `position-sync.service.ts:52-420`

---

## 6. 주요 파일 위치

| 기능 | 파일 경로 |
|-----|----------|
| 핵심 전략 로직 | `backend/src/strategies/simple-true-ob.strategy.ts` |
| 전략 인터페이스 | `backend/src/strategies/simple-true-ob.interface.ts` |
| 주문 실행 | `backend/src/order/order.service.ts` |
| 포지션 동기화 | `backend/src/sync/position-sync.service.ts` |
| 리스크 관리 | `backend/src/risk/risk.service.ts` |
| 신호 처리 | `backend/src/signal/signal-processor.service.ts` |
| 전략 실행 | `backend/src/signal/strategy-runner.service.ts` |

---

## 7. 핵심 수치 요약

### 7.1 전략 설정값

| 설정항목 | 값 | 설명 |
|---------|-----|------|
| lookback | 2 | OB 감지용 회귀 기간 |
| minBodyRatio | 0.5 | 봉 몸통 최소 비율 (50%) |
| useBodyOnly | true | ORB는 몸통만 사용 |
| requireReversal | true | 진입 캔들 역방향 필요 |
| orbAtr | 1.5 | ORB 감지 ATR배수 |
| orbVol | 2.0 | ORB 감지 볼륨배수 |
| rrRatio | 4.0 | TP2의 R:R 비율 |
| obMaxBars | 60 | OB 최대 유지 캔들 |
| capitalUsage | 0.1 | 거래당 자본 사용 (10%) |
| slippage | 0.0002 | 슬리피지 (0.02%) |
| maxHoldingBars | 48 | 최대 보유 캔들 (4시간) |
| minAwayMultRangebound | 0.2 | ATR% < 1.0 |
| minAwayMultNormal | 0.8 | ATR% 1.0-2.0 |
| minAwayMultTrending | 2.0 | ATR% > 2.0 |
| maxPriceDeviation | 0.02 | 가격 편차 제한 (2%) |
| orderValidityBars5m | 15 | 5분봉 주문 유효시간 |
| orderValidityBars15m | 15 | 15분봉 주문 유효시간 |
| useDynamicLeverage | true | ATR% 기반 동적 레버리지 |

### 7.2 한눈에 보는 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    진입 조건 (Entry)                        │
├─────────────────────────────────────────────────────────────┤
│ ORB 감지:     ATR × 1.5 | 볼륨 × 2.0 | 몸통 50%+           │
│ 트렌드 필터:  SMA50 대비 2% 이상 거리                       │
│ Away 조건:   횡보장 0.2 | 보통 0.8 | 트렌딩 2.0            │
│ 재진입 쿨다운: 12캔들                                       │
├─────────────────────────────────────────────────────────────┤
│                    청산 조건 (Exit)                         │
├─────────────────────────────────────────────────────────────┤
│ TP1:         1.2R (100% 청산)                              │
│ SL:          OB 경계 ± 1%                                   │
│ 최대 보유:   5분봉 2시간 | 15분봉 4시간                     │
├─────────────────────────────────────────────────────────────┤
│                    포지션 관리                              │
├─────────────────────────────────────────────────────────────┤
│ 레버리지:    5x ~ 15x (ATR% 기반 동적)                      │
│ 자본 사용:   10%                                            │
│ 슬리피지:    0.02%                                          │
│ 최대 포지션: 10개 (롱5 / 숏5)                               │
│ 일일 손실:   10% 제한                                       │
│ 심볼 블랙:   2회 손실 시 당일 금지                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 최적화 이력

| 버전 | 변경사항 |
|-----|---------|
| v4 | RR Ratio 4.0, TP1 Ratio 1.2, TP 100% 단일 청산 |
| v5 | 레버리지 15x, 최대보유 48캔들 (4시간) |
| v6 | 가격 편차 2% 체크, 주문 유효시간 15캔들 |
| v7 | ATR% 기반 동적 레버리지 (15x/10x/5x) |
| v8 | 재진입 쿨다운 12캔들 추가 |
| v9 | TP1 Ratio 1.0 (승률 57%, MDD 22.5%) |
| v10 | 동적 잔액 기반 복리 재투자 |
| v13 | 일일 심볼 블랙리스트 (2회 손실 금지) |
| v14/v15 | 최대 보유시간 강제 청산 (5m: 2시간, 15m: 4시간) |
