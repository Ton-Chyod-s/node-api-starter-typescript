import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@interfaces/http/cookies/auth-cookie';

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export class LoginController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
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
