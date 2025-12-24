import crypto from 'crypto';
import { ForgotPasswordUseCase } from '@usecases/credentials/forgot-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import type { IMailerService } from '@domain/services/mailer-service';
import { User } from '@domain/entities/user';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('ForgotPasswordUseCase', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3001';
    process.env.PASSWORD_RESET_PATH = '/reset-password/{token}';
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = '15';
  });

  it('não deve enviar e-mail quando usuário não existir', async () => {
    const userRepo: jest.Mocked<IUserRepository> = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    const resetTokenRepo: jest.Mocked<IPasswordResetTokenRepository> = {
      deleteAllForUser: jest.fn(),
      create: jest.fn(),
      findValidByTokenHash: jest.fn(),
      markUsed: jest.fn(),
    };

    const mailer: jest.Mocked<IMailerService> = {
      sendMail: jest.fn(),
    };

    const useCase = new ForgotPasswordUseCase(userRepo, resetTokenRepo, mailer);
    await useCase.execute('no@exemplo.com');

    expect(resetTokenRepo.deleteAllForUser).not.toHaveBeenCalled();
    expect(resetTokenRepo.create).not.toHaveBeenCalled();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('deve criar token e enviar e-mail quando usuário existir', async () => {
    const user = new User({
      id: 'u1',
      name: 'User',
      email: 'user@example.com',
      passwordHash: 'hash',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepo: jest.Mocked<IUserRepository> = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findById: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    const resetTokenRepo: jest.Mocked<IPasswordResetTokenRepository> = {
      deleteAllForUser: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation(async (input) => {
        return {
          id: 't1',
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdAt: new Date(),
          usedAt: null,
        };
      }),
      findValidByTokenHash: jest.fn(),
      markUsed: jest.fn(),
    };

    const mailer: jest.Mocked<IMailerService> = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const fixed = Buffer.alloc(32, 7);
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as unknown as jest.SpyInstance<
      Buffer,
      [number]
    >;

    randomBytesSpy.mockReturnValue(fixed);

    const rawToken = fixed.toString('hex');
    const expectedHash = sha256Hex(rawToken);

    const useCase = new ForgotPasswordUseCase(userRepo, resetTokenRepo, mailer);
    await useCase.execute('USER@EXAMPLE.COM');

    expect(resetTokenRepo.deleteAllForUser).toHaveBeenCalledWith('u1');
    expect(resetTokenRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tokenHash: expectedHash }),
    );

    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Recuperação de senha',
        html: expect.stringContaining(`/reset-password/${rawToken}`),
      }),
    );
  });
});
