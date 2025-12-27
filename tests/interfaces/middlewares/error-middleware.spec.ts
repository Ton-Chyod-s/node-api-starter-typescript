import type { Request, Response, NextFunction } from 'express';

import { httpStatusCodes } from '@utils/httpConstants';
import { AppError } from '@utils/app-error';

const makeReq = (overrides: Partial<Request> = {}) =>
  ({
    method: 'GET',
    originalUrl: '/api/test',
    ...overrides,
  }) as unknown as Request;

const makeRes = (headersSent = false) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    headersSent,
  };

  return res as unknown as Response;
};

const makeNext = () => jest.fn() as unknown as NextFunction;

function setBaseEnv(nodeEnv: 'test' | 'development' | 'production' = 'test') {
  process.env.NODE_ENV = nodeEnv;

  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT = process.env.KEY_JWT ?? 'test-secret';
  process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'test-issuer';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'test-audience';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  process.env.SENTRY_DSN = '';
}

async function loadErrorMiddleware(nodeEnv: 'test' | 'development' | 'production' = 'test') {
  jest.resetModules();
  setBaseEnv(nodeEnv);

  const mod = await import('@interfaces/http/middlewares/error-middleware');
  return mod.errorMiddleware;
}

describe('errorMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve chamar next(err) se headersSent for true', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');
    const err = new Error('Qualquer erro');

    const req = makeReq();
    const res = makeRes(true);
    const next = makeNext();

    errorMiddleware(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('deve retornar 500 e usar a mensagem do erro quando o erro não tiver statusCode', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');
    const err = new Error('Algo quebrou');

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: err.message,
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: httpStatusCodes.INTERNAL_SERVER_ERROR,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve usar statusCode customizado quando presente no erro (4xx/5xx)', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');
    const err = new AppError({
      statusCode: 409,
      message: 'User already exists',
      code: 'USER_ALREADY_EXISTS',
    });

    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User already exists',
        code: 'USER_ALREADY_EXISTS',
        statusCode: 409,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 400 quando o body vier com JSON inválido (body-parser)', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');

    const err = new SyntaxError('Unexpected token') as unknown as { type?: string } & Error;
    err.type = 'entity.parse.failed';

    const req = makeReq({ method: 'POST', originalUrl: '/api/auth/register' });
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err as Error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.BAD_REQUEST,
        message: 'Invalid JSON body',
        code: 'INVALID_JSON',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 400 e incluir issues quando for ZodError', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');

    const { z } = await import('zod');

    const schema = z.object({ email: z.string().email() });
    let err: unknown;
    try {
      schema.parse({ email: 'nao-email' });
    } catch (e) {
      err = e;
    }

    const req = makeReq({ method: 'POST', originalUrl: '/api/auth/register' });
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err as Error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.BAD_REQUEST,
        message: 'Invalid data',
        code: 'VALIDATION_ERROR',
        data: expect.objectContaining({ issues: expect.any(Array) }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando for erro de JWT', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');

    const jwt = await import('jsonwebtoken');
    const err = new jwt.JsonWebTokenError('invalid token');

    const req = makeReq({ method: 'GET', originalUrl: '/api/auth/me' });
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.UNAUTHORIZED,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 409 quando for Prisma P2002 (unique constraint)', async () => {
    const errorMiddleware = await loadErrorMiddleware('test');

    const { Prisma } = await import('@prisma/client');

    type PrismaKnownRequestErrorCtor = new (
      message: string,
      options: { code: string; clientVersion: string; meta?: unknown },
    ) => Error & { code: string; meta?: unknown };

    const PrismaClientKnownRequestError =
      Prisma.PrismaClientKnownRequestError as unknown as PrismaKnownRequestErrorCtor;

    const err = new PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: '7.2.0',
      meta: { target: ['email'] },
    });

    const req = makeReq({ method: 'POST', originalUrl: '/api/auth/register' });
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err as Error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.CONFLICT);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.CONFLICT,
        message: 'Resource already exists',
        code: 'RESOURCE_CONFLICT',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('em produção, deve ocultar a mensagem original para erros 5xx', async () => {
    const errorMiddleware = await loadErrorMiddleware('production');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const err = new Error('Segredo interno');

    const req = makeReq({ method: 'GET', originalUrl: '/api/health' });
    const res = makeRes();
    const next = makeNext();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      }),
    );

    consoleSpy.mockRestore();
  });
});
