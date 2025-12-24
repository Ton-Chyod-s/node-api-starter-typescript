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

jest.mock('@infrastructure/repositories/user-repositories', () => {
  return {
    PrismaUserRepository: jest.fn().mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          id: 'user-123',
          name: 'Klay',
          email: 'k@k.com',
          role: 'USER',
        }),
      };
    }),
  };
});

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

type Handler = (...args: unknown[]) => unknown;

type RouteStackItem = {
  handle: Handler;
};

type ExpressRoute = {
  path?: string;
  methods?: Record<string, boolean>;
  stack: RouteStackItem[];
};

type ExpressLayer = {
  name?: string;
  route?: ExpressRoute;
  handle?: {
    stack?: ExpressLayer[];
  };
};

type RouterWithStack = {
  stack: ExpressLayer[];
};

function findRouteLayer(
  router: RouterWithStack,
  path: string,
  method?: string,
): ExpressLayer | undefined {
  const stack = router.stack ?? [];

  for (const layer of stack) {
    if (layer.route?.path) {
      const samePath = layer.route.path === path;
      const sameMethod = method ? Boolean(layer.route.methods?.[method]) : true;

      if (samePath && sameMethod) return layer;
    }

    if (layer.name === 'router' && Array.isArray(layer.handle?.stack)) {
      const found = findRouteLayer({ stack: layer.handle.stack }, path, method);
      if (found) return found;
    }
  }

  return undefined;
}

describe('routes /auth', () => {
  it('deve registrar /auth/logout com handler que recebe next (wiring)', async () => {
    const routes = await loadRoutesWithEnv();

    const routerWithStack = routes as unknown as RouterWithStack;
    const layer = findRouteLayer(routerWithStack, '/auth/logout', 'post');

    expect(layer).toBeDefined();
    expect(layer?.route).toBeDefined();

    const handlers = layer!.route!.stack.map((s) => s.handle);
    const logoutHandler = handlers[handlers.length - 1];

    expect(logoutHandler.length).toBe(3);
  });

  it('GET /auth/me deve retornar 401 sem token', async () => {
    const routes = await loadRoutesWithEnv('secret-1');

    const app = express();
    app.use(cookieParser());
    app.use('/api', routes);

    const { baseUrl, close } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toMatchObject({ statusCode: 401, message: 'Unauthorized' });
    } finally {
      await close();
    }
  });

  it('GET /auth/me deve retornar 200 com token válido', async () => {
    const secret = 'secret-2';
    const routes = await loadRoutesWithEnv(secret);

    const issuer = process.env.JWT_ISSUER ?? 'test-issuer';
    const audience = process.env.JWT_AUDIENCE ?? 'test-audience';

    const token = jwt.sign({ role: 'USER' }, secret, {
      subject: 'user-123',
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
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({
        statusCode: 200,
        message: 'Authenticated',
        data: {
          user: {
            id: 'user-123',
            name: 'Klay',
            email: 'k@k.com',
            role: 'USER',
          },
        },
      });
    } finally {
      await close();
    }
  });
});
