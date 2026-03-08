import crypto from 'crypto';

import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import type { ICacheService } from '@domain/services/cache-service';
import { User } from '@domain/entities/user';
import { userCacheKey } from '@utils/cache-keys';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function makeCacheServiceMock(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ResetPasswordUseCase', () => {
  it('deve falhar com token inválido sem hashear a senha', async () => {
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
      findValidByTokenHash: jest.fn().mockResolvedValue(null),
      markUsed: jest.fn(),
      consumeByTokenHash: jest.fn().mockResolvedValue(null),
    };

    const cacheService = makeCacheServiceMock();
    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);

    await expect(
      useCase.execute({ token: 'invalid-token', newPassword: 'SenhaForte123' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired token',
      code: 'PASSWORD_RESET_INVALID_TOKEN',
    });

    expect(resetTokenRepo.consumeByTokenHash).not.toHaveBeenCalled();
    expect(userRepo.updatePasswordHash).not.toHaveBeenCalled();
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('deve atualizar senha, consumir o token e invalidar o cache', async () => {
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
      incrementTokenVersion: jest.fn().mockResolvedValue(undefined),
    };

    const resetTokenRepo: jest.Mocked<IPasswordResetTokenRepository> = {
      replaceTokenForUser: jest.fn(),
      findValidByTokenHash: jest.fn().mockResolvedValue({
        id: 'prt-1',
        userId: 'u1',
        tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        usedAt: null,
      }),
      markUsed: jest.fn(),
      consumeByTokenHash: jest.fn().mockResolvedValue('u1'),
    };

    const cacheService = makeCacheServiceMock();
    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);

    await useCase.execute({ token: rawToken, newPassword: 'NovaSenhaForte123' });

    expect(resetTokenRepo.findValidByTokenHash).toHaveBeenCalledWith(tokenHash);
    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith(tokenHash);
    expect(userRepo.updatePasswordHash).toHaveBeenCalledWith('u1', expect.any(String));
    expect(userRepo.incrementTokenVersion).toHaveBeenCalledWith('u1');
    expect(cacheService.del).toHaveBeenCalledWith(userCacheKey('u1'));
    expect(resetTokenRepo.markUsed).not.toHaveBeenCalled();
  });

  it('deve ignorar falha ao invalidar o cache após reset', async () => {
    const userRepo: jest.Mocked<IUserRepository> = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
      incrementTokenVersion: jest.fn().mockResolvedValue(undefined),
    };

    const resetTokenRepo: jest.Mocked<IPasswordResetTokenRepository> = {
      replaceTokenForUser: jest.fn(),
      findValidByTokenHash: jest.fn().mockResolvedValue({
        id: 'prt-1',
        userId: 'u1',
        tokenHash: sha256Hex('valid-token'),
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        usedAt: null,
      }),
      markUsed: jest.fn(),
      consumeByTokenHash: jest.fn().mockResolvedValue('u1'),
    };

    const cacheService = makeCacheServiceMock();
    cacheService.del.mockRejectedValue(new Error('redis down'));

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);

    await expect(
      useCase.execute({ token: 'valid-token', newPassword: 'SenhaMuitoForte123' }),
    ).resolves.toBeUndefined();

    expect(userRepo.updatePasswordHash).toHaveBeenCalledWith('u1', expect.any(String));
    expect(userRepo.incrementTokenVersion).toHaveBeenCalledWith('u1');
    expect(cacheService.del).toHaveBeenCalledWith(userCacheKey('u1'));
  });
});
