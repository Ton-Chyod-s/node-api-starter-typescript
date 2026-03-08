import Redis from 'ioredis';
import { env } from '@config/env';

let _redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (_redis) return _redis;

  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL não definida');
  }

  _redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    keyPrefix: `${env.APP_NAME ?? 'app'}:${env.NODE_ENV}:`, // ex: ecommerce:development:
  });

  _redis.on('error', (err) => {
    if (env.NODE_ENV !== 'test') {
      console.error('[Redis] Erro de conexão:', err.message);
    }
  });

  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
