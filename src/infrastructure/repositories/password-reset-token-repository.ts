import { prisma } from '@infrastructure/prisma/client';
import type {
  CreatePasswordResetTokenInput,
  IPasswordResetTokenRepository,
  PasswordResetTokenRecord,
} from '@domain/repositories/password-reset-token-repository';

export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async replaceTokenForUser(
    userId: string,
    input: Omit<CreatePasswordResetTokenInput, 'userId'>,
  ): Promise<PasswordResetTokenRecord> {
    const [, token] = await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.create({
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
  ): Promise<PasswordResetTokenRecord | null> {
    const token = await prisma.passwordResetToken.findFirst({
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

  async markUsed(id: string, usedAt: Date = new Date()): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt },
    });
  }

  async consumeByTokenHash(tokenHash: string, now: Date = new Date()): Promise<string | null> {
    return prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, userId: true },
      });

      if (!token) return null;

      const updateToken = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (updateToken.count !== 1) return null;

      return token.userId;
    });
  }
}
