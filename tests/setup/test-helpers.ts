import type { Express } from 'express';
import type { Socket } from 'node:net';

export type FetchLikeResponse = {
  headers: {
    get: (name: string) => string | null;
    getSetCookie?: () => string[];
  };
};

export async function loadApp(): Promise<Express> {
  jest.resetModules();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT = 'test-secret';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.SENTRY_DSN = '';
  process.env.TRUST_PROXY = '0';
  process.env.CSRF_ENABLED = 'true';
  process.env.CSRF_COOKIE_NAME = 'csrfToken';
  process.env.COOKIE_SECURE = 'false';
  process.env.COOKIE_SAMESITE = 'lax';
  process.env.SMTP_HOST = 'smtp.local';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASSWORD = 'pass';
  process.env.SMTP_PORT = '465';
  process.env.FRONTEND_URL = 'http://frontend.local';
  process.env.PASSWORD_RESET_PATH = '/reset-password/{token}';
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = '15';

  const { createApp } = (await import('@main/app')) as typeof import('@main/app');
  return createApp() as unknown as Express;
}

export function startServer(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const sockets = new Set<Socket>();
      server.on('connection', (socket: Socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
      });

      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            for (const s of sockets) s.destroy();
            server.close(() => r());
          }),
      });
    });
  });
}

export function getSetCookies(res: FetchLikeResponse): string[] {
  const headers = res.headers;
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

export function pickCookie(setCookies: string[], cookieName: string): string | null {
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    if (first.startsWith(`${cookieName}=`)) return first;
  }
  return null;
}

export async function drain(res: Response): Promise<void> {
  try {
    await res.arrayBuffer();
  } catch {
    try {
      await res.body?.cancel();
    } catch {}
  }
}
