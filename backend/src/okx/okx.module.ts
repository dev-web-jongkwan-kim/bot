import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OkxService } from './okx.service';

@Module({
  imports: [ConfigModule],
  providers: [OkxService],
  exports: [OkxService],
})
export class OkxModule {}
