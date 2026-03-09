import { Request, Response, NextFunction } from 'express';
import { LogoutController } from '@interfaces/http/controllers/user/logout-controller';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ICacheService } from '@domain/services/cache-service';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';
import type { IUserRepository } from '@domain/repositories/user-repository';
import type { ICacheService } from '@domain/services/cache-service';
import { userCacheKey } from '@utils/cache-keys';

const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    clearCookie: jest.fn(),
  };

  return res as unknown as Response;
};

const makeNextMock = () => jest.fn() as unknown as NextFunction;

function makeUserRepositoryMock(): jest.Mocked<Pick<IUserRepository, 'incrementTokenVersion'>> {
  return {
    incrementTokenVersion: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCacheServiceMock(): jest.Mocked<Pick<ICacheService, 'del'>> {
  return {
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('LogoutController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve limpar o cookie de autenticação e retornar 200', async () => {
    const controller = new LogoutController(
      makeUserRepositoryMock() as unknown as IUserRepository,
      makeCacheServiceMock() as unknown as ICacheService,
    );

    const req = { user: undefined } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Logout successful',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve invalidar sessão quando houver usuário autenticado', async () => {
    const userRepository = makeUserRepositoryMock();
    const cacheService = makeCacheServiceMock();

    const controller = new LogoutController(
      userRepository as unknown as IUserRepository,
      cacheService as unknown as ICacheService,
    );

    const req = {
      user: { id: 'user-1', role: 'USER', tokenVersion: 0 },
    } as unknown as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(userRepository.incrementTokenVersion).toHaveBeenCalledWith('user-1');
    expect(cacheService.del).toHaveBeenCalledWith(userCacheKey('user-1'));
    expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve repassar o erro para next quando clearCookie lançar erro', async () => {
    const controller = new LogoutController(
      makeUserRepositoryMock() as unknown as IUserRepository,
      makeCacheServiceMock() as unknown as ICacheService,
    );

    const req = { user: { id: 'u1', role: 'USER', tokenVersion: 0 } } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    await controller.handle(req, res, next);

  it('deve repassar o erro para next quando ocorrer exceção', async () => {
    const userRepo = makeUserRepoMock();
    userRepo.incrementTokenVersion.mockRejectedValue(new Error('db error'));

    const controller = new LogoutController(
      userRepo as unknown as IUserRepository,
      makeCacheServiceMock(),
    );

    const req = { user: { id: 'u1', role: 'USER', tokenVersion: 0 } } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
