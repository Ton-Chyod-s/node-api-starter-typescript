import { Router, type RequestHandler } from 'express';

import { makeAuth } from '@interfaces/http/factories/controllers/user/make-auth-middleware';
import { requireRole } from '@interfaces/http/middlewares/require-role-middleware';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

const router = Router();
const authMiddleware = makeAuth();

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

router.get('/admin/ping', authMiddleware, requireRole('ADMIN'), (req, res) => {
  return res.status(httpStatusCodes.OK).json(
    createResponse(httpStatusCodes.OK, 'OK', {
      user: req.user,
    }),
  );
});

let _listUsersController: Promise<
  import('@interfaces/http/controllers/user/list-users-controller').ListUsersController
> | null = null;
async function getListUsersController() {
  return (_listUsersController ??= import(
    '@interfaces/http/factories/controllers/user/list-users-controller.factory'
  ).then((m) => m.makeListUsersController()));
}

let _updateRoleController: Promise<
  import('@interfaces/http/controllers/user/update-role-controller').UpdateRoleController
> | null = null;
async function getUpdateRoleController() {
  return (_updateRoleController ??= import(
    '@interfaces/http/factories/controllers/user/update-role-controller.factory'
  ).then((m) => m.makeUpdateRoleController()));
}

router.get(
  '/admin/users',
  authMiddleware,
  requireRole('ADMIN'),
  asyncRoute(async (req, res, next) => {
    const controller = await getListUsersController();
    return controller.handle(req, res, next);
  }),
);

router.patch(
  '/admin/users/:id/role',
  authMiddleware,
  requireRole('ADMIN'),
  asyncRoute(async (req, res, next) => {
    const controller = await getUpdateRoleController();
    return controller.handle(req, res, next);
  }),
);

export default router;

export function resetAdminControllersForTesting(): void {
  _listUsersController = null;
  _updateRoleController = null;
}
