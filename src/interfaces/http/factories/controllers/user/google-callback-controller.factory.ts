import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { GoogleCallbackController } from '@interfaces/http/controllers/user/google-callback-controller';
import { GoogleLoginUseCase } from '@usecases/user/google-login-use-case';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';

export function makeGoogleCallbackController() {
  const userRepository = new PrismaUserRepository();
  const tokenService = makeTokenService();

  const googleLoginUseCase = new GoogleLoginUseCase(userRepository, tokenService);
  return new GoogleCallbackController(googleLoginUseCase);
}
