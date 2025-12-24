import type { Request, Response, NextFunction, Application } from 'express';

jest.mock('express-rate-limit', () => {
  return () => (_req: Request, _res: Response, next: NextFunction) => next();
});

async function loadCreateApp(envVars: Record<string, string | undefined>) {
  jest.resetModules();

  const keys = [
    'NODE_ENV',
    'DATABASE_URL',
    'KEY_JWT',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'CORS_ORIGIN',
    'SENTRY_DSN',
  ] as const;

  for (const k of keys) delete process.env[k];

  for (const [key, value] of Object.entries(envVars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT ??= 'test-secret';
  process.env.JWT_ISSUER ??= 'test-issuer';
  process.env.JWT_AUDIENCE ??= 'test-audience';
  process.env.SENTRY_DSN = '';

  const mod = (await import('@main/app')) as typeof import('@main/app');
  return mod.createApp as () => Application;
}

describe('createApp', () => {
  it('deve falhar quando CORS_ORIGIN não estiver definido', async () => {
    await expect(loadCreateApp({ CORS_ORIGIN: '' })).rejects.toThrow(/CORS_ORIGIN/i);
  });

  it('deve falhar quando CORS_ORIGIN="*" com credentials=true', async () => {
    const createApp = await loadCreateApp({ CORS_ORIGIN: '*' });
    expect(() => createApp()).toThrow(/CORS_ORIGIN/i);
  });

  it('deve criar o app quando CORS_ORIGIN for válido', async () => {
    const createApp = await loadCreateApp({ CORS_ORIGIN: 'http://localhost:3000' });
    const app = createApp();

    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
