import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { GoogleLoginUseCase } from '@usecases/user/google-login-use-case';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@interfaces/http/cookies/auth-cookie';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AppError } from '@utils/app-error';
import { env } from '@config/env';

export class GoogleCallbackController {
  private readonly client: OAuth2Client;

  constructor(private readonly googleLoginUseCase: GoogleLoginUseCase) {
    this.client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );
  }

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query['code'];

      if (!code || typeof code !== 'string') {
        throw AppError.badRequest('Missing authorization code', 'AUTH_MISSING_CODE');
      }

      const { tokens } = await this.client.getToken(code);

      if (!tokens.id_token) {
        throw AppError.unauthorized('Google did not return an ID token', 'AUTH_GOOGLE_NO_ID_TOKEN');
      }

      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || !payload.name) {
        throw AppError.unauthorized('Invalid Google token payload', 'AUTH_GOOGLE_INVALID_PAYLOAD');
      }

      const result = await this.googleLoginUseCase.execute({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
      });

      res.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions());

      if (env.FRONTEND_URL) {
        return res.redirect(env.FRONTEND_URL);
      }

      return res.status(httpStatusCodes.OK).json(
        createResponse(httpStatusCodes.OK, 'Google login successful', { user: result.user }),
      );
    } catch (err) {
      return next(err);
    }
  }
}
