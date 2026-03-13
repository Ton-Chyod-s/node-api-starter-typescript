import { ResetPasswordUseCase } from '@usecases/credentials/reset-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import type { ICacheService } from '@domain/services/cache-service';

jest.mock('@utils/password-generator', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-new-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('@utils/hash', () => ({
  sha256Hex: jest.fn((v: string) => `sha256:${v}`),
}));

function makeUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
    incrementTokenVersion: jest.fn().mockResolvedValue(undefined),
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

  it('deve falhar com token inválido (vazio)', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const cacheService = makeCacheServiceMock();

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);

    await expect(
      useCase.execute({ token: '   ', newPassword: 'SenhaForte123!' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired token',
      code: 'PASSWORD_RESET_INVALID_TOKEN',
    });
  });

  it('deve falhar quando token não encontrado no banco', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const cacheService = makeCacheServiceMock();

    resetTokenRepo.consumeByTokenHash.mockResolvedValue(null);

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);

    await expect(
      useCase.execute({ token: 'token-inexistente', newPassword: 'SenhaForte123!' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired token',
      code: 'PASSWORD_RESET_INVALID_TOKEN',
    });

    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith('sha256:token-inexistente');
  });

  it('deve atualizar senha e marcar token como usado', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const cacheService = makeCacheServiceMock();

    resetTokenRepo.consumeByTokenHash.mockResolvedValue('u1');

    const useCase = new ResetPasswordUseCase(userRepo, resetTokenRepo, cacheService);
    await useCase.execute({ token: 'valid-token-123', newPassword: 'NovaSenhaForte123!' });

    expect(resetTokenRepo.consumeByTokenHash).toHaveBeenCalledWith('sha256:valid-token-123');
    expect(userRepo.updatePasswordHash).toHaveBeenCalledWith('u1', 'hashed-new-password');
    expect(userRepo.incrementTokenVersion).toHaveBeenCalledWith('u1');
    expect(cacheService.del).toHaveBeenCalledWith(expect.stringContaining('u1'));
  });
});
