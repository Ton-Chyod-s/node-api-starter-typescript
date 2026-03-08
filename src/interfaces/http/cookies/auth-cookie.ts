import type { CookieOptions } from 'express';
import { env } from '@config/env';
import { expiresInToMs } from '@utils/string';

export const AUTH_COOKIE_NAME = `${env.APP_NAME}_token`;

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
