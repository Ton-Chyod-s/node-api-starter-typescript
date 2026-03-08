import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ICacheService } from '@domain/services/cache-service';
import { logger } from '@infrastructure/logging/logger';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@interfaces/http/cookies/auth-cookie';
import { userCacheKey } from '@utils/cache-keys';

export class LogoutController {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cacheService: ICacheService,
  ) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (userId) {
        await this.userRepository.incrementTokenVersion(userId);

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
      const response = createResponse(httpStatusCodes.OK, 'Logout successful');
      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
