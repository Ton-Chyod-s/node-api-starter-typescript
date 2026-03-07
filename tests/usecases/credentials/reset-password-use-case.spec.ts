import crypto from 'crypto';

import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import { User } from '@domain/entities/user';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('ResetPasswordUseCase', () => {
  it('deve falhar com token inválido', async () => {
    const userRepo: jest.Mocked<IUserRepository> = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
      findAll: jest.fn(),
      incrementTokenVersion: jest.fn(),
    };

    const resetTokenRepo: jest.Mocked<IPasswordResetTokenRepository> = {
      replaceTokenForUser: jest.fn(),
      findValidByTokenHash: jest.fn(),
      markUsed: jest.fn(),
      consumeByTokenHash: jest.fn().mockResolvedValue(null),
    };

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo);

    await expect(
      useCase.execute({ token: 'invalid-token', newPassword: 'SenhaForte123' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired token',
      code: 'PASSWORD_RESET_INVALID_TOKEN',
    });
  });

  it('deve atualizar senha e marcar token como usado', async () => {
    const user = new User({
      id: 'u1',
      name: 'User',
      email: 'user@example.com',
      passwordHash: 'old',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const rawToken = 'abc123token-value-xxxxxxxx';
    const tokenHash = sha256Hex(rawToken);

    const userRepo: jest.Mocked<IUserRepository> = {
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(user),
      create: jest.fn(),
      updatePasswordHash: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
      incrementTokenVersion: jest.fn(),
    };

    const resetTokenRepo: jest.Mocked<IPasswordResetTokenRepository> = {
      replaceTokenForUser: jest.fn(),
      findValidByTokenHash: jest.fn(),
      markUsed: jest.fn(),
      consumeByTokenHash: jest.fn().mockResolvedValue('u1'),
    };

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo);
    await useCase.execute({ token: rawToken, newPassword: 'NovaSenhaForte123' });

    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith(
      tokenHash,
      expect.any(String),
    );
    expect(userRepo.updatePasswordHash).not.toHaveBeenCalled();
    expect(resetTokenRepo.markUsed).not.toHaveBeenCalled();
  });
});
