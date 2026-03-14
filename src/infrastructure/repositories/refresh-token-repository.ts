import { prisma } from '@infrastructure/prisma/client';
import type {
  CreateRefreshTokenInput,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '@domain/repositories/refresh-token-repository';

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  async replaceTokenForUser(
    userId: string,
    input: Omit<CreateRefreshTokenInput, 'userId'>,
  ): Promise<RefreshTokenRecord> {
    const [, token] = await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.refreshToken.create({
        data: {
          userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      }),
    ]);

    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      usedAt: token.usedAt,
    };
  }

  async findValidByTokenHash(
    tokenHash: string,
    now: Date = new Date(),
  ): Promise<RefreshTokenRecord | null> {
    const token = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (!token) return null;

    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      usedAt: token.usedAt,
    };
  }

  async consumeByTokenHash(tokenHash: string, now: Date = new Date()): Promise<string | null> {    return prisma.$transaction(async (tx) => {
      const token = await tx.refreshToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, userId: true },
      });

      if (!token) return null;

      const updated = await tx.refreshToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (updated.count !== 1) return null;

      return token.userId;
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
