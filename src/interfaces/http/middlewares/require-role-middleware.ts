import type { Request, Response, NextFunction } from 'express';

import type { UserRole } from '@domain/entities/user';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

export function requireRole(roles: UserRole | UserRole[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const allowedSet = new Set<UserRole>(allowed);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response = createResponse(httpStatusCodes.UNAUTHORIZED, 'Unauthorized');
      return res.status(httpStatusCodes.UNAUTHORIZED).json(response);
    }

    if (!allowedSet.has(req.user.role)) {
      const status = httpStatusCodes.FORBIDDEN ?? 403;
      const response = createResponse(status, 'Forbidden');
      return res.status(status).json(response);
    }

    return next();
  };
}
