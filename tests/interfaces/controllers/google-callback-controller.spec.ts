import { Request, Response, NextFunction } from 'express';
import { GoogleCallbackController } from '@interfaces/http/controllers/user/google-callback-controller';
import { GoogleLoginUseCase } from '@usecases/user/google-login-use-case';
import { AppError } from '@utils/app-error';
import { httpStatusCodes } from '@utils/httpConstants';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  const getToken = jest.fn();

  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      getToken,
      verifyIdToken,
    })),
    __verifyIdToken: verifyIdToken,
    __getToken: getToken,
  };
});

jest.mock('@config/env', () => ({
  env: {
    NODE_ENV: 'test',
    APP_NAME: 'app',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
    FRONTEND_URL: undefined,
    COOKIE_SECURE: false,
    COOKIE_SAMESITE: 'lax',
    JWT_EXPIRES_IN: '1h',
    REFRESH_TOKEN_EXPIRES_IN_DAYS: 30 * 24 * 60 * 60 * 1000,
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OAUTH_STATE_COOKIE = 'oauth_state';
const VALID_STATE = 'valid-csrf-state-token';

function makeResMock() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
  };
  return res as unknown as Response;
}

function makeNextMock() {
  return jest.fn() as unknown as NextFunction;
}

function makeUseCaseMock() {
  return { execute: jest.fn() } as unknown as GoogleLoginUseCase;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    query: { state: VALID_STATE, code: 'auth-code-from-google' },
    cookies: { [OAUTH_STATE_COOKIE]: VALID_STATE },
    ...overrides,
  } as unknown as Request;
}

function makeOAuthResult() {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'user-id', name: 'John', email: 'john@example.com', role: 'USER' },
    created: false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GoogleCallbackController', () => {
  let useCase: GoogleLoginUseCase;
  let controller: GoogleCallbackController;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { __verifyIdToken, __getToken } = require('google-auth-library');

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = makeUseCaseMock();
    controller = new GoogleCallbackController(useCase);

    __getToken.mockResolvedValue({ tokens: { id_token: 'google-id-token' } });
    __verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'john@example.com',
        name: 'John Doe',
      }),
    });
    (useCase.execute as jest.Mock).mockResolvedValue(makeOAuthResult());
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('deve retornar 200 e setar cookies quando o fluxo OAuth é válido', async () => {
    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      googleId: 'google-sub-123',
      email: 'john@example.com',
      name: 'John Doe',
    });

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Google login successful' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('deve redirecionar para FRONTEND_URL quando configurado', async () => {
    const { env } = await import('@config/env');
    (env as Record<string, unknown>).FRONTEND_URL = 'http://frontend.local';

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('http://frontend.local');

    (env as Record<string, unknown>).FRONTEND_URL = undefined;
  });

  it('deve limpar o cookie de estado OAuth independente do resultado', async () => {
    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    // Força erro para garantir que clearCookie é chamado mesmo antes do throw
    __getToken.mockRejectedValue(new Error('network error'));

    await controller.handle(req, res, next);

    expect(res.clearCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, { path: '/' });
  });

  // ── State CSRF validation ────────────────────────────────────────────────────

  it('deve chamar next com AppError 403 quando state não corresponde ao cookie', async () => {
    const req = makeReq({
      query: { state: 'tampered-state', code: 'auth-code' },
      cookies: { [OAUTH_STATE_COOKIE]: VALID_STATE },
    });
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: 'AUTH_OAUTH_STATE_MISMATCH' }),
    );
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('deve chamar next com 403 quando cookie de estado está ausente', async () => {
    const req = makeReq({ cookies: {} });
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('deve chamar next com 403 quando state query param está ausente', async () => {
    const req = makeReq({ query: { code: 'auth-code' } });
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  // ── Code validation ──────────────────────────────────────────────────────────

  it('deve chamar next com 400 quando authorization code está ausente', async () => {
    const req = makeReq({ query: { state: VALID_STATE } });
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, code: 'AUTH_MISSING_CODE' }),
    );
  });

  // ── Google API failures ──────────────────────────────────────────────────────

  it('deve chamar next com 401 quando Google não retorna id_token', async () => {
    __getToken.mockResolvedValue({ tokens: {} });

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'AUTH_GOOGLE_NO_ID_TOKEN' }),
    );
  });

  it('deve chamar next com 401 quando payload do Google token é inválido', async () => {
    __verifyIdToken.mockResolvedValue({ getPayload: () => null });

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'AUTH_GOOGLE_INVALID_PAYLOAD' }),
    );
  });

  it('deve chamar next quando getToken lança exceção', async () => {
    __getToken.mockRejectedValue(new Error('Google API error'));

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ── Use case failures ────────────────────────────────────────────────────────

  it('deve chamar next quando use case lança AppError (ex: email já registrado)', async () => {
    (useCase.execute as jest.Mock).mockRejectedValue(
      AppError.conflict('An account with this email already exists.', 'AUTH_EMAIL_ALREADY_REGISTERED'),
    );

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'AUTH_EMAIL_ALREADY_REGISTERED' }),
    );
  });
});
