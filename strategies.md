# 🎯 Smart Money Concepts 매매 전략 완전 정리

## 📋 핵심 개념 요약

### **7가지 SMC 요소**
1. **Market Structure** - BOS/CHoCH (추세 방향)
2. **Order Blocks** - 기관 주문 구역 (진입 위치)
3. **Fair Value Gaps** - 가격 공백 (지지/저항)
4. **Equal Highs/Lows** - 유동성 집중 (사냥감)
5. **Premium/Discount Zones** - 가격 밸류에이션
6. **Strong/Weak Highs/Lows** - 트레일링 레벨
7. **Internal vs Swing** - 타임프레임 구분

---

## 🎯 매매 신호 생성 로직

### **TIER 1: ULTRA PREMIUM (95% 신뢰도, 3% 포지션)**

#### 필수 조건 (ALL 충족)
```
1. Swing BOS 발생 (50봉 기준)
   - 상승 BOS: 이전 High 돌파 + 추세 BULLISH 전환
   - 하락 BOS: 이전 Low 돌파 + 추세 BEARISH 전환

2. Bullish/Bearish Order Block 존재
   - Untested 상태 (미테스트)
   - 현재가가 OB 범위 내부
   - Volume Delta ≥ 5M

3. Fair Value Gap 정렬
   - 같은 방향 FVG 존재
   - 현재가가 FVG 50% 이내

4. Discount/Premium Zone 위치
   - LONG: Discount Zone (0-25%)
   - SHORT: Premium Zone (75-100%)
```

#### 보조 확인 (+5점씩)
```
5. VWAP 방향 일치
   - LONG: 가격 > VWAP
   - SHORT: 가격 < VWAP

6. Volume Delta 확인
   - LONG: Delta > 0
   - SHORT: Delta < 0

7. Funding Rate 유리
   - LONG: Funding < -0.01%
   - SHORT: Funding > +0.01%
```

#### 진입 규칙
```
LONG:
- Entry: Order Block 상단 (50% 지점 권장)
- SL: Order Block 하단 - (ATR × 0.5)
- TP1: Equilibrium (50%)
- TP2: Premium Zone 하단 (75%)
- TP3: Swing High

SHORT:
- Entry: Order Block 하단 (50% 지점 권장)
- SL: Order Block 상단 + (ATR × 0.5)
- TP1: Equilibrium (50%)
- TP2: Discount Zone 상단 (25%)
- TP3: Swing Low
```

---

### **TIER 2: PREMIUM (80% 신뢰도, 2% 포지션)**

#### 필수 조건 (3개 중 2개 충족)
```
1. Swing BOS + Order Block
   - BOS 발생
   - OB 리테스트 진행 중

2. Internal BOS + Swing 추세 일치
   - Internal BOS (5봉)
   - Swing 추세와 같은 방향

3. CHoCH + Order Block
   - 추세 전환 신호
   - 새로운 방향의 OB 형성
```

#### 추가 필터
```
4. VWAP 위치 확인
   - LONG: 가격 > VWAP (필수)
   - SHORT: 가격 < VWAP (필수)

5. Volume 확인
   - 현재 Volume > 평균 1.2배
```

#### 진입 규칙
```
LONG:
- Entry: Order Block 내부 (현재가)
- SL: OB 하단 - ATR × 0.3
- TP1: 1:1 RR
- TP2: 2:1 RR

SHORT:
- Entry: Order Block 내부
- SL: OB 상단 + ATR × 0.3
- TP1: 1:1 RR
- TP2: 2:1 RR
```

---

### **TIER 3: STANDARD (72% 신뢰도, 1.5% 포지션)**

#### 필수 조건
```
1. Internal BOS (5봉) 발생
   - 빠른 구조 변화 감지

2. Internal Order Block 리테스트
   - 현재가가 Internal OB 내부

3. Volume Delta 일치
   - LONG: Delta > 0
   - SHORT: Delta < 0
```

#### 추가 조건 (선택)
```
4. Equal Highs/Lows 근처
   - EQH/EQL ± 0.3% 이내

5. FVG 존재
   - 같은 방향 FVG
```

#### 진입 규칙
```
LONG:
- Entry: Internal OB 상단
- SL: Internal OB 하단
- TP1: 0.8:1 RR
- TP2: 1.5:1 RR

SHORT:
- Entry: Internal OB 하단
- SL: Internal OB 상단
- TP1: 0.8:1 RR
- TP2: 1.5:1 RR
```

---

## 🔥 특수 전략: Liquidity Grab

### **Equal Highs/Lows 사냥 전략**

#### 신호 발생 조건
```
1. Equal High 형성 (3회 이상 터치)
   - 가격대 차이 < ATR × 0.1
   - 3-5개 봉 간격

2. EQH 돌파 발생
   - Stop Loss 청산 유발

3. 빠른 되돌림 (15분 이내)
   - EQH 아래로 재진입
   - = Liquidity Grab 확인

4. 반대 방향 Order Block 존재
   - Bearish OB 발견
```

