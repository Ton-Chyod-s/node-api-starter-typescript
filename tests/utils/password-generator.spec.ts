import argon2 from 'argon2';
import { hashPassword, verifyPassword } from '@utils/password-generator';

jest.mock('argon2', () => {
  const hash = jest.fn();
  const verify = jest.fn();

  return {
    __esModule: true,
    default: { hash, verify },
    hash,
    verify,
  };
});

const mockedArgon2 = argon2 as unknown as {
  hash: jest.Mock;
  verify: jest.Mock;
};

describe('password-generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('deve chamar argon2.hash com a senha e retornar o hash', async () => {
      mockedArgon2.hash.mockResolvedValue('hash_gerado');

      await expect(hashPassword('minha_senha')).resolves.toBe('hash_gerado');

      expect(mockedArgon2.hash).toHaveBeenCalledTimes(1);
      expect(mockedArgon2.hash).toHaveBeenCalledWith('minha_senha');
    });

    it('deve propagar erro do argon2.hash', async () => {
      mockedArgon2.hash.mockRejectedValue(new Error('falhou'));

      await expect(hashPassword('x')).rejects.toThrow('falhou');
    });
  });

  describe('verifyPassword', () => {
    it('deve chamar argon2.verify com (hash, password) e retornar true/false', async () => {
      mockedArgon2.verify.mockResolvedValue(true);

      await expect(verifyPassword('minha_senha', 'hash_gerado')).resolves.toBe(true);

      expect(mockedArgon2.verify).toHaveBeenCalledTimes(1);
      expect(mockedArgon2.verify).toHaveBeenCalledWith('hash_gerado', 'minha_senha');
    });

    it('deve propagar erro do argon2.verify', async () => {
      mockedArgon2.verify.mockRejectedValue(new Error('erro verify'));

      await expect(verifyPassword('senha', 'hash')).rejects.toThrow('erro verify');
    });
  });
});
