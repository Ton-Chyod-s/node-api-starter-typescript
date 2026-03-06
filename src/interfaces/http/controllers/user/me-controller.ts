import { Request, Response, NextFunction } from 'express';
import { MeUseCase } from '@usecases/user/me-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AppError } from '@utils/app-error';

export class MeController {
  constructor(private readonly meUseCase: MeUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        const response = createResponse(
          httpStatusCodes.UNAUTHORIZED,
          'Unauthorized',
          undefined,
          undefined,
          'UNAUTHORIZED',
        );
        return res.status(httpStatusCodes.UNAUTHORIZED).json(response);
      }

      const user = await this.meUseCase.execute(req.user.id);

      const response = createResponse(httpStatusCodes.OK, 'Authenticated', {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
