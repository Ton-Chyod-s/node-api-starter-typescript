import 'dotenv/config';
import './instrument';
import { createApp } from './app';
import { env } from '@config/env';
import { prisma } from '@infrastructure/prisma/client';

const app = createApp();
const port = env.PORT || 3000;

const server = app.listen(port, () => {
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server running on ${baseUrl}`);

  if (env.NODE_ENV !== 'production') {
    console.log(`Swagger UI: ${baseUrl}/api/docs`);
    console.log(`OpenAPI: ${baseUrl}/api/openapi.yaml`);
  }
});

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  const forceExitTimeout = setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
  forceExitTimeout.unref();

  server.close(async (err) => {
    try {
      if (err) {
        console.error('Error while closing server:', err);
      }

      await prisma.$disconnect();

      process.exit(err ? 1 : 0);
    } catch (e) {
      console.error('Error during shutdown:', e);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
