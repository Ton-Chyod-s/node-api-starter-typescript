import crypto from 'crypto';

import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import type { ICacheService } from '@domain/services/cache-service';
import { User } from '@domain/entities/user';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function makeUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn(),
    findAll: jest.fn(),
    incrementTokenVersion: jest.fn(),
  };
}

function makeResetTokenRepoMock(): jest.Mocked<IPasswordResetTokenRepository> {
  return {
    replaceTokenForUser: jest.fn(),
    findValidByTokenHash: jest.fn(),
    markUsed: jest.fn(),
    consumeByTokenHash: jest.fn(),
  };
}

function makeCacheServiceMock(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ResetPasswordUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve falhar com token inválido', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const cacheService = makeCacheServiceMock();
    resetTokenRepo.consumeByTokenHash.mockResolvedValue(null);

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);

    await expect(
      useCase.execute({ token: 'invalid-token', newPassword: 'SenhaForte123' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired token',
      code: 'PASSWORD_RESET_INVALID_TOKEN',
    });
  });

  it('deve atualizar senha e marcar token como usado', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const cacheService = makeCacheServiceMock();

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

    userRepo.findById.mockResolvedValue(user);
    userRepo.updatePasswordHash.mockResolvedValue(undefined);
    resetTokenRepo.consumeByTokenHash.mockResolvedValue('u1');

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);
    await useCase.execute({ token: rawToken, newPassword: 'NovaSenhaForte123' });

    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith(tokenHash);
    expect(userRepo.updatePasswordHash).toHaveBeenCalledWith('u1', expect.any(String));
    expect(userRepo.incrementTokenVersion).toHaveBeenCalledWith('u1');
    expect(cacheService.del).toHaveBeenCalledWith(expect.stringContaining('u1'));
    expect(resetTokenRepo.markUsed).not.toHaveBeenCalled();
  });
});
