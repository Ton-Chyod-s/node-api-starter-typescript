import type { CookieOptions } from 'express';
import { env, expiresInToMs } from '@config/env';

export const AUTH_COOKIE_NAME = 'token';

export function authCookieOptions(): CookieOptions {
  const secure = (env.COOKIE_SECURE ?? env.NODE_ENV === 'production') === true;
  const sameSite = env.COOKIE_SAMESITE ?? 'lax';

  if (sameSite === 'none' && !secure) {
    throw new Error('COOKIE_SAMESITE=none exige COOKIE_SECURE=true (HTTPS).');
  }

  const maxAge = expiresInToMs(env.JWT_EXPIRES_IN);

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}
