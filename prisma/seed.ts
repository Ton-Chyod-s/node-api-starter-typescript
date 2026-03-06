import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedEnv } from '../src/config/seed-env';

const adapter = new PrismaPg({
  connectionString: seedEnv.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function ensureAdminUser() {
  const isProd = seedEnv.NODE_ENV === 'production';

  const email = seedEnv.SEED_ADMIN_EMAIL ?? (isProd ? undefined : 'admin@local.test');
  const password = seedEnv.SEED_ADMIN_PASSWORD ?? (isProd ? undefined : 'ChangeMe!123');
  const name = seedEnv.SEED_ADMIN_NAME ?? 'Admin';

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
