import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { makeAuth } from '@interfaces/http/factories/controllers/user/make-auth-middleware';
import { LogoutController } from '@interfaces/http/controllers/user/logout-controller';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { env } from '@config/env';
import { ensureCsrfTokenCookie } from '@interfaces/http/middlewares/csrf-middleware';

const router = Router();
const authMiddleware = makeAuth();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next) => {
    const status = httpStatusCodes.TOO_MANY_REQUESTS ?? 429;

    const response = createResponse(status, 'Too many requests, please try again later');

    return res.status(status).json(response);
  },
});

const logoutController = new LogoutController();
// Controllers que dependem de banco de dados (Prisma) são carregados sob demanda.
// Isso evita que testes (ex: rotas que não usam DB) travem ao importar o módulo.

let _registerController:
  | import('@interfaces/http/controllers/user/register-controller').RegisterController
  | null = null;
async function getRegisterController() {
  if (_registerController) return _registerController;

  const { makeRegisterController } =
    await import('@interfaces/http/factories/controllers/user/register-controller.factory');

  _registerController = makeRegisterController();
  return _registerController;
}

let _loginController:
  | import('@interfaces/http/controllers/user/login-controller').LoginController
  | null = null;
async function getLoginController() {
  if (_loginController) return _loginController;

  const { makeLoginController } =
    await import('@interfaces/http/factories/controllers/user/login-controller.factory');

  _loginController = makeLoginController();
  return _loginController;
}

let _loginTokenController:
  | import('@interfaces/http/controllers/user/login-token-controller').LoginTokenController
  | null = null;
async function getLoginTokenController() {
  if (_loginTokenController) return _loginTokenController;

  const { makeLoginTokenController } =
    await import('../factories/controllers/user/login-token-controller.factory');

  _loginTokenController = makeLoginTokenController();
  return _loginTokenController;
}

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next) => {
    const status = httpStatusCodes.TOO_MANY_REQUESTS ?? 429;
    const response = createResponse(status, 'Too many requests, please try again later');
    return res.status(status).json(response);
  },
});

let _forgotPasswordController:
  | import('@interfaces/http/controllers/credentials/forgot-password-controller').ForgotPasswordController
  | null = null;
async function getForgotPasswordController() {
  if (_forgotPasswordController) return _forgotPasswordController;

  const { makeForgotPasswordController } =
    await import('@interfaces/http/factories/controllers/credentials/forgot-password-controller.factory');

  _forgotPasswordController = makeForgotPasswordController();
  return _forgotPasswordController;
}

let _resetPasswordController:
  | import('@interfaces/http/controllers/credentials/reset-password-controller').ResetPasswordController
  | null = null;
async function getResetPasswordController() {
  if (_resetPasswordController) return _resetPasswordController;

  const { makeResetPasswordController } =
    await import('@interfaces/http/factories/controllers/credentials/reset-password-controller.factory');

  _resetPasswordController = makeResetPasswordController();
  return _resetPasswordController;
}

router.post('/auth/register', authLimiter, async (req, res, next) => {
  const controller = await getRegisterController();
  return controller.handle(req, res, next);
});

router.post('/auth/login', authLimiter, async (req, res, next) => {
  const controller = await getLoginController();
  return controller.handle(req, res, next);
});

// (app/CLI)
router.post('/auth/token', authLimiter, async (req, res, next) => {
  const controller = await getLoginTokenController();
  return controller.handle(req, res, next);
});

router.post('/auth/logout', authMiddleware, (req, res, next) =>
  logoutController.handle(req, res, next),
);

router.post('/auth/forgot-password', passwordResetLimiter, async (req, res, next) => {
  const controller = await getForgotPasswordController();
  return controller.handle(req, res, next);
});

router.post('/auth/reset-password', passwordResetLimiter, async (req, res, next) => {
  const controller = await getResetPasswordController();
  return controller.handle(req, res, next);
});

router.get('/auth/me', authMiddleware, async (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json(createResponse(401, 'Unauthorized', undefined, undefined, 'UNAUTHORIZED'));
  }

  // Busca dados completos do usuário (inclui role).
  const { PrismaUserRepository } = await import('@infrastructure/repositories/user-repositories');
  const userRepo = new PrismaUserRepository();

  try {
    const user = await userRepo.findById(req.user.id);
    if (!user) {
      return res
        .status(401)
        .json(createResponse(401, 'Unauthorized', undefined, undefined, 'UNAUTHORIZED'));
    }

    return res.status(200).json(
      createResponse(200, 'Authenticated', {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }),
    );
  } catch (err) {
    return next(err);
  }
});

router.get('/auth/csrf', (req, res) => {
  if (!env.CSRF_ENABLED) return res.sendStatus(204);

  const token = ensureCsrfTokenCookie(req, res);

  return res.status(200).json(
    createResponse(httpStatusCodes.OK, 'CSRF token generated', {
      csrfToken: token,
    }),
  );
});

export default router;
