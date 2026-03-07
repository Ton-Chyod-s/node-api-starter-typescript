import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { makeAuthMiddleware } from '@interfaces/http/middlewares/auth-middleware';

export function makeAuth() {
  const tokenService = makeTokenService();
  const userRepository = new PrismaUserRepository();
  return makeAuthMiddleware(tokenService, userRepository);
}
