import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '@domain/repositories/user-repository';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { ICacheService } from '@domain/services/cache-service';
import { logger } from '@infrastructure/logging/logger';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '@interfaces/http/cookies/auth-cookie';
import { userCacheKey } from '@utils/cache-keys';

export class LogoutController {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: ICacheService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (userId) {
        await this.userRepository.incrementTokenVersion(userId);

        await this.refreshTokenRepository.deleteByUserId(userId);

        try {
          await this.cacheService.del(userCacheKey(userId));
        } catch (err) {
          logger.warn('Falha ao invalidar sessão no cache durante logout.', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

      const response = createResponse(httpStatusCodes.OK, 'Logout successful');
      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
