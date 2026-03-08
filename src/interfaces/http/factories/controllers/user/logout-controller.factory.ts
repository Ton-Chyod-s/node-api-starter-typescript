import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { makeCacheService } from '@interfaces/http/factories/cache/container';
import { LogoutController } from '@interfaces/http/controllers/user/logout-controller';

export function makeLogoutController() {
  const userRepository = new PrismaUserRepository();
  const cacheService = makeCacheService();
  return new LogoutController(userRepository, cacheService);
}
