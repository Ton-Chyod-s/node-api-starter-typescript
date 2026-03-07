import { IUserRepository } from '@domain/repositories/user-repository';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import { hashPassword } from '@utils/password-generator';
import { AppError } from '@utils/app-error';
import { sha256Hex } from '@utils/hash';

type ResetInput = {
  token: string;
  newPassword: string;
};

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly resetTokenRepo: IPasswordResetTokenRepository,
  ) {}

  async execute({ token, newPassword }: ResetInput): Promise<void> {
    const rawToken = token.trim();
    if (!rawToken) {
      throw AppError.badRequest('Invalid or expired token', 'PASSWORD_RESET_INVALID_TOKEN');
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      throw AppError.badRequest('Invalid password', 'PASSWORD_RESET_INVALID_PASSWORD');
    }

    const tokenHash = sha256Hex(rawToken);
    const passwordHash = await hashPassword(newPassword);

    const userId = await this.resetTokenRepo.consumeByTokenHash(tokenHash, passwordHash);

    if (!userId) {
      throw AppError.badRequest('Invalid or expired token', 'PASSWORD_RESET_INVALID_TOKEN');
    }
  }
}
