import crypto from 'crypto';
import { IUserRepository } from '@domain/repositories/user-repository';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { ITokenService } from '@domain/services/token-service';
import { sha256Hex } from '@utils/hash';

type GoogleUserInfo = {
  googleId: string;
  email: string;
  name: string;
};

type GoogleLoginOutput = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export class GoogleLoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenTtlMs: number,
  ) {}

  async execute({ googleId, email, name }: GoogleUserInfo): Promise<GoogleLoginOutput> {
    const { user } = await this.userRepository.upsertByGoogleId({ googleId, email, name });

    const accessToken = this.tokenService.sign({
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = sha256Hex(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.refreshTokenRepository.replaceTokenForUser(user.id, { tokenHash, expiresAt });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
