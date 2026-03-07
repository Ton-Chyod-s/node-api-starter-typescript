import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '@domain/services/token-service';
import { IUserRepository } from '@domain/repositories/user-repository';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

export function makeAuthMiddleware(tokenService: ITokenService, userRepository: IUserRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const unauthorized = () => {
      const response = createResponse(
        httpStatusCodes.UNAUTHORIZED,
        'Unauthorized',
        undefined,
        undefined,
        'UNAUTHORIZED',
      );
      return res.status(httpStatusCodes.UNAUTHORIZED).json(response);
    };

    try {
      const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
      const header = req.headers.authorization;

      const bearerCandidate = header?.startsWith('Bearer ')
        ? header.slice('Bearer '.length).trim()
        : undefined;

      const token = bearerCandidate ?? cookieToken;

      if (!token) {
        return unauthorized();
      }

      let payload;
      try {
        payload = tokenService.verify(token);
      } catch {
        return unauthorized();
      }

      const user = await userRepository.findById(payload.sub);
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        return unauthorized();
      }

      req.user = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
