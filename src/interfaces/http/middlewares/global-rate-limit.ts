import rateLimit from 'express-rate-limit';

import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

// Rate limit global (suave) para toda a API.
// Objetivo: reduzir abuso e tráfego acidental sem atrapalhar uso normal.
// Os limiters específicos (ex: auth) continuam mais restritivos.
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Monitoração/healthcheck costuma bater com frequência.
  // Como é apenas leitura, podemos excluir do limiter global.
  skip: (req) => req.path === '/health',
  handler: (_req, res, _next) => {
    const status = httpStatusCodes.TOO_MANY_REQUESTS ?? 429;

    const response = createResponse(status, 'Too many requests, please try again later');

    return res.status(status).json(response);
  },
});
