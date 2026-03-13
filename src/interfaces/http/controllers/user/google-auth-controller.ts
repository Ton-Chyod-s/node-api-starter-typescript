import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '@config/env';

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
    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
    });

    return res.redirect(url);
  }
}
