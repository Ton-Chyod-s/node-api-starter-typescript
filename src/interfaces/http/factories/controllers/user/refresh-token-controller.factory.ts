import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { RefreshTokenUseCase } from '@usecases/user/refresh-token-use-case';
import { RefreshTokenController } from '@interfaces/http/controllers/user/refresh-token-controller';
import { env } from '@config/env';

export function makeRefreshTokenController() {
  const userRepository = new PrismaUserRepository();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  const tokenService = makeTokenService();

  const useCase = new RefreshTokenUseCase(
    userRepository,
    refreshTokenRepository,
    tokenService,
    env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  return new RefreshTokenController(useCase);
}
