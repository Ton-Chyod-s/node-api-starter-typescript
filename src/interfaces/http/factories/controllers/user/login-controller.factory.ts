import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { LoginController } from '@interfaces/http/controllers/user/login-controller';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';

export function makeLoginController() {
  const userRepository = new PrismaUserRepository();
  const tokenService = makeTokenService();

  const loginUseCase = new LoginUseCase(userRepository, tokenService);
  return new LoginController(loginUseCase);
}
