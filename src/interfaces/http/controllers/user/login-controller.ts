import { Request, Response, NextFunction } from 'express';
import { LoginTokenUseCase } from '@usecases/user/login-token-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '@interfaces/http/cookies/auth-cookie';
import { loginCredentialsSchema } from '@domain/dtos/shared/login-schema';

export class LoginController {
  constructor(private readonly loginTokenUseCase: LoginTokenUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginCredentialsSchema.safeParse(req.body);
      if (!parsed.success) {
        const response = createResponse(
          httpStatusCodes.BAD_REQUEST,
          'Invalid request body',
          {
            issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
          },
          undefined,
          'VALIDATION_ERROR',
        );
        return res.status(httpStatusCodes.BAD_REQUEST).json(response);
      }

      const result = await this.loginTokenUseCase.execute(parsed.data);

      res.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions());
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

      const response = createResponse(httpStatusCodes.OK, 'Login successful', {
        user: result.user,
      });

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