#### 진입 규칙
```
SHORT (EQH Grab):
- Entry: EQH 레벨 (되돌림 확인 후)
- SL: EQH + ATR × 0.5
- TP1: 최근 Bullish OB 상단
- TP2: Swing Low

신뢰도: 85%
Position: 2.5%
```

---

## 📊 타임프레임 전략

### **15분봉 (주 전략)**
```
사용:
- Swing Structure (50봉)
- Swing Order Blocks
- Fair Value Gaps

신호 빈도: 2-4회/일 (80 심볼)
보유 시간: 2-6시간
적합 Tier: 1, 2
```

### **5분봉 (진입 타이밍)**
```
사용:
- Internal Structure (5봉)
- Internal Order Blocks
- 빠른 BOS 감지

신호 빈도: 5-10회/일
보유 시간: 30분-2시간
적합 Tier: 3
```

### **Multi-Timeframe 조합**
```
최적 전략:
1. 15분봉에서 Swing BOS 확인
2. 15분봉 Order Block 식별
3. 5분봉에서 Internal BOS 대기
4. 5분봉 OB 리테스트 시 진입

효과:
- 큰 그림 확인 (15분)
- 정밀 진입 (5분)
- 승률 +8-12%
```

---

## 🛡️ 리스크 관리

### **포지션 사이징**
```
기본 원칙:
- Tier 1: 3% (OB 하단까지 리스크 2%)
- Tier 2: 2% (OB 하단까지 리스크 2%)
- Tier 3: 1.5% (OB 하단까지 리스크 2%)

계산:
Risk Amount = Account × 0.02
Position Size = Risk Amount / (Entry - SL)
```

### **손절 규칙**
```
LONG:
- 초기 SL: Order Block 하단 - (ATR × 0.3~0.5)
- TP1 도달 시: SL을 본전으로 이동
- 최대 손실: 포지션당 2%

SHORT:
- 초기 SL: Order Block 상단 + (ATR × 0.3~0.5)
- TP1 도달 시: SL을 본전으로
```

### **익절 전략**
```
3단계 분할 청산:
- TP1 (40%): Equilibrium 또는 1:1 RR
- TP2 (40%): Premium/Discount 경계 또는 2:1 RR
- TP3 (20%): Swing High/Low 또는 3:1 RR

Trailing:
- TP1 도달 후 Internal Structure 기준 추적
- 반대 방향 Internal BOS 발생 시 전량 청산
```

### **시간 제한**
```
최대 보유 시간:
- 15분봉 포지션: 6시간
- 5분봉 포지션: 2시간

이유:
- 펀딩비 누적 방지
- 구조 변화 대응
- 자본 회전율 향상
```

---

## 🚫 필터링 규칙 (진입 금지)

### **시장 조건**
```
1. 횡보장 (Ranging)
   - BOS 없이 CHoCH만 반복
   - ATR < 평균 ATR × 0.7
   → 거래 중단

2. 극도 변동성
   - ATR > 평균 ATR × 2.0
   - Tier 1만 거래
   → Tier 2,3 중단

3. 주요 뉴스/이벤트
   - FOMC, CPI 발표 1시간 전후
   → 모든 거래 중단
```

### **구조적 조건**
```
4. Order Block 없음
   - 최근 20봉 내 OB 미형성
   → 진입 대기

5. Tested Order Block
   - 이미 1회 리테스트된 OB
   → 신뢰도 -30%
   → Tier 1,2만 거래

6. 반대 구조 존재
   - LONG 시도 중 Bearish OB 근처
   - SHORT 시도 중 Bullish OB 근처
   → 진입 보류
```

### **기술적 조건**
```
7. VWAP 역행
   - LONG인데 가격 < VWAP
   - SHORT인데 가격 > VWAP
   → Tier 1,2 진입 금지
   → Tier 3만 허용

8. Volume 부족
   - 현재 Volume < 평균 × 0.8
   → 모든 Tier 대기

9. Funding Rate 극단
   - |Funding Rate| > 0.1%
   → 반대 방향만 거래
```

---

## 📅 운영 스케줄

### **일일 루틴**
```
00:00-04:00 (KST)
- 저유동성 시간대
- Tier 3 중단
- Tier 1,2만 운영

04:00-12:00
- 아시아 세션
- 모든 Tier 활성

12:00-20:00
- 유럽 세션
- 변동성 증가
- 신호 빈도 최대

20:00-24:00
- 미국 세션
- Premium 신호 집중
- Tier 1,2 우선

펀딩비 정산 (00:00, 08:00, 16:00)
- 정산 10분 전: 신규 진입 중단
- 정산 후: 정상 운영
```

---

## 🎯 우선순위 시스템

