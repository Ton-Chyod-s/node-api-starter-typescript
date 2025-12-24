import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '@config/env';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

function safeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');

    if (aBuf.length !== bBuf.length) return false;

    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function csrfCookieOptions() {
  const secure = (env.COOKIE_SECURE ?? env.NODE_ENV === 'production') === true;
  const sameSite = env.COOKIE_SAMESITE ?? 'lax';

  if (sameSite === 'none' && !secure) {
    throw new Error('COOKIE_SAMESITE=none exige COOKIE_SECURE=true (HTTPS).');
  }

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
  } as const;
}

function csrfCookieName(): string {
  return env.CSRF_COOKIE_NAME ?? 'csrfToken';
}

export function ensureCsrfTokenCookie(req: Request, res: Response): string {
  const name = csrfCookieName();

  const existing = req.cookies?.[name] as string | undefined;
  if (existing) return existing;

  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(name, token, csrfCookieOptions());
  return token;
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!env.CSRF_ENABLED) return next();

  const method = req.method.toUpperCase();
  const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isUnsafe) return next();

  const url = req.originalUrl || '';

  if (url.startsWith('/api/auth/register')) return next();
  if (url.startsWith('/api/auth/forgot-password')) return next();
  if (url.startsWith('/api/auth/reset-password')) return next();

  if (url.startsWith('/api/health')) return next();
  if (url.startsWith('/api/auth/token')) return next();

  const authHeader = req.headers.authorization;
  const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
  if (hasBearer) return next();

  const hasAuthCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);

  const isLogin = url.startsWith('/api/auth/login');
  const isLogout = url.startsWith('/api/auth/logout');

  const isCookieAuthRoute = isLogin || (isLogout && hasAuthCookie);

  if (!hasAuthCookie && !isCookieAuthRoute) return next();

  const cookieToken = ensureCsrfTokenCookie(req, res);

  const headerTokenRaw = req.headers['x-csrf-token'] ?? req.headers['x-xsrf-token'];
  const headerToken = Array.isArray(headerTokenRaw) ? headerTokenRaw[0] : headerTokenRaw;

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    const response = createResponse(
      httpStatusCodes.FORBIDDEN,
      'Invalid or missing CSRF token',
      undefined,
      undefined,
      'CSRF_INVALID_TOKEN',
    );
    return res.status(httpStatusCodes.FORBIDDEN).json(response);
  }

  return next();
}
