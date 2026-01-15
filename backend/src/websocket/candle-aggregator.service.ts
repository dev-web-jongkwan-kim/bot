import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

export interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ✅ Lua 스크립트로 확장된 Redis 타입
interface ExtendedRedis extends Redis {
  saveCandle(key: string, value: string, bufferSize: string, ttl: string): Promise<number>;
}

@Injectable()
export class CandleAggregatorService {
  private readonly logger = new Logger(CandleAggregatorService.name);
  private readonly bufferSize = 50; // 최근 50개 캔들만 유지
  private readonly ttl = 21600;  // 6시간 TTL
  private strategyCallbacks: Map<string, Set<(symbol: string, timeframe: string, candle: CandleData) => Promise<void>>> = new Map();

  constructor(@Inject('REDIS_CLIENT') private redis: ExtendedRedis) {}

  async onCandleClose(symbol: string, timeframe: string, candle: CandleData) {
    const key = `candles:${symbol}:${timeframe}`;

    // [FLOW-2] 캔들 집계 로깅
    this.logger.debug(
      `[FLOW-2] Aggregator → Redis | ${symbol} ${timeframe} saved to ${key}`
    );

    // Redis에 저장 (최근 50개만 유지)
    const candleJson = JSON.stringify({
      timestamp: candle.timestamp.toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    });

    try {
      // 키 타입 확인 및 정리
      const keyType = await this.redis.type(key);
      if (keyType !== 'list' && keyType !== 'none') {
        // 잘못된 타입이면 삭제
        await this.redis.del(key);
      }

      // ✅ Lua 스크립트로 원자적 저장 (LPUSH + LTRIM + EXPIRE)
      await this.redis.saveCandle(
        key,
        candleJson,
        this.bufferSize.toString(),
        this.ttl.toString()
      );
    } catch (error) {
      this.logger.error(`Error saving candle to Redis for ${key}:`, error);
    }

    // 전략에 브로드캐스트
    await this.notifyStrategies(symbol, timeframe, candle);
  }

  async getCandles(symbol: string, timeframe: string, limit: number = 50): Promise<CandleData[]> {
    const key = `candles:${symbol}:${timeframe}`;
    const data = await this.redis.lrange(key, 0, limit - 1);
    
    return data
      .map((json) => {
        const parsed = JSON.parse(json);
        return {
          timestamp: new Date(parsed.timestamp),
          open: parseFloat(parsed.open),
          high: parseFloat(parsed.high),
          low: parseFloat(parsed.low),
          close: parseFloat(parsed.close),
          volume: parseFloat(parsed.volume),
        };
      })
      .reverse(); // 오래된 것부터
  }

  registerStrategy(strategyName: string, callback: (symbol: string, timeframe: string, candle: CandleData) => Promise<void>) {
    if (!this.strategyCallbacks.has(strategyName)) {
      this.strategyCallbacks.set(strategyName, new Set());
    }
    this.strategyCallbacks.get(strategyName)!.add(callback);
  }

  private async notifyStrategies(symbol: string, timeframe: string, candle: CandleData) {
    const promises: Promise<void>[] = [];
    const strategyCount = this.strategyCallbacks.size;

    // [FLOW-2] 전략 브로드캐스트 로깅 - 전략이 없으면 경고
    if (strategyCount === 0) {
      this.logger.warn(`[FLOW-2] ⚠️ No strategies registered! Candle ${symbol} ${timeframe} not processed.`);
      return;
    }

    // [FLOW-2] 5분마다 로그 (스팸 방지)
    const minutes = candle.timestamp.getMinutes();
    if (minutes % 5 === 0 && candle.timestamp.getSeconds() < 10) {
      this.logger.log(
        `[FLOW-2] Aggregator → Strategy | Broadcasting to ${strategyCount} strategies`
      );
    }

    for (const [strategyName, callbacks] of this.strategyCallbacks.entries()) {
      for (const callback of callbacks) {
        promises.push(
          callback(symbol, timeframe, candle).catch((error) => {
            this.logger.error(`[FLOW-2] ❌ Strategy Error | ${strategyName}: ${error.message}`);
          })
        );
      }
    }

    await Promise.allSettled(promises);
  }
}
