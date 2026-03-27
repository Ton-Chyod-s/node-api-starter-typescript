import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';
import { LoginController } from '@interfaces/http/controllers/user/login-controller';
import { LoginTokenUseCase } from '@usecases/user/login-token-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { env } from '@config/env';

export function makeLoginController() {
  const userRepository = new PrismaUserRepository();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  const tokenService = makeTokenService();

  const loginTokenUseCase = new LoginTokenUseCase(
    userRepository,
    refreshTokenRepository,
    tokenService,
    env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  return new LoginController(loginTokenUseCase);
}
