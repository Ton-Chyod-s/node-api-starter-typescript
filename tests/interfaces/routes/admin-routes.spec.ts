import express, {
  type Express,
  type Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

jest.mock('express-rate-limit', () => {
  return () => (_req: Request, _res: Response, next: NextFunction) => next();
});

jest.mock('@infrastructure/prisma/client', () => ({ prisma: {} }));

const mockUserData = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@test.com',
  role: 'ADMIN' as const,
  tokenVersion: 0,
};

const mockFindAll = jest.fn();
const mockFindById = jest.fn().mockImplementation(() => Promise.resolve({ ...mockUserData }));
const mockUpdateRole = jest.fn().mockImplementation(() => Promise.resolve());

jest.mock('@infrastructure/repositories/user-repositories', () => {
  return {
    PrismaUserRepository: jest.fn().mockImplementation(() => ({
      findById: mockFindById,
      findAll: mockFindAll,
      updateRole: mockUpdateRole,
    })),
  };
});

jest.mock('@infrastructure/redis/client', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }),
}));

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

function makeAdminToken(secret: string, userId = 'admin-1'): string {
  const issuer = process.env.JWT_ISSUER ?? 'test-issuer';
  const audience = process.env.JWT_AUDIENCE ?? 'test-audience';
  return jwt.sign({ role: 'ADMIN', tokenVersion: 0 }, secret, {
    subject: userId,
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer,
    audience,
  });
}

function makeUserToken(secret: string, userId = 'user-1'): string {
  const issuer = process.env.JWT_ISSUER ?? 'test-issuer';
  const audience = process.env.JWT_AUDIENCE ?? 'test-audience';
  return jwt.sign({ role: 'USER', tokenVersion: 0 }, secret, {
    subject: userId,
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer,
    audience,
  });
}

async function loadRoutesWithEnv(secret = 'test-secret'): Promise<Router> {
  jest.resetModules();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db';
  process.env.KEY_JWT = secret;
  process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'test-issuer';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'test-audience';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  process.env.SENTRY_DSN = '';

  const mod = (await import('@interfaces/http/routes')) as typeof import('@interfaces/http/routes');
  return mod.default;
}

// ─── /admin/ping ─────────────────────────────────────────────────────────────

describe('GET /admin/ping', () => {
  it('deve retornar 401 sem token', async () => {
    const routes = await loadRoutesWithEnv('secret-ping-1');
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/ping`);
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('deve retornar 403 quando role for USER', async () => {
    const secret = 'secret-ping-2';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeUserToken(secret);
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/ping`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });

  it('deve retornar 200 quando role for ADMIN', async () => {
    const secret = 'secret-ping-3';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeAdminToken(secret);
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/ping`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toMatchObject({ statusCode: 200, message: 'OK' });
    } finally {
      await close();
    }
  });
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────

describe('GET /admin/users', () => {
  const mockUsers = [
    { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'USER' },
    { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'ADMIN' },
  ];

  beforeEach(() => {
    mockFindAll.mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    mockFindAll.mockReset();
  });

  it('deve retornar 401 sem token', async () => {
    const routes = await loadRoutesWithEnv('secret-list-1');
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`);
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('deve retornar 403 quando role for USER', async () => {
    const secret = 'secret-list-2';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeUserToken(secret, 'user-1');
    mockFindById.mockResolvedValue({ id: 'user-1', role: 'USER', tokenVersion: 0 });
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });

  it('deve retornar 200 com lista e nextCursor quando ADMIN', async () => {
    const secret = 'secret-list-3';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeAdminToken(secret, 'admin-1');
    mockFindById.mockResolvedValue({ ...mockUserData });
    mockFindAll.mockResolvedValue(mockUsers);
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toMatchObject({
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: {
          users: expect.arrayContaining([
            expect.objectContaining({ id: 'u1', email: 'alice@test.com' }),
          ]),
          nextCursor: expect.anything(),
        },
      });
    } finally {
      await close();
    }
  });

  it('deve retornar 400 quando take for inválido', async () => {
    const secret = 'secret-list-4';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeAdminToken(secret, 'admin-1');
    mockFindById.mockResolvedValue({ ...mockUserData });
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users?take=999`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
      });
      expect(res.status).toBe(400);
    } finally {
      await close();
    }
  });
});

// ─── PATCH /admin/users/:id/role ─────────────────────────────────────────────

describe('PATCH /admin/users/:id/role', () => {
  const targetId = 'target-user-1';

  beforeEach(() => {
    mockFindById.mockResolvedValue({ ...mockUserData });
    mockUpdateRole.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockFindById.mockReset();
    mockUpdateRole.mockReset();
  });

  it('deve retornar 401 sem token', async () => {
    const routes = await loadRoutesWithEnv('secret-role-1');
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('deve retornar 403 quando role for USER', async () => {
    const secret = 'secret-role-2';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeUserToken(secret, 'user-1');
    mockFindById.mockResolvedValue({ id: 'user-1', role: 'USER', tokenVersion: 0 });
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });

  it('deve retornar 400 quando role for inválida', async () => {
    const secret = 'secret-role-3';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeAdminToken(secret, 'admin-1');
    mockFindById.mockResolvedValue({ ...mockUserData });
    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
        body: JSON.stringify({ role: 'SUPERADMIN' }),
      });
      expect(res.status).toBe(400);
    } finally {
      await close();
    }
  });

  it('deve retornar 200 ao promover usuário para ADMIN', async () => {
    const secret = 'secret-role-4';
    const routes = await loadRoutesWithEnv(secret);
    const token = makeAdminToken(secret, 'admin-1');

    const targetUser = {
      id: targetId,
      name: 'Target User',
      email: 'target@test.com',
      role: 'USER',
      tokenVersion: 0,
    };

    mockFindById
      .mockResolvedValueOnce({ ...mockUserData }) // auth middleware (admin autenticado)
      .mockResolvedValueOnce({ ...targetUser });   // use case (usuário alvo)

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api', routes);
    const { baseUrl, close } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${targetId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toMatchObject({
        statusCode: 200,
        message: 'User role updated successfully',
      });
    } finally {
      await close();
    }
  });
});
