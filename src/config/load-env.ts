import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const nodeEnv = process.env.NODE_ENV || 'development';

const envFiles = [
  `.env.${nodeEnv}`,
  nodeEnv === 'development' ? '.env.develop' : null,
  '.env',
].filter(Boolean) as string[];

let envFileLoaded = false;

for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (nodeEnv === 'development') {
      console.log(`Variáveis carregadas de: ${envFile}`);
    }
    envFileLoaded = true;
    break;
  }
}

if (!envFileLoaded) {
  console.warn(`Nenhum arquivo .env encontrado. Tentei: ${envFiles.join(', ')}`);
}

export {};
