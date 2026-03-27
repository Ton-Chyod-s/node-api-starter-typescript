import { Request, Response, NextFunction } from 'express';
import { UpdateUserRoleUseCase } from '@usecases/user/update-role-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { z } from 'zod';

const updateRoleBodySchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export class UpdateRoleController {
  constructor(private readonly updateUserRoleUseCase: UpdateUserRoleUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateRoleBodySchema.safeParse(req.body);

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

      const targetUserId = req.params.id;

      const result = await this.updateUserRoleUseCase.execute({
        targetUserId,
        role: parsed.data.role,
      });

      const response = createResponse(httpStatusCodes.OK, 'User role updated successfully', result);

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
