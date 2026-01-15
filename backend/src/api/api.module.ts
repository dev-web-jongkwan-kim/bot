import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiController } from './api.controller';
import { Position } from '../database/entities/position.entity';
import { Signal } from '../database/entities/signal.entity';
import { OrderModule } from '../order/order.module';
import { OkxModule } from '../okx/okx.module';
import { SymbolSelectionModule } from '../symbol-selection/symbol-selection.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, Signal]),
    OrderModule,
    OkxModule,
    SymbolSelectionModule,
    SyncModule,
  ],
  controllers: [ApiController],
})
export class ApiModule {}
