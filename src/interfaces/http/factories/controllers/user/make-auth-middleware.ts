import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { makeCacheService } from '@interfaces/http/factories/cache/container';
import { makeAuthMiddleware } from '@interfaces/http/middlewares/auth-middleware';

export function makeAuth() {
  const tokenService = makeTokenService();
  const userRepository = new PrismaUserRepository();
  const cacheService = makeCacheService();
  return makeAuthMiddleware(tokenService, userRepository, cacheService);
}
