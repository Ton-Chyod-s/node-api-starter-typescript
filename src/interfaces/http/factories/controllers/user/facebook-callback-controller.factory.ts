import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { FacebookCallbackController } from '@interfaces/http/controllers/user/facebook-callback-controller';
import { FacebookLoginUseCase } from '@usecases/user/facebook-login-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';

export function makeFacebookCallbackController() {
  const userRepository = new PrismaUserRepository();
  const tokenService = makeTokenService();
  const facebookLoginUseCase = new FacebookLoginUseCase(userRepository, tokenService);
  return new FacebookCallbackController(facebookLoginUseCase);
}
