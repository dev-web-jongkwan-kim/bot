import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SimpleTrueOBStrategy } from '../strategies/simple-true-ob.strategy';
import { CandleAggregatorService, CandleData } from '../websocket/candle-aggregator.service';
import { SignalProcessorService } from './signal-processor.service';
import { BinanceService } from '../binance/binance.service';
import { SymbolSelectionService } from '../symbol-selection/symbol-selection.service';

/**
 * StrategyRunnerService
 *
 * 실시간 매매를 위한 전략 실행 서비스
 * - 캔들 종료 이벤트를 수신하여 SimpleTrueOB 전략 실행
 * - 생성된 시그널을 SignalProcessorService로 전달
 *
 * SimpleTrueOB Strategy (tb1에서 가져옴):
 * - ORB (Opening Range Breakout) 메서드
 * - 동적 minAwayMult 설정 (변동성 기반)
 * - Partial TP: TP1=1.5x (75%), TP2=2.5x (25%)
 * - SMA 50 (1시간봉 기준) 필터
 */
@Injectable()
export class StrategyRunnerService implements OnModuleInit {
  private readonly logger = new Logger(StrategyRunnerService.name);

  constructor(
    private readonly simpleTrueOBStrategy: SimpleTrueOBStrategy,
    private readonly candleAggregator: CandleAggregatorService,
    private readonly signalProcessor: SignalProcessorService,
    private readonly binanceService: BinanceService,
    private readonly symbolSelection: SymbolSelectionService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 StrategyRunnerService initializing...');

    // 전략 초기화 (실시간 모드)
    this.simpleTrueOBStrategy.reset();

    // 캔들 집계 서비스에 콜백 등록
    this.candleAggregator.registerStrategy('SIMPLE_TRUE_OB', this.onCandleClose.bind(this));

    this.logger.log('✅ StrategyRunnerService initialized with SimpleTrueOB strategy');

    // 심볼 선택이 완료될 때까지 대기 후 과거 캔들 로드
    setTimeout(() => {
      this.loadHistoricalCandles().catch(err => {
        this.logger.error('Failed to load historical candles:', err);
      });
    }, 3000); // 3초 후 실행 (SymbolSelectionService 초기화 대기)
  }

  /**
   * 실시간 매매 시작 전 과거 700개 캔들 로드
   * SMA50(1시간봉 = 600개 5분봉) 계산을 위해 700개 필요
   *
   * ✅ Rate Limit 계산 (170 심볼 기준):
   * - Binance Futures API: 2,400 weight/분
   * - Klines (limit>500): 5 weight/요청
   * - 배치당: 5 심볼 × 2 타임프레임 = 10 요청 × 5 = 50 weight
   * - 5초 간격: 12 배치/분 × 50 weight = 600 weight/분 (25% 사용, 매우 안전)
   * - 예상 초기화 시간: 170/5 = 34 배치 × 5초 = ~3분
   */
  private async loadHistoricalCandles() {
    this.logger.log('📥 Loading historical candles for immediate signal detection...');
    this.logger.log('📊 Required: 700 candles (600 for SMA50 + 100 buffer)');

    const symbols = this.symbolSelection.getSelectedSymbols();
    const loadedCount = { '5m': 0, '15m': 0 };
    const REQUIRED_CANDLES = 700;
    const BATCH_SIZE = 5;  // ✅ 5개씩 (rate limit 안전 마진)
    const BATCH_DELAY = 5000;  // ✅ 5초 대기 (25% rate limit만 사용, 매우 안전)

    const startTime = Date.now();
    const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);

    this.logger.log(`📡 Loading ${symbols.length} symbols in ${totalBatches} batches (rate limit safe)`);

    // ✅ 심볼을 배치로 나누어 병렬 처리
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      this.logger.log(`  [Batch ${batchNum}/${totalBatches}] Loading ${batch.length} symbols...`);

      // ✅ 배치 내 심볼들을 병렬로 처리
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            // 5분봉과 15분봉을 병렬로 로드
            const [candles5m, candles15m] = await Promise.all([
              this.binanceService.getHistoricalCandles(symbol, '5m', REQUIRED_CANDLES),
              this.binanceService.getHistoricalCandles(symbol, '15m', REQUIRED_CANDLES),
            ]);

            // 5분봉 처리 (순차적으로 전략에 주입)
            if (candles5m.length > 0) {
              for (const candle of candles5m) {
                await this.simpleTrueOBStrategy.on5minCandleClose(symbol, candle);
              }
              loadedCount['5m']++;
            }

            // 15분봉 처리
            if (candles15m.length > 0) {
              for (const candle of candles15m) {
                await this.simpleTrueOBStrategy.on15minCandleClose(symbol, candle);
              }
              loadedCount['15m']++;
            }

