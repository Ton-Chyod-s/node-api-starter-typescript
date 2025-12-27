import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { env } from '@config/env';
import { AppError } from '@utils/app-error';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';

function isBodyParserJsonError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) return false;

  const maybe = err as unknown as { type?: unknown };
  return typeof maybe.type === 'string' && maybe.type.includes('entity.parse.failed');
}

function isJwtError(err: unknown): boolean {
  return (
    err instanceof JsonWebTokenError ||
    err instanceof TokenExpiredError ||
    err instanceof NotBeforeError
  );
}

function isAppErrorLike(
  err: unknown,
): err is { statusCode: number; message: string; code: string; data?: unknown } {
  if (!err || typeof err !== 'object') return false;

  const maybe = err as Record<string, unknown>;

  return (
    typeof maybe.statusCode === 'number' &&
    Number.isInteger(maybe.statusCode) &&
    typeof maybe.message === 'string' &&
    maybe.message.length > 0 &&
    typeof maybe.code === 'string' &&
    maybe.code.trim().length > 0
  );
}

export function errorMiddleware(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (isBodyParserJsonError(err)) {
    const status = httpStatusCodes.BAD_REQUEST;
    const response = createResponse(
      status,
      'Invalid JSON body',
      undefined,
      undefined,
      'INVALID_JSON',
    );
    return res.status(status).json(response);
  }

  if (err instanceof ZodError) {
    const status = httpStatusCodes.BAD_REQUEST;
    const response = createResponse(
      status,
      'Invalid data',
      { issues: err.issues },
      undefined,
      'VALIDATION_ERROR',
    );
    return res.status(status).json(response);
  }

  if (isJwtError(err)) {
    const status = httpStatusCodes.UNAUTHORIZED;
    const response = createResponse(status, 'Unauthorized', undefined, undefined, 'UNAUTHORIZED');
    return res.status(status).json(response);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const status = httpStatusCodes.CONFLICT;
      const response = createResponse(
        status,
        'Resource already exists',
        err.meta ? { meta: err.meta } : undefined,
        undefined,
        'RESOURCE_CONFLICT',
      );
      return res.status(status).json(response);
    }
  }

  const isProd = env.NODE_ENV === 'production';

  const isErrorWithAppShape = (e: unknown): e is Error & { statusCode: number; code: string } => {
    if (!(e instanceof Error)) return false;
    if (!e || typeof e !== 'object') return false;

    const maybe = e as unknown as Record<string, unknown>;
    const statusCode = maybe.statusCode;
    const code = maybe.code;

    return (
      typeof statusCode === 'number' &&
      Number.isInteger(statusCode) &&
      typeof code === 'string' &&
      code.trim().length > 0
    );
  };

  if (err instanceof AppError || isAppErrorLike(err) || isErrorWithAppShape(err)) {
    const appErr = err as AppError & { data?: unknown; code?: string; statusCode?: number };
    const status = appErr.statusCode ?? httpStatusCodes.INTERNAL_SERVER_ERROR;
    const code = appErr.code ?? 'UNEXPECTED_ERROR';
    const response = createResponse(status, appErr.message, appErr.data, undefined, code);
    return res.status(status).json(response);
  }

  const legacy = err as Error & { statusCode?: number; data?: unknown; code?: unknown };

  const rawStatus =
    typeof legacy.statusCode === 'number' && Number.isInteger(legacy.statusCode)
      ? legacy.statusCode
      : undefined;

  const status =
    rawStatus && rawStatus >= 400 && rawStatus < 600
      ? rawStatus
      : httpStatusCodes.INTERNAL_SERVER_ERROR;

  const isServerError = status >= 500 && status < 600;

  const message =
    isServerError && isProd ? 'Internal server error' : legacy.message || 'Internal server error';

  const logMessage = `[${RED}ERROR${RESET}] ${status} - ${req.method} ${req.originalUrl} - ${message}`;

  if (env.NODE_ENV !== 'test') {
    console.error(logMessage);
    if (!isProd && legacy.stack) {
      console.error(legacy.stack);
    }
  }

  const legacyCode =
    typeof legacy.code === 'string' && legacy.code.trim().length > 0
      ? legacy.code.trim()
      : undefined;

  const response = createResponse(
    status,
    message,
    isServerError && isProd ? undefined : legacy.data,
    undefined,
    isServerError ? 'INTERNAL_SERVER_ERROR' : (legacyCode ?? 'UNEXPECTED_ERROR'),
  );

  return res.status(status).json(response);
}
