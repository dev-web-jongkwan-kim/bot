import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BacktestCandle,
  BacktestPosition,
  BacktestSignal,
  BacktestConfig,
  BacktestTrade,
  BacktestResults,
} from './interfaces/backtest.interface';

@Injectable()
export class BacktestEngineService {
  private readonly logger = new Logger(BacktestEngineService.name);

  private initialBalance: number = 10000;
  private balance: number = 10000;
  private riskPerTrade: number = 0.01;
  private dailyLossLimit: number = 0.04;
  private maxPositions: number = 8;
  private takerFee: number = 0.00075;  // 실시간과 동일 (0.075%)
  private makerFee: number = 0.0004;  // ✅ 실제 바이낸스 0.04% 반영 (이전: 0.02%)
  private slippage: number = 0.0002;

  // ✅ 소자본 모드 설정 (.env에서 읽기)
  private minPositionSize: number;
  private fixedLeverage: number;

  constructor(private configService: ConfigService) {
    // .env에서 설정 읽기
    this.minPositionSize = parseFloat(
      this.configService.get<string>('MIN_POSITION_SIZE') || '15',
    );
    this.fixedLeverage = parseInt(
      this.configService.get<string>('FIXED_LEVERAGE') || '10',
    );

    this.logger.log(
      `[BACKTEST ENGINE] Initialized with:\n` +
      `  Min Position Size: $${this.minPositionSize}\n` +
      `  Fixed Leverage:    ${this.fixedLeverage}x\n` +
      `  Maker Fee:         ${(this.makerFee * 100).toFixed(3)}%\n` +
      `  Taker Fee:         ${(this.takerFee * 100).toFixed(3)}%`
    );
  }

  private positions: BacktestPosition[] = [];
  private positionIdCounter = 0;
  private tradesLog: BacktestTrade[] = [];
  private equityCurve: Array<{ timestamp: Date; balance: number; equity: number }> = [];
  private dailyPnl: Record<string, number> = {};

  private strategies: Map<string, any> = new Map();
  private data5m: Map<string, BacktestCandle[]> = new Map();
  private data15m: Map<string, BacktestCandle[]> = new Map();
  private riskParams: any = null;

  initialize(config: BacktestConfig) {
    this.initialBalance = config.initialBalance;
    this.balance = config.initialBalance;
    this.riskPerTrade = config.riskPerTrade || 0.01;
    this.dailyLossLimit = config.dailyLossLimit || 0.04;
    this.maxPositions = config.maxPositions || 8;
    this.takerFee = config.takerFee || 0.0004;
    this.slippage = config.slippage || 0.0002;

    this.positions = [];
    this.positionIdCounter = 0;
    this.tradesLog = [];
    this.equityCurve = [];
    this.dailyPnl = {};
    this.strategies.clear();  // 전략 Map 초기화 추가!
  }

  addStrategy(name: string, strategyInstance: any) {
    this.strategies.set(name, strategyInstance);
  }

  clearStrategies() {
    this.strategies.clear();
  }

  setData(symbol: string, interval: '5m' | '15m', candles: BacktestCandle[]) {
    if (interval === '5m') {
      this.data5m.set(symbol, candles);
    } else {
      this.data15m.set(symbol, candles);
    }
  }

