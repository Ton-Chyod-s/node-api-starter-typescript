import crypto from 'crypto';
import { IUserRepository } from '@domain/repositories/user-repository';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { ITokenService } from '@domain/services/token-service';
import { verifyPassword } from '@utils/password-generator';
import { AppError } from '@utils/app-error';
import { sha256Hex } from '@utils/hash';

type LoginTokenInput = { email: string; password: string };

type LoginTokenOutput = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export class LoginTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenTtlMs: number,
  ) {}

  async execute({ email, password }: LoginTokenInput): Promise<LoginTokenOutput> {
    const user = await this.userRepository.findByEmail(email.trim().toLowerCase());
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw AppError.unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
    }

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
