import type { Express } from 'express';

jest.setTimeout(30000);

async function startServer(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
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

async function loadApp(): Promise<Express> {
  jest.resetModules();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT = 'test-secret';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.SENTRY_DSN = '';
  process.env.TRUST_PROXY = '0';

  process.env.CSRF_ENABLED = 'false';

  const { createApp } = (await import('@main/app')) as typeof import('@main/app');
  return createApp() as unknown as Express;
}

describe('Security: payload limit', () => {
  it('deve responder 413 quando o JSON passa de 10kb', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      const bigBody = { padding: 'x'.repeat(12_000) };

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bigBody),
      });

      expect(res.status).toBe(413);
    } finally {
      await close();
    }
  });
});
