import type { Express } from 'express';
import type { Socket } from 'node:net';

jest.setTimeout(30000);

type StartedServer = { baseUrl: string; close: () => Promise<void> };

function startServer(app: Express): Promise<StartedServer> {
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

type HeadersWithGetSetCookie = Headers & { getSetCookie?: () => string[] };

function getSetCookies(res: Response): string[] {
  const headers = res.headers as HeadersWithGetSetCookie;

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function pickCookie(setCookies: string[], cookieName: string): string | null {
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    if (first.startsWith(`${cookieName}=`)) return first;
  }
  return null;
}

async function drain(res: Response) {
  try {
    await res.arrayBuffer();
  } catch {
    try {
      await res.body?.cancel();
    } catch {}
  }
}

async function loadApp(extraEnv: Record<string, string | undefined> = {}): Promise<Express> {
  jest.resetModules();

  const keys = [
    'NODE_ENV',
    'DATABASE_URL',
    'KEY_JWT',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'CORS_ORIGIN',
    'SENTRY_DSN',
    'CSRF_ENABLED',
    'CSRF_COOKIE_NAME',
    'COOKIE_SECURE',
    'COOKIE_SAMESITE',
  ] as const;

  for (const k of keys) delete process.env[k];

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    KEY_JWT: 'test-secret',
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    CORS_ORIGIN: 'http://localhost:3000',
    SENTRY_DSN: '',
    CSRF_ENABLED: 'true',
    CSRF_COOKIE_NAME: 'csrfToken',
    COOKIE_SECURE: 'false',
    COOKIE_SAMESITE: 'lax',
    ...extraEnv,
  });

  const { createApp } = (await import('@main/app')) as typeof import('@main/app');
  return createApp() as unknown as Express;
}

type CsrfResponse = { data?: { csrfToken?: string } };

describe('CSRF (HTTP)', () => {
  it('bloqueia POST /auth/login sem header CSRF e libera quando header e cookie batem', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, {
        headers: { connection: 'close' },
      });
      expect(csrfRes.status).toBe(200);

      const csrfBody = (await csrfRes.json()) as CsrfResponse;
      const token = csrfBody.data?.csrfToken;
      expect(typeof token).toBe('string');

      const cookies = getSetCookies(csrfRes);
      const csrfCookie = pickCookie(cookies, 'csrfToken');
      expect(csrfCookie).not.toBeNull();

      if (!csrfCookie || !token) throw new Error('CSRF cookie/token ausente');

      await drain(csrfRes);

      const noHeader = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: csrfCookie,
          connection: 'close',
        },
        body: JSON.stringify({}),
      });
      await drain(noHeader);
      expect(noHeader.status).toBe(403);

      const withHeader = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: csrfCookie,
          'x-csrf-token': token,
          connection: 'close',
        },
        body: JSON.stringify({}),
      });
      await drain(withHeader);
      expect(withHeader.status).toBe(400);

      const bearerBypass = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test',
          connection: 'close',
        },
        body: JSON.stringify({}),
      });
      await drain(bearerBypass);
      expect(bearerBypass.status).toBe(400);
    } finally {
      await close();
    }
  });
});
