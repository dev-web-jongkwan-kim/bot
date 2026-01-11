import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DataPreprocessorService {
  private readonly logger = new Logger(DataPreprocessorService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async preprocessAndSave(symbol: string, interval: string, candles: any[]) {
    const tableName = `historical_candles_${interval}`;

    for (const candle of candles) {
      await this.dataSource.query(
        `INSERT INTO ${tableName} (symbol, timestamp, open, high, low, close, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (symbol, timestamp) DO NOTHING`,
        [
          symbol,
          new Date(candle.openTime),
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
        ]
      );
    }

    this.logger.log(`Saved ${candles.length} candles to ${tableName} for ${symbol}`);
  }
}
