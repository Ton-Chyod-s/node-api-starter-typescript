import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '@domain/services/token-service';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ICacheService } from '@domain/services/cache-service';
import { logger } from '@infrastructure/logging/logger';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';
import { userCacheKey } from '@utils/cache-keys';

type CachedUser = {
  id: string;
  role: string;
  tokenVersion: number;
};

const USER_CACHE_TTL = 60;

export function makeAuthMiddleware(
  tokenService: ITokenService,
  userRepository: IUserRepository,
  cacheService: ICacheService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const unauthorized = () => {
      const response = createResponse(
        httpStatusCodes.UNAUTHORIZED,
        'Unauthorized',
        undefined,
        undefined,
        'UNAUTHORIZED',
      );
      return res.status(httpStatusCodes.UNAUTHORIZED).json(response);
    };

    try {
      const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
      const header = req.headers.authorization;

      const bearerCandidate = header?.startsWith('Bearer ')
        ? header.slice('Bearer '.length).trim()
        : undefined;

      const token = bearerCandidate ?? cookieToken;

      if (!token) {
        return unauthorized();
      }

      let payload;
      try {
        payload = tokenService.verify(token);
      } catch {
        return unauthorized();
      }

      const cacheKey = userCacheKey(payload.sub);

      let cached: CachedUser | null = null;

      try {
        cached = await cacheService.get<CachedUser>(cacheKey);
      } catch (err) {
        logger.warn('Falha ao ler sessão do cache. Seguindo com fallback para banco.', {
          userId: payload.sub,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (!cached) {
        const user = await userRepository.findById(payload.sub);
        if (!user) return unauthorized();

        cached = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };

        try {
          await cacheService.set(cacheKey, cached, USER_CACHE_TTL);
        } catch (err) {
          logger.warn('Falha ao salvar sessão no cache. Requisição seguirá normalmente.', {
            userId: user.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (cached.tokenVersion !== payload.tokenVersion) {
        return unauthorized();
      }

      req.user = {
        id: cached.id,
        role: cached.role as 'USER' | 'ADMIN',
        tokenVersion: cached.tokenVersion,
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
