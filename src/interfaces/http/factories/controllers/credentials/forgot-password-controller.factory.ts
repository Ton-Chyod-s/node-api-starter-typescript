import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { NodemailerService } from '@infrastructure/services/node-mailer-service';
import { ConsoleMailerService } from '@infrastructure/services/console-mailer-service';
import { PrismaPasswordResetTokenRepository } from '@infrastructure/repositories/password-reset-token-repository';

import { ForgotPasswordController } from '@interfaces/http/controllers/credentials/forgot-password-controller';
import { ForgotPasswordUseCase } from '@usecases/credentials/forgot-password-use-case';
import { env } from '@config/env';

export function makeForgotPasswordController() {
  const userRepo = new PrismaUserRepository();
  const resetTokenRepo = new PrismaPasswordResetTokenRepository();
  const hasSmtp = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  const mailer = hasSmtp ? new NodemailerService() : new ConsoleMailerService();

  const useCase = new ForgotPasswordUseCase(userRepo, resetTokenRepo, mailer);
  return new ForgotPasswordController(useCase);
}
