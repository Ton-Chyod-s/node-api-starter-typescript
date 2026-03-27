import { Request, Response, NextFunction } from 'express';
import { ListUsersUseCase } from '@usecases/user/list-users-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { z } from 'zod';

const listUsersQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
});

export class ListUsersController {
  constructor(private readonly listUsersUseCase: ListUsersUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listUsersQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        const response = createResponse(
          httpStatusCodes.BAD_REQUEST,
          'Invalid query parameters',
          {
            issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
          },
          undefined,
          'VALIDATION_ERROR',
        );
        return res.status(httpStatusCodes.BAD_REQUEST).json(response);
      }

      const result = await this.listUsersUseCase.execute(parsed.data);

      const response = createResponse(httpStatusCodes.OK, 'Users retrieved successfully', result);

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
