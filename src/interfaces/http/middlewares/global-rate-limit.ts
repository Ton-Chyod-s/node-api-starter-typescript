import rateLimit from 'express-rate-limit';

import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: (_req, res, _next) => {
    const status = httpStatusCodes.TOO_MANY_REQUESTS ?? 429;

    const response = createResponse(status, 'Too many requests, please try again later');

    return res.status(status).json(response);
  },
});
