import crypto from 'crypto';
import { IUserRepository } from '@domain/repositories/user-repository';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { ITokenService } from '@domain/services/token-service';
import { AppError } from '@utils/app-error';
import { sha256Hex } from '@utils/hash';

type RefreshTokenInput = {
  refreshToken: string;
};

type RefreshTokenOutput = {
  accessToken: string;
  refreshToken: string;
};

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenTtlMs: number,
  ) {}

  async execute({ refreshToken }: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const tokenHash = sha256Hex(refreshToken);

    const userId = await this.refreshTokenRepository.consumeByTokenHash(tokenHash);
    if (!userId) {
      throw AppError.unauthorized('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('User not found', 'REFRESH_TOKEN_INVALID');
    }

    const accessToken = this.tokenService.sign({
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = sha256Hex(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.refreshTokenRepository.replaceTokenForUser(user.id, {
      tokenHash: newTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
}
