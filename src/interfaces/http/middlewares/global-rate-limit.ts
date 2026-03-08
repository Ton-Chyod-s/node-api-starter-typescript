import { makeRateLimiter } from '@interfaces/http/middlewares/rate-limit';

export const globalApiLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  skip: (req) => req.path === '/health',
});