  async run(config: BacktestConfig): Promise<BacktestResults> {
    // 전략은 이미 addStrategy로 추가되어 있으므로, strategies는 초기화하지 않음
    this.initialBalance = config.initialBalance;
    this.balance = config.initialBalance;
    this.riskPerTrade = config.riskPerTrade || 0.01;
    this.dailyLossLimit = config.dailyLossLimit || 0.04;
    this.maxPositions = config.maxPositions || 8;
    this.takerFee = config.takerFee || 0.0004;
    this.slippage = config.slippage || 0.0002;
    this.riskParams = config.riskParams || null;

    this.positions = [];
    this.positionIdCounter = 0;
    this.tradesLog = [];
    this.equityCurve = [];
    this.dailyPnl = {};

    this.logger.log(`Starting backtest: ${config.startDate} to ${config.endDate}`);

    // 모든 타임스탬프 수집
    const allTimestamps = new Set<number>();
    config.symbols.forEach((symbol) => {
      this.data5m.get(symbol)?.forEach((c) => allTimestamps.add(c.timestamp.getTime()));
      this.data15m.get(symbol)?.forEach((c) => allTimestamps.add(c.timestamp.getTime()));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // 시간 순차적으로 처리
    for (const timestamp of sortedTimestamps) {
      const currentTime = new Date(timestamp);

      // Validate date
      if (isNaN(currentTime.getTime())) {
        this.logger.warn(`Invalid timestamp: ${timestamp}`);
        continue;
      }

      const currentDate = currentTime.toISOString().split('T')[0];

      if (!this.dailyPnl[currentDate]) {
        this.dailyPnl[currentDate] = 0;
      }

      if (this.checkDailyLossLimit(currentDate)) {
        continue;
      }

      for (const symbol of config.symbols) {
        const candle15m = this.data15m.get(symbol)?.find((c) => c.timestamp.getTime() === timestamp);
        if (candle15m) {
          await this.process15mCandle(symbol, candle15m);
        }

        const candle5m = this.data5m.get(symbol)?.find((c) => c.timestamp.getTime() === timestamp);
        if (candle5m) {
          this.updatePositions(symbol, candle5m);
          await this.process5mCandle(symbol, candle5m);
        }
      }

      this.recordEquity(currentTime);
    }

    return this.getResults();
  }

  private async process15mCandle(symbol: string, candle: BacktestCandle) {
    for (const [name, strategy] of this.strategies.entries()) {
      if (strategy.on15minCandleClose) {
        const signal = await strategy.on15minCandleClose(symbol, candle);
        if (signal) {
          await this.executeSignal(signal, candle);
        }
      }
    }
  }

  private async process5mCandle(symbol: string, candle: BacktestCandle) {
    for (const [name, strategy] of this.strategies.entries()) {
      if (strategy.on5minCandleClose) {
        const signal = await strategy.on5minCandleClose(symbol, candle);
        if (signal) {
          await this.executeSignal(signal, candle);
        }
      }
    }
  }

  private async executeSignal(signal: BacktestSignal, candle: BacktestCandle) {
    // ✅ 방향 필터: PSAR_EMA_MACD SHORT 차단 (SignalProcessorService와 동일)
    if (signal.strategy === 'PSAR_EMA_MACD' && signal.side === 'SHORT') {
      this.logger.debug(`[BACKTEST FILTER] Blocked PSAR_EMA_MACD SHORT for ${signal.symbol}`);
      return;
    }

    // ✅ 방향 필터: EMA_RIBBON SHORT는 80점 이상만 허용
    if (signal.strategy === 'EMA_RIBBON' && signal.side === 'SHORT') {
      const score = (signal as any).score || 0;
      if (score < 80) {
        this.logger.debug(`[BACKTEST FILTER] Blocked EMA_RIBBON SHORT for ${signal.symbol} (score ${score} < 80)`);
        return;
      }
    }

    // ✅ 리스크 파라미터 적용 (손절/익절 재계산)
    if (this.riskParams && this.shouldApplyRiskParams(signal.strategy)) {
      signal = this.applyRiskManagement(signal, candle);
    }

    const openPositions = this.positions.filter((p) => p.status === 'OPEN');
    if (openPositions.length >= this.maxPositions) {
      return;
    }

    if (isNaN(candle.timestamp.getTime())) {
      this.logger.warn('Invalid candle timestamp in executeSignal');
      return;
    }

    const currentDate = candle.timestamp.toISOString().split('T')[0];
    if (this.checkDailyLossLimit(currentDate)) {
      return;
    }

    // ✅ 개선: 동적 슬리피지 + 진입 타이밍 지연 반영
    // 메이커 주문: 슬리피지 낮음 (0.01%), 실시간은 1초 지연
    // 테이커 주문: 슬리피지 높음 (0.05%), 실시간은 1초 지연
    const score = (signal as any).score || 0;
    const useMakerOrder = score < 85;
    const slippagePct = useMakerOrder ? 0.0001 : 0.0005; // 메이커 0.01%, 테이커 0.05%

    // 진입 타이밍 지연 (1초) → 캔들 내 가격 변동 추정
    // 실시간은 캔들 종료(candle.close) 후 1초 뒤 진입
    // 백테스트도 캔들 내 변동을 감안하여 close와 다음 캔들 평균 사용
    const timingDelayPct = (candle.high - candle.low) / candle.close * 0.1; // 변동성의 10%

    const totalSlippage = slippagePct + timingDelayPct;
    const entryPrice = signal.side === 'LONG'
      ? signal.entryPrice * (1 + totalSlippage)
      : signal.entryPrice * (1 - totalSlippage);

    const positionSize = this.calculatePositionSize(signal, entryPrice);
    if (!positionSize) {
      return;
    }

    const positionValue = positionSize.quantity * entryPrice;

    // ✅ 메이커/테이커 수수료 구분 (신호 점수 85점 기준)
    const fee = positionValue * (useMakerOrder ? this.makerFee : this.takerFee);

    this.logger.debug(
      `[BACKTEST] ${signal.symbol} ${signal.side} | ` +
      `${signal.strategy} | Score: ${score} | ` +
      `Fee: ${useMakerOrder ? 'MAKER' : 'TAKER'} (${(fee).toFixed(2)} USDT)`
    );

    // ✅ 레버리지 오버라이드
    const leverage = this.riskParams?.leverageOverride || positionSize.leverage;

    const position: BacktestPosition = {
      id: this.positionIdCounter++,
      symbol: signal.symbol,
      strategy: signal.strategy,
      side: signal.side,
      entryPrice: entryPrice,
      entryTime: candle.timestamp,
      quantity: positionSize.quantity,
      leverage: leverage,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      tp1Percent: this.riskParams?.tp1Percent || signal.tp1Percent,
      tp2Percent: 100 - (this.riskParams?.tp1Percent || signal.tp1Percent),
      status: 'OPEN',
    };

    this.positions.push(position);
    this.balance -= positionSize.marginRequired + fee;
  }

  private shouldApplyRiskParams(strategy: string): boolean {
    if (!this.riskParams) return false;

    // 전략 이름 매핑 (대소문자 구분 없이)
    const strategyMapping: Record<string, string[]> = {
      'LIQUIDITY_CASCADE': ['Liquidity', 'Cascade'],
      'MULTI_TF_CONFLUENCE': ['Multi-Timeframe', 'Confluence'],
      'VOL_TERM_STRUCTURE': ['Volatility', 'Term', 'Structure'],
      'FUNDING_MEAN_REVERSION': ['Funding', 'Rate', 'Mean', 'Reversion'],
    };

    const riskStrategy = this.riskParams.strategy;
    const keywords = strategyMapping[riskStrategy];

    if (!keywords) {
      // 매핑 테이블에 없으면 기존 로직 사용
      return strategy.toLowerCase().includes(riskStrategy.toLowerCase());
    }

    // 모든 키워드가 전략 이름에 포함되어 있는지 확인
    return keywords.every(keyword =>
      strategy.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private applyRiskManagement(signal: BacktestSignal, candle: BacktestCandle): BacktestSignal {
    const params = this.riskParams;
    const entryPrice = signal.entryPrice;

    // 손절 계산
    let stopLoss = signal.stopLoss;

    if (params.stopLossMethod === 'FIXED_PCT' && params.stopLossPct) {
      const stopDistance = entryPrice * params.stopLossPct;
      stopLoss = signal.side === 'LONG'
        ? entryPrice - stopDistance
        : entryPrice + stopDistance;
    }

    // 최소/최대 손절 제한
    if (params.minStopLossPct || params.maxStopLossPct) {
      const currentStopPct = Math.abs(stopLoss - entryPrice) / entryPrice;
      const minStop = params.minStopLossPct || 0;
      const maxStop = params.maxStopLossPct || 1;

      const clampedStopPct = Math.max(minStop, Math.min(maxStop, currentStopPct));
      const stopDistance = entryPrice * clampedStopPct;

      stopLoss = signal.side === 'LONG'
        ? entryPrice - stopDistance
        : entryPrice + stopDistance;
    }

    // 익절 계산
    let takeProfit1 = signal.takeProfit1;
    let takeProfit2 = signal.takeProfit2;

    if (params.takeProfitMethod === 'RR_RATIO' && params.rrRatio1) {
      const stopDistance = Math.abs(entryPrice - stopLoss);
      const tp1Distance = stopDistance * params.rrRatio1;
      const tp2Distance = stopDistance * (params.rrRatio2 || params.rrRatio1 * 2);

      takeProfit1 = signal.side === 'LONG'
        ? entryPrice + tp1Distance
        : entryPrice - tp1Distance;

      takeProfit2 = signal.side === 'LONG'
        ? entryPrice + tp2Distance
        : entryPrice - tp2Distance;
    }

    return {
      ...signal,
      stopLoss,
      takeProfit1,
      takeProfit2,
    };
  }

  /**
   * ✅ 전략별 자본 배분 비율 (RiskService와 동일)
   */
  private getStrategyAllocation(strategy: string): number {
    const allocation: Record<string, number> = {
      'BB_MEAN_REV': 0.40,       // 40% - 가장 안정적
      'PSAR_EMA_MACD': 0.35,     // 35% - 큰 수익, 높은 리스크
      'EMA_RIBBON': 0.25,        // 25% - 손익비 우수, 낮은 승률

      // 레거시 전략들 (균등 배분)
      'ORB_15': 0.33,
      'ORB_BALANCED': 0.33,
      'KELTNER_BREAKOUT': 0.33,
      'MANUAL': 1.0,
    };

    return allocation[strategy] || 0.33; // 기본값 33%
  }

  /**
   * ✅ 포지션 크기 계산 (RiskService와 동일한 로직)
   */
  private calculatePositionSize(signal: BacktestSignal, entryPrice: number) {
    // 소자본 모드: 초기 잔액 $1000 미만 시 최소 포지션 크기 사용
    const useMinPositionMode = this.minPositionSize > 0 && this.initialBalance < 1000;

    let positionSizeUsdt: number;
    let leverage: number;

    if (useMinPositionMode) {
      // 소자본 모드: 고정 포지션 크기 & 고정 레버리지
      positionSizeUsdt = this.minPositionSize;
      leverage = this.fixedLeverage;

      this.logger.debug(
        `[BACKTEST] Small capital mode: $${positionSizeUsdt} @ ${leverage}x for ${signal.symbol}`
      );
    } else {
      // ✅ 일반 모드: 전략별 자본 배분 적용
      const strategyAllocation = this.getStrategyAllocation(signal.strategy);
      const allocatedCapital = this.initialBalance * strategyAllocation;

      const riskAmount = allocatedCapital * this.riskPerTrade;
      const stopLossPct = Math.abs(entryPrice - signal.stopLoss) / entryPrice;

      if (stopLossPct === 0) {
        return null;
      }

      positionSizeUsdt = riskAmount / stopLossPct;
      leverage = signal.leverage;

      this.logger.debug(
        `[BACKTEST] ${signal.strategy} allocation: ${(strategyAllocation * 100).toFixed(0)}%, ` +
        `capital: $${allocatedCapital.toFixed(2)}, position: $${positionSizeUsdt.toFixed(2)}`
      );
    }

    const marginRequired = positionSizeUsdt / leverage;

    if (marginRequired > this.balance * 0.9) {
      return null;
    }

    const quantity = positionSizeUsdt / entryPrice;

    return { positionSizeUsdt, marginRequired, quantity, leverage };
  }

  private updatePositions(symbol: string, candle: BacktestCandle) {
    const openPositions = this.positions.filter(
      (p) => p.status === 'OPEN' && p.symbol === symbol,
    );

    for (const position of openPositions) {
      if (position.side === 'LONG') {
        const slHit = candle.low <= position.stopLoss;
        const tp1Hit = position.takeProfit1 && candle.high >= position.takeProfit1;
        const tp2Hit = position.takeProfit2 && position.tp2Percent > 0 && candle.high >= position.takeProfit2;

        // ✅ 개선: 캔들 내 순서 문제 해결
        // SL과 TP가 모두 도달했을 때, candle.open과의 거리로 순서 판단
        if (slHit && (tp1Hit || tp2Hit)) {
          const distanceToSL = Math.abs(candle.open - position.stopLoss);
          const distanceToTP = tp1Hit
            ? Math.abs(candle.open - position.takeProfit1)
            : Math.abs(candle.open - position.takeProfit2);

          if (distanceToTP < distanceToSL) {
            // TP가 먼저 도달 → 부분 익절 후 손절
            if (tp1Hit && position.tp1Percent < 100) {
              this.partialClose(position, position.takeProfit1, candle.timestamp, 'TP1', position.tp1Percent / 100);
              position.stopLoss = position.entryPrice; // Break-even
              position.takeProfit1 = undefined;
              // 남은 포지션 손절
              this.closePosition(position, position.stopLoss, candle.timestamp, 'SL');
            } else if (tp1Hit) {
              this.closePosition(position, position.takeProfit1, candle.timestamp, 'TP1');
            } else if (tp2Hit) {
              this.closePosition(position, position.takeProfit2, candle.timestamp, 'TP2');
            }
            continue;
          }
        }

        // 순차 처리 (SL 우선)
        if (slHit) {
          this.closePosition(position, position.stopLoss, candle.timestamp, 'SL');
          continue;
        }
        if (tp1Hit) {
          if (position.tp1Percent < 100) {
            this.partialClose(position, position.takeProfit1, candle.timestamp, 'TP1', position.tp1Percent / 100);
            position.stopLoss = position.entryPrice; // Break-even
            position.takeProfit1 = undefined;
          } else {
            this.closePosition(position, position.takeProfit1, candle.timestamp, 'TP1');
          }
        }
        if (tp2Hit) {
          this.closePosition(position, position.takeProfit2, candle.timestamp, 'TP2');
        }
      } else {
        // SHORT
        const slHit = candle.high >= position.stopLoss;
        const tp1Hit = position.takeProfit1 && candle.low <= position.takeProfit1;
        const tp2Hit = position.takeProfit2 && position.tp2Percent > 0 && candle.low <= position.takeProfit2;

        // ✅ 개선: 캔들 내 순서 문제 해결 (SHORT)
        if (slHit && (tp1Hit || tp2Hit)) {
          const distanceToSL = Math.abs(candle.open - position.stopLoss);
          const distanceToTP = tp1Hit
            ? Math.abs(candle.open - position.takeProfit1)
            : Math.abs(candle.open - position.takeProfit2);

          if (distanceToTP < distanceToSL) {
            // TP가 먼저 도달
            if (tp1Hit && position.tp1Percent < 100) {
              this.partialClose(position, position.takeProfit1, candle.timestamp, 'TP1', position.tp1Percent / 100);
              position.stopLoss = position.entryPrice;
              position.takeProfit1 = undefined;
              this.closePosition(position, position.stopLoss, candle.timestamp, 'SL');
            } else if (tp1Hit) {
              this.closePosition(position, position.takeProfit1, candle.timestamp, 'TP1');
            } else if (tp2Hit) {
              this.closePosition(position, position.takeProfit2, candle.timestamp, 'TP2');
            }
            continue;
          }
        }

        // 순차 처리
        if (slHit) {
          this.closePosition(position, position.stopLoss, candle.timestamp, 'SL');
          continue;
        }
        if (tp1Hit) {
          if (position.tp1Percent < 100) {
            this.partialClose(position, position.takeProfit1, candle.timestamp, 'TP1', position.tp1Percent / 100);
            position.stopLoss = position.entryPrice;
            position.takeProfit1 = undefined;
          } else {
            this.closePosition(position, position.takeProfit1, candle.timestamp, 'TP1');
          }
        }
        if (tp2Hit) {
          this.closePosition(position, position.takeProfit2, candle.timestamp, 'TP2');
        }
      }
    }
  }

  private partialClose(position: BacktestPosition, exitPrice: number, exitTime: Date, reason: string, closePercent: number) {
    const closeQuantity = position.quantity * closePercent;
    const priceDiff = position.side === 'LONG' ? exitPrice - position.entryPrice : position.entryPrice - exitPrice;
    const pnl = priceDiff * closeQuantity;
    const exitPositionValue = closeQuantity * exitPrice;
    const fee = exitPositionValue * this.takerFee;
    const netPnl = pnl - fee;

    // Entry 시 차감한 margin을 돌려받음 (entry price 기준)
    const entryPositionValue = closeQuantity * position.entryPrice;
    const marginReturn = entryPositionValue / position.leverage;
    this.balance += marginReturn + netPnl;
    position.quantity -= closeQuantity;

    const trade: BacktestTrade = {
      positionId: position.id,
      symbol: position.symbol,
      strategy: position.strategy,
      side: position.side,
      entryPrice: position.entryPrice,
      entryTime: position.entryTime,
      exitPrice: exitPrice,
      exitTime: exitTime,
      exitReason: reason,
      quantity: closeQuantity,
      leverage: position.leverage,
      pnl: netPnl,
      fee: fee,
      partial: true,
    };

    this.tradesLog.push(trade);

    if (!isNaN(exitTime.getTime())) {
      const currentDate = exitTime.toISOString().split('T')[0];
      this.dailyPnl[currentDate] = (this.dailyPnl[currentDate] || 0) + netPnl;
    }
  }

  private closePosition(position: BacktestPosition, exitPrice: number, exitTime: Date, reason: string) {
    const priceDiff = position.side === 'LONG' ? exitPrice - position.entryPrice : position.entryPrice - exitPrice;
    const pnl = priceDiff * position.quantity;
    const exitPositionValue = position.quantity * exitPrice;
    const fee = exitPositionValue * this.takerFee;
    let netPnl = pnl - fee;

    // Entry 시 차감한 margin을 돌려받음 (entry price 기준)
    const entryPositionValue = position.quantity * position.entryPrice;
    const marginReturn = entryPositionValue / position.leverage;

    if (reason === 'LIQUIDATION') {
      // 청산 시 모든 마진 손실
      netPnl = -marginReturn;
    }

    this.balance += marginReturn + netPnl;

    position.status = reason === 'LIQUIDATION' ? 'LIQUIDATED' : 'CLOSED';
    position.exitPrice = exitPrice;
    position.exitTime = exitTime;
    position.exitReason = reason as any;
    position.realizedPnl = netPnl;

    const trade: BacktestTrade = {
      positionId: position.id,
      symbol: position.symbol,
      strategy: position.strategy,
      side: position.side,
      entryPrice: position.entryPrice,
      entryTime: position.entryTime,
      exitPrice: exitPrice,
      exitTime: exitTime,
      exitReason: reason,
      quantity: position.quantity,
      leverage: position.leverage,
      pnl: netPnl,
      fee: fee,
      partial: false,
    };

    this.tradesLog.push(trade);

    if (!isNaN(exitTime.getTime())) {
      const currentDate = exitTime.toISOString().split('T')[0];
      this.dailyPnl[currentDate] = (this.dailyPnl[currentDate] || 0) + netPnl;
    }
  }

  private checkDailyLossLimit(date: string): boolean {
    const dailyLoss = this.dailyPnl[date] || 0;
    return dailyLoss <= -this.initialBalance * this.dailyLossLimit;
  }

  private recordEquity(timestamp: Date) {
    const equity = this.balance;
    this.equityCurve.push({ timestamp, balance: this.balance, equity });
  }

  private getResults(): BacktestResults {
    const wins = this.tradesLog.filter((t) => t.pnl > 0).length;
    const losses = this.tradesLog.filter((t) => t.pnl < 0).length;
    // totalPnl은 실제 잔고 변화 (수수료, 슬리피지 모두 포함)
    const totalPnl = this.balance - this.initialBalance;
    const roi = (totalPnl / this.initialBalance) * 100;
    const winRate = this.tradesLog.length > 0 ? (wins / this.tradesLog.length) * 100 : 0;

    return {
      initialBalance: this.initialBalance,
      finalBalance: this.balance,
      totalPnl,
      roi,
      totalTrades: this.tradesLog.length,
      wins,
      losses,
      winRate,
      tradesLog: this.tradesLog,
      equityCurve: this.equityCurve,
      dailyPnl: this.dailyPnl,
    };
  }
}
