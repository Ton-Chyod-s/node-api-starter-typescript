import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RefreshTokenUseCase } from '@usecases/user/refresh-token-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '@interfaces/http/cookies/auth-cookie';

const refreshTokenBodySchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});

export class RefreshTokenController {
  constructor(private readonly refreshTokenUseCase: RefreshTokenUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

      if (cookieToken) {
        const result = await this.refreshTokenUseCase.execute({ refreshToken: cookieToken });

        res.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions());
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

        return res
          .status(httpStatusCodes.OK)
          .json(createResponse(httpStatusCodes.OK, 'Token refreshed'));
      }

      const parsed = refreshTokenBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(httpStatusCodes.BAD_REQUEST).json(
          createResponse(
            httpStatusCodes.BAD_REQUEST,
            'Invalid request body',
            {
              issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
            },
            undefined,
            'VALIDATION_ERROR',
          ),
        );
      }

      const result = await this.refreshTokenUseCase.execute({
        refreshToken: parsed.data.refresh_token,
      });

      return res.status(httpStatusCodes.OK).json(
        createResponse(httpStatusCodes.OK, 'Token refreshed', {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        }),
      );
    } catch (err) {
      return next(err);
    }
  }
}
