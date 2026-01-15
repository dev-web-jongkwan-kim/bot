import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OkxModule } from './okx/okx.module';
import { StrategiesModule } from './strategies/strategies.module';
import { SignalModule } from './signal/signal.module';
import { RiskModule } from './risk/risk.module';
import { OrderModule } from './order/order.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { WebSocketModule } from './websocket/websocket.module';
import { BacktestModule } from './backtest/backtest.module';
import { ApiModule } from './api/api.module';
import { SyncModule } from './sync/sync.module';
import { SymbolSelectionModule } from './symbol-selection/symbol-selection.module';
import { TradingControlModule } from './trading-control/trading-control.module';
import { ScalpingModule } from './scalping/scalping.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Position } from './database/entities/position.entity';
import { Signal } from './database/entities/signal.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'trader',
      password: process.env.DB_PASSWORD || 'secure_password',
      database: process.env.DB_DATABASE || 'trading',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.LOG_SQL === 'true',  // ✅ SQL 로깅은 선택적
      // ✅ 80심볼 동시 처리를 위한 연결 풀 최적화
      extra: {
        max: 20,  // 최대 연결 수 (기본 10 → 20)
        min: 5,   // 최소 연결 유지
        idleTimeoutMillis: 30000,  // 유휴 연결 30초 후 해제
        connectionTimeoutMillis: 5000,  // 연결 타임아웃 5초
        statement_timeout: 30000,  // 쿼리 타임아웃 30초
      },
    }),
    DatabaseModule,
    CacheModule,
    TradingControlModule,  // ✅ 매매 시작/종료 제어 (Global)
    OkxModule,
    WebSocketModule,
    SymbolSelectionModule, // 동적 종목 선택 모듈
    StrategiesModule,
    SignalModule,
    RiskModule,
    OrderModule,
    BacktestModule,
    ApiModule,
    SyncModule, // 포지션 동기화 모듈
    ScalpingModule, // 스캘핑 전략 모듈
    TypeOrmModule.forFeature([Position, Signal]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
