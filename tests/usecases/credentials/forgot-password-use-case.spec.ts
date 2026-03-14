import crypto from 'crypto';
import { ForgotPasswordUseCase } from '@usecases/credentials/forgot-password-use-case';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token-repository';
import type { IMailerService } from '@domain/services/mailer-service';
import { User } from '@domain/entities/user';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function makeUserRepoMock(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByGoogleId: jest.fn(),
    create: jest.fn(),
    upsertByGoogleId: jest.fn(),
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

function makeMailerMock(): jest.Mocked<IMailerService> {
  return {
    sendMail: jest.fn(),
  };
}

describe('ForgotPasswordUseCase', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3001';
    process.env.PASSWORD_RESET_PATH = '/reset-password/{token}';
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = '15';
  });

  it('não deve enviar e-mail quando usuário não existir', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const mailer = makeMailerMock();

    userRepo.findByEmail.mockResolvedValue(null);

    const useCase = new ForgotPasswordUseCase(userRepo, resetTokenRepo, mailer);
    await useCase.execute('no@exemplo.com');

    expect(resetTokenRepo.replaceTokenForUser).not.toHaveBeenCalled();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('deve criar token e enviar e-mail quando usuário existir', async () => {
    const userRepo = makeUserRepoMock();
    const resetTokenRepo = makeResetTokenRepoMock();
    const mailer = makeMailerMock();

    const user = new User({
      id: 'u1',
      name: 'User',
      email: 'user@example.com',
      passwordHash: 'hash',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    userRepo.findByEmail.mockResolvedValue(user);
    resetTokenRepo.replaceTokenForUser.mockImplementation(async (userId, input) => ({
      id: 't1',
      userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      usedAt: null,
    }));
    mailer.sendMail.mockResolvedValue(undefined);

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

    expect(resetTokenRepo.replaceTokenForUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ tokenHash: expectedHash }),
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
