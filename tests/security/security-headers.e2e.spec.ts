import type { Express } from 'express';

jest.setTimeout(15000);

function startServer(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
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

async function loadApp(extraEnv: Record<string, string | undefined> = {}) {
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
  ];
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
    ...extraEnv,
  });

  const { createApp } = (await import('@main/app')) as typeof import('@main/app');
  return createApp() as unknown as Express;
}

describe('Security headers (helmet)', () => {
  it('não deve expor x-powered-by e deve enviar headers básicos do helmet', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/api/auth/csrf`);
      expect(res.status).toBe(200);

      expect(res.headers.get('x-powered-by')).toBeNull();
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');

      expect(res.headers.get('x-frame-options')).not.toBeNull();
    } finally {
      await close();
    }
  });
});
