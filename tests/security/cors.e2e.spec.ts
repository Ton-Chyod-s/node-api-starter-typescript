import type { Express } from 'express';

jest.setTimeout(45000);

type StartedServer = { baseUrl: string; close: () => Promise<void> };

function startServer(app: Express): Promise<StartedServer> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

async function loadApp(corsOrigin: string): Promise<Express> {
  jest.resetModules();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT = 'test-secret';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.CORS_ORIGIN = corsOrigin;
  process.env.SENTRY_DSN = '';
  process.env.TRUST_PROXY = '0';

  process.env.CSRF_ENABLED = 'false';

  const { createApp } = (await import('@main/app')) as typeof import('@main/app');
  return createApp() as unknown as Express;
}

async function preflight(baseUrl: string, origin: string): Promise<Response> {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
}

describe('Security: CORS', () => {
  it('preflight com origem permitida deve retornar allow-origin igual ao permitido e allow-credentials=true', async () => {
    const allowed = 'http://localhost:3000';
    const app = await loadApp(allowed);
    const { baseUrl, close } = await startServer(app);

    try {
      const res = await preflight(baseUrl, allowed);

      expect([200, 204]).toContain(res.status);
      expect(res.headers.get('access-control-allow-origin')).toBe(allowed);
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    } finally {
      await close();
    }
  });

  it('preflight com origem diferente não deve liberar allow-origin para a origem maliciosa', async () => {
    const allowed = 'http://localhost:3000';
    const evil = 'http://evil.local';
    const app = await loadApp(allowed);
    const { baseUrl, close } = await startServer(app);

    try {
      const res = await preflight(baseUrl, evil);

      expect([200, 204]).toContain(res.status);

      const allowOrigin = res.headers.get('access-control-allow-origin');

      expect(allowOrigin).not.toBe(evil);
    } finally {
      await close();
    }
  });
});
