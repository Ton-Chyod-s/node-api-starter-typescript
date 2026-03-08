import { env } from '@config/env';
import { getRedisClient } from '@infrastructure/redis/client';
import { RedisCacheService } from '@infrastructure/redis/redis-cache-service';
import { NullCacheService } from '@infrastructure/redis/null-cache-service';
import type { ICacheService } from '@domain/services/cache-service';

let _instance: ICacheService | null = null;

export function makeCacheService(): ICacheService {
  if (_instance) return _instance;

  if (env.REDIS_URL) {
    _instance = new RedisCacheService(getRedisClient());
  } else {
    _instance = new NullCacheService();
  }

  return _instance;
}
