import { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@interfaces/http/cookies/auth-cookie';
import { loginCredentialsSchema } from '@domain/dtos/shared/login-schema';

export class LoginController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

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

      const result = await this.loginUseCase.execute(parsed.data);

      res.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions());

      const response = createResponse(httpStatusCodes.OK, 'Login successful', {
        user: result.user,
      });

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
