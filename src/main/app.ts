import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { errorMiddleware } from '@interfaces/http/middlewares/error-middleware';
import * as Sentry from '@sentry/node';
import { env } from '@config/env';
import router from '@interfaces/http/routes';
import { csrfMiddleware } from '@interfaces/http/middlewares/csrf-middleware';
import { globalApiLimiter } from '@interfaces/http/middlewares/global-rate-limit';

type SentryCompat = typeof Sentry & {
  setupExpressErrorHandler?: (app: Application) => void;
  Handlers?: {
    requestHandler?: () => express.RequestHandler;
    errorHandler?: () => express.ErrorRequestHandler;
  };
};

function sentryCompat(): SentryCompat {
  return Sentry as unknown as SentryCompat;
}

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');

  app.set('trust proxy', env.TRUST_PROXY ?? false);

  app.use(cookieParser());

  const corsOrigin = env.CORS_ORIGIN;
  if (!corsOrigin) throw new Error('CORS_ORIGIN not set in environment variables');

  if (corsOrigin === '*') {
    throw new Error(
      'CORS_ORIGIN="*" não é permitido quando credentials=true. Configure uma origem específica (ex: http://localhost:3000).',
    );
  }

  app.use(cors({ origin: corsOrigin, credentials: true }));

  app.use(helmet());

  app.use(express.json({ limit: '10kb' }));

  if (env.SENTRY_DSN) {
    const sc = sentryCompat();
    const requestHandler = sc.Handlers?.requestHandler?.();
    if (requestHandler) app.use(requestHandler);
  }

  app.use('/api', globalApiLimiter);

  app.use(csrfMiddleware);

  app.use('/api', router);

  if (env.SENTRY_DSN) {
    const sc = sentryCompat();

    const errorHandler = sc.Handlers?.errorHandler?.();
    if (errorHandler) {
      app.use(errorHandler);
    } else if (typeof sc.setupExpressErrorHandler === 'function') {
      sc.setupExpressErrorHandler(app);
    }
  }

  app.use(errorMiddleware);

  return app;
}
