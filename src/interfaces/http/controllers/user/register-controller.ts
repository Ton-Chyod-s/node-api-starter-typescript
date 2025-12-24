import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CreateUserUseCase } from '@usecases/user/create-use-case';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

const registerSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .transform((v) => v.trim()),
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export class RegisterController {
  constructor(private createUserUseCase: CreateUserUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.safeParse(req.body);

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
