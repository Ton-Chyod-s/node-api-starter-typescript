import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';
import { FacebookCallbackController } from '@interfaces/http/controllers/user/facebook-callback-controller';
import { FacebookLoginUseCase } from '@usecases/user/facebook-login-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { env } from '@config/env';

export function makeFacebookCallbackController() {
  const userRepository = new PrismaUserRepository();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  const tokenService = makeTokenService();

  const facebookLoginUseCase = new FacebookLoginUseCase(
    userRepository,
    refreshTokenRepository,
    tokenService,
    env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );
  return new FacebookCallbackController(facebookLoginUseCase);
}
