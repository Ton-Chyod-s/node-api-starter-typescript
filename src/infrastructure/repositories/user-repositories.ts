import { prisma } from '../prisma/client';
import {
  IUserRepository,
  CreateUserData,
  UpsertGoogleUserData,
  UpsertFacebookUserData,
  UserListItemRepository,
  FindAllParams,
} from '@domain/repositories/user-repository';
import { User, type UserRole } from '@domain/entities/user';

type PrismaUserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  facebookId: string | null;
  role: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeRole(role: string): UserRole {
  if (role === 'ADMIN' || role === 'USER') return role;
  throw new Error(`Unknown role: "${role}". Expected ADMIN or USER.`);
}

function toDomain(record: PrismaUserRecord): User {
  return new User({
    id: record.id,
    name: record.name,
    email: record.email,
    passwordHash: record.passwordHash,
    googleId: record.googleId,
    facebookId: record.facebookId,
    role: normalizeRole(record.role),
    tokenVersion: record.tokenVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toDomain(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { googleId } });
    return user ? toDomain(user) : null;
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { facebookId } });
    return user ? toDomain(user) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        googleId: data.googleId ?? null,
        facebookId: data.facebookId ?? null,
        role: data.role ?? 'USER',
      },
    });
    return toDomain(user);
  }

  async upsertByGoogleId(data: UpsertGoogleUserData): Promise<{ user: User; created: boolean }> {
    let created = false;

    const record = await prisma.$transaction(async (tx) => {
      const normalizedEmail = data.email.trim().toLowerCase();

      const existingByGoogle = await tx.user.findUnique({
        where: { googleId: data.googleId },
        select: { id: true },
      });

      if (!existingByGoogle) {
        const existingByEmail = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, googleId: true },
        });

        if (existingByEmail) {
          const { AppError } = await import('@utils/app-error');
          throw AppError.conflict(
            'An account with this email already exists. Please log in with your original method.',
            'AUTH_EMAIL_ALREADY_REGISTERED',
          );
        }
      }

      created = existingByGoogle === null;

      return tx.user.upsert({
        where: { googleId: data.googleId },
        update: {},
        create: {
          name: data.name,
          email: normalizedEmail,
          googleId: data.googleId,
          role: 'USER',
        },
      });
    });

    return { user: toDomain(record), created };
  }

  async upsertByFacebookId(data: UpsertFacebookUserData): Promise<{ user: User; created: boolean }> {
    let created = false;

    const record = await prisma.$transaction(async (tx) => {
      const normalizedEmail = data.email.trim().toLowerCase();

      const existingByFacebook = await tx.user.findUnique({
        where: { facebookId: data.facebookId },
        select: { id: true },
      });

      if (!existingByFacebook) {
        const existingByEmail = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, facebookId: true },
        });

        if (existingByEmail) {
          const { AppError } = await import('@utils/app-error');
          throw AppError.conflict(
            'An account with this email already exists. Please log in with your original method.',
            'AUTH_EMAIL_ALREADY_REGISTERED',
          );
        }
      }

      created = existingByFacebook === null;

      return tx.user.upsert({
        where: { facebookId: data.facebookId },
        update: {},
        create: {
          name: data.name,
          email: normalizedEmail,
          facebookId: data.facebookId,
          role: 'USER',
        },
      });
    });

    return { user: toDomain(record), created };
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async findAll(params?: FindAllParams): Promise<UserListItemRepository[]> {
    const take = params?.take ?? 100;
    const cursor = params?.cursor;

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
    }));
  }
}
