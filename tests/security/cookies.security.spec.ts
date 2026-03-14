import { loadApp, startServer, getSetCookies } from '../setup/test-helpers';

jest.setTimeout(30000);

function findCookie(cookies: string[], name: string): string | undefined {
  return cookies.find((c) => c.startsWith(`${name}=`));
}

describe('Security: cookies', () => {
  it('CSRF cookie deve existir, não deve ser HttpOnly, e deve ter SameSite e Path', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/api/auth/csrf`);
      expect(res.status).toBe(200);

      const cookies = getSetCookies(res as unknown as Parameters<typeof getSetCookies>[0]);
      const csrf = findCookie(cookies, 'csrfToken');
      expect(csrf).toBeDefined();

      const raw = String(csrf);
      expect(raw.toLowerCase()).toContain('samesite=lax');
      expect(raw).toContain('Path=/');
      expect(raw.toLowerCase()).not.toContain('httponly');
    } finally {
      await close();
    }
  });

  it('authCookieOptions deve gerar cookie HttpOnly e bloquear SameSite=none sem secure', async () => {
    jest.resetModules();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.KEY_JWT = 'test-secret';
    process.env.JWT_ISSUER = 'test-issuer';
    process.env.JWT_AUDIENCE = 'test-audience';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.SENTRY_DSN = '';
    process.env.TRUST_PROXY = '0';
    process.env.COOKIE_SECURE = 'false';
    process.env.COOKIE_SAMESITE = 'lax';

    const mod =
      (await import('@interfaces/http/cookies/auth-cookie')) as typeof import('@interfaces/http/cookies/auth-cookie');
    const opts = mod.authCookieOptions();

    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe('/');
    expect(opts.sameSite).toBe('lax');

    jest.resetModules();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.KEY_JWT = 'test-secret';
    process.env.JWT_ISSUER = 'test-issuer';
    process.env.JWT_AUDIENCE = 'test-audience';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.SENTRY_DSN = '';
    process.env.TRUST_PROXY = '0';
    process.env.COOKIE_SECURE = 'false';
    process.env.COOKIE_SAMESITE = 'none';

    const mod2 =
      (await import('@interfaces/http/cookies/auth-cookie')) as typeof import('@interfaces/http/cookies/auth-cookie');
    expect(() => mod2.authCookieOptions()).toThrow(/COOKIE_SAMESITE=none/i);
  });
});
