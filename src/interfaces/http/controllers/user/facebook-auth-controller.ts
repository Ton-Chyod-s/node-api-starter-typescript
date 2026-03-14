import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '@config/env';

export const FACEBOOK_OAUTH_STATE_COOKIE = 'facebook_oauth_state';

export class FacebookAuthController {
  handle(_req: Request, res: Response, _next: NextFunction) {
    const state = crypto.randomBytes(16).toString('hex');

    res.cookie(FACEBOOK_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: (env.COOKIE_SECURE ?? env.NODE_ENV === 'production') === true,
      maxAge: 5 * 60 * 1000,
      path: '/',
    });

    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID!,
      redirect_uri: env.FACEBOOK_REDIRECT_URI!,
      scope: 'email,public_profile',
      response_type: 'code',
      state,
    });

    return res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
  }
}
