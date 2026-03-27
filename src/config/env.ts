import '@config/load-env';
import { z } from 'zod';
import {
  normalizeOptionalString,
  parseBoolean,
  parseCorsOrigin,
  parseExpiresIn,
  parseTrustProxy,
  preprocessOptional,
} from '@utils/string';

const corsOriginSchema = z.preprocess(
  (val) => parseCorsOrigin(val),
  z.union([z.literal('*'), z.string().min(1), z.array(z.string().min(1)).min(1)]),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).optional(),

  DATABASE_URL: z.string().min(1),

  // ------------------------------------------------------------------------------
  // REDIS
  // ------------------------------------------------------------------------------
  REDIS_URL: z.string().optional().transform(normalizeOptionalString),

  KEY_JWT: z.string().min(1),

  JWT_EXPIRES_IN: z.string().optional().transform(parseExpiresIn),

  JWT_ISSUER: z.string().min(1),

  JWT_AUDIENCE: z.string().min(1),

  CORS_ORIGIN: corsOriginSchema,

  SENTRY_DSN: z.string().optional(),

  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional().default(0),

  TRUST_PROXY: z.string().optional().transform(parseTrustProxy),

  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional().default('lax'),

  COOKIE_SECURE: z.string().optional().transform(parseBoolean),

  CSRF_ENABLED: z.string().optional().default('true').transform(parseBoolean),

  CSRF_COOKIE_NAME: z.string().optional().default('csrfToken'),

  DEBUG_ROUTES_ENABLED: z.string().optional().default('false').transform(parseBoolean),

  FRONTEND_URL: z.string().optional().transform(normalizeOptionalString),
  PASSWORD_RESET_PATH: z.string().optional().default('/reset-password/{token}'),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z
    .preprocess(
      preprocessOptional,
      z.coerce
        .number()
        .int()
        .min(1)
        .max(60 * 24 * 30),
    )
    .optional()
    .default(15),

  SEED_ADMIN_EMAIL: z.string().optional().transform(normalizeOptionalString),
  SEED_ADMIN_PASSWORD: z.string().optional().transform(normalizeOptionalString),
  SEED_ADMIN_NAME: z.string().optional().transform(normalizeOptionalString),

  // ------------------------------------------------------------------------------
  // GOOGLE OAUTH
  // ------------------------------------------------------------------------------
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .transform(normalizeOptionalString)
    .pipe(z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .transform(normalizeOptionalString)
    .pipe(z.string().min(1).optional()),
  GOOGLE_REDIRECT_URI: z
    .string()
    .optional()
    .transform(normalizeOptionalString)
    .pipe(z.string().url().optional()),

  // ------------------------------------------------------------------------------
  // FACEBOOK OAUTH
  // ------------------------------------------------------------------------------
  FACEBOOK_APP_ID: z
    .string()
    .optional()
    .transform(normalizeOptionalString)
    .pipe(z.string().min(1).optional()),
  FACEBOOK_APP_SECRET: z
    .string()
    .optional()
    .transform(normalizeOptionalString)
    .pipe(z.string().min(1).optional()),
  FACEBOOK_REDIRECT_URI: z
    .string()
    .optional()
    .transform(normalizeOptionalString)
    .pipe(z.string().url().optional()),

  SMTP_HOST: z.string().optional().transform(normalizeOptionalString),
  SMTP_PORT: z
    .preprocess(preprocessOptional, z.coerce.number().int().min(1).max(65535))
    .optional()
    .default(465),
  SMTP_USER: z.string().optional().transform(normalizeOptionalString),
  SMTP_PASSWORD: z.string().optional().transform(normalizeOptionalString),
  SMTP_SECURE: z.string().optional().transform(parseBoolean),
  EMAIL_FROM: z.string().optional().transform(normalizeOptionalString),

  APP_NAME: z.string().optional().default('app'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),

  USER_CACHE_TTL_SECONDS: z
    .preprocess(preprocessOptional, z.coerce.number().int().min(10).max(3600))
    .optional()
    .default(60),

  REFRESH_TOKEN_EXPIRES_IN_DAYS: z
    .preprocess(preprocessOptional, z.coerce.number().int().min(1).max(365))
    .optional()
    .default(30)
    .transform((days) => days * 24 * 60 * 60 * 1000),

  REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES: z
    .preprocess(preprocessOptional, z.coerce.number().int().min(0).max(60 * 24 * 7))
    .optional()
    .default(60),
});

const parsedEnv = schema.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production' && !data.REDIS_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message: 'REDIS_URL is required in production',
    });
  }

  if (data.NODE_ENV === 'production' && data.CSRF_ENABLED === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CSRF_ENABLED'],
      message: 'CSRF_ENABLED cannot be false in production. Remove the variable or set it to true.',
    });
  }

  if (data.NODE_ENV === 'production' && data.TRUST_PROXY === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TRUST_PROXY'],
      message:
        'TRUST_PROXY is not set in production. If running behind a load balancer or reverse proxy, set TRUST_PROXY=1 (or the appropriate value) to ensure correct client IP detection for rate limiting.',
    });
  }
});

export const env = parsedEnv.parse(process.env);
