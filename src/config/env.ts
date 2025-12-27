import 'dotenv/config';
import { z } from 'zod';
import ms from 'ms';
import type { StringValue } from 'ms';

type CorsOrigin = '*' | string | string[];

function parseExpiresIn(value?: string): number | StringValue | undefined {
  if (!value) return undefined;

  const v = value.trim();

  if (/^\d+$/.test(v)) return Number(v);

  if (!/^\d+(\.\d+)?(ms|s|m|h|d|w|y)$/i.test(v)) {
    throw new Error(
      `JWT_EXPIRES_IN inválido: "${value}". Use ex: "3600" (segundos) ou "1d", "2h", "15m".`,
    );
  }

  return v as StringValue;
}

export function expiresInToMs(expiresIn?: number | StringValue): number | undefined {
  if (expiresIn === undefined) return undefined;

  if (typeof expiresIn === 'number') return expiresIn * 1000;

  const parsed = ms(expiresIn);
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
}

function parseCorsOrigin(raw: unknown): CorsOrigin {
  const value = String(raw ?? '').trim();

  if (value === '*') return '*';

  if (value.includes(',')) {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return list.length === 1 ? list[0] : list;
  }

  return value;
}

const corsOriginSchema = z.preprocess(
  (val) => parseCorsOrigin(val),
  z.union([z.literal('*'), z.string().min(1), z.array(z.string().min(1)).min(1)]),
);

function parseTrustProxy(value?: string): boolean | number | undefined {
  if (value === undefined) return undefined;

  const v = value.trim();
  if (!v) return undefined;

  const lower = v.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;

  if (/^\d+$/.test(v)) return Number(v);

  throw new Error(`TRUST_PROXY inválido: "${value}". Use "true", "false" ou um inteiro (ex: 1).`);
}

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;

  const v = value.trim().toLowerCase();
  if (!v) return undefined;

  if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(v)) return false;

  throw new Error(`Boolean inválido: "${value}". Use true/false (ou 1/0).`);
}

function normalizeOptionalString(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

function preprocessOptional(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).optional(),

  DATABASE_URL: z.string().min(1),

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

  SMTP_HOST: z.string().optional().transform(normalizeOptionalString),
  SMTP_PORT: z
    .preprocess(preprocessOptional, z.coerce.number().int().min(1).max(65535))
    .optional()
    .default(465),
  SMTP_USER: z.string().optional().transform(normalizeOptionalString),
  SMTP_PASSWORD: z.string().optional().transform(normalizeOptionalString),
  SMTP_SECURE: z.string().optional().transform(parseBoolean),
  EMAIL_FROM: z.string().optional().transform(normalizeOptionalString),
});

export const env = schema.parse(process.env);
