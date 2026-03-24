import { Request, Response, NextFunction } from 'express';
import { LoginTokenUseCase } from '@usecases/user/login-token-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { loginCredentialsSchema } from '@domain/dtos/shared/login-schema';

export class LoginTokenController {
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

      const response = createResponse(httpStatusCodes.OK, 'Login successful', {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: result.user,
      });

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}

