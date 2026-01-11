import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketService } from './websocket/websocket.service';
import { SymbolSelectionService } from './symbol-selection/symbol-selection.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private wsService: WebSocketService,
    private symbolSelection: SymbolSelectionService,
  ) {}

  async onModuleInit() {
    this.logger.log('\n' + '═'.repeat(80));
    this.logger.log('🚀 CRYPTO TRADING BOT - STARTUP');
    this.logger.log('═'.repeat(80));
    this.logger.log('');
    this.logger.log('📊 TRADING FLOW:');
    this.logger.log('  [1] WebSocket → 캔들 수신');
    this.logger.log('  [2] CandleAggregator → 캔들 집계 & Redis 저장');
    this.logger.log('  [3] StrategyRunner → SimpleTrueOB 전략 실행');
    this.logger.log('  [4] SignalProcessor → 신호 큐 관리 & 중복 제거');
    this.logger.log('  [5] RiskService → 리스크 체크 (포지션/일일손실/상관관계)');
    this.logger.log('  [6] OrderService → 바이낸스 주문 실행');
    this.logger.log('  [7] PositionSync → 포지션 동기화 & TP1 후 SL 본전 이동');
    this.logger.log('');
    this.logger.log('⚙️  SETTINGS:');
    this.logger.log('  Strategy:    SimpleTrueOB (ORB)');
    this.logger.log('  Score:       80 (고정) → 메이커 주문');
    this.logger.log('  TP1/TP2:     80%/20%');
    this.logger.log('  Leverage:    10x (소자본 모드)');
    this.logger.log('  Position:    $15 USDT');
    this.logger.log('═'.repeat(80) + '\n');

    // 동적 종목 선택: 거래량 기준 상위 170개 (하이브리드)
    // - Top 5는 고정 (BTC, ETH, BNB, SOL, XRP)
    // - 나머지 165개는 24h 거래량 순
    // ✅ 80개 → 170개 확장 (백테스트 결과: ROI 40% → 88%)
    this.logger.log('Selecting symbols by 24h volume...');

    try {
      const symbols = await this.symbolSelection.selectHybridSymbols(170);

      this.logger.log(`\nStarting WebSocket subscriptions...`);
      await this.wsService.subscribeAll(symbols, ['5m', '15m']);

      this.logger.log('\n' + '═'.repeat(80));
      this.logger.log('✅ STARTUP COMPLETE');
      this.logger.log('═'.repeat(80));
      this.logger.log(`📡 Monitoring: ${symbols.length} symbols × 3 streams = ${symbols.length * 3} total`);
      this.logger.log(`   (5m kline + 15m kline + markPrice per symbol)`);
      this.logger.log(`🔄 Daily symbol update: 00:00 UTC (09:00 KST)`);
      this.logger.log(`📝 Log format: [FLOW-N] Stage → Action | Details`);
      this.logger.log('═'.repeat(80) + '\n');

    } catch (error) {
      this.logger.error('Error during startup:', error);
      this.logger.error('Trading bot may not function properly');
    }
  }

  getHello(): string {
    return 'Crypto Trading Bot API - ORB + BB Strategy (Dynamic Symbol Selection)';
  }
}
