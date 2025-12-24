import { CreateUserUseCase } from '@usecases/user/create-use-case';
import { IUserRepository } from '@domain/repositories/user-repository';
import { User } from '@domain/entities/user';

jest.mock('@utils/password-generator', () => ({
  hashPassword: jest.fn(),
}));

import { hashPassword } from '@utils/password-generator';

type RepoMock = jest.Mocked<IUserRepository>;

function makeRepoMock(): RepoMock {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn(),
  };
}

describe('CreateUserUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve normalizar o email, verificar existência, hashear a senha e criar o usuário', async () => {
    const repo = makeRepoMock();
    const useCase = new CreateUserUseCase(repo);

    repo.findByEmail.mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');

    const created = new User({
      id: 'u1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
      role: 'USER',
    });
    repo.create.mockResolvedValue(created);

    const result = await useCase.execute({
      name: 'John Doe',
      email: '  John.DOE@Example.com  ',
      password: 'super-secret',
    });

    expect(repo.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
    expect(hashPassword).toHaveBeenCalledWith('super-secret');

    expect(repo.create).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
    });

    expect(result).toBe(created);
  });

  it('deve lançar erro 409 quando o email já existir', async () => {
    const repo = makeRepoMock();
    const useCase = new CreateUserUseCase(repo);

    repo.findByEmail.mockResolvedValue(
      new User({
        id: 'u1',
        name: 'Existing',
        email: 'john.doe@example.com',
        passwordHash: 'hash',
        role: 'USER',
      }),
    );

    await expect(
      useCase.execute({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'super-secret',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'User already exists',
      code: 'USER_ALREADY_EXISTS',
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
