import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { env } from '@config/env';
import { logger } from '@infrastructure/logging/logger';
import { getRedisClient } from '@infrastructure/redis/client';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

type MakeRateLimiterOptions = {
  windowMs: number;
  limit: number;
  skip?: Options['skip'];
};

let redisStore: RedisStore | undefined;
let memoryFallbackWarned = false;

function getRateLimitStore(): RedisStore | undefined {
  if (!env.REDIS_URL) {
    if (!memoryFallbackWarned && env.NODE_ENV !== 'test') {
      logger.warn('REDIS_URL não configurada. Rate limit seguirá com store em memória.');
      memoryFallbackWarned = true;
    }

    return undefined;
  }

  if (redisStore) return redisStore;

  const client = getRedisClient();

  redisStore = new RedisStore({
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<number>,
    prefix: 'rl:',
  });

  return redisStore;
}

export function makeRateLimiter({
  windowMs,
  limit,
  skip,
}: MakeRateLimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    store: getRateLimitStore(),
    passOnStoreError: true,
    handler: (_req, res) => {
      const status = httpStatusCodes.TOO_MANY_REQUESTS ?? 429;

      const response = createResponse(
        status,
        'Too many requests, please try again later',
      );

      return res.status(status).json(response);
    },
  });
}
