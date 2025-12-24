import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const adapter = new PrismaPg({
  connectionString: requiredEnv('DATABASE_URL'),
});

const prisma = new PrismaClient({ adapter });

async function ensureAdminUser() {
  const isProd = process.env.NODE_ENV === 'production';

  const email = process.env.SEED_ADMIN_EMAIL ?? (isProd ? undefined : 'admin@local.test');
  const password = process.env.SEED_ADMIN_PASSWORD ?? (isProd ? undefined : 'ChangeMe!123');
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    if (isProd) {
      throw new Error(
        'Em produção, defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD para rodar o seed com segurança.',
      );
    }
    throw new Error('SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD estão faltando.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await argon2.hash(password);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'ADMIN',
      },
    });

    console.log(`[seed] Admin criado: ${email}`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { name, role: 'ADMIN' },
  });

  console.log(`[seed] Admin já existia (nome atualizado): ${email}`);
}

async function main() {
  await ensureAdminUser();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[seed] Falhou:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
