import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from './websocket/websocket.service';
import { SymbolSelectionService } from './symbol-selection/symbol-selection.service';
import { ScalpingDataService } from './scalping/services/scalping-data.service';

/**
 * AppService
 *
 * ✅ TradingControlService에서 startTrading/stopTrading 호출
 * - 서버 시작 시 자동 시작하지 않음
 * - Start 버튼 클릭 시 startTrading() 호출
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private isTrading = false;

  constructor(
    private wsService: WebSocketService,
    private symbolSelection: SymbolSelectionService,
    private scalpingDataService: ScalpingDataService,
  ) {}

  /**
   * ✅ 실시간 매매 시작 (TradingControlService에서 호출)
   */
  async startTrading(): Promise<void> {
    if (this.isTrading) {
      this.logger.warn('Trading is already started');
      return;
    }

    this.logger.log('\n' + '═'.repeat(80));
    this.logger.log('🚀 CRYPTO TRADING BOT - STARTING');
    this.logger.log('═'.repeat(80));
    this.logger.log('');
    this.logger.log('📊 TRADING FLOW:');
    this.logger.log('  [1] WebSocket → 캔들 수신');
    this.logger.log('  [2] CandleAggregator → 캔들 집계 & Redis 저장');
    this.logger.log('  [3] StrategyRunner → SimpleTrueOB 전략 실행');
    this.logger.log('  [4] SignalProcessor → 신호 큐 관리 & 중복 제거');
    this.logger.log('  [5] RiskService → 리스크 체크 (포지션/일일손실/상관관계)');
    this.logger.log('  [6] OrderService → OKX 주문 실행');
    this.logger.log('  [7] PositionSync → 포지션 동기화 & TP1 후 SL 본전 이동');
    this.logger.log('');
    this.logger.log('⚙️  SETTINGS:');
    this.logger.log('  Strategy:    SimpleTrueOB (ORB)');
    this.logger.log('  Score:       80 (고정) → 메이커 주문');
    this.logger.log('  TP1/TP2:     80%/20%');
    this.logger.log('  Leverage:    20x (고정)');
    this.logger.log('  Position:    $20 USDT');
    this.logger.log('═'.repeat(80) + '\n');

    // 동적 종목 선택: 거래량 기준 상위 50개 (하이브리드)
    // - Top 5는 고정 (BTC, ETH, BNB, SOL, XRP)
    // - 나머지 165개는 24h 거래량 순
    this.logger.log('Selecting symbols by 24h volume...');

    try {
      const symbols = await this.symbolSelection.selectHybridSymbols(50);

      // 스캘핑용 심볼/초기 캔들 로드 트리거
      this.logger.log(`\n📥 Preparing scalping data (symbol refresh + initial candles)...`);
      await this.scalpingDataService.refreshSymbolList();

      this.logger.log(`\nStarting WebSocket subscriptions...`);
      await this.wsService.subscribeAll(symbols, ['5m', '15m']);

      this.isTrading = true;

      this.logger.log('\n' + '═'.repeat(80));
      this.logger.log('✅ TRADING STARTED');
      this.logger.log('═'.repeat(80));
      this.logger.log(`📡 Monitoring: ${symbols.length} symbols × 3 streams = ${symbols.length * 3} total`);
      this.logger.log(`   (5m kline + 15m kline + markPrice per symbol)`);
      this.logger.log(`🔄 Daily symbol update: 00:00 UTC (09:00 KST)`);
      this.logger.log(`📝 Log format: [FLOW-N] Stage → Action | Details`);
      this.logger.log('═'.repeat(80) + '\n');

    } catch (error) {
      this.logger.error('Error during trading start:', error);
      throw error;
    }
  }

  /**
   * ✅ 실시간 매매 종료 (TradingControlService에서 호출)
   */
  async stopTrading(): Promise<void> {
    if (!this.isTrading) {
      this.logger.warn('Trading is already stopped');
      return;
    }

    this.logger.log('\n' + '═'.repeat(80));
    this.logger.log('🛑 CRYPTO TRADING BOT - STOPPING');
    this.logger.log('═'.repeat(80));

    try {
      // WebSocket 연결 해제
      await this.wsService.disconnectAll();

      this.isTrading = false;

      this.logger.log('✅ TRADING STOPPED');
      this.logger.log('═'.repeat(80) + '\n');

    } catch (error) {
      this.logger.error('Error during trading stop:', error);
      throw error;
    }
  }

  /**
   * ✅ 실행 상태 확인
   */
  getIsTrading(): boolean {
    return this.isTrading;
  }

  getHello(): string {
    return 'Crypto Trading Bot API - ORB + BB Strategy (Dynamic Symbol Selection)';
  }
}
