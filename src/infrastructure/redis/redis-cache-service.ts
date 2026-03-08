import type Redis from 'ioredis';
import type { ICacheService } from '@domain/services/cache-service';

export class RedisCacheService implements ICacheService {
  constructor(private readonly client: Redis) {}

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
