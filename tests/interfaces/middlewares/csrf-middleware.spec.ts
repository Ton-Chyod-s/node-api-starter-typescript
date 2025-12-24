import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

async function loadCsrfMiddleware(csrfEnabled: boolean) {
  jest.resetModules();

  const keys = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'KEY_JWT',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'CORS_ORIGIN',
    'CSRF_ENABLED',
    'CSRF_COOKIE_NAME',
  ];

  for (const k of keys) delete process.env[k];

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT = 'test-secret';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  process.env.CSRF_ENABLED = csrfEnabled ? 'true' : 'false';
  process.env.CSRF_COOKIE_NAME = 'csrfToken';

  const mod =
    (await import('@interfaces/http/middlewares/csrf-middleware')) as typeof import('@interfaces/http/middlewares/csrf-middleware');

  return mod.csrfMiddleware;
}

const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    cookie: jest.fn(),
  };

  return res as unknown as Response;
};

describe('csrf-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve aceitar quando CSRF está habilitado e header bate com o cookie', async () => {
    const timingSpy = jest.spyOn(crypto, 'timingSafeEqual');
    const middleware = await loadCsrfMiddleware(true);

    const token = 'a'.repeat(64);

    const req = {
      method: 'POST',
      originalUrl: '/api/users',
      cookies: {
        [AUTH_COOKIE_NAME]: 'auth-cookie',
        csrfToken: token,
      },
      headers: {
        'x-csrf-token': token,
      },
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(timingSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando CSRF está habilitado e o header está ausente', async () => {
    const middleware = await loadCsrfMiddleware(true);

    const token = 'b'.repeat(64);

    const req = {
      method: 'POST',
      originalUrl: '/api/users',
      cookies: {
        [AUTH_COOKIE_NAME]: 'auth-cookie',
        csrfToken: token,
      },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.FORBIDDEN,
        message: 'Invalid or missing CSRF token',
        code: 'CSRF_INVALID_TOKEN',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
