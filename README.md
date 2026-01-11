# 암호화폐 선물 자동매매 시스템

바이낸스 선물 거래소를 활용한 자동매매 봇 시스템입니다.

## 시스템 구성

- **백엔드**: NestJS (TypeScript)
- **프론트엔드**: Next.js (TypeScript)
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **거래소**: Binance Futures

## 주요 기능

### 전략
1. **ICT Order Block + Liquidity Sweep** (24/7 활성)
2. **Opening Range Breakout 15분** (09:00-10:00 KST)
3. **Bollinger Band Mean Reversion** (24/7 활성)

### 모니터링
- 80개 종목 실시간 모니터링
- 5분봉, 15분봉 동시 구독
- 실시간 신호 생성 및 주문 실행

### 리스크 관리
- 최대 동시 포지션: 8개
- 거래당 리스크: 1%
- 일일 손실 제한: 4%
- 상관관계 체크 (BTC-ETH 동시 진입 방지)

### 백테스트
- Binance 히스토리컬 데이터 다운로드
- 백테스트 엔진 (슬리피지, 수수료 반영)
- 성능 분석 및 리포트 생성

## 설치 및 실행

### Docker Compose (권장)

```bash
# 환경변수 설정
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# .env 파일 수정 (바이낸스 API 키 등 설정)

# 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 수동 설치

#### 백엔드

```bash
cd backend
npm install
cp .env.example .env
# .env 파일 수정
npm run start:dev
```

#### 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### 데이터베이스

PostgreSQL과 Redis가 필요합니다. Docker를 사용하는 경우:

```bash
docker-compose up -d postgres redis
```

## API 엔드포인트

### 대시보드
- `GET /api/dashboard/metrics` - 대시보드 메트릭
- `GET /api/positions/open` - 오픈 포지션 조회
- `GET /api/signals` - 신호 조회

### 백테스트
- `POST /api/backtest/run` - 백테스트 실행
- `GET /api/backtest/results/:id` - 백테스트 결과 조회

## WebSocket

- 연결: `ws://localhost:3001`
- 이벤트: `message` (type: 'signal' | 'position')

## 주의사항

- **테스트넷 사용 권장**: 초기 테스트는 Binance Testnet 사용
- **소액 시작**: 실제 자금 사용 시 소액으로 시작
- **모니터링 필수**: 실시간 모니터링 및 알림 설정
