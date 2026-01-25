# OKX SimpleTrueOB 전략 분석 문서

작성일: 2026-01-25
현재 버전: **v16 (RR 개선 패키지)**

---

## 목차

1. [개요](#개요)
2. [현재 사용 중인 설정 (v16)](#현재-사용-중인-설정-v16)
3. [버전 이력](#버전-이력)
4. [비활성화된 기능](#비활성화된-기능)
5. [핵심 로직](#핵심-로직)
6. [포지션 관리](#포지션-관리)
7. [파일 구조](#파일-구조)

---

## 개요

### 전략 목표
- **전략명**: SimpleTrueOB (Order Block 기반 진입)
- **거래소**: OKX
- **타임프레임**: 5분, 15분
- **목표 승률**: 50%+
- **목표 RR**: 1.5:1+

### 핵심 원칙
1. **Order Block 기반 진입**: OB 영역 리테스트 시 진입
2. **ATR 기반 손절**: 7기간 ATR × 1.5
3. **부분 익절**: TP1(1R) 70%, TP2(2R) 30%
4. **트레일링 스탑**: 1R 도달 시 SL → 진입가
5. **시간 기반 청산**: 30분 후 수익 없으면 청산

---

## 현재 사용 중인 설정 (v16)

### 진입 설정
| 파라미터 | 값 | 설명 |
|---------|-----|------|
| entryRatio | 0.3 | OB 경계(0)와 현재가(1) 사이 진입 위치 |
| leverage | 20x | 고정 레버리지 |
| margin | $20 | 고정 마진 |
| orderValidityBars5m | 3 | 5분봉 주문 유효시간 (15분) |
| orderValidityBars15m | 3 | 15분봉 주문 유효시간 (45분) |

### 손절/익절 설정
| 파라미터 | 값 | 설명 |
|---------|-----|------|
| SL 계산 | ATR7 × 1.5 | 7기간 ATR 기반 동적 손절 |
| TP1 | 1R (70%) | 진입~SL 거리의 1배 위치에서 70% 청산 |
| TP2 | 2R (30%) | 진입~SL 거리의 2배 위치에서 30% 청산 |

### Order Block 감지
| 파라미터 | 값 | 설명 |
|---------|-----|------|
| orbAtr | 1.6 | ORB 감지용 ATR 배수 |
| orbVol | 2.2 | ORB 감지용 거래량 배수 |
| obMaxBars | 60 | OB 유효 기간 (캔들 수) |
| minAwayMultRangebound | 0.2 | 횡보장 최소 이탈 배수 |
| minAwayMultNormal | 0.8 | 보통장 최소 이탈 배수 |
| minAwayMultTrending | 2.0 | 추세장 최소 이탈 배수 |

### 포지션 관리 (PositionSync)
| 파라미터 | 값 | 설명 |
|---------|-----|------|
| 트레일링 스탑 | 1R 도달 시 | SL을 진입가로 이동 (손실 0 보장) |
| 시간 기반 청산 | 30분 | 30분 후 수익 없으면 시장가 청산 |
| 동기화 주기 | 10초 | OKX 포지션 동기화 간격 |

### 필터 설정
| 필터 | 상태 | 설명 |
|------|------|------|
| ATR+CVD 필터 | ✅ 활성 | ATR% 0.5-3.0%, CVD 20캔들 |
| 유동성 스윕 필터 | ✅ 활성 | 10캔들 내 0.05%+ 돌파 확인 |
| BTC 세이프티 가드 | ✅ 활성 | BTC 급변동 시 대기 |
| OI 다이버전스 | ✅ 활성 | 가격-OI 다이버전스 확인 |

---

## 버전 이력

### v16 (2026-01-25) - 현재 버전
**RR 개선 패키지**
- 진입비율: 0.5 → **0.3** (OB에 더 가깝게)
- ATR 기반 SL: 고정 0.6% → **1.5x ATR (7기간)**
- 부분 익절: TP1(1R) **70%**, TP2(2R) **30%**
- 트레일링 스탑: **1R 도달 시 SL → 진입가**
- 시간 청산: **30분 후 수익 없으면 청산**

### v15.2 (2026-01-25)
- 진입가: OB 경계와 현재가의 50% 중간 지점
- entryRatio = 0.5

### v15.1 (2026-01-25)
- 진입가: OB 경계선 → 현재 종가 (즉시 체결)
- 체결률 0% → 90%+ 개선

### v15 (2026-01-25)
- ~~REVERSAL 모드~~ 비활성화 (TREND_FOLLOWING만 사용)
- ~~TP Ratio 1.5R~~ → 2.0R
- SL Buffer: ~~0.8%~~ → 0.6%
- 마진: ~~$10~~ → $20
- 레버리지: ~~15x~~ → 20x

### v14 (2026-01-24)
- 마진 $10 고정, 레버리지 15x 고정
- REVERSAL 조건 강화
- ~~REVERSAL TP 2.0R~~ → 1.3R

### v12 (2026-01-23)
- 소액 자산 최적화 (capitalUsage 0.2)
- 유동성 스윕 필터 추가
- BTC 세이프티 가드 추가
- OI 다이버전스 필터 추가

### v11 (2026-01-22)
- ~~시장 레짐 기반 자동 스위칭~~ (ADX + RSI + EMA 이격도)
- ~~리버스 모드~~ TP 비율: 2.0R

### v10 (2026-01-13)
- ATR + CVD 필터 추가
- 승률 58.8% → 62.5% (+3.7%p)

---

## 비활성화된 기능

다음 기능들은 코드에 존재하지만 **현재 비활성화** 상태입니다:

### ~~시장 레짐 기반 스위칭 (useMarketRegime)~~
```typescript
useMarketRegime: false  // v15에서 비활성화
```
- ADX, RSI, EMA 이격도 기반 REVERSAL/TREND 자동 전환
- v15에서 TREND_FOLLOWING만 사용하도록 변경

### ~~동적 레버리지 (useDynamicLeverage)~~
```typescript
useDynamicLeverage: false  // v15에서 비활성화
```
- ATR% 기반 레버리지 조절 (5x-15x)
- v15에서 20x 고정으로 변경

### ~~REVERSAL 모드~~
- v15에서 완전 비활성화
- 모든 진입이 TREND_FOLLOWING 모드

### ~~고정 SL Buffer (slBuffer 0.6%)~~
- v16에서 ATR 기반 동적 SL로 변경
- 1.5x ATR (7기간)

---

## 핵심 로직

### 1. Order Block 감지
```
MSB (Market Structure Break): 구조 이탈 후 형성된 OB
SWEEP: 유동성 스윕 후 형성된 OB
ORB: Opening Range Breakout (orbAtr, orbVol 조건 충족)
```

### 2. 진입 조건
```
1. OB 감지 ✅
2. 가격이 OB에서 이탈 (minAwayMult × ATR 이상) ✅
3. 가격이 OB 영역으로 리테스트 ✅
4. ATR+CVD 필터 통과 ✅
5. 유동성 스윕 필터 통과 ✅
6. BTC 급변동 없음 ✅
→ 시그널 발생!
```

### 3. v16 진입가 계산
```typescript
const obBoundary = direction === 'LONG' ? activeOB.bottom : activeOB.top;
const entryRatio = 0.3;  // 0 = OB 경계, 1 = 현재가
const entry = obBoundary + (currentPrice - obBoundary) * entryRatio;
```

### 4. v16 SL 계산 (ATR 기반)
```typescript
const atr7 = calculateATR7(candles, i);  // 7기간 ATR
const slDistance = atr7 * 1.5;           // 1.5x ATR

// LONG: SL = Entry - slDistance
// SHORT: SL = Entry + slDistance
```

### 5. v16 TP 계산
```typescript
const risk = Math.abs(entry - stopLoss);
const tp1 = direction === 'LONG'
  ? entry + risk * 1.0   // TP1 = 1R
  : entry - risk * 1.0;
const tp2 = direction === 'LONG'
  ? entry + risk * 2.0   // TP2 = 2R
  : entry - risk * 2.0;
```

---

## 포지션 관리

### PositionSyncService (position-sync.service.ts)

#### v16 트레일링 스탑
```typescript
// 1R 도달 시 SL → 진입가로 이동
private async checkTrailingStopAt1R(dbPositions, okxPositions) {
  for (const pos of dbPositions) {
    const risk = Math.abs(entryPrice - stopLoss);
    const oneRPrice = side === 'LONG'
      ? entryPrice + risk
      : entryPrice - risk;

    if (markPrice >= oneRPrice) {  // 1R 도달
      await this.okxService.modifyStopLoss(symbol, entryPrice);  // SL → 진입가
      this.oneRReachedPositions.add(symbol);
    }
  }
}
```

#### v16 시간 기반 청산
```typescript
// 30분 후 수익 없으면 청산
private readonly TIME_BASED_EXIT_MS = 30 * 60 * 1000;  // 30분

private async checkTimeBasedExit(dbPositions, okxPositions) {
  for (const pos of dbPositions) {
    const holdingTime = Date.now() - pos.openedAt;
    const unrealizedPnl = parseFloat(okxPos.unrealizedProfit);

    if (holdingTime > TIME_BASED_EXIT_MS && unrealizedPnl <= 0) {
      await this.okxService.closePosition(symbol, quantity);  // 시장가 청산
    }
  }
}
```

---

## 파일 구조

### 전략 관련 파일
| 파일 | 역할 |
|-----|------|
| `src/strategies/simple-true-ob.strategy.ts` | 메인 전략 로직 |
| `src/strategies/simple-true-ob.interface.ts` | 인터페이스 정의 |
| `src/strategies/oi-divergence.service.ts` | OI 다이버전스 필터 |
| `src/strategies/btc-safety-guard.service.ts` | BTC 세이프티 가드 |

### 포지션 관리 파일
| 파일 | 역할 |
|-----|------|
| `src/sync/position-sync.service.ts` | 포지션 동기화 + v16 트레일링/시간 청산 |
| `src/order/order.service.ts` | 주문 실행 |
| `src/order/order-monitor.service.ts` | 주문 모니터링 |

### OKX 연동 파일
| 파일 | 역할 |
|-----|------|
| `src/okx/okx.service.ts` | OKX API 연동 |
| `src/okx/okx-websocket.service.ts` | OKX WebSocket 연동 |

---

## 성능 지표 (목표)

| 지표 | 이전 (v15) | 목표 (v16) |
|-----|-----------|-----------|
| 승률 | 50% | 50%+ |
| RR | 0.94:1 | 1.5:1+ |
| 평균 보유 시간 | - | 30분 이내 |
| 일일 시그널 | 2-5개 | 2-5개 |

---

## 환경 설정 (.env)

```env
# OKX API
OKX_API_KEY=xxx
OKX_SECRET_KEY=xxx
OKX_PASSPHRASE=xxx

# Trading Settings
ACCOUNT_BALANCE=100
RISK_PER_TRADE=0.01
MAX_POSITIONS=8
FIXED_LEVERAGE=20
MIN_POSITION_SIZE=15
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|-----|------|----------|
| 2026-01-25 | v16 | RR 개선 패키지 (ATR SL, 분할 TP, 트레일링, 시간 청산) |
| 2026-01-25 | v15.2 | entryRatio 0.5 |
| 2026-01-25 | v15.1 | 체결률 개선 (즉시 체결) |
| 2026-01-25 | v15 | REVERSAL 비활성화, 20x 레버리지 |
| 2026-01-24 | v14 | 고정 마진/레버리지 |
| 2026-01-23 | v12 | 필터 강화 |
| 2026-01-22 | v11 | 시장 레짐 스위칭 |
| 2026-01-13 | v10 | ATR+CVD 필터 |

---

*이 문서는 2026-01-25 기준으로 작성되었습니다.*
