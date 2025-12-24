import { PrismaUserRepository } from '@infrastructure/repositories/user-repositories';
import { prisma } from '@infrastructure/prisma/client';
import { User } from '@domain/entities/user';

jest.mock('@infrastructure/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('PrismaUserRepository', () => {
  const repo = new PrismaUserRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findByEmail deve retornar null quando não encontrar', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue(null);

    const result = await repo.findByEmail('a@a.com');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@a.com' } });
    expect(result).toBeNull();
  });

  it('findByEmail deve mapear registro do prisma para entidade User', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
      id: '1',
      name: 'Klay',
      email: 'k@k.com',
      passwordHash: 'hash',
    });

    const result = await repo.findByEmail('k@k.com');

    expect(result).toBeInstanceOf(User);

    expect(result).toMatchObject({
      id: '1',
      name: 'Klay',
      email: 'k@k.com',
      passwordHash: 'hash',
    });
  });

  it('create deve chamar prisma.user.create com os dados e retornar User mapeado', async () => {
    (prisma.user.create as unknown as jest.Mock).mockResolvedValue({
      id: '2',
      name: 'Novo',
      email: 'n@n.com',
      passwordHash: 'hash2',
    });

    const result = await repo.create({
      name: 'Novo',
      email: 'n@n.com',
      passwordHash: 'hash2',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { name: 'Novo', email: 'n@n.com', passwordHash: 'hash2' },
    });

    expect(result).toBeInstanceOf(User);
    expect(result).toMatchObject({
      id: '2',
      name: 'Novo',
      email: 'n@n.com',
      passwordHash: 'hash2',
    });
  });

  it('deve propagar erro do prisma (findByEmail)', async () => {
    (prisma.user.findUnique as unknown as jest.Mock).mockRejectedValue(new Error('db down'));

    await expect(repo.findByEmail('x@x.com')).rejects.toThrow('db down');
  });
});
