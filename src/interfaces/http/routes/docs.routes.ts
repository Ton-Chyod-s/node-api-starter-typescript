import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import YAML from 'yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { SwaggerUiOptions } from 'swagger-ui-express';
import type { Request, Response, NextFunction } from 'express';
import { env } from '@config/env';
import { ensureCsrfTokenCookie } from '@interfaces/http/middlewares/csrf-middleware';

type DocumentLike = { cookie?: string };

type SwaggerRequest = {
  method?: string;
  headers?: Record<string, string>;
  credentials?: 'include' | 'omit' | 'same-origin';
  withCredentials?: boolean;
  url?: string;
} & Record<string, unknown>;

function getCookie(cookieStr: string, name: string): string {
  const pattern = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const match = cookieStr.match(pattern);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

const router = Router();

function specPath() {
  return path.resolve(process.cwd(), 'docs', 'openapi', 'openapi.yaml');
}

let cachedSpec: unknown | null = null;

async function loadOpenApiSpecBundled() {
  if (cachedSpec) return cachedSpec;

  const bundled = await SwaggerParser.bundle(specPath());
  cachedSpec = bundled;
  return bundled;
}

router.get('/openapi.yaml', async (_req, res, next) => {
  try {
    const spec = await loadOpenApiSpecBundled();
    return res.type('text/yaml').send(YAML.stringify(spec));
  } catch (err) {
    return next(err);
  }
});

router.get('/openapi.json', async (_req, res, next) => {
  try {
    const spec = await loadOpenApiSpecBundled();
    return res.json(spec);
  } catch (err) {
    return next(err);
  }
});

router.use('/docs', swaggerUi.serve);

router.get('/docs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (env.CSRF_ENABLED) {
      ensureCsrfTokenCookie(req, res);
    }

    const spec = await loadOpenApiSpecBundled();

    const csrfCookieName = env.CSRF_COOKIE_NAME ?? 'csrfToken';

    const options = {
      explorer: true,
      swaggerOptions: {
        withCredentials: true,
        persistAuthorization: false,

        requestInterceptor: (r: SwaggerRequest): SwaggerRequest => {
          r.credentials = 'include';
          r.withCredentials = true;

          try {
            const m = String(r.method ?? '').toUpperCase();
            const isUnsafe = m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
            if (!isUnsafe) return r;

            const doc = (globalThis as unknown as { document?: DocumentLike }).document;

            const cookieStr = typeof doc?.cookie === 'string' ? doc.cookie : '';
            const token = getCookie(cookieStr, csrfCookieName);

            if (token) {
              r.headers = r.headers ?? {};
              r.headers['x-csrf-token'] = token;
            }
          } catch {
            // no-op
          }

          return r;
        },
      },
    } satisfies SwaggerUiOptions;

    const handler = swaggerUi.setup(spec, options);
    return handler(req, res, next);
  } catch (err) {
    return next(err);
  }
});

export default router;
