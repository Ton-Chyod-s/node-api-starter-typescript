import { Router, type RequestHandler } from 'express';
import { makeAuth, makeOptionalAuth } from '@interfaces/http/factories/controllers/user/make-auth-middleware';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { env } from '@config/env';
import { ensureCsrfTokenCookie } from '@interfaces/http/middlewares/csrf-middleware';
import { makeRateLimiter } from '@interfaces/http/middlewares/rate-limit';

const router = Router();
const authMiddleware = makeAuth();
const optionalAuthMiddleware = makeOptionalAuth();


const asyncRoute = (
  handler: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
};


const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

let _logoutController:
  | import('@interfaces/http/controllers/user/logout-controller').LogoutController
  | null = null;
async function getLogoutController() {
  if (_logoutController) return _logoutController;
  const { makeLogoutController } = await import(
    '@interfaces/http/factories/controllers/user/logout-controller.factory'
  );
  _logoutController = makeLogoutController();
  return _logoutController;
}

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

const passwordResetLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
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

router.post('/auth/register', authLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getRegisterController();
  return controller.handle(req, res, next);
}));

router.post('/auth/login', authLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getLoginController();
  return controller.handle(req, res, next);
}));

router.post('/auth/token', authLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getLoginTokenController();
  return controller.handle(req, res, next);
}));

router.post('/auth/logout', authLimiter, optionalAuthMiddleware, asyncRoute(async (req, res, next) => {
  const controller = await getLogoutController();
  return controller.handle(req, res, next);
}));

router.post('/auth/forgot-password', passwordResetLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getForgotPasswordController();
  return controller.handle(req, res, next);
}));

router.post('/auth/reset-password', passwordResetLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getResetPasswordController();
  return controller.handle(req, res, next);
}));

let _googleAuthController:
  | import('@interfaces/http/controllers/user/google-auth-controller').GoogleAuthController
  | null = null;
async function getGoogleAuthController() {
  if (_googleAuthController) return _googleAuthController;
  const { makeGoogleAuthController } =
    await import('@interfaces/http/factories/controllers/user/google-auth-controller.factory');
  _googleAuthController = makeGoogleAuthController();
  return _googleAuthController;
}

let _googleCallbackController:
  | import('@interfaces/http/controllers/user/google-callback-controller').GoogleCallbackController
  | null = null;
async function getGoogleCallbackController() {
  if (_googleCallbackController) return _googleCallbackController;
  const { makeGoogleCallbackController } =
    await import('@interfaces/http/factories/controllers/user/google-callback-controller.factory');
  _googleCallbackController = makeGoogleCallbackController();
  return _googleCallbackController;
}

router.get('/auth/google', authLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getGoogleAuthController();
  return controller.handle(req, res, next);
}));

router.get('/auth/google/callback', authLimiter, asyncRoute(async (req, res, next) => {
  const controller = await getGoogleCallbackController();
  return controller.handle(req, res, next);
}));

let _meController:
  | import('@interfaces/http/controllers/user/me-controller').MeController
  | null = null;
async function getMeController() {
  if (_meController) return _meController;

  const { makeMeController } =
    await import('@interfaces/http/factories/controllers/user/me-controller.factory');

  _meController = makeMeController();
  return _meController;
}

router.get('/auth/me', authMiddleware, asyncRoute(async (req, res, next) => {
  const controller = await getMeController();
  return controller.handle(req, res, next);
}));

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

export function resetControllersForTesting(): void {
  if (env.NODE_ENV === 'production') return;

  _logoutController = null;
  _registerController = null;
  _loginController = null;
  _loginTokenController = null;
  _forgotPasswordController = null;
  _resetPasswordController = null;
  _meController = null;
  _googleAuthController = null;
  _googleCallbackController = null;
}
