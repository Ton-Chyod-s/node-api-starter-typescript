import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { defineConfig, env as prismaEnv } from 'prisma/config';

const nodeEnv = process.env.NODE_ENV || 'development';

const envFiles = [
  `.env.${nodeEnv}`,
  nodeEnv === 'development' ? '.env.develop' : null,
  '.env',
].filter(Boolean) as string[];

for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), 'config', envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: prismaEnv('DATABASE_URL'),
  },
});
