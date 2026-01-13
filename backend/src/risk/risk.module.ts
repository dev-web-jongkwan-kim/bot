import { Module, forwardRef } from '@nestjs/common';
import { RiskService } from './risk.service';
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '@nestjs/config';
import { OkxModule } from '../okx/okx.module';
import { SymbolSelectionModule } from '../symbol-selection/symbol-selection.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    OkxModule,                  // v10: Dynamic balance (OKX)
    SymbolSelectionModule,      // v12: Sector management
    forwardRef(() => OrderModule),  // ✅ 통합 슬롯 체크용
  ],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}


