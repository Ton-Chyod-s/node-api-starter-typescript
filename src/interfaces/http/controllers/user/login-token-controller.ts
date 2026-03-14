import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token-repository';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { loginCredentialsSchema } from '@domain/dtos/shared/login-schema';
import { sha256Hex } from '@utils/hash';

export class LoginTokenController {
  constructor(
    private loginUseCase: LoginUseCase,
    private refreshTokenRepository: IRefreshTokenRepository,
    private refreshTokenTtlMs: number,
  ) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginCredentialsSchema.safeParse(req.body);

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

      const rawRefreshToken = crypto.randomBytes(64).toString('hex');
      const tokenHash = sha256Hex(rawRefreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

      await this.refreshTokenRepository.replaceTokenForUser(result.user.id, {
        tokenHash,
        expiresAt,
      });

      const response = createResponse(httpStatusCodes.OK, 'Login successful', {
        access_token: result.token,
        refresh_token: rawRefreshToken,
        user: result.user,
      });

      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