            this.logger.debug(`[${symbol}] Loaded ${candles5m.length} 5m + ${candles15m.length} 15m candles`);
          } catch (error) {
            this.logger.warn(`Failed to load historical candles for ${symbol}:`, error.message);
          }
        })
      );

      // ✅ 배치 간 대기 (API rate limit 방지)
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(`✅ Historical candles loaded in ${elapsedTime}s: ${loadedCount['5m']} symbols (5m), ${loadedCount['15m']} symbols (15m)`);
    this.logger.log('🎯 SimpleTrueOB Strategy is now ready for real-time signal detection!');
    this.logger.log('📈 SMA50 (1h = 600 candles) will be calculated from loaded data');

    // ✅ 과거 데이터 로딩 완료 → 실시간 모드 활성화
    this.simpleTrueOBStrategy.enableLiveMode();
  }

  /**
   * 캔들 종료 이벤트 핸들러
   */
  private async onCandleClose(symbol: string, timeframe: string, candle: CandleData): Promise<void> {
    try {
      if (timeframe === '5m') {
        await this.on5minCandleClose(symbol, candle);
      } else if (timeframe === '15m') {
        await this.on15minCandleClose(symbol, candle);
      }
    } catch (error) {
      this.logger.error(`Error in onCandleClose for ${symbol} ${timeframe}:`, error);
    }
  }

  /**
   * 5분봉 종료 이벤트 처리
   */
  private async on5minCandleClose(symbol: string, candle: CandleData): Promise<void> {
    try {
      const signal = await this.simpleTrueOBStrategy.on5minCandleClose(symbol, candle);
      if (signal) {
        const riskPercent = ((signal.entryPrice - signal.stopLoss) / signal.entryPrice * 100).toFixed(2);
        const rrRatio = ((signal.takeProfit1 - signal.entryPrice) / (signal.entryPrice - signal.stopLoss)).toFixed(1);

        // [FLOW-3] 신호 생성 로깅
        this.logger.log(
          `\n[FLOW-3] ═══════════════════════════════════════════════════════════════\n` +
          `[FLOW-3] 🎯 SIGNAL GENERATED | ${symbol} 5m\n` +
          `[FLOW-3] ───────────────────────────────────────────────────────────────\n` +
          `[FLOW-3]   Direction: ${signal.side === 'LONG' ? '🟢 LONG' : '🔴 SHORT'}\n` +
          `[FLOW-3]   Entry:     ${signal.entryPrice.toFixed(4)}\n` +
          `[FLOW-3]   Stop Loss: ${signal.stopLoss.toFixed(4)} (${riskPercent}% risk)\n` +
          `[FLOW-3]   TP1:       ${signal.takeProfit1.toFixed(4)} (${signal.tp1Percent}%)\n` +
          `[FLOW-3]   TP2:       ${signal.takeProfit2.toFixed(4)} (${signal.tp2Percent}%)\n` +
          `[FLOW-3]   R:R Ratio: 1:${rrRatio}\n` +
          `[FLOW-3]   Method:    ${signal.metadata?.method || 'ORB'}\n` +
          `[FLOW-3]   Score:     ${signal.score}/100\n` +
          `[FLOW-3] ═══════════════════════════════════════════════════════════════`
        );
        await this.signalProcessor.addSignal(signal);
      }
    } catch (error) {
      this.logger.error(`[FLOW-3] ❌ Strategy Error | ${symbol} 5m: ${error.message}`);
    }
  }

  /**
   * 15분봉 종료 이벤트 처리
   */
  private async on15minCandleClose(symbol: string, candle: CandleData): Promise<void> {
    try {
      const signal = await this.simpleTrueOBStrategy.on15minCandleClose(symbol, candle);
      if (signal) {
        const riskPercent = ((signal.entryPrice - signal.stopLoss) / signal.entryPrice * 100).toFixed(2);
        const rrRatio = ((signal.takeProfit1 - signal.entryPrice) / (signal.entryPrice - signal.stopLoss)).toFixed(1);

        // [FLOW-3] 신호 생성 로깅
        this.logger.log(
          `\n[FLOW-3] ═══════════════════════════════════════════════════════════════\n` +
          `[FLOW-3] 🎯 SIGNAL GENERATED | ${symbol} 15m\n` +
          `[FLOW-3] ───────────────────────────────────────────────────────────────\n` +
          `[FLOW-3]   Direction: ${signal.side === 'LONG' ? '🟢 LONG' : '🔴 SHORT'}\n` +
          `[FLOW-3]   Entry:     ${signal.entryPrice.toFixed(4)}\n` +
          `[FLOW-3]   Stop Loss: ${signal.stopLoss.toFixed(4)} (${riskPercent}% risk)\n` +
          `[FLOW-3]   TP1:       ${signal.takeProfit1.toFixed(4)} (${signal.tp1Percent}%)\n` +
          `[FLOW-3]   TP2:       ${signal.takeProfit2.toFixed(4)} (${signal.tp2Percent}%)\n` +
          `[FLOW-3]   R:R Ratio: 1:${rrRatio}\n` +
          `[FLOW-3]   Method:    ${signal.metadata?.method || 'ORB'}\n` +
          `[FLOW-3]   Score:     ${signal.score}/100\n` +
          `[FLOW-3] ═══════════════════════════════════════════════════════════════`
        );
        await this.signalProcessor.addSignal(signal);
      }
    } catch (error) {
      this.logger.error(`[FLOW-3] ❌ Strategy Error | ${symbol} 15m: ${error.message}`);
    }
  }
}
