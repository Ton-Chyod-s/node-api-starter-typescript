import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { env } from '@config/env';

export const OAUTH_STATE_COOKIE = 'oauth_state';

export class GoogleAuthController {
  private readonly client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );
  }

  handle(_req: Request, res: Response, _next: NextFunction) {
    const state = crypto.randomBytes(16).toString('hex');

    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: (env.COOKIE_SECURE ?? env.NODE_ENV === 'production') === true,
      maxAge: 5 * 60 * 1000, // 5 minutos
      path: '/',
    });

    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state,
    });

    return res.redirect(url);
  }
}
