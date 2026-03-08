import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaPasswordResetTokenRepository } from '@infrastructure/repositories/password-reset-token-repository';
import { makeCacheService } from '@interfaces/http/factories/cache/container';

import { ResetPasswordController } from '@interfaces/http/controllers/credentials/reset-password-controller';
import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';

export function makeResetPasswordController() {
  const userRepo = new PrismaUserRepository();
  const resetTokenRepo = new PrismaPasswordResetTokenRepository();
  const cacheService = makeCacheService();

  const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);
  return new ResetPasswordController(useCase);
}
