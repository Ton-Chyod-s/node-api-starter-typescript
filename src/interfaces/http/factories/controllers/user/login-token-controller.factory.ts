import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { LoginTokenController } from '@interfaces/http/controllers/user/login-token-controller';

export function makeLoginTokenController() {
  const userRepository = new PrismaUserRepository();
  const tokenService = makeTokenService();

  const loginUseCase = new LoginUseCase(userRepository, tokenService);
  return new LoginTokenController(loginUseCase);
}
