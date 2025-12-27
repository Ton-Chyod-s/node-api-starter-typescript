import type { Express } from 'express';
import type { User as UserEntity } from '@domain/entities/user';

jest.setTimeout(30000);

jest.mock('express-rate-limit', () => {
  return () => (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next();
});

jest.mock('@utils/password-generator', () => {
  return {
    hashPassword: jest.fn(async (password: string) => `hash:${password}`),
    verifyPassword: jest.fn(async (password: string, hash: string) => hash === `hash:${password}`),
  };
});

type ResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
};

type Store = {
  usersById: Map<string, UserEntity>;
  usersByEmail: Map<string, UserEntity>;
  resetTokens: Map<string, ResetTokenRecord>;
  sentMails: Array<{ to: string; subject: string; html: string }>;
  userSeq: number;
  tokenSeq: number;
};

type CsrfBody = {
  statusCode: number;
  message: string;
  data: {
    csrfToken: string;
  };
};

function getStore(): Store {
  const g = globalThis as unknown as { __authFlowStore?: Store };
  if (!g.__authFlowStore) {
    g.__authFlowStore = {
      usersById: new Map(),
      usersByEmail: new Map(),
      resetTokens: new Map(),
      sentMails: [],
      userSeq: 0,
      tokenSeq: 0,
    };
  }
  return g.__authFlowStore;
}

jest.mock('@infrastructure/repositories/user-repositories', () => {
  const { User } = jest.requireActual(
    '@domain/entities/user',
  ) as typeof import('@domain/entities/user');

  class PrismaUserRepository {
    async findByEmail(email: string) {
      const store = getStore();
      return store.usersByEmail.get(email) ?? null;
    }

    async findById(id: string) {
      const store = getStore();
      return store.usersById.get(id) ?? null;
    }

    async create(data: { name: string; email: string; passwordHash: string }) {
      const store = getStore();
      store.userSeq += 1;
      const id = `user-${store.userSeq}`;

      const user = new User({
        id,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: 'USER',
      });

      store.usersById.set(id, user);
      store.usersByEmail.set(data.email, user);

      return user;
    }

    async updatePasswordHash(userId: string, passwordHash: string) {
      const store = getStore();
      const user = store.usersById.get(userId);

      if (user) {
        const mutable = user as unknown as { props: { passwordHash: string } };
        mutable.props.passwordHash = passwordHash;
      }
    }
  }

  return { PrismaUserRepository };
});

jest.mock('@infrastructure/repositories/password-reset-token-repository', () => {
  class PrismaPasswordResetTokenRepository {
    async deleteAllForUser(userId: string) {
      const store = getStore();

      for (const [id, token] of store.resetTokens.entries()) {
        if (token.userId === userId) store.resetTokens.delete(id);
      }
    }

    async create(input: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }): Promise<ResetTokenRecord> {
      const store = getStore();
      store.tokenSeq += 1;
      const id = `rt-${store.tokenSeq}`;

      const record: ResetTokenRecord = {
        id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
        usedAt: null,
      };

      store.resetTokens.set(id, record);
      return record;
    }

    async findValidByTokenHash(
      tokenHash: string,
      now: Date = new Date(),
    ): Promise<ResetTokenRecord | null> {
      const store = getStore();

      for (const token of store.resetTokens.values()) {
        if (token.tokenHash === tokenHash && !token.usedAt && token.expiresAt > now) {
          return token;
        }
      }

      return null;
    }

    async markUsed(id: string, usedAt: Date = new Date()) {
      const store = getStore();
      const token = store.resetTokens.get(id);
      if (token) token.usedAt = usedAt;
    }
  }

  return { PrismaPasswordResetTokenRepository };
});

jest.mock('@infrastructure/services/node-mailer-service', () => {
  class NodemailerService {
    async sendMail(params: { to: string; subject: string; html: string }) {
      const store = getStore();
      store.sentMails.push(params);
    }
  }

  return { NodemailerService };
});

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

type FetchLikeResponse = {
  headers: {
    get: (name: string) => string | null;
    getSetCookie?: () => string[];
  };
};

function getSetCookies(res: FetchLikeResponse): string[] {
  const headers = res.headers;

  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();

  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function pickCookie(setCookies: string[], cookieName: string): string | null {
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    if (first.startsWith(`${cookieName}=`)) return first;
  }
  return null;
}

