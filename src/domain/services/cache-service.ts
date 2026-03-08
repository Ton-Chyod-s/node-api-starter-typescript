export interface ICacheService {
  /**
   * Salva um valor serializado no cache.
   * @param key  Chave do cache (ex: "user:abc123")
   * @param value Objeto que será armazenado como JSON
   * @param ttlSeconds Tempo de expiração em segundos
   */
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;

  get<T>(key: string): Promise<T | null>;

  del(key: string): Promise<void>;
}
