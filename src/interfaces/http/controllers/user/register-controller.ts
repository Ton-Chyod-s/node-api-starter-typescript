import { Request, Response, NextFunction } from 'express';
import { CreateUserUseCase } from '@usecases/user/create-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { registerRequestSchema } from '@domain/dtos/user/register-request-dto';

export class RegisterController {
  constructor(private createUserUseCase: CreateUserUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerRequestSchema.safeParse(req.body);

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

      const user = await this.createUserUseCase.execute(parsed.data);

      const response = createResponse(httpStatusCodes.CREATED, 'User created successfully', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      return res.status(httpStatusCodes.CREATED).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
