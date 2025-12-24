import { makeTokenService } from '@interfaces/http/factories/jwt/container';
import { makeAuthMiddleware } from '@interfaces/http/middlewares/auth-middleware';

export function makeAuth() {
  const tokenService = makeTokenService();
  return makeAuthMiddleware(tokenService);
}
