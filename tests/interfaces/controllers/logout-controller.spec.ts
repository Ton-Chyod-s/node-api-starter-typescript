import { Request, Response, NextFunction } from 'express';
import { LogoutController } from '@interfaces/http/controllers/user/logout-controller';
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

describe('LogoutController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve limpar o cookie de autenticação e retornar 200', () => {
    const controller = new LogoutController();

    const req = {} as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    controller.handle(req, res, next);

    expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, expect.any(Object));

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Logout successful',
      }),
    );

    expect(next).not.toHaveBeenCalled();
  });

  it('deve repassar o erro para next quando clearCookie lançar erro', () => {
    const controller = new LogoutController();

    const req = {} as Request;
    const res = makeResponseMock();
    const next = makeNextMock();

    const error = new Error('Cookie clear failed');
    (res.clearCookie as jest.Mock).mockImplementation(() => {
      throw error;
    });

    controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
