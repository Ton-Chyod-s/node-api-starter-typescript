import { Router, type RequestHandler } from 'express';
import {
  makeAuth,
  makeOptionalAuth,
} from '@interfaces/http/factories/controllers/user/make-auth-middleware';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';
import { env } from '@config/env';
import { ensureCsrfTokenCookie } from '@interfaces/http/middlewares/csrf-middleware';
import { makeRateLimiter } from '@interfaces/http/middlewares/rate-limit';

const router = Router();
const authMiddleware = makeAuth();
const optionalAuthMiddleware = makeOptionalAuth();

const asyncRoute = (
  handler: (
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
};

const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

let _logoutController: Promise<
  import('@interfaces/http/controllers/user/logout-controller').LogoutController
> | null = null;
async function getLogoutController() {
  return (_logoutController ??= import(
    '@interfaces/http/factories/controllers/user/logout-controller.factory'
  ).then((m) => m.makeLogoutController()));
}

let _registerController: Promise<
  import('@interfaces/http/controllers/user/register-controller').RegisterController
> | null = null;
async function getRegisterController() {
  return (_registerController ??= import(
    '@interfaces/http/factories/controllers/user/register-controller.factory'
  ).then((m) => m.makeRegisterController()));
}

let _loginController: Promise<
  import('@interfaces/http/controllers/user/login-controller').LoginController
> | null = null;
async function getLoginController() {
  return (_loginController ??= import(
    '@interfaces/http/factories/controllers/user/login-controller.factory'
  ).then((m) => m.makeLoginController()));
}

let _loginTokenController: Promise<
  import('@interfaces/http/controllers/user/login-token-controller').LoginTokenController
> | null = null;
async function getLoginTokenController() {
  return (_loginTokenController ??= import(
    '../factories/controllers/user/login-token-controller.factory'
  ).then((m) => m.makeLoginTokenController()));
}

let _refreshTokenController: Promise<
  import('@interfaces/http/controllers/user/refresh-token-controller').RefreshTokenController
> | null = null;
async function getRefreshTokenController() {
  return (_refreshTokenController ??= import(
    '@interfaces/http/factories/controllers/user/refresh-token-controller.factory'
  ).then((m) => m.makeRefreshTokenController()));
}

const passwordResetLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

let _forgotPasswordController: Promise<
  import('@interfaces/http/controllers/credentials/forgot-password-controller').ForgotPasswordController
> | null = null;
async function getForgotPasswordController() {
  return (_forgotPasswordController ??= import(
    '@interfaces/http/factories/controllers/credentials/forgot-password-controller.factory'
  ).then((m) => m.makeForgotPasswordController()));
}

let _resetPasswordController: Promise<
  import('@interfaces/http/controllers/credentials/reset-password-controller').ResetPasswordController
> | null = null;
async function getResetPasswordController() {
  return (_resetPasswordController ??= import(
    '@interfaces/http/factories/controllers/credentials/reset-password-controller.factory'
  ).then((m) => m.makeResetPasswordController()));
}

router.post(
  '/auth/register',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getRegisterController();
    return controller.handle(req, res, next);
  }),
);

router.post(
  '/auth/login',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getLoginController();
    return controller.handle(req, res, next);
  }),
);

router.post(
  '/auth/token',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getLoginTokenController();
    return controller.handle(req, res, next);
  }),
);

router.post(
  '/auth/refresh',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getRefreshTokenController();
    return controller.handle(req, res, next);
  }),
);

router.post(
  '/auth/logout',
  authLimiter,
  optionalAuthMiddleware,
  asyncRoute(async (req, res, next) => {
    const controller = await getLogoutController();
    return controller.handle(req, res, next);
  }),
);

router.post(
  '/auth/forgot-password',
  passwordResetLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getForgotPasswordController();
    return controller.handle(req, res, next);
  }),
);

router.post(
  '/auth/reset-password',
  passwordResetLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getResetPasswordController();
    return controller.handle(req, res, next);
  }),
);

let _googleAuthController: Promise<
  import('@interfaces/http/controllers/user/google-auth-controller').GoogleAuthController
> | null = null;
async function getGoogleAuthController() {
  return (_googleAuthController ??= import(
    '@interfaces/http/factories/controllers/user/google-auth-controller.factory'
  ).then((m) => m.makeGoogleAuthController()));
}

let _googleCallbackController: Promise<
  import('@interfaces/http/controllers/user/google-callback-controller').GoogleCallbackController
> | null = null;
async function getGoogleCallbackController() {
  return (_googleCallbackController ??= import(
    '@interfaces/http/factories/controllers/user/google-callback-controller.factory'
  ).then((m) => m.makeGoogleCallbackController()));
}

let _facebookAuthController: Promise<
  import('@interfaces/http/controllers/user/facebook-auth-controller').FacebookAuthController
> | null = null;
async function getFacebookAuthController() {
  return (_facebookAuthController ??= import(
    '@interfaces/http/factories/controllers/user/facebook-auth-controller.factory'
  ).then((m) => m.makeFacebookAuthController()));
}

let _facebookCallbackController: Promise<
  import('@interfaces/http/controllers/user/facebook-callback-controller').FacebookCallbackController
> | null = null;
async function getFacebookCallbackController() {
  return (_facebookCallbackController ??= import(
    '@interfaces/http/factories/controllers/user/facebook-callback-controller.factory'
  ).then((m) => m.makeFacebookCallbackController()));
}

router.get(
  '/auth/google',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getGoogleAuthController();
    return controller.handle(req, res, next);
  }),
);

router.get(
  '/auth/google/callback',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getGoogleCallbackController();
    return controller.handle(req, res, next);
  }),
);

router.get(
  '/auth/facebook',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getFacebookAuthController();
    return controller.handle(req, res, next);
  }),
);

router.get(
  '/auth/facebook/callback',
  authLimiter,
  asyncRoute(async (req, res, next) => {
    const controller = await getFacebookCallbackController();
    return controller.handle(req, res, next);
  }),
);

let _meController: Promise<
  import('@interfaces/http/controllers/user/me-controller').MeController
> | null = null;
async function getMeController() {
  return (_meController ??= import(
    '@interfaces/http/factories/controllers/user/me-controller.factory'
  ).then((m) => m.makeMeController()));
}

router.get(
  '/auth/me',
  authMiddleware,
  asyncRoute(async (req, res, next) => {
    const controller = await getMeController();
    return controller.handle(req, res, next);
  }),
);

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
  _facebookAuthController = null;
  _facebookCallbackController = null;
  _refreshTokenController = null;
}
