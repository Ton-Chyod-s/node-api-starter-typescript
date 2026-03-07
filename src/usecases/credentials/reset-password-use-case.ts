import { IUserRepository } from '@domain/repositories/user-repository';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import { hashPassword } from '@utils/password-generator';
import { AppError } from '@utils/app-error';
import { sha256Hex } from '@utils/hash';
import { passwordSchema } from '@domain/dtos/shared/password-schema';

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

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      throw AppError.badRequest('Invalid password', 'PASSWORD_RESET_INVALID_PASSWORD');
    }

    const tokenHash = sha256Hex(rawToken);
    const passwordHash = await hashPassword(parsed.data);

    const userId = await this.resetTokenRepo.consumeByTokenHash(tokenHash, passwordHash);

    if (!userId) {
      throw AppError.badRequest('Invalid or expired token', 'PASSWORD_RESET_INVALID_TOKEN');
    }
  }
}
