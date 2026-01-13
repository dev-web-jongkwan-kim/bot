import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal } from '../database/entities/signal.entity';
import { Position } from '../database/entities/position.entity';
import { ConfigService } from '@nestjs/config';
import { BinanceService } from '../binance/binance.service';
import { SymbolSectorService, Sector } from '../symbol-selection/symbol-sector.service';
import { OrderMonitorService } from '../order/order-monitor.service';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private readonly initialBalance: number;  // .env의 초기값 (fallback용)
  private readonly riskPerTrade: number;
  private readonly dailyLossLimit: number;
  private readonly maxPositions: number;
  private readonly maxLongPositions: number;   // 방향별 제한
  private readonly maxShortPositions: number;  // 방향별 제한
  private readonly minPositionSize: number;
  private readonly fixedLeverage: number;
  private readonly useDynamicBalance: boolean;

  // v10: 동적 잔액 캐시 (복리 재투자용)
  private cachedBalance: number = 0;
  private balanceCacheTime: number = 0;
  private readonly BALANCE_CACHE_TTL = 60000;  // 1분 캐시

  // v13: 일일 심볼 블랙리스트 (2회 이상 손실 시 당일 진입 금지)
  private dailySymbolLosses: Map<string, number> = new Map();
  private blacklistDate: string = '';  // YYYY-MM-DD 형식
  private readonly MAX_DAILY_SYMBOL_LOSSES = 2;  // 이 횟수 이상 손실 시 블랙리스트

  // v15: 당일 시작 잔액 (Daily Loss Limit 계산용)
  private dailyStartBalance: number = 0;
  private dailyStartBalanceDate: string = '';  // YYYY-MM-DD 형식

  // ✅ 마진 고정 (v19)
  private readonly MIN_MARGIN = 20;   // v19: 마진 $20 고정
  private readonly MAX_MARGIN = 20;   // v19: 마진 $20 고정
  private readonly ABNORMAL_MARGIN_THRESHOLD = 35;  // 비정상 마진 기준 $35

  // ✅ 캔들 기반 동시 진입 제한 (상관관계 필터링)
  // 같은 캔들 내 같은 방향 최대 주문 수
  private readonly MAX_SAME_DIRECTION_PER_CANDLE = 2;

  // 캔들별 진입 카운터: { '5m': { candleStart: timestamp, long: count, short: count }, '15m': {...} }
  private candleEntryCount: Map<string, { candleStart: number; long: number; short: number }> = new Map();

  constructor(
    @InjectRepository(Signal)
    private signalRepo: Repository<Signal>,
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    private configService: ConfigService,
    private binanceService: BinanceService,       // v10: 바이낸스 서비스 주입
    private symbolSectorService: SymbolSectorService,  // v12: 섹터 관리 서비스
    @Inject(forwardRef(() => OrderMonitorService))
    private orderMonitorService: OrderMonitorService,  // ✅ 대기 주문 추적용
  ) {
    this.initialBalance = parseFloat(
      this.configService.get<string>('ACCOUNT_BALANCE') || '10000',
    );
    this.riskPerTrade = parseFloat(
      this.configService.get<string>('RISK_PER_TRADE') || '0.01',
    );
    this.dailyLossLimit = parseFloat(
      this.configService.get<string>('DAILY_LOSS_LIMIT') || '0.10',
    );
    this.maxPositions = parseInt(
      this.configService.get<string>('MAX_POSITIONS') || '10',
    );
    this.maxLongPositions = parseInt(
      this.configService.get<string>('MAX_LONG_POSITIONS') || '5',
    );
    this.maxShortPositions = parseInt(
      this.configService.get<string>('MAX_SHORT_POSITIONS') || '5',
    );
    this.minPositionSize = parseFloat(
      this.configService.get<string>('MIN_POSITION_SIZE') || '0',
    );
    this.fixedLeverage = parseInt(
      this.configService.get<string>('FIXED_LEVERAGE') || '0',
    );
    // v10: 동적 잔액 사용 여부 (기본값: true)
    this.useDynamicBalance = this.configService.get<string>('USE_DYNAMIC_BALANCE') !== 'false';

    // 초기화 로그
    this.logger.log(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 [RISK SERVICE INITIALIZED]\n` +
      `  Initial Balance:   $${this.initialBalance.toFixed(2)} (from .env)\n` +
      `  Dynamic Balance:   ${this.useDynamicBalance ? '✅ ENABLED (compound)' : '❌ DISABLED (fixed)'}\n` +
      `  Risk Per Trade:    ${(this.riskPerTrade * 100).toFixed(2)}%\n` +
      `  Daily Loss Limit:  ${(this.dailyLossLimit * 100).toFixed(2)}%\n` +
      `  Max Positions:     ${this.maxPositions} (LONG: ${this.maxLongPositions}, SHORT: ${this.maxShortPositions})\n` +
      `  Min Position Size: $${this.minPositionSize} (${this.minPositionSize > 0 ? 'ENABLED' : 'DISABLED'})\n` +
      `  Fixed Leverage:    ${this.fixedLeverage}x (${this.fixedLeverage > 0 ? 'ENABLED' : 'DISABLED'})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
  }

  /**
   * v10: 바이낸스에서 실시간 잔액 가져오기 (1분 캐시)
   * 복리 재투자를 위해 실제 잔액 사용
   */
  private async getAccountBalance(): Promise<number> {
    // 동적 잔액 비활성화 시 초기값 사용
    if (!this.useDynamicBalance) {
      return this.initialBalance;
    }

    const now = Date.now();

    // 캐시가 유효하면 캐시된 값 반환
    if (this.cachedBalance > 0 && now - this.balanceCacheTime < this.BALANCE_CACHE_TTL) {
      return this.cachedBalance;
    }

    try {
      const balance = await this.binanceService.getAvailableBalance();

      if (balance > 0) {
        this.cachedBalance = balance;
        this.balanceCacheTime = now;
        this.logger.log(`[BALANCE] Fetched from Binance: $${balance.toFixed(2)}`);
        return balance;
      }
    } catch (error: any) {
      this.logger.warn(`[BALANCE] Failed to fetch from Binance: ${error.message}`);
    }

    // 실패 시 캐시된 값 또는 초기값 사용
    if (this.cachedBalance > 0) {
      this.logger.warn(`[BALANCE] Using cached value: $${this.cachedBalance.toFixed(2)}`);
      return this.cachedBalance;
    }

    this.logger.warn(`[BALANCE] Using initial value: $${this.initialBalance.toFixed(2)}`);
    return this.initialBalance;
  }

  async isDuplicateSignal(signal: any): Promise<boolean> {
    const recentSignals = await this.signalRepo
      .createQueryBuilder('signal')
      .where('signal.symbol = :symbol', { symbol: signal.symbol })
      .andWhere('signal.side = :side', { side: signal.side })
      .andWhere('signal.timestamp > NOW() - INTERVAL \'15 minutes\'')
      .getCount();

    return recentSignals > 0;
  }

  async checkRisk(signal: any): Promise<boolean> {
    // 일일 손실 체크
    if (!(await this.checkDailyLossLimit())) {
      return false;
    }

    return true;
  }

  async checkDailyLossLimit(): Promise<boolean> {
    this.logger.log(`[RISK CHECK] Checking daily loss limit...`);

    // v15: 당일 시작 잔액 설정 (날짜가 바뀌면 리셋)
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.dailyStartBalanceDate !== todayStr) {
      const currentBalance = await this.getAccountBalance();
      this.dailyStartBalance = currentBalance;
      this.dailyStartBalanceDate = todayStr;
      this.logger.log(`[DAILY LOSS] 📅 New day - Start balance set: $${currentBalance.toFixed(2)}`);
    }

    // 시작 잔액 기준으로 계산
    const startBalance = this.dailyStartBalance;

    const result = await this.positionRepo
      .createQueryBuilder('position')
      .select('SUM(position.realizedPnl)', 'totalPnl')
      .where('DATE(position.closedAt) = CURRENT_DATE')
      .andWhere('position.status = :status', { status: 'CLOSED' })
      .getRawOne();

    const dailyPnl = parseFloat(result?.totalPnl || '0');
    const dailyLossPct = dailyPnl / startBalance;
    const dailyLossThreshold = -this.dailyLossLimit;
    const maxLossAmount = startBalance * this.dailyLossLimit;

    this.logger.log(
      `  [DAILY LOSS CHECK]\n` +
      `    Start Balance: $${startBalance.toFixed(2)} (day start)\n` +
      `    Daily PnL:     $${dailyPnl.toFixed(2)}\n` +
      `    Loss %:        ${(dailyLossPct * 100).toFixed(2)}% / ${(dailyLossThreshold * 100).toFixed(2)}%\n` +
      `    Max Loss:      $${maxLossAmount.toFixed(2)}\n` +
      `    Status:        ${dailyLossPct <= dailyLossThreshold ? '❌ EXCEEDED' : '✅ PASSED'}`
    );

    if (dailyLossPct <= dailyLossThreshold) {
      this.logger.warn(
        `\n🛑 [DAILY LOSS LIMIT REACHED]\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `  Start Balance: $${startBalance.toFixed(2)}\n` +
        `  Daily PnL:     $${dailyPnl.toFixed(2)}\n` +
        `  Loss %:        ${(dailyLossPct * 100).toFixed(2)}%\n` +
        `  Limit:         ${(dailyLossThreshold * 100).toFixed(2)}% ($${maxLossAmount.toFixed(2)})\n` +
        `  Trading STOPPED until next day\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
      return false;
    }

    return true;
  }

  async checkPositionLimit(direction?: 'LONG' | 'SHORT'): Promise<boolean> {
    this.logger.log(`[RISK CHECK] Checking position limit... (direction: ${direction || 'ANY'})`);

    // ✅ 통합 슬롯 체크: OPEN 포지션 + 대기 중 LIMIT 주문
    const slotUsage = await this.orderMonitorService.getTotalSlotUsage();
    const { openPositions, pendingOrders, total, openLongPositions, openShortPositions } = slotUsage;

    // 대기 주문의 방향별 개수
    const pendingLong = this.orderMonitorService.getPendingOrderCountBySide('LONG');
    const pendingShort = this.orderMonitorService.getPendingOrderCountBySide('SHORT');

    this.logger.log(
      `  [SLOT USAGE]\n` +
      `    OPEN Positions:  ${openPositions} (LONG: ${openLongPositions}, SHORT: ${openShortPositions})\n` +
      `    Pending LIMIT:   ${pendingOrders} (LONG: ${pendingLong}, SHORT: ${pendingShort})\n` +
      `    Total Slots:     ${total}/${this.maxPositions}`
    );

    // 1. 전체 슬롯 체크 (OPEN + PENDING)
    if (total >= this.maxPositions) {
      this.logger.warn(
        `\n🛑 [MAX SLOTS REACHED]\n` +
        `  Total Slots:      ${total}/${this.maxPositions}\n` +
        `  Open Positions:   ${openPositions}\n` +
        `  Pending Orders:   ${pendingOrders}\n` +
        `  → Cannot open new position`
      );
      return false;
    }

    // 2. 방향별 슬롯 체크 (direction이 제공된 경우)
    if (direction) {
      const totalDirectionSlots = direction === 'LONG'
        ? openLongPositions + pendingLong
        : openShortPositions + pendingShort;

      const maxForDirection = direction === 'LONG' ? this.maxLongPositions : this.maxShortPositions;

      this.logger.log(
        `  [DIRECTION LIMIT CHECK] ${direction}: ${totalDirectionSlots}/${maxForDirection} | ` +
        `Status: ${totalDirectionSlots >= maxForDirection ? '❌ DIRECTION LIMIT' : '✅ PASSED'}`
      );

      if (totalDirectionSlots >= maxForDirection) {
        this.logger.warn(
          `\n🛑 [${direction} SLOTS LIMIT REACHED]\n` +
          `  ${direction} Slots:  ${totalDirectionSlots}/${maxForDirection}\n` +
          `  (Open: ${direction === 'LONG' ? openLongPositions : openShortPositions}, ` +
          `Pending: ${direction === 'LONG' ? pendingLong : pendingShort})\n` +
          `  → Cannot open new ${direction} position`
        );
        return false;
      }
    } else {
      this.logger.log(
        `  [POSITION LIMIT CHECK] ${total}/${this.maxPositions} slots used | Status: ✅ PASSED`
      );
    }

    return true;
  }

  /**
   * v13: 일일 심볼 블랙리스트 체크
   * 당일 2회 이상 손실한 심볼은 진입 금지
   */
  checkSymbolBlacklist(symbol: string): boolean {
    // 날짜가 바뀌면 블랙리스트 리셋
    const today = new Date().toISOString().split('T')[0];
    if (this.blacklistDate !== today) {
      this.dailySymbolLosses.clear();
      this.blacklistDate = today;
      this.logger.log(`[BLACKLIST] 🔄 Daily reset - new date: ${today}`);
    }

    const lossCount = this.dailySymbolLosses.get(symbol) || 0;

    if (lossCount >= this.MAX_DAILY_SYMBOL_LOSSES) {
      this.logger.warn(
        `[BLACKLIST] 🚫 ${symbol} blocked | Losses today: ${lossCount}/${this.MAX_DAILY_SYMBOL_LOSSES}`
      );
      return false;  // 블랙리스트됨 - 진입 불가
    }

    return true;  // 진입 가능
  }

  /**
   * v13: 심볼 손실 기록
   * 포지션 청산 시 손실이면 호출
   */
  recordSymbolLoss(symbol: string): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.blacklistDate !== today) {
      this.dailySymbolLosses.clear();
      this.blacklistDate = today;
    }

    const currentLosses = this.dailySymbolLosses.get(symbol) || 0;
    const newLosses = currentLosses + 1;
    this.dailySymbolLosses.set(symbol, newLosses);

    this.logger.log(
      `[BLACKLIST] 📝 ${symbol} loss recorded | Today: ${newLosses}/${this.MAX_DAILY_SYMBOL_LOSSES}` +
      (newLosses >= this.MAX_DAILY_SYMBOL_LOSSES ? ' → 🚫 BLACKLISTED' : '')
    );
  }

  /**
   * v13: 현재 블랙리스트 상태 조회
   */
  getBlacklistedSymbols(): string[] {
    const blacklisted: string[] = [];
    this.dailySymbolLosses.forEach((losses, symbol) => {
      if (losses >= this.MAX_DAILY_SYMBOL_LOSSES) {
        blacklisted.push(symbol);
      }
    });
    return blacklisted;
  }

  async checkCorrelation(signal: any): Promise<boolean> {
    this.logger.log(`[RISK CHECK] Checking correlation for ${signal.symbol} ${signal.side}...`);

    const openPositions = await this.positionRepo.find({
      where: { status: 'OPEN' },
    });

    this.logger.log(
      `  [CORRELATION CHECK] ${signal.symbol} ${signal.side} | Open positions: ${openPositions.length}`
    );

    // BTC-ETH 체크
    if (signal.symbol === 'BTCUSDT') {
      const ethPosition = openPositions.find((p) => p.symbol === 'ETHUSDT');
      if (ethPosition && ethPosition.side === signal.side) {
        this.logger.warn(
          `\n🛑 [CORRELATION CONFLICT]\n` +
          `  Signal:         BTCUSDT ${signal.side}\n` +
          `  Existing:       ETHUSDT ${ethPosition.side}\n` +
          `  Reason:         BTC-ETH highly correlated\n` +
          `  → Rejecting signal to avoid overexposure`
        );
        return false;
      }
    } else if (signal.symbol === 'ETHUSDT') {
      const btcPosition = openPositions.find((p) => p.symbol === 'BTCUSDT');
      if (btcPosition && btcPosition.side === signal.side) {
        this.logger.warn(
          `\n🛑 [CORRELATION CONFLICT]\n` +
          `  Signal:         ETHUSDT ${signal.side}\n` +
          `  Existing:       BTCUSDT ${btcPosition.side}\n` +
          `  Reason:         ETH-BTC highly correlated\n` +
          `  → Rejecting signal to avoid overexposure`
        );
        return false;
      }
    }

    // v12: 동일 섹터 체크 (SymbolSectorService 사용 - 바이낸스 공식 분류)
    const sector = this.symbolSectorService.getSector(signal.symbol);
    const maxPerSector = this.symbolSectorService.getMaxPositionsForSector(sector);
    const sectorPositions = openPositions.filter(
      (p) => this.symbolSectorService.getSector(p.symbol) === sector
    );

    this.logger.log(
      `  [SECTOR CHECK] ${signal.symbol} in "${sector}" sector | ${sectorPositions.length}/${maxPerSector} positions | Status: ${sectorPositions.length >= maxPerSector ? '❌ LIMIT REACHED' : '✅ PASSED'}`
    );

    if (sectorPositions.length >= maxPerSector) {
      this.logger.warn(
        `\n🛑 [SECTOR LIMIT REACHED]\n` +
        `  Signal:         ${signal.symbol} (${sector})\n` +
        `  Sector:         ${sector}\n` +
        `  Positions:      ${sectorPositions.length}/${maxPerSector}\n` +
        `  Symbols:        ${sectorPositions.map(p => p.symbol).join(', ')}\n` +
        `  → Rejecting signal to maintain diversification`
      );
      return false;
    }

    // v12: 상관관계 높은 섹터도 체크
    const correlatedSectors = this.symbolSectorService.getCorrelatedSectors(sector);
    if (correlatedSectors.length > 0) {
      const correlatedPositions = openPositions.filter((p) => {
        const pSector = this.symbolSectorService.getSector(p.symbol);
        return correlatedSectors.includes(pSector as any);
      });

      const totalCorrelated = sectorPositions.length + correlatedPositions.length;
      const correlatedLimit = maxPerSector + 2; // 상관섹터 포함 시 +2 여유

      this.logger.log(
        `  [CORRELATED SECTORS] ${sector} + [${correlatedSectors.join(', ')}] | ${totalCorrelated}/${correlatedLimit} positions`
      );

      if (totalCorrelated >= correlatedLimit) {
        this.logger.warn(
          `\n🛑 [CORRELATED SECTOR LIMIT]\n` +
          `  Signal:         ${signal.symbol} (${sector})\n` +
          `  Correlated:     [${correlatedSectors.join(', ')}]\n` +
          `  Total:          ${totalCorrelated}/${correlatedLimit}\n` +
          `  → Rejecting to avoid correlated sector overexposure`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * ✅ 캔들 기반 동시 진입 제한 체크
   *
   * 같은 캔들 내 같은 방향으로 MAX_SAME_DIRECTION_PER_CANDLE개까지만 진입 허용
   * - 상관관계 높은 종목들이 동시에 신호 발생 시 손실 확대 방지
   * - 5분봉, 15분봉 각각 별도로 카운트
   */
  checkCandleEntryLimit(signal: any): boolean {
    const timeframe = signal.timeframe || signal.metadata?.timeframe || '5m';
    const side = signal.side as 'LONG' | 'SHORT';

    // 현재 캔들 시작 시간 계산
    const now = Date.now();
    const candleDuration = timeframe === '15m' ? 15 * 60 * 1000 : 5 * 60 * 1000;
    const currentCandleStart = Math.floor(now / candleDuration) * candleDuration;

    // 현재 타임프레임의 카운터 조회
    let counter = this.candleEntryCount.get(timeframe);

    // 새 캔들이 시작되었으면 카운터 리셋
    if (!counter || counter.candleStart !== currentCandleStart) {
      counter = {
        candleStart: currentCandleStart,
        long: 0,
        short: 0,
      };
      this.candleEntryCount.set(timeframe, counter);
      this.logger.log(
        `[CANDLE LIMIT] 🕐 New ${timeframe} candle started at ${new Date(currentCandleStart).toISOString()}`
      );
    }

    // 현재 방향의 진입 수 확인
    const currentCount = side === 'LONG' ? counter.long : counter.short;

    this.logger.log(
      `  [CANDLE ENTRY CHECK] ${timeframe} | ${side}: ${currentCount}/${this.MAX_SAME_DIRECTION_PER_CANDLE} | ` +
      `Status: ${currentCount >= this.MAX_SAME_DIRECTION_PER_CANDLE ? '❌ LIMIT REACHED' : '✅ PASSED'}`
    );

    if (currentCount >= this.MAX_SAME_DIRECTION_PER_CANDLE) {
      this.logger.warn(
        `\n🛑 [CANDLE ENTRY LIMIT REACHED]\n` +
        `  Timeframe:  ${timeframe}\n` +
        `  Direction:  ${side}\n` +
        `  Count:      ${currentCount}/${this.MAX_SAME_DIRECTION_PER_CANDLE}\n` +
        `  Signal:     ${signal.symbol}\n` +
        `  → Rejecting to prevent correlated entries`
      );
      return false;
    }

    return true;
  }

  /**
   * ✅ 캔들 진입 카운터 증가 (주문 성공 시 호출)
   */
  recordCandleEntry(timeframe: string, side: 'LONG' | 'SHORT'): void {
    const tf = timeframe || '5m';
    const now = Date.now();
    const candleDuration = tf === '15m' ? 15 * 60 * 1000 : 5 * 60 * 1000;
    const currentCandleStart = Math.floor(now / candleDuration) * candleDuration;

    let counter = this.candleEntryCount.get(tf);

    if (!counter || counter.candleStart !== currentCandleStart) {
      counter = {
        candleStart: currentCandleStart,
        long: 0,
        short: 0,
      };
      this.candleEntryCount.set(tf, counter);
    }

    if (side === 'LONG') {
      counter.long++;
    } else {
      counter.short++;
    }

    this.logger.log(
      `[CANDLE ENTRY] 📝 Recorded ${tf} ${side} | ` +
      `Current: LONG=${counter.long}, SHORT=${counter.short}`
    );
  }

  /**
   * ✅ 현재 캔들 진입 상태 조회 (디버그/API용)
   */
  getCandleEntryStatus(): Record<string, { candleStart: string; long: number; short: number }> {
    const result: Record<string, { candleStart: string; long: number; short: number }> = {};

    for (const [tf, counter] of this.candleEntryCount) {
      result[tf] = {
        candleStart: new Date(counter.candleStart).toISOString(),
        long: counter.long,
        short: counter.short,
      };
    }

    return result;
  }

  async calculatePositionSize(signal: any): Promise<any> {
    // ✅ NaN 검증 (DB decimal 타입 문자열 변환 누락 방지)
    if (!signal.entryPrice || isNaN(Number(signal.entryPrice))) {
      throw new Error(`Invalid entryPrice: ${signal.entryPrice} for ${signal.symbol}`);
    }
    if (!signal.stopLoss || isNaN(Number(signal.stopLoss))) {
      throw new Error(`Invalid stopLoss: ${signal.stopLoss} for ${signal.symbol}`);
    }

    // v10: 바이낸스에서 실시간 잔액 가져오기 (복리 재투자)
    const accountBalance = await this.getAccountBalance();

    this.logger.log(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 [POSITION SIZE CALCULATION]\n` +
      `  Symbol:     ${signal.symbol}\n` +
      `  Strategy:   ${signal.strategy}\n` +
      `  Entry:      ${signal.entryPrice}\n` +
      `  Stop Loss:  ${signal.stopLoss}\n` +
      `  SL Dist:    ${Math.abs(signal.entryPrice - signal.stopLoss).toFixed(2)}\n` +
      `  Balance:    $${accountBalance.toFixed(2)} ${this.useDynamicBalance ? '(LIVE from Binance)' : '(FIXED from .env)'}`
    );

    // 소자본 모드: 잔액 $1000 미만 시 최소 포지션 크기 사용
    const useMinPositionMode = this.minPositionSize > 0 && accountBalance < 1000;

    let positionSizeUsdt: number;
    let leverage: number;

    if (useMinPositionMode) {
      // ✅ 소자본 모드: 마진 범위 제한 (v16 수정)
      // margin = clamp(자본 × 10%, MIN_MARGIN, MAX_MARGIN)
      const capitalUsage = 0.1;  // 10% - 백테스트와 동일
      const calculatedMargin = Math.max(accountBalance * capitalUsage, this.minPositionSize);
      // v16: 마진을 MIN_MARGIN ~ MAX_MARGIN 범위로 제한
      const marginUsdt = Math.min(Math.max(calculatedMargin, this.MIN_MARGIN), this.MAX_MARGIN);
      // v7: 신호의 동적 레버리지 사용 (ATR% 기반), 없으면 FIXED_LEVERAGE fallback
      leverage = signal.leverage || this.fixedLeverage;
      positionSizeUsdt = marginUsdt * leverage; // 마진 × 레버리지 = 포지션 가치

      this.logger.log(
        `\n🔸 [SMALL CAPITAL MODE ACTIVATED]\n` +
        `  Account Balance:  $${accountBalance.toFixed(2)} ${this.useDynamicBalance ? '(LIVE)' : '(FIXED)'}\n` +
        `  Capital Usage:    ${(capitalUsage * 100).toFixed(0)}%\n` +
        `  Calculated:       $${calculatedMargin.toFixed(2)}\n` +
        `  Margin (clamped): $${marginUsdt.toFixed(2)} (range: $${this.MIN_MARGIN}~$${this.MAX_MARGIN})\n` +
        `  Leverage:         ${leverage}x (${signal.leverage ? 'DYNAMIC from signal' : 'FIXED_LEVERAGE fallback'})\n` +
        `  Position Value:   $${positionSizeUsdt.toFixed(2)}\n` +
        `  Reason:           Balance < $1000`
      );
    } else {
      // 일반 모드: 전략별 자본 배분
      const strategyAllocation = this.getStrategyAllocation(signal.strategy);
      const allocatedCapital = accountBalance * strategyAllocation;

      const riskAmount = allocatedCapital * this.riskPerTrade;
      const stopLossPct = Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice;
      positionSizeUsdt = riskAmount / stopLossPct;
      leverage = signal.leverage;

      this.logger.log(
        `\n🔸 [NORMAL MODE - STRATEGY ALLOCATION]\n` +
        `  Account Balance:  $${accountBalance.toFixed(2)} ${this.useDynamicBalance ? '(LIVE)' : '(FIXED)'}\n` +
        `  Strategy:         ${signal.strategy}\n` +
        `  Allocation:       ${(strategyAllocation * 100).toFixed(0)}%\n` +
        `  Allocated Cap:    $${allocatedCapital.toFixed(2)}\n` +
        `  Risk/Trade:       ${(this.riskPerTrade * 100).toFixed(2)}%\n` +
        `  Risk Amount:      $${riskAmount.toFixed(2)}\n` +
        `  SL %:             ${(stopLossPct * 100).toFixed(2)}%\n` +
        `  Position Size:    $${positionSizeUsdt.toFixed(2)}\n` +
        `  Leverage:         ${leverage}x`
      );
    }

    let marginRequired = positionSizeUsdt / leverage;

    // ✅ v16: 최종 마진 범위 검증 및 조정
    const originalMargin = marginRequired;
    if (marginRequired < this.MIN_MARGIN) {
      marginRequired = this.MIN_MARGIN;
      positionSizeUsdt = marginRequired * leverage;
      this.logger.warn(`[MARGIN CLAMP] Margin $${originalMargin.toFixed(2)} < MIN → Adjusted to $${this.MIN_MARGIN}`);
    } else if (marginRequired > this.MAX_MARGIN) {
      marginRequired = this.MAX_MARGIN;
      positionSizeUsdt = marginRequired * leverage;
      this.logger.warn(`[MARGIN CLAMP] Margin $${originalMargin.toFixed(2)} > MAX → Adjusted to $${this.MAX_MARGIN}`);
    }

    const quantity = positionSizeUsdt / signal.entryPrice;

    this.logger.log(
      `\n✅ [FINAL CALCULATION]\n` +
      `  Position Size:    $${positionSizeUsdt.toFixed(2)}\n` +
      `  Leverage:         ${leverage}x\n` +
      `  Margin Required:  $${marginRequired.toFixed(2)} (range: $${this.MIN_MARGIN}~$${this.MAX_MARGIN})\n` +
      `  Quantity:         ${quantity.toFixed(6)}\n` +
      `  Notional Value:   $${(quantity * signal.entryPrice).toFixed(2)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

    return {
      positionSizeUsdt,
      marginRequired,
      quantity,
      leverage,
    };
  }

  /**
   * ✅ v16: 비정상 마진 체크
   * 마진이 ABNORMAL_MARGIN_THRESHOLD 이상이면 비정상으로 판단
   */
  isAbnormalMargin(marginUsdt: number): boolean {
    return marginUsdt >= this.ABNORMAL_MARGIN_THRESHOLD;
  }

  /**
   * ✅ v16: 비정상 마진 기준값 반환 (외부에서 사용)
   */
  getAbnormalMarginThreshold(): number {
    return this.ABNORMAL_MARGIN_THRESHOLD;
  }

  // 전략별 자본 배분 비율
  private getStrategyAllocation(strategy: string): number {
    const allocation: Record<string, number> = {
      'BB_MEAN_REV': 0.40,       // 40% - 가장 안정적
      'PSAR_EMA_MACD': 0.35,     // 35% - 큰 수익, 높은 리스크
      'EMA_RIBBON': 0.25,        // 25% - 손익비 우수, 낮은 승률

      // 레거시 전략들 (균등 배분)
      'ORB_15': 0.33,
      'MANUAL': 1.0,
    };

    return allocation[strategy] || 0.33; // 기본값 33%
  }

}


