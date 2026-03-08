import { Request, Response, NextFunction } from 'express';
import { makeAuthMiddleware } from '@interfaces/http/middlewares/auth-middleware';
import { ITokenService } from '@domain/services/token-service';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ICacheService } from '@domain/services/cache-service';
import { User } from '@domain/entities/user';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  return res as unknown as Response;
};

type TokenMock = jest.Mocked<ITokenService>;
type RepoMock = jest.Mocked<Pick<IUserRepository, 'findById'>>;
type CacheMock = jest.Mocked<ICacheService>;

function makeTokenServiceMock(): TokenMock {
  return {
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

function makeUserRepoMock(): RepoMock {
  return { findById: jest.fn() };
}

function makeCacheServiceMock(): CacheMock {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUserStub(overrides: Partial<{ id: string; tokenVersion: number }> = {}): User {
  return new User({
    id: overrides.id ?? '1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: 'USER',
    tokenVersion: overrides.tokenVersion ?? 0,
  });
}

describe('auth-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve aceitar token via cookie quando tokenVersion bate com o banco', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    tokenService.verify.mockReturnValue({ sub: '1', role: 'USER', tokenVersion: 0 });
    userRepo.findById.mockResolvedValue(makeUserStub({ id: '1', tokenVersion: 0 }));

    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'cookie-token' },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(tokenService.verify).toHaveBeenCalledWith('cookie-token');
    expect(userRepo.findById).toHaveBeenCalledWith('1');
    expect(req.user).toEqual({ id: '1', role: 'USER', tokenVersion: 0 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve aceitar token via header Bearer', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    tokenService.verify.mockReturnValue({ sub: '2', role: 'USER', tokenVersion: 3 });
    userRepo.findById.mockResolvedValue(makeUserStub({ id: '2', tokenVersion: 3 }));

    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: {},
      headers: { authorization: 'Bearer header-token' },
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(tokenService.verify).toHaveBeenCalledWith('header-token');
    expect(req.user).toEqual({ id: '2', role: 'USER', tokenVersion: 3 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando tokenVersion do token diverge do banco (token revogado)', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    tokenService.verify.mockReturnValue({ sub: '1', role: 'USER', tokenVersion: 0 });
    
    userRepo.findById.mockResolvedValue(makeUserStub({ id: '1', tokenVersion: 1 }));

    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'stale-token' },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: httpStatusCodes.UNAUTHORIZED, message: 'Unauthorized' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando usuário não existe no banco', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    tokenService.verify.mockReturnValue({ sub: 'ghost', role: 'USER', tokenVersion: 0 });
    userRepo.findById.mockResolvedValue(null);

    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'valid-sig-but-deleted-user' },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando não houver token', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: {},
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando authorization não for Bearer', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: {},
      headers: { authorization: 'Basic abc' },
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o token for inválido (verify lança erro)', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    tokenService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'bad-token' },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('deve chamar next(err) quando ocorrer erro inesperado ao ler req', async () => {
    const tokenService = makeTokenServiceMock();
    const userRepo = makeUserRepoMock();
    const middleware = makeAuthMiddleware(tokenService, userRepo as unknown as IUserRepository, makeCacheServiceMock());

    const req = {
      get cookies() {
        throw new Error('boom');
      },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
