import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

import { AppError } from '@utils/app-error';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { env } from '@config/env';
import { logger } from '@infrastructure/logging/logger';

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
        undefined,
        undefined,
        'RESOURCE_CONFLICT',
      );
      return res.status(status).json(response);
    }
  }

  if (err instanceof AppError) {
    const response = createResponse(
      err.statusCode,
      err.message,
      err.data,
      undefined,
      err.code,
    );
    return res.status(err.statusCode).json(response);
  }

  const isProd = env.NODE_ENV === 'production';

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

  if (env.NODE_ENV !== 'test') {
    logger.error(`${status} - ${req.method} ${req.originalUrl} - ${message}`, {
      status,
      method: req.method,
      url: req.originalUrl,
      ...((!isProd && legacy.stack) ? { stack: legacy.stack } : {}),
    });
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
