import { Request, Response, NextFunction } from 'express';
import { RegisterController } from '@interfaces/http/controllers/user/register-controller';
import { CreateUserUseCase } from '@usecases/user/create-use-case';
import { User } from '@domain/entities/user';
import { httpStatusCodes } from '@utils/httpConstants';

const makeResponseMock = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  return res as unknown as Response;
};

const makeNextMock = () => jest.fn() as unknown as NextFunction;

const makeUseCaseMock = () => {
  return {
    execute: jest.fn(),
  } as unknown as CreateUserUseCase;
};

describe('RegisterController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 201 e usuário criado quando o body é válido', async () => {
    const useCase = makeUseCaseMock();
    const controller = new RegisterController(useCase);

    const req = {
      body: {
        name: '  John Doe  ',
        email: 'John.DOE@Example.com',
        password: '12345678',
      },
    } as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    const user = new User({
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hash',
      role: 'USER',
    });

    (useCase.execute as jest.Mock).mockResolvedValue(user);

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '12345678',
    });

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User created successfully',
        data: expect.objectContaining({
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'USER',
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 400 e não chamar o use case quando o body é inválido (senha curta, nome pequeno, email inválido)', async () => {
    const useCase = makeUseCaseMock();
    const controller = new RegisterController(useCase);

    const req = {
      body: {
        name: 'J',
        email: 'email-invalido',
        password: '123',
      },
    } as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();

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
    const useCase = makeUseCaseMock();
    const controller = new RegisterController(useCase);

    const req = {
      body: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: '12345678',
      },
    } as Request;

    const res = makeResponseMock();
    const next = makeNextMock();

    const error = new Error('User already exists');
    (useCase.execute as jest.Mock).mockRejectedValue(error);

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
