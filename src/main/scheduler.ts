import { env } from '@config/env';
import { logger } from '@infrastructure/logging/logger';
import { PrismaRefreshTokenRepository } from '@infrastructure/repositories/refresh-token-repository';

type SchedulerHandle = {
  stop: () => void;
};

let handle: SchedulerHandle | null = null;

/**
 * Executa a limpeza de refresh tokens expirados e registra o resultado.
 */
async function runCleanup(): Promise<void> {
  const repo = new PrismaRefreshTokenRepository();
  try {
    const deleted = await repo.deleteExpired();
    if (deleted > 0) {
      logger.info('[scheduler] Expired refresh tokens removed', { count: deleted });
    } else {
      logger.debug('[scheduler] No expired refresh tokens to remove');
    }
  } catch (err) {
    logger.error('[scheduler] Failed to clean up expired refresh tokens', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Inicia o cron de limpeza de refresh tokens expirados.
 *
 * O intervalo é controlado por REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES (default: 60).
 * Defina como 0 para desativar.
 *
 * A primeira execução é imediata (limpeza no boot), as seguintes seguem o intervalo.
 */
export function startScheduler(): SchedulerHandle {
  if (handle) return handle;

  const intervalMinutes = env.REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES;

  if (intervalMinutes === 0) {
    logger.info('[scheduler] Refresh token cleanup cron is disabled (REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES=0)');
    handle = { stop: () => {} };
    return handle;
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info('[scheduler] Refresh token cleanup cron started', {
    intervalMinutes,
  });

  // Executa imediatamente no boot e depois a cada intervalo
  void runCleanup();
  const timer = setInterval(() => void runCleanup(), intervalMs);

  // Não impede o processo de encerrar enquanto aguarda o próximo tick
  timer.unref();

  handle = {
    stop() {
      clearInterval(timer);
      handle = null;
      logger.info('[scheduler] Refresh token cleanup cron stopped');
    },
  };

  return handle;
}

/**
 * Para o scheduler se estiver ativo.
 * Chamado no graceful shutdown.
 */
export function stopScheduler(): void {
  handle?.stop();
}
