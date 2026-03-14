async function loadEnv(envVars: Record<string, string | undefined>) {
  jest.resetModules();

  const keys = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'KEY_JWT',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'JWT_EXPIRES_IN',
    'CORS_ORIGIN',
    'SENTRY_DSN',
    'SENTRY_TRACES_SAMPLE_RATE',
    'TRUST_PROXY',
    'COOKIE_SAMESITE',
    'COOKIE_SECURE',
    'CSRF_ENABLED',
    'CSRF_COOKIE_NAME',
    'FRONTEND_URL',
    'PASSWORD_RESET_PATH',
    'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    'SEED_ADMIN_EMAIL',
    'SEED_ADMIN_PASSWORD',
    'SEED_ADMIN_NAME',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'EMAIL_FROM',
    'REDIS_URL',
    'USER_CACHE_TTL_SECONDS',
    'APP_NAME',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ] as const;

  for (const k of keys) delete process.env[k];

  for (const [key, value] of Object.entries(envVars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT ??= 'test-secret';
  process.env.JWT_ISSUER ??= 'test-issuer';
  process.env.JWT_AUDIENCE ??= 'test-audience';
  process.env.CORS_ORIGIN ??= 'http://localhost:3000';
  process.env.NODE_ENV = envVars.NODE_ENV ?? 'test';

  const mod = (await import('@config/env')) as typeof import('@config/env');
  return mod.env;
}

describe('env parsing', () => {
  it('deve transformar JWT_EXPIRES_IN numérico em number', async () => {
    const env = await loadEnv({ JWT_EXPIRES_IN: '3600' });
    expect(env.JWT_EXPIRES_IN).toBe(3600);
  });

  it('deve aceitar JWT_EXPIRES_IN no formato ms (ex: 2h)', async () => {
    const env = await loadEnv({ JWT_EXPIRES_IN: '2h' });
    expect(env.JWT_EXPIRES_IN).toBe('2h');
  });

  it('deve lançar erro para JWT_EXPIRES_IN inválido', async () => {
    await expect(loadEnv({ JWT_EXPIRES_IN: 'abc' })).rejects.toThrow('JWT_EXPIRES_IN inválido');
  });

  it('deve transformar TRUST_PROXY em boolean', async () => {
    const envTrue = await loadEnv({ TRUST_PROXY: 'true' });
    expect(envTrue.TRUST_PROXY).toBe(true);

    const envFalse = await loadEnv({ TRUST_PROXY: 'false' });
    expect(envFalse.TRUST_PROXY).toBe(false);
  });

  it('deve transformar TRUST_PROXY em number quando informado como inteiro', async () => {
    const env = await loadEnv({ TRUST_PROXY: '2' });
    expect(env.TRUST_PROXY).toBe(2);
  });

  it('deve lançar erro para TRUST_PROXY inválido', async () => {
    await expect(loadEnv({ TRUST_PROXY: 'abc' })).rejects.toThrow('TRUST_PROXY inválido');
  });

  it('deve exigir REDIS_URL em production', async () => {
    await expect(loadEnv({ NODE_ENV: 'production', REDIS_URL: '' })).rejects.toThrow(/REDIS_URL/i);
  });

  it('deve aceitar production quando REDIS_URL estiver definida', async () => {
    const env = await loadEnv({
      NODE_ENV: 'production',
      REDIS_URL: 'redis://localhost:6379',
    });

    expect(env.NODE_ENV).toBe('production');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });
});
