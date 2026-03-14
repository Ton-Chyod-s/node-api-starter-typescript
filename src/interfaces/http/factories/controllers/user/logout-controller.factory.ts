import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';
import { makeCacheService } from '@interfaces/http/factories/cache/container';
import { LogoutController } from '@interfaces/http/controllers/user/logout-controller';

export function makeLogoutController() {
  const userRepository = new PrismaUserRepository();
  const cacheService = makeCacheService();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  return new LogoutController(userRepository, cacheService, refreshTokenRepository);
}
