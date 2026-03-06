import * as Sentry from '@sentry/node';
import { env } from '@config/env';

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE ?? 0),

    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      const req = event.request as unknown as { cookies?: unknown } | undefined;
      if (req?.cookies !== undefined) delete req.cookies;

      return event;
    },
  });
}
