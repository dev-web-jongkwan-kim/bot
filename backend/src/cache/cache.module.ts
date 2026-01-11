import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');

        const redis = new Redis({
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
          // ✅ 80심볼 동시 처리를 위한 최적화 설정
          maxRetriesPerRequest: 3,  // 요청당 최대 재시도
          retryStrategy: (times) => {
            if (times > 10) {
              logger.error(`Redis connection failed after ${times} attempts`);
              return null;  // 10회 실패 후 포기
            }
            const delay = Math.min(times * 100, 3000);  // 최대 3초
            return delay;
          },
          enableOfflineQueue: true,  // 연결 끊김 시 큐잉
          lazyConnect: false,
          connectTimeout: 10000,  // 연결 타임아웃 10초
          commandTimeout: 5000,   // 명령 타임아웃 5초
        });

        redis.on('connect', () => {
          logger.log('✅ Redis connected');
        });

        redis.on('error', (err) => {
          logger.error(`Redis error: ${err.message}`);
        });

        redis.on('close', () => {
          logger.warn('Redis connection closed');
        });

        // ✅ Lua 스크립트 사전 등록 (원자적 캔들 저장용)
        redis.defineCommand('saveCandle', {
          numberOfKeys: 1,
          lua: `
            local key = KEYS[1]
            local value = ARGV[1]
            local bufferSize = tonumber(ARGV[2])
            local ttl = tonumber(ARGV[3])

            redis.call('LPUSH', key, value)
            redis.call('LTRIM', key, 0, bufferSize - 1)
            redis.call('EXPIRE', key, ttl)
            return redis.call('LLEN', key)
          `,
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class CacheModule {}


