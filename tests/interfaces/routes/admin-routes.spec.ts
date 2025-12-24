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

// Esses testes sobem um servidor real e, com ts-jest, a primeira compilação pode passar de 5s.
jest.setTimeout(20000);

jest.mock('express-rate-limit', () => {
  return () => (_req: Request, _res: Response, next: NextFunction) => next();
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

describe('routes /admin', () => {
  it('GET /admin/ping deve retornar 401 sem token', async () => {
    const routes = await loadRoutesWithEnv('secret-admin-1');

    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);

    const { baseUrl, close } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/api/admin/ping`);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toMatchObject({ statusCode: 401, message: 'Unauthorized' });
    } finally {
      await close();
    }
  });

  it('GET /admin/ping deve retornar 403 quando role for USER', async () => {
    const secret = 'secret-admin-2';
    const routes = await loadRoutesWithEnv(secret);

    const issuer = process.env.JWT_ISSUER ?? 'test-issuer';
    const audience = process.env.JWT_AUDIENCE ?? 'test-audience';

    const token = jwt.sign({ role: 'USER' }, secret, {
      subject: 'user-1',
      expiresIn: '1h',
      algorithm: 'HS256',
      issuer,
      audience,
    });

    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);

    const { baseUrl, close } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/api/admin/ping`, {
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
      });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toMatchObject({ statusCode: 403, message: 'Forbidden' });
    } finally {
      await close();
    }
  });

  it('GET /admin/ping deve retornar 200 quando role for ADMIN', async () => {
    const secret = 'secret-admin-3';
    const routes = await loadRoutesWithEnv(secret);

    const issuer = process.env.JWT_ISSUER ?? 'test-issuer';
    const audience = process.env.JWT_AUDIENCE ?? 'test-audience';

    const token = jwt.sign({ role: 'ADMIN' }, secret, {
      subject: 'admin-1',
      expiresIn: '1h',
      algorithm: 'HS256',
      issuer,
      audience,
    });

    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);

    const { baseUrl, close } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/api/admin/ping`, {
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({
        statusCode: 200,
        message: 'OK',
        data: {
          user: { id: 'admin-1', role: 'ADMIN' },
        },
      });
    } finally {
      await close();
    }
  });
});
