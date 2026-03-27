import type { CookieOptions } from 'express';
import { env } from '@config/env';
import { expiresInToMs } from '@utils/string';

export const AUTH_COOKIE_NAME = `${env.APP_NAME}_token`;
export const REFRESH_COOKIE_NAME = `${env.APP_NAME}_refresh`;

function baseCookieOptions(): Pick<CookieOptions, 'secure' | 'sameSite'> {
  const secure = (env.COOKIE_SECURE ?? env.NODE_ENV === 'production') === true;
  const sameSite = env.COOKIE_SAMESITE ?? 'lax';

  if (sameSite === 'none' && !secure) {
    throw new Error('COOKIE_SAMESITE=none exige COOKIE_SECURE=true (HTTPS).');
  }

  return { secure, sameSite };
}

export function authCookieOptions(): CookieOptions {
  const base = baseCookieOptions();
  const maxAge = expiresInToMs(env.JWT_EXPIRES_IN);

  return {
    httpOnly: true,
    path: '/',
    ...base,
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export function refreshCookieOptions(): CookieOptions {
  const base = baseCookieOptions();

  return {
    httpOnly: true,
    path: '/api/auth/refresh',
    ...base,
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  };
}
