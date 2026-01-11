import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as yauzl from 'yauzl';

@Injectable()
export class DataDownloaderService {
  private readonly logger = new Logger(DataDownloaderService.name);
  private readonly BASE_URL = 'https://data.binance.vision';
  private readonly dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'backtest_data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async downloadKlines(
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string,
  ): Promise<string[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    this.logger.log(
      `Downloading ${dates.length} days of ${symbol} ${interval} data...`,
    );

    const downloadedFiles: string[] = [];
    const chunks = [];
    for (let i = 0; i < dates.length; i += 10) {
      chunks.push(dates.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const promises = chunk.map((date) =>
        this.downloadSingleFile(symbol, interval, date),
      );
      const results = await Promise.allSettled(promises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          downloadedFiles.push(result.value);
          this.logger.log(`✓ ${chunk[index]}`);
        } else {
          this.logger.error(`✗ ${chunk[index]}`);
        }
      });
    }

    this.logger.log(
      `Downloaded ${downloadedFiles.length}/${dates.length} files`,
    );
    return downloadedFiles;
  }

  private async downloadSingleFile(
    symbol: string,
    interval: string,
    date: string,
  ): Promise<string | null> {
    const url = `${this.BASE_URL}/data/futures/um/daily/klines/${symbol}/${interval}/${symbol}-${interval}-${date}.zip`;
    const csvFilename = `${symbol}-${interval}-${date}.csv`;
    const csvPath = path.join(this.dataDir, csvFilename);

    if (fs.existsSync(csvPath)) {
      return csvPath;
    }

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      if (response.status !== 200) {
        return null;
      }

      return new Promise((resolve, reject) => {
        yauzl.fromBuffer(Buffer.from(response.data), { lazyEntries: true }, (err, zipfile) => {
          if (err) return reject(err);
          
          zipfile.readEntry();
          zipfile.on('entry', (entry) => {
            if (entry.fileName.endsWith('.csv')) {
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) return reject(err);
                const writeStream = fs.createWriteStream(csvPath);
                readStream.pipe(writeStream);
                writeStream.on('close', () => resolve(csvPath));
              });
            } else {
              zipfile.readEntry();
            }
          });
        });
      });
    } catch (error) {
      this.logger.error(`Error downloading ${date}: ${error.message}`);
      return null;
    }
  }

  async loadAndMerge(
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    const files = await this.downloadKlines(symbol, interval, startDate, endDate);

    if (files.length === 0) {
      throw new Error('No files downloaded');
    }

    const allCandles: any[] = [];

    for (const filepath of files.sort()) {
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 11) {
          const openTime = parseInt(parts[0]);
          const open = parseFloat(parts[1]);
          const high = parseFloat(parts[2]);
          const low = parseFloat(parts[3]);
          const close = parseFloat(parts[4]);
          const volume = parseFloat(parts[5]);

          // Validate all required fields
          if (!isNaN(openTime) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && !isNaN(volume)) {
            allCandles.push({
              openTime,
              open,
              high,
              low,
              close,
              volume,
              closeTime: parseInt(parts[6]) || openTime + 300000,
              quoteVolume: parseFloat(parts[7]) || 0,
              trades: parseInt(parts[8]) || 0,
              takerBuyVolume: parseFloat(parts[9]) || 0,
              takerBuyQuoteVolume: parseFloat(parts[10]) || 0,
            });
          }
        }
      }
    }

    const uniqueCandles = Array.from(
      new Map(allCandles.map((c) => [c.openTime, c])).values(),
    ).sort((a, b) => a.openTime - b.openTime);

    this.logger.log(`Loaded ${uniqueCandles.length} candles`);

    return uniqueCandles;
  }
}
