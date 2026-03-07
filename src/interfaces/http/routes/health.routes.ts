import { Router } from 'express';
import { env } from '@config/env';
import { createResponse } from '@utils/createResponse';
import { httpStatusCodes } from '@utils/httpConstants';

import pkg from '../../../../package.json';

const router = Router();

type DbHealth = {
  status: 'up' | 'down' | 'timeout';
  latencyMs?: number;
};

type HealthData = {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  app: {
    name: string;
    version: string;
    nodeEnv: string;
  };
  runtime: {
    node: string;
    platform: NodeJS.Platform;
  };
  checks: {
    database: DbHealth;
  };
};

async function checkDatabase(timeoutMs = 300): Promise<DbHealth> {
  const started = Date.now();

  try {
    const { prisma } = await import('../../../infrastructure/prisma/client');

    const result = await Promise.race<DbHealth>([
      prisma.$queryRaw`SELECT 1`.then(() => ({ status: 'up', latencyMs: Date.now() - started })),
      new Promise<DbHealth>((resolve) =>
        setTimeout(() => resolve({ status: 'timeout' }), timeoutMs),
      ),
    ]);

    return result;
  } catch {
    return { status: 'down' };
  }
}

router.get('/health', async (_req, res) => {
  const started = Date.now();

  const db = await checkDatabase();

  const overallStatus: HealthData['status'] =
    db.status === 'up' ? 'ok' : db.status === 'timeout' ? 'degraded' : 'down';

  const statusCode =
    overallStatus === 'down' ? httpStatusCodes.SERVICE_UNAVAILABLE : httpStatusCodes.OK;

  const data: HealthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    app: {
      name: String((pkg as { name?: string }).name ?? 'api'),
      version: String((pkg as { version?: string }).version ?? '0.0.0'),
      nodeEnv: env.NODE_ENV,
    },
    runtime: {
      node: process.version,
      platform: process.platform,
    },
    checks: {
      database: db,
    },
  };

  const message =
    overallStatus === 'ok'
      ? 'OK'
      : overallStatus === 'degraded'
        ? 'Degraded'
        : 'Service Unavailable';
  const elapsed = `${Date.now() - started}ms`;
  const response = createResponse(statusCode, message, data, elapsed);

  return res.status(statusCode).json(response);
});

export default router;
