import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { ForgotPasswordUseCase } from '@usecases/credentials/forgot-password-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
});

export class ForgotPasswordController {
  constructor(private readonly useCase: ForgotPasswordUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);

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

      await this.useCase.execute(parsed.data.email);

      const response = createResponse(
        httpStatusCodes.OK,
        'If the email exists, you will receive instructions to reset your password',
      );

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
