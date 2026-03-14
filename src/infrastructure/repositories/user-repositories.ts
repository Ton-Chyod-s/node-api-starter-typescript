import { prisma } from '../prisma/client';
import {
  IUserRepository,
  CreateUserData,
  UpsertGoogleUserData,
  UpsertFacebookUserData,
  UserListItemRepository,
} from '@domain/repositories/user-repository';
import { User, type UserRole } from '@domain/entities/user';

function normalizeRole(role: string): UserRole {
  if (role === 'ADMIN' || role === 'USER') return role;
  throw new Error(`Unknown role: "${role}". Expected ADMIN or USER.`);
}

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;

    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { googleId } });
    if (!user) return null;

    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
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

    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      facebookId: user.facebookId,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async upsertByGoogleId(data: UpsertGoogleUserData): Promise<{ user: User; created: boolean }> {
    const existing = await prisma.user.findUnique({ where: { googleId: data.googleId } });

    const record = await prisma.user.upsert({
      where: { googleId: data.googleId },
      update: {},
      create: {
        name: data.name,
        email: data.email.trim().toLowerCase(),
        googleId: data.googleId,
        role: 'USER',
      },
    });

    const user = new User({
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

    return { user, created: existing === null };
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { facebookId } });
    if (!user) return null;

    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      facebookId: user.facebookId,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async upsertByFacebookId(data: UpsertFacebookUserData): Promise<{ user: User; created: boolean }> {
    const existing = await prisma.user.findUnique({ where: { facebookId: data.facebookId } });

    const record = await prisma.user.upsert({
      where: { facebookId: data.facebookId },
      update: {},
      create: {
        name: data.name,
        email: data.email.trim().toLowerCase(),
        facebookId: data.facebookId,
        role: 'USER',
      },
    });

    const user = new User({
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

    return { user, created: existing === null };
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

  async findAll(): Promise<UserListItemRepository[]> {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    });

    return users.map((user: (typeof users)[number]) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
    }));
  }
}
