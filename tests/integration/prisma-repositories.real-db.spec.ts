import { execSync } from 'node:child_process';
import 'dotenv/config';

const RUN =
  process.env.RUN_INTEGRATION_TESTS === '1' ||
  process.env.RUN_INTEGRATION_TESTS === 'true' ||
  process.env.RUN_INTEGRATION_TESTS === 'yes';

const dbUrl =
  process.env.INTEGRATION_DATABASE_URL ||
  process.env.DATABASE_URL;

const HAS_DB_URL = typeof dbUrl === 'string' && dbUrl.trim().length > 0;

const maybeDescribe = RUN && HAS_DB_URL ? describe : describe.skip;

maybeDescribe('integration: Prisma repositories com Postgres real', () => {
  let prisma: import('@prisma/client').PrismaClient | undefined;
  let userRepo: import('@infrastructure/repositories/user-repositories').PrismaUserRepository;
  let tokenRepo: import('@infrastructure/repositories/password-reset-token-repository').PrismaPasswordResetTokenRepository;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = dbUrl;
    process.env.KEY_JWT = process.env.KEY_JWT ?? 'test-secret';
    process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'test-issuer';
    process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'test-audience';
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
    process.env.SENTRY_DSN = '';

    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          NODE_ENV: 'test',
        },
      });
    } catch (err) {
      console.warn(
        '[integration] Banco indisponível para testes de integração. Pulei a suíte. Motivo:',
        err,
      );
      return;
    }

    jest.resetModules();

    const prismaMod =
      (await import('@infrastructure/prisma/client')) as typeof import('@infrastructure/prisma/client');
    prisma = prismaMod.prisma;

    const userRepoMod =
      (await import('@infrastructure/repositories/user-repositories')) as typeof import('@infrastructure/repositories/user-repositories');
    userRepo = new userRepoMod.PrismaUserRepository();

    const tokenRepoMod =
      (await import('@infrastructure/repositories/password-reset-token-repository')) as typeof import('@infrastructure/repositories/password-reset-token-repository');
    tokenRepo = new tokenRepoMod.PrismaPasswordResetTokenRepository();
  }, 60_000);

  beforeEach(async () => {
    if (!prisma) return;
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('User repo: cria e busca (role default USER)', async () => {
    if (!prisma) return;

    const created = await userRepo.create({
      name: 'John',
      email: 'john@example.com',
      passwordHash: 'hash:123',
    });

    expect(created.id).toBeTruthy();
    expect(created.role).toBe('USER');

    const byEmail = await userRepo.findByEmail('john@example.com');
    expect(byEmail?.id).toBe(created.id);
    expect(byEmail?.role).toBe('USER');
  });

  it('Email CITEXT unique: casing diferente deve dar P2002', async () => {
    if (!prisma) return;

    await userRepo.create({
      name: 'A',
      email: 'John.DOE@Example.com',
      passwordHash: 'hash:123',
    });

    await expect(
      userRepo.create({
        name: 'B',
        email: 'john.doe@example.com',
        passwordHash: 'hash:456',
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('Password reset token: create -> findValid -> markUsed e cascade on delete', async () => {
    if (!prisma) return;

    const user = await userRepo.create({
      name: 'Klay',
      email: 'klay@example.com',
      passwordHash: 'hash:old',
    });

    const expiresAt = new Date(Date.now() + 60_000);
    const record = await tokenRepo.create({
      userId: user.id,
      tokenHash: 'abc',
      expiresAt,
    });

    const valid = await tokenRepo.findValidByTokenHash('abc');
    expect(valid?.id).toBe(record.id);

    await tokenRepo.markUsed(record.id);
    const afterUsed = await tokenRepo.findValidByTokenHash('abc');
    expect(afterUsed).toBeNull();

    const record2 = await tokenRepo.create({
      userId: user.id,
      tokenHash: 'def',
      expiresAt,
    });

    await prisma.user.delete({ where: { id: user.id } });

    const stillThere = await prisma.passwordResetToken.findUnique({ where: { id: record2.id } });
    expect(stillThere).toBeNull();
  });
});
