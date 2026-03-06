import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const nodeEnv = process.env.NODE_ENV || 'development';

const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

const envPath = resolve(process.cwd(), envFile);

if (!existsSync(envPath)) {
  const fallbackPath = resolve(process.cwd(), '.env');

  if (existsSync(fallbackPath)) {
    config({ path: fallbackPath });
    console.log(`Variáveis de ambiente carregadas de .env (fallback)`);
  } else {
    if (!process.env.DATABASE_URL) {
      console.warn(`Arquivo ${envFile} não encontrado e DATABASE_URL não definida.`);
      console.warn(`Em desenvolvimento: crie ${envFile} baseado em .env.example`);
      console.warn(`Em produção/Docker: defina variáveis de ambiente no container`);
    }
  }
} else {
  config({ path: envPath });
  console.log(`Variáveis de ambiente carregadas de ${envFile}`);
}

export {};
