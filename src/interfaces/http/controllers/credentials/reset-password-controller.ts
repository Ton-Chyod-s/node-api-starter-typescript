import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(72),
});

export class ResetPasswordController {
  constructor(private readonly useCase: ResetPasswordUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);

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

      await this.useCase.execute(parsed.data);

      const response = createResponse(httpStatusCodes.OK, 'Password reset successful');
      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
