import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaPasswordResetTokenRepository } from '@infrastructure/repositories/password-reset-token-repository';

import { ResetPasswordController } from '@interfaces/http/controllers/credentials/reset-password-controller';
import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';

export function makeResetPasswordController() {
  const userRepo = new PrismaUserRepository();
  const resetTokenRepo = new PrismaPasswordResetTokenRepository();

  const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo);
  return new ResetPasswordController(useCase);
}
