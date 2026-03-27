import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';
import { GoogleCallbackController } from '@interfaces/http/controllers/user/google-callback-controller';
import { GoogleLoginUseCase } from '@usecases/user/google-login-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { env } from '@config/env';

export function makeGoogleCallbackController() {
  const userRepository = new PrismaUserRepository();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  const tokenService = makeTokenService();

  const googleLoginUseCase = new GoogleLoginUseCase(
    userRepository,
    refreshTokenRepository,
    tokenService,
    env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );
  return new GoogleCallbackController(googleLoginUseCase);
}
