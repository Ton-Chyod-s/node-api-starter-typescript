/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stub do @prisma/client para uso em testes unitários/de integração leve.
 * Evita a necessidade de rodar `prisma generate` no ambiente de CI/teste.
 */

type TransactionClient = {
  $executeRawUnsafe: (...args: any[]) => Promise<any>;
  $queryRaw: (...args: any[]) => Promise<any>;
  [key: string]: any;
};

export class PrismaClient {
  $transaction: ((fn: (tx: TransactionClient) => Promise<any>) => Promise<any>) & jest.Mock =
    jest.fn(async (fn: (tx: TransactionClient) => Promise<any>) => fn(this as any));
  $executeRawUnsafe = jest.fn().mockResolvedValue(undefined);
  $queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1n }]);
  $disconnect = jest.fn().mockResolvedValue(undefined);
  user = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  passwordResetToken = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
}

export const Prisma = {
  PrismaClientKnownRequestError: class extends Error {
    code: string;
    constructor(message: string, opts: { code: string; clientVersion: string }) {
      super(message);
      this.code = opts.code;
    }
  },
};
