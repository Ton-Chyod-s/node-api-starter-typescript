import { Request, Response, NextFunction } from 'express';
import { makeAuthMiddleware } from '@interfaces/http/middlewares/auth-middleware';
import { ITokenService } from '@domain/services/token-service';
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

function makeTokenServiceMock(): TokenMock {
  return {
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

describe('auth-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve aceitar token via cookie', () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockReturnValue({ sub: '1', role: 'USER' });

    const middleware = makeAuthMiddleware(tokenService);

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'cookie-token' },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(tokenService.verify).toHaveBeenCalledWith('cookie-token');
    expect(req.user).toEqual({ id: '1', role: 'USER' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve aceitar token via header Bearer', () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockReturnValue({ sub: '2', role: 'USER' });

    const middleware = makeAuthMiddleware(tokenService);

    const req = {
      cookies: {},
      headers: { authorization: 'Bearer header-token' },
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(tokenService.verify).toHaveBeenCalledWith('header-token');
    expect(req.user).toEqual({ id: '2', role: 'USER' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando não houver token', () => {
    const tokenService = makeTokenServiceMock();
    const middleware = makeAuthMiddleware(tokenService);

    const req = {
      cookies: {},
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.UNAUTHORIZED,
        message: 'Unauthorized',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando authorization não for Bearer', () => {
    const tokenService = makeTokenServiceMock();
    const middleware = makeAuthMiddleware(tokenService);

    const req = {
      cookies: {},
      headers: { authorization: 'Basic abc' },
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.UNAUTHORIZED,
        message: 'Unauthorized',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o token for inválido', () => {
    const tokenService = makeTokenServiceMock();
    tokenService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    const middleware = makeAuthMiddleware(tokenService);

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: 'bad-token' },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatusCodes.UNAUTHORIZED,
        message: 'Unauthorized',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve chamar next(err) quando ocorrer erro inesperado ao ler req', () => {
    const tokenService = makeTokenServiceMock();
    const middleware = makeAuthMiddleware(tokenService);

    const req = {
      get cookies() {
        throw new Error('boom');
      },
      headers: {},
    } as unknown as Request;

    const res = makeResponseMock();
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
