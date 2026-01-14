import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { CacheModule } from '../cache/cache.module';
import { OrderModule } from '../order/order.module';

// Services
import { ScalpingDataService } from './services/scalping-data.service';
import { ScalpingSignalService } from './services/scalping-signal.service';
import { ScalpingPositionService } from './services/scalping-position.service';
import { ScalpingOrderService } from './services/scalping-order.service';

// Analyzers
import { TrendAnalyzer } from './strategies/trend-analyzer';
import { MomentumAnalyzer } from './strategies/momentum-analyzer';

/**
 * 스캘핑 전략 모듈
 *
 * 30분 이내 빠른 매매를 목표로 하는 스캘핑 전략
 *
 * 구성:
 * - ScalpingDataService: Funding Rate, OI, Spread 수집
 * - ScalpingSignalService: 다단계 필터링으로 시그널 생성
 * - ScalpingPositionService: 활성 포지션 관리
 * - ScalpingOrderService: 주문 실행 및 포지션 관리
 * - TrendAnalyzer: 15분봉 추세 분석
 * - MomentumAnalyzer: 5분봉 모멘텀 분석
 */
@Module({
  imports: [
    BinanceModule,
    CacheModule,
    OrderModule,
  ],
  providers: [
    // Analyzers (먼저 등록)
    TrendAnalyzer,
    MomentumAnalyzer,

    // Services
    ScalpingDataService,
    ScalpingSignalService,
    ScalpingPositionService,
    ScalpingOrderService,
  ],
  exports: [
    ScalpingDataService,
    ScalpingSignalService,
    ScalpingPositionService,
    ScalpingOrderService,
  ],
})
export class ScalpingModule {}
