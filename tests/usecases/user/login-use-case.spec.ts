import { LoginUseCase } from '@usecases/user/login-use-case';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ITokenService } from '@domain/services/token-service';
import { User } from '@domain/entities/user';

jest.mock('@utils/password-generator', () => ({
  verifyPassword: jest.fn(),
}));

import { verifyPassword } from '@utils/password-generator';

type RepoMock = jest.Mocked<IUserRepository>;
type TokenMock = jest.Mocked<ITokenService>;

function makeRepoMock(): RepoMock {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn(),
  };
}

function makeTokenMock(): TokenMock {
  return {
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

describe('LoginUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve lançar 401 quando o usuário não existir', async () => {
    const repo = makeRepoMock();
    const tokenService = makeTokenMock();
    const useCase = new LoginUseCase(repo, tokenService);

    repo.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'john.doe@example.com', password: '12345678' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
      code: 'AUTH_INVALID_CREDENTIALS',
    });

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('deve lançar 401 quando a senha estiver incorreta', async () => {
    const repo = makeRepoMock();
    const tokenService = makeTokenMock();
    const useCase = new LoginUseCase(repo, tokenService);

    const user = new User({
      id: 'u1',
      name: 'John',
      email: 'john.doe@example.com',
      passwordHash: 'hash',
      role: 'USER',
    });

    repo.findByEmail.mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'john.doe@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
      code: 'AUTH_INVALID_CREDENTIALS',
    });

    expect(verifyPassword).toHaveBeenCalledWith('wrong', 'hash');
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('deve retornar token e user quando credenciais forem válidas', async () => {
    const repo = makeRepoMock();
    const tokenService = makeTokenMock();
    const useCase = new LoginUseCase(repo, tokenService);

    const user = new User({
      id: 'u1',
      name: 'John',
      email: 'john.doe@example.com',
      passwordHash: 'hash',
      role: 'USER',
    });

    repo.findByEmail.mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    tokenService.sign.mockReturnValue('token-123');

    const result = await useCase.execute({
      email: 'john.doe@example.com',
      password: 'correct',
    });

    expect(verifyPassword).toHaveBeenCalledWith('correct', 'hash');
    expect(tokenService.sign).toHaveBeenCalledWith({ sub: 'u1', role: 'USER' });

    expect(result).toEqual({
      token: 'token-123',
      user: {
        id: 'u1',
        name: 'John',
        email: 'john.doe@example.com',
        role: 'USER',
      },
    });
  });
});
