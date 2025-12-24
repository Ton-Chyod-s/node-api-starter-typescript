import type { Express } from 'express';

jest.setTimeout(30000);

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
    CSRF_ENABLED: 'false',
    ...extraEnv,
  });

  const { createApp } = (await import('@main/app')) as typeof import('@main/app');
  return createApp() as unknown as Express;
}

describe('Rate limit (HTTP)', () => {
  it('deve limitar /auth/login após 20 tentativas (429 na 21a)', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      let lastStatus = 0;

      for (let i = 0; i < 21; i++) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        });
        lastStatus = res.status;
      }

      expect(lastStatus).toBe(429);
    } finally {
      await close();
    }
  });

  it('deve limitar /auth/forgot-password após 10 tentativas (429 na 11a)', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      let lastStatus = 0;

      for (let i = 0; i < 11; i++) {
        const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        });
        lastStatus = res.status;
      }

      expect(lastStatus).toBe(429);
    } finally {
      await close();
    }
  });
});
