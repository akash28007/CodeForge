import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

/**
 * Local dev talks to Redis via REDIS_HOST/REDIS_PORT (docker-compose, no auth/TLS).
 * Hosted Redis (e.g. Upstash) is instead given as a single REDIS_URL
 * (rediss://default:<password>@<host>:<port>) which already encodes TLS + auth.
 * BullMQ requires maxRetriesPerRequest: null on any connection used for blocking commands.
 */
export function createRedisConnection(config: ConfigService): IORedis {
  const url = config.get<string>('REDIS_URL');
  if (url) {
    return new IORedis(url, { maxRetriesPerRequest: null });
  }

  return new IORedis({
    host: config.getOrThrow<string>('REDIS_HOST'),
    port: Number(config.getOrThrow<string>('REDIS_PORT')),
    maxRetriesPerRequest: null,
  });
}
