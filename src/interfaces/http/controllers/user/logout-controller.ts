import { Request, Response, NextFunction } from 'express';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@interfaces/http/cookies/auth-cookie';

export class LogoutController {
  handle(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
      const response = createResponse(httpStatusCodes.OK, 'Logout successful');
      return res.status(httpStatusCodes.OK).json(response);
    } catch (err) {
      return next(err);
    }
  }
}
