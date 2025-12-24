import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '@domain/services/token-service';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

export function makeAuthMiddleware(tokenService: ITokenService) {
  return (req: Request, res: Response, next: NextFunction) => {
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

      const bearerToken = bearerCandidate ? bearerCandidate : undefined;

      const token = bearerToken ?? cookieToken;

      if (!token) {
        return unauthorized();
      }

      try {
        const payload = tokenService.verify(token);
        req.user = { id: payload.sub, role: payload.role };
        return next();
      } catch {
        return unauthorized();
      }
    } catch (err) {
      return next(err);
    }
  };
}
