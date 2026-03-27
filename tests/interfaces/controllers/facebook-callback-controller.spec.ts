import { Request, Response, NextFunction } from 'express';
import { FacebookCallbackController } from '@interfaces/http/controllers/user/facebook-callback-controller';
import { FacebookLoginUseCase } from '@usecases/user/facebook-login-use-case';
import { AppError } from '@utils/app-error';
import { httpStatusCodes } from '@utils/httpConstants';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@config/env', () => ({
  env: {
    NODE_ENV: 'test',
    APP_NAME: 'app',
    FACEBOOK_APP_ID: 'fb-app-id',
    FACEBOOK_APP_SECRET: 'fb-app-secret',
    FACEBOOK_REDIRECT_URI: 'http://localhost:3000/auth/facebook/callback',
    FRONTEND_URL: undefined,
    COOKIE_SECURE: false,
    COOKIE_SAMESITE: 'lax',
    JWT_EXPIRES_IN: '1h',
    REFRESH_TOKEN_EXPIRES_IN_DAYS: 30 * 24 * 60 * 60 * 1000,
  },
}));

// ─── fetch mock (global) ──────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FACEBOOK_STATE_COOKIE = 'fb_oauth_state';
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
  return { execute: jest.fn() } as unknown as FacebookLoginUseCase;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    query: { state: VALID_STATE, code: 'fb-auth-code' },
    cookies: { [FACEBOOK_STATE_COOKIE]: VALID_STATE },
    ...overrides,
  } as unknown as Request;
}

function mockFetchSuccess(profile = {
  id: 'fb-user-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
}) {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'fb-access-token' }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => profile,
    });
}

function makeOAuthResult() {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'user-id', name: 'Jane Doe', email: 'jane@example.com', role: 'USER' },
    created: false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FacebookCallbackController', () => {
  let useCase: FacebookLoginUseCase;
  let controller: FacebookCallbackController;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = makeUseCaseMock();
    controller = new FacebookCallbackController(useCase);

    mockFetchSuccess();
    (useCase.execute as jest.Mock).mockResolvedValue(makeOAuthResult());
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('deve retornar 200 e setar cookies quando o fluxo OAuth é válido', async () => {
    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      facebookId: 'fb-user-id',
      email: 'jane@example.com',
      name: 'Jane Doe',
    });

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Facebook login successful' }),
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

  it('deve limpar o cookie de estado OAuth', async () => {
    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(res.clearCookie).toHaveBeenCalledWith(FACEBOOK_STATE_COOKIE, { path: '/' });
  });

  // ── State CSRF validation ────────────────────────────────────────────────────

  it('deve chamar next com 403 quando state não corresponde ao cookie', async () => {
    const req = makeReq({
      query: { state: 'tampered-state', code: 'fb-auth-code' },
      cookies: { [FACEBOOK_STATE_COOKIE]: VALID_STATE },
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

  // ── Facebook API failures ────────────────────────────────────────────────────

  it('deve chamar next com 401 quando Facebook retorna erro na troca do code', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'AUTH_FACEBOOK_TOKEN_ERROR' }),
    );
  });

  it('deve chamar next com 401 quando falha ao buscar perfil do Facebook', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fb-access-token' }),
      })
      .mockResolvedValueOnce({ ok: false });

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'AUTH_FACEBOOK_PROFILE_ERROR' }),
    );
  });

  it('deve chamar next com 401 quando perfil do Facebook não tem email', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fb-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-user-id', name: 'Jane Doe' }), // sem email
      });

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'AUTH_FACEBOOK_INVALID_PAYLOAD' }),
    );
  });

  it('deve chamar next quando fetch lança exceção de rede', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const req = makeReq();
    const res = makeResMock();
    const next = makeNextMock();

    await controller.handle(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ── Use case failures ────────────────────────────────────────────────────────

  it('deve chamar next quando use case lança AppError (ex: email já registrado)', async () => {
    (useCase.execute as jest.Mock).mockRejectedValue(
      AppError.conflict(
        'An account with this email already exists.',
        'AUTH_EMAIL_ALREADY_REGISTERED',
      ),
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
