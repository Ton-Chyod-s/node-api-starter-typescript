import { IUserRepository } from '@domain/repositories/user-repository';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { ITokenService } from '@domain/services/token-service';
import { createOAuthSession, OAuthSessionOutput } from './oauth-session';

type FacebookUserInfo = {
  facebookId: string;
  email: string;
  name: string;
};

export class FacebookLoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenTtlMs: number,
  ) {}

  async execute({ facebookId, email, name }: FacebookUserInfo): Promise<OAuthSessionOutput> {
    const { user } = await this.userRepository.upsertByFacebookId({ facebookId, email, name });

    return createOAuthSession(
      user,
      this.tokenService,
      this.refreshTokenRepository,
      this.refreshTokenTtlMs,
    );
  }
}