function extractTokenFromResetLink(html: string): string {
  const linkMatch = html.match(/href=["']([^"']+)["']/i);
  if (!linkMatch?.[1]) throw new Error('Reset link não encontrado no e-mail mockado');

  const link = linkMatch[1];
  const token = link.split('/').pop();
  if (!token) throw new Error('Token não encontrado no reset link');

  return token;
}

async function loadApp(): Promise<Express> {
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

describe('E2E /auth flows (HTTP)', () => {
  beforeEach(() => {
    const store = getStore();
    store.usersById.clear();
    store.usersByEmail.clear();
    store.resetTokens.clear();
    store.sentMails.length = 0;
    store.userSeq = 0;
    store.tokenSeq = 0;
  });

  it('register -> csrf -> login -> me', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '  John Doe  ',
          email: 'John.DOE@Example.com',
          password: '12345678',
        }),
      });

      const registerBody = await registerRes.json();
      expect(registerRes.status).toBe(201);
      expect(registerBody).toMatchObject({
        statusCode: 201,
        message: 'User created successfully',
        data: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'USER',
        },
      });

      const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
      const csrfBody = (await csrfRes.json()) as CsrfBody; // ALTERADO
      expect(csrfRes.status).toBe(200);
      expect(csrfBody).toMatchObject({ statusCode: 200, message: 'CSRF token generated' });

      const csrfCookies = getSetCookies(csrfRes as unknown as FetchLikeResponse);
      const csrfCookie = pickCookie(csrfCookies, 'csrfToken');
      expect(csrfCookie).toBeTruthy();

      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: csrfCookie!,
          'x-csrf-token': csrfBody.data.csrfToken,
        },
        body: JSON.stringify({
          email: 'john.doe@example.com',
          password: '12345678',
        }),
      });

      const loginBody = await loginRes.json();
      expect(loginRes.status).toBe(200);
      expect(loginBody).toMatchObject({
        statusCode: 200,
        message: 'Login successful',
        data: {
          user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'USER',
          },
        },
      });

      const loginCookies = getSetCookies(loginRes as unknown as FetchLikeResponse);
      const authCookie = pickCookie(loginCookies, 'token');
      expect(authCookie).toBeTruthy();

      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Cookie: authCookie!,
        },
      });

      const meBody = await meRes.json();
      expect(meRes.status).toBe(200);
      expect(meBody).toMatchObject({
        statusCode: 200,
        message: 'Authenticated',
        data: {
          user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'USER',
          },
        },
      });
    } finally {
      await close();
    }
  });

  it('forgot-password -> reset-password -> login com nova senha', async () => {
    const app = await loadApp();
    const { baseUrl, close } = await startServer(app);

    try {
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Klay',
          email: 'klay@example.com',
          password: 'OldPass123',
        }),
      });

      const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'klay@example.com' }),
      });
      expect(forgotRes.status).toBe(200);

      const store = getStore();
      expect(store.sentMails.length).toBe(1);

      const token = extractTokenFromResetLink(store.sentMails[0].html);

      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: 'NewPass123' }),
      });

      const resetBody = await resetRes.json();
      expect(resetRes.status).toBe(200);
      expect(resetBody).toMatchObject({
        statusCode: 200,
        message: 'Password reset successful',
      });

      const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
      const csrfBody = (await csrfRes.json()) as CsrfBody; // ALTERADO
      const csrfCookie = pickCookie(
        getSetCookies(csrfRes as unknown as FetchLikeResponse),
        'csrfToken',
      );
      expect(csrfCookie).toBeTruthy();

      const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: csrfCookie!,
          'x-csrf-token': csrfBody.data.csrfToken,
        },
        body: JSON.stringify({ email: 'klay@example.com', password: 'OldPass123' }),
      });

      expect(oldLoginRes.status).toBe(401);

      const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: csrfCookie!,
          'x-csrf-token': csrfBody.data.csrfToken,
        },
        body: JSON.stringify({ email: 'klay@example.com', password: 'NewPass123' }),
      });

      expect(newLoginRes.status).toBe(200);
    } finally {
      await close();
    }
  });
});
