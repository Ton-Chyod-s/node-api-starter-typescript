import { JwtTokenService } from '@infrastructure/jwt/jwt-token-service';
import { env } from '@config/env';

export function makeTokenService() {
  return new JwtTokenService({
    secret: env.KEY_JWT,
    expiresIn: env.JWT_EXPIRES_IN,

    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });
}
