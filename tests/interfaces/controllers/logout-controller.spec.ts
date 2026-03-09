import { Request, Response, NextFunction } from 'express';
import { LogoutController } from '@interfaces/http/controllers/user/logout-controller';
import { IUserRepository } from '@domain/repositories/user-repository';
import { ICacheService } from '@domain/services/cache-service';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    clearCookie: jest.fn(),
  };

  return res as unknown as Response;
};

const makeNextMock = () => jest.fn() as unknown as NextFunction;

function makeUserRepoMock(): jest.Mocked<Pick<IUserRepository, 'incrementTokenVersion'>> {
  return { incrementTokenVersion: jest.fn().mockResolvedValue(undefined) };
}

function makeCacheServiceMock(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('LogoutController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve limpar o cookie de autenticação e retornar 200', async () => {
    const controller = new LogoutController(
      makeUserRepoMock() as unknown as IUserRepository,
      makeCacheServiceMock(),
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

  it('deve incrementar tokenVersion e invalidar cache quando usuário autenticado', async () => {
    const userRepo = makeUserRepoMock();
    const cacheService = makeCacheServiceMock();
    const controller = new LogoutController(
      userRepo as unknown as IUserRepository,
      cacheService,
    );

    const req = { user: { id: 'u1', role: 'USER', tokenVersion: 0 } } as unknown as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(userRepo.incrementTokenVersion).toHaveBeenCalledWith('u1');
    expect(cacheService.del).toHaveBeenCalledWith(expect.stringContaining('u1'));
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
  });

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
