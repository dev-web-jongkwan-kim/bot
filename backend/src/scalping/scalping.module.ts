import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Signal } from '../database/entities/signal.entity';
import { Position } from '../database/entities/position.entity';

// Services
import { ScalpingDataService } from './services/scalping-data.service';
import { ScalpingSignalService } from './services/scalping-signal.service';
import { ScalpingOrderService } from './services/scalping-order.service';
import { ScalpingPositionService } from './services/scalping-position.service';
import { ScalpingOrderWatchdogService } from './services/scalping-order-watchdog.service';

// Strategies (Analyzers)
import { TrendAnalyzer } from './strategies/trend-analyzer';
import { MomentumAnalyzer } from './strategies/momentum-analyzer';

// Dependencies
import { OkxModule } from '../okx/okx.module';
import { BinanceModule } from '../binance/binance.module';
import { CacheModule } from '../cache/cache.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { DatabaseModule } from '../database/database.module';
import { SymbolSelectionModule } from '../symbol-selection/symbol-selection.module';

/**
 * 스캘핑 전략 모듈
 *
 * 30분 이내 청산 초단타 스캘핑 전략
 *
 * 구성요소:
 * - ScalpingDataService: 마켓 데이터 수집 (Funding, OI, Spread)
 * - ScalpingSignalService: 시그널 생성 (6단계 필터)
 * - ScalpingOrderService: 주문 실행 및 포지션 관리
 * - ScalpingPositionService: 포지션 상태 관리
 * - TrendAnalyzer: 15분봉 추세 분석
 * - MomentumAnalyzer: 5분봉 모멘텀 분석
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    CacheModule,
    OkxModule,
    BinanceModule,
    WebSocketModule,
    DatabaseModule,
    SymbolSelectionModule,
    TypeOrmModule.forFeature([Signal, Position]),
  ],
  providers: [
    // 데이터 서비스
    ScalpingDataService,

    // 분석기
    TrendAnalyzer,
    MomentumAnalyzer,

    // 시그널 서비스
    ScalpingSignalService,

    // 포지션 서비스
    ScalpingPositionService,

    // 주문 서비스
    ScalpingOrderService,
    ScalpingOrderWatchdogService,
  ],
  exports: [
    ScalpingDataService,
    ScalpingSignalService,
    ScalpingOrderService,
    ScalpingPositionService,
    ScalpingOrderWatchdogService,
  ],
})
export class ScalpingModule {}
