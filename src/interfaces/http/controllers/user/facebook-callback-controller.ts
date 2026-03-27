import { Request, Response, NextFunction } from 'express';
import { FacebookLoginUseCase } from '@usecases/user/facebook-login-use-case';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '@interfaces/http/cookies/auth-cookie';
import { FACEBOOK_OAUTH_STATE_COOKIE } from '@interfaces/http/controllers/user/facebook-auth-controller';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { AppError } from '@utils/app-error';
import { env } from '@config/env';

export class FacebookCallbackController {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly facebookLoginUseCase: FacebookLoginUseCase) {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET || !env.FACEBOOK_REDIRECT_URI) {
      throw new Error(
        'Facebook OAuth não está configurado. Defina FACEBOOK_APP_ID, FACEBOOK_APP_SECRET e FACEBOOK_REDIRECT_URI.',
      );
    }

    this.appId = env.FACEBOOK_APP_ID;
    this.appSecret = env.FACEBOOK_APP_SECRET;
    this.redirectUri = env.FACEBOOK_REDIRECT_URI;
  }

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

      const tokenParams = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
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
        email?: string;
      };

      if (!facebookId || !email || !name) {
        throw AppError.unauthorized(
          'Invalid Facebook profile data',
          'AUTH_FACEBOOK_INVALID_PAYLOAD',
        );
      }

      const result = await this.facebookLoginUseCase.execute({ facebookId, email, name });

      res.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions());
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

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

