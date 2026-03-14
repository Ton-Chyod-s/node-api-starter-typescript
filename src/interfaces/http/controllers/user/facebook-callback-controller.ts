import { Request, Response, NextFunction } from 'express';
import { FacebookLoginUseCase } from '@usecases/user/facebook-login-use-case';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@interfaces/http/cookies/auth-cookie';
import { FACEBOOK_OAUTH_STATE_COOKIE } from '@interfaces/http/controllers/user/facebook-auth-controller';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AppError } from '@utils/app-error';
import { env } from '@config/env';

export class FacebookCallbackController {
  constructor(private readonly facebookLoginUseCase: FacebookLoginUseCase) {}

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const stateParam = req.query['state'];
      const stateCookie = req.cookies?.[FACEBOOK_OAUTH_STATE_COOKIE] as string | undefined;

      res.clearCookie(FACEBOOK_OAUTH_STATE_COOKIE, { path: '/' });

      if (
        !stateParam ||
        typeof stateParam !== 'string' ||
        !stateCookie ||
        stateParam !== stateCookie
      ) {
        throw AppError.forbidden('Invalid OAuth state', 'AUTH_OAUTH_STATE_MISMATCH');
      }

      const code = req.query['code'];
      if (!code || typeof code !== 'string') {
        throw AppError.badRequest('Missing authorization code', 'AUTH_MISSING_CODE');
      }

      // 1. Troca code por access_token
      const tokenParams = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID!,
        client_secret: env.FACEBOOK_APP_SECRET!,
        redirect_uri: env.FACEBOOK_REDIRECT_URI!,
        code,
      });

      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`,
      );

      if (!tokenRes.ok) {
        throw AppError.unauthorized(
          'Failed to exchange Facebook code',
          'AUTH_FACEBOOK_TOKEN_ERROR',
        );
      }

      const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string };

      // 2. Busca dados do usuário na Graph API
      const profileParams = new URLSearchParams({
        fields: 'id,name,email',
        access_token: accessToken,
      });

      const profileRes = await fetch(`https://graph.facebook.com/me?${profileParams}`);

      if (!profileRes.ok) {
        throw AppError.unauthorized(
          'Failed to fetch Facebook profile',
          'AUTH_FACEBOOK_PROFILE_ERROR',
        );
      }

      const { id: facebookId, name, email } = (await profileRes.json()) as {
        id: string;
        name: string;
        email: string;
      };

      if (!facebookId || !email || !name) {
        throw AppError.unauthorized(
          'Invalid Facebook profile data',
          'AUTH_FACEBOOK_INVALID_PAYLOAD',
        );
      }

      const result = await this.facebookLoginUseCase.execute({ facebookId, email, name });

      res.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions());

      if (env.FRONTEND_URL) {
        return res.redirect(env.FRONTEND_URL);
      }

      return res
        .status(httpStatusCodes.OK)
        .json(
          createResponse(httpStatusCodes.OK, 'Facebook login successful', { user: result.user }),
        );
    } catch (err) {
      return next(err);
    }
  }
}
