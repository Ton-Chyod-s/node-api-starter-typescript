import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { UpdateRoleController } from '@interfaces/http/controllers/user/update-role-controller';
import { UpdateUserRoleUseCase } from '@usecases/user/update-role-use-case';
import { makeCacheService } from '@interfaces/http/factories/cache/container';

export function makeUpdateRoleController() {
  const userRepository = new PrismaUserRepository();
  const cacheService = makeCacheService();
  const updateUserRoleUseCase = new UpdateUserRoleUseCase(userRepository, cacheService);
  return new UpdateRoleController(updateUserRoleUseCase);
}
