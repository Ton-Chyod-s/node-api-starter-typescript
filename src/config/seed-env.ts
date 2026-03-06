import '@config/load-env';
import { z } from 'zod';

function normalizeOptionalString(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),

  DATABASE_URL: z.string().min(1),

  SEED_ADMIN_EMAIL: z.string().optional().transform(normalizeOptionalString),
  SEED_ADMIN_PASSWORD: z.string().optional().transform(normalizeOptionalString),
  SEED_ADMIN_NAME: z.string().optional().transform(normalizeOptionalString),
});

export const seedEnv = schema.parse(process.env);
