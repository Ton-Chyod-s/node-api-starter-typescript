import crypto from 'crypto';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { ITokenService } from '@domain/services/token-service';
import { User } from '@domain/entities/user';
import { sha256Hex } from '@utils/hash';

export type OAuthSessionOutput = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export async function createOAuthSession(
  user: User,
  tokenService: ITokenService,
  refreshTokenRepository: IRefreshTokenRepository,
  refreshTokenTtlMs: number,
): Promise<OAuthSessionOutput> {
  const accessToken = tokenService.sign({
    sub: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  const rawRefreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = sha256Hex(rawRefreshToken);
  const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

  await refreshTokenRepository.replaceTokenForUser(user.id, { tokenHash, expiresAt });

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
