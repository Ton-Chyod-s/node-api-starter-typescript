import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export class LoginTokenController {
  constructor(private loginUseCase: LoginUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        const response = createResponse(
          httpStatusCodes.BAD_REQUEST,
          'Invalid request body',
          { issues: parsed.error.issues },
          undefined,
          'VALIDATION_ERROR',
        );
        return res.status(httpStatusCodes.BAD_REQUEST).json(response);
      }

      const result = await this.loginUseCase.execute(parsed.data);

      const response = createResponse(httpStatusCodes.OK, 'Login successful', {
        token: result.token,
        user: result.user,
      });

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
