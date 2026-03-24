import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';
import { LoginTokenUseCase } from '@usecases/user/login-token-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { LoginTokenController } from '@interfaces/http/controllers/user/login-token-controller';
import { env } from '@config/env';

export function makeLoginTokenController() {
  const userRepository = new PrismaUserRepository();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  const tokenService = makeTokenService();

  const loginTokenUseCase = new LoginTokenUseCase(
    userRepository,
    refreshTokenRepository,
    tokenService,
    env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  return new LoginTokenController(loginTokenUseCase);
}

