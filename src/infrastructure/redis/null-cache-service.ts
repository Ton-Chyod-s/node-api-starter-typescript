import type { ICacheService } from '@domain/services/cache-service';

export class NullCacheService implements ICacheService {
  async set(_key: string, _value: unknown, _ttlSeconds: number): Promise<void> {}

  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async del(_key: string): Promise<void> {}
}
