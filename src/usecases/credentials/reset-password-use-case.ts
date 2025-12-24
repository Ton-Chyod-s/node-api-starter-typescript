import crypto from 'crypto';

import { IUserRepository } from '@domain/repositories/user-repository';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import { hashPassword } from '@utils/password-generator';
import { AppError } from '@utils/app-error';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

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
    const tokenRecord = await this.resetTokenRepo.findValidByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw AppError.badRequest('Invalid or expired token', 'PASSWORD_RESET_INVALID_TOKEN');
    }

    const user = await this.userRepo.findById(tokenRecord.userId);
    if (!user) {
      await this.resetTokenRepo.markUsed(tokenRecord.id);
      throw AppError.badRequest('Invalid or expired token', 'PASSWORD_RESET_INVALID_TOKEN');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepo.updatePasswordHash(user.id, passwordHash);
    await this.resetTokenRepo.markUsed(tokenRecord.id);
  }
}
