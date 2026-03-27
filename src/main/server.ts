import './instrument';
import { createApp } from './app';
import { env } from '@config/env';
import { prisma } from '@infrastructure/prisma/client';
import { logger } from '@infrastructure/logging/logger';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';

const app = createApp();
const port = env.PORT || 3000;

async function cleanupExpiredTokens() {
  try {
    const repo = new PrismaRefreshTokenRepository();
    const deleted = await repo.deleteExpired();
    if (deleted > 0) {
      logger.info('Expired refresh tokens removed on startup', { count: deleted });
    }
  } catch (err) {
    logger.warn('Failed to clean up expired refresh tokens on startup', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const server = app.listen(port, () => {
  const baseUrl = `http://localhost:${port}`;
  logger.info('Server running', { baseUrl });

  if (env.NODE_ENV !== 'production') {
    logger.info('Swagger UI available', { url: `${baseUrl}/api/docs` });
    logger.info('OpenAPI available', { url: `${baseUrl}/api/openapi.yaml` });
  }

  void cleanupExpiredTokens();
});

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn('Received shutdown signal. Shutting down gracefully...', { signal });

  const forceExitTimeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
  forceExitTimeout.unref();

  server.closeAllConnections();
  server.close(async (err) => {
    try {
      if (err) {
        logger.error('Error while closing server', err);
      }

      await prisma.$disconnect();

      process.exit(err ? 1 : 0);
    } catch (e) {
      logger.error('Error during shutdown', e instanceof Error ? e : { error: e });
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
