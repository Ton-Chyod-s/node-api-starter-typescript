import { Request, Response, NextFunction } from 'express';
import { LoginController } from '@interfaces/http/controllers/user/login-controller';
import { LoginUseCase } from '@usecases/user/login-use-case';
import { httpStatusCodes } from '@utils/httpConstants';
import { AUTH_COOKIE_NAME } from '@interfaces/http/cookies/auth-cookie';

const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    cookie: jest.fn(),
  };

  return res as unknown as Response;
};

const makeNextMock = () => jest.fn() as unknown as NextFunction;

const makeLoginUseCaseMock = () => {
  return {
    execute: jest.fn(),
  } as unknown as LoginUseCase;
};

describe('LoginController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 200, setar cookie e retornar usuário quando o body é válido', async () => {
    const useCase = makeLoginUseCaseMock();
    const controller = new LoginController(useCase);

    const req = {
      body: {
        email: 'John.DOE@Example.com',
        password: '12345678',
      },
    } as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    const loginResult = {
      token: 'fake-token',
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'USER' as const,
      },
    };

    (useCase.execute as jest.Mock).mockResolvedValue(loginResult);

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      email: 'john.doe@example.com',
      password: '12345678',
    });

    expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'fake-token', expect.any(Object));

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Login successful',
        data: {
          user: loginResult.user,
        },
      }),
    );

    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 400 e não chamar o use case quando o body é inválido', async () => {
    const useCase = makeLoginUseCaseMock();
    const controller = new LoginController(useCase);

    const req = {
      body: {
        email: 'email-invalido',
        password: '123',
      },
    } as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid request body',
        data: {
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(Array),
              message: expect.any(String),
            }),
          ]),
        },
      }),
    );

    expect(next).not.toHaveBeenCalled();
  });

  it('deve repassar o erro para next quando o use case lançar erro', async () => {
    const useCase = makeLoginUseCaseMock();
    const controller = new LoginController(useCase);

    const req = {
      body: {
        email: 'john.doe@example.com',
        password: '12345678',
      },
    } as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    const error = new Error('Invalid credentials');
    (useCase.execute as jest.Mock).mockRejectedValue(error);

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      email: 'john.doe@example.com',
      password: '12345678',
    });

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith(error);
  });
});
