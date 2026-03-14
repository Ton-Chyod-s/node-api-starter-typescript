import type { User as UserEntity } from '@domain/entities/user';
import {
  loadApp,
  startServer,
  getSetCookies,
  pickCookie,
  type FetchLikeResponse,
} from '../../setup/test-helpers';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

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

// Store encapsulado em módulo local — sem poluir globalThis
const store: Store = {
  usersById: new Map(),
  usersByEmail: new Map(),
  resetTokens: new Map(),
  sentMails: [],
  userSeq: 0,
  tokenSeq: 0,
};

function getStore(): Store {
  return store;
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
      const existing = store.usersById.get(userId);

      if (existing) {
        const updated = new User({
          id: existing.id,
          name: existing.name,
          email: existing.email,
          passwordHash,
          role: existing.role,
          tokenVersion: existing.tokenVersion,
        });
        store.usersById.set(userId, updated);
        store.usersByEmail.set(existing.email, updated);
      }
    }

    async findAll() {
      const store = getStore();
      return Array.from(store.usersById.values()).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));
    }

    async incrementTokenVersion(userId: string) {
      const store = getStore();
      const existing = store.usersById.get(userId);

      if (existing) {
        const updated = new User({
          id: existing.id,
          name: existing.name,
          email: existing.email,
          passwordHash: existing.passwordHash,
          role: existing.role,
          tokenVersion: (existing.tokenVersion ?? 0) + 1,
        });
        store.usersById.set(userId, updated);
        store.usersByEmail.set(existing.email, updated);
      }
    }
  }

  return { PrismaUserRepository };
});

jest.mock('@infrastructure/repositories/password-reset-token-repository', () => {
  class PrismaPasswordResetTokenRepository {
    async replaceTokenForUser(
      userId: string,
      input: { tokenHash: string; expiresAt: Date },
    ): Promise<ResetTokenRecord> {
      const store = getStore();

      for (const [id, token] of store.resetTokens.entries()) {
        if (token.userId === userId) store.resetTokens.delete(id);
      }

      store.tokenSeq += 1;
      const id = `rt-${store.tokenSeq}`;

      const record: ResetTokenRecord = {
        id,
        userId,
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

    async consumeByTokenHash(tokenHash: string, now: Date = new Date()): Promise<string | null> {
      const store = getStore();

      for (const token of store.resetTokens.values()) {
        if (token.tokenHash === tokenHash && !token.usedAt && token.expiresAt > now) {
          token.usedAt = now;
          return token.userId;
        }
      }

      return null;
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

function extractTokenFromResetLink(html: string): string {
  const linkMatch = html.match(/href=["']([^"']+)["']/i);
  if (!linkMatch?.[1]) throw new Error('Reset link não encontrado no e-mail mockado');

  const link = linkMatch[1];
  const token = link.split('/').pop();
  if (!token) throw new Error('Token não encontrado no reset link');

  return token;
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
          password: 'Senha@12345',
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
          password: 'Senha@12345',
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
      const authCookie = pickCookie(loginCookies, AUTH_COOKIE_NAME);
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
          password: 'OldPass@123',
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
        body: JSON.stringify({ token, newPassword: 'NewPass@123' }),
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
        body: JSON.stringify({ email: 'klay@example.com', password: 'OldPass@123' }),
      });

      expect(oldLoginRes.status).toBe(401);

      const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: csrfCookie!,
          'x-csrf-token': csrfBody.data.csrfToken,
        },
        body: JSON.stringify({ email: 'klay@example.com', password: 'NewPass@123' }),
      });

      expect(newLoginRes.status).toBe(200);
    } finally {
      await close();
    }
  });
});
