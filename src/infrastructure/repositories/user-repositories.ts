import { prisma } from '../prisma/client';
import { IUserRepository, CreateUserData } from '@domain/repositories/user-repository';
import { User, type UserRole } from '@domain/entities/user';

function normalizeRole(role: unknown): UserRole {
  return role === 'ADMIN' || role === 'USER' ? (role as UserRole) : 'USER';
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
      role: normalizeRole((user as unknown as { role?: unknown }).role),
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
      role: normalizeRole((user as unknown as { role?: unknown }).role),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });

    return new User({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: normalizeRole((user as unknown as { role?: unknown }).role),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