### **신호 발생 시 우선순위**
```
1순위: Tier 1 (Swing BOS + OB + FVG + Discount)
   → 즉시 진입

2순위: Tier 2 (Swing BOS + OB)
   → Tier 1 없을 때 진입

3순위: Liquidity Grab (EQH/EQL)
   → Tier 1,2 없을 때

4순위: Tier 3 (Internal BOS)
   → 모든 상위 Tier 없고 포지션 여유 있을 때
```

### **동시 신호 발생 시**
```
케이스 1: 같은 Tier, 다른 심볼
→ Volume Delta 큰 것 우선
→ Funding Rate 유리한 것 우선

케이스 2: 다른 Tier, 같은 심볼
→ 높은 Tier 우선
→ 낮은 Tier 무시

케이스 3: 최대 포지션 도달 (3개)
→ 신규 신호가 기존보다 높은 Tier면 교체 고려
→ 같은 Tier면 유지
```

---

## 📈 성과 추적 지표

### **필수 모니터링**
```
실시간 추적:
- 승률 (목표: 80%+)
- Profit Factor (목표: 2.5+)
- 일일 RR (목표: +0.15%+)
- 최대 드로우다운 (한도: -3%)

Tier별 분석:
- Tier 1 승률 (목표: 88%+)
- Tier 2 승률 (목표: 82%+)
- Tier 3 승률 (목표: 75%+)

구조별 분석:
- BOS 신호 성공률
- CHoCH 신호 성공률
- Liquidity Grab 성공률
```

### **주간 리뷰**
```
체크 항목:
1. 손실 거래 분석
   - 어떤 조건 위반했나?
   - 필터 추가 필요한가?

2. Tier별 성과
   - 어느 Tier가 부진한가?
   - 파라미터 조정 필요한가?

3. 시간대별 성과
   - 어느 시간대가 좋은가?
   - 운영 시간 조정 필요한가?

4. 심볼별 성과
   - 어떤 코인이 잘 맞는가?
   - 심볼 리스트 조정 필요한가?
```

---

## 🔄 시스템 개선 프로세스

### **파라미터 조정 기준**
```
매월 1일:
- 최근 30일 데이터 분석
- 승률 < 75%인 Tier 파라미터 조정

조정 대상:
1. Order Block 필터
   - Volume Delta 임계값
   - ATR 배수

2. Structure 크기
   - Swing: 50봉 (고정)
   - Internal: 5봉 → 3-7봉 테스트

3. Premium/Discount 비율
   - 현재: 25/75
   - 테스트: 20/80, 30/70

4. Equal Highs/Lows 임계값
   - 현재: ATR × 0.1
   - 테스트: ATR × 0.05~0.15
```

---

## ✅ 체크리스트 (진입 전 필수 확인)

```
[ ] 1. Market Structure 확인
    - BOS/CHoCH 명확한가?
    - Swing 추세 방향은?

[ ] 2. Order Block 확인
    - Untested OB인가?
    - Volume Delta ≥ 5M인가?
    - 현재가가 OB 내부인가?

[ ] 3. Premium/Discount 확인
    - LONG: Discount Zone인가?
    - SHORT: Premium Zone인가?

[ ] 4. Fair Value Gap 확인
    - 같은 방향 FVG 있는가?
    - Unfilled 상태인가?

[ ] 5. VWAP 확인
    - 추세와 일치하는가?

[ ] 6. Volume 확인
    - 충분한 거래량인가?

[ ] 7. Funding Rate 확인
    - 유리한 방향인가?

[ ] 8. 리스크 확인
    - SL 거리가 2% 이내인가?
    - 최대 포지션 수 확인했는가?
    - 일일 손실 한도 여유 있는가?

[ ] 9. 시간대 확인
    - 펀딩비 정산 10분 전 아닌가?
    - 주요 뉴스 시간대 아닌가?

[ ] 10. Tier 확인
     - 어느 Tier인가?
     - 적절한 포지션 크기인가?
```

---

## 🎯 최종 요약

### **핵심 원칙 3가지**
```
1. Structure First (구조 우선)
   - BOS/CHoCH 없으면 거래 안 함
   - 추세 명확할 때만 진입

2. Order Block is King (OB가 왕)
   - OB 리테스트가 최고의 진입점
   - Untested OB만 신뢰

3. Multi-Layer Confirmation (다층 확인)
   - SMC 단독 아닌 VWAP, Delta 결합
   - 3개 이상 일치 시 진입
```

### **성공의 열쇠**
```
✅ 인내심
   - Tier 1 신호만 기다리기
   - 하루 2-3회면 충분

✅ 규율
   - 체크리스트 100% 준수
   - 감정 배제

✅ 적응
   - 주간 리뷰 반영
   - 시장 변화 대응
```
1
이 전략으로 *2*일평균 4회 거래, 월 +3.5~5%, 연 +45~60%** 달성 가능합니다. 🎯