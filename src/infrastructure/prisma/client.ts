import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@config/env';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const isDev = env.NODE_ENV === 'development';
const isTest = env.NODE_ENV === 'test';

export const prisma = new PrismaClient({
  adapter,
  log: isTest ? [] : isDev ? ['query', 'warn', 'error'] : ['error'],
  errorFormat: isDev ? 'pretty' : 'minimal',
});
