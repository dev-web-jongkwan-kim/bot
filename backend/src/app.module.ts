import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'trader'),
        password: configService.get('DB_PASSWORD', 'secure_password'),
        database: configService.get('DB_DATABASE', 'trading'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // 기존 테이블 사용
        logging: configService.get('LOG_SQL') === 'true',
        extra: {
          max: 20,
          min: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          statement_timeout: 30000,
        },
      }),
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
    TypeOrmModule.forFeature([Position, Signal]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
