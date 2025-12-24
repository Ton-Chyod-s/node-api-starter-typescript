import { Router } from 'express';

import { makeAuth } from '@interfaces/http/factories/controllers/user/make-auth-middleware';
import { requireRole } from '@interfaces/http/middlewares/require-role-middleware';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

const router = Router();
const authMiddleware = makeAuth();

router.get('/admin/ping', authMiddleware, requireRole('ADMIN'), (req, res) => {
  return res.status(httpStatusCodes.OK).json(
    createResponse(httpStatusCodes.OK, 'OK', {
      user: req.user,
    }),
  );
});

export default router;
