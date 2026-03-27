import { startScheduler, stopScheduler } from '@main/scheduler';

// Mock do módulo de repositório para isolar o teste do banco
jest.mock('@infrastructure/repositories/refresh-token-repository', () => ({
  PrismaRefreshTokenRepository: jest.fn().mockImplementation(() => ({
    deleteExpired: jest.fn().mockResolvedValue(0),
  })),
}));

// Mock do logger para não poluir o output dos testes
jest.mock('@infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { PrismaRefreshTokenRepository } = jest.requireMock(
  '@infrastructure/repositories/refresh-token-repository',
);
const { logger } = jest.requireMock('@infrastructure/logging/logger');

describe('scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    stopScheduler(); // garante estado limpo entre testes
  });

  afterEach(() => {
    stopScheduler();
    jest.useRealTimers();
  });

  describe('startScheduler()', () => {
    it('executa deleteExpired imediatamente no boot', async () => {
      const deleteExpired = jest.fn().mockResolvedValue(3);
      PrismaRefreshTokenRepository.mockImplementation(() => ({ deleteExpired }));

      startScheduler();

      // Avança microtasks para resolver o void runCleanup() imediato
      await Promise.resolve();
      await Promise.resolve();

      expect(deleteExpired).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        '[scheduler] Expired refresh tokens removed',
        { count: 3 },
      );
    });

    it('executa deleteExpired novamente após o intervalo configurado', async () => {
      const deleteExpired = jest.fn().mockResolvedValue(0);
      PrismaRefreshTokenRepository.mockImplementation(() => ({ deleteExpired }));

      startScheduler();
      await Promise.resolve();
      await Promise.resolve();

      expect(deleteExpired).toHaveBeenCalledTimes(1);

      // Simula 60 minutos (intervalo padrão)
      jest.advanceTimersByTime(60 * 60 * 1000);
      await Promise.resolve();
      await Promise.resolve();

      expect(deleteExpired).toHaveBeenCalledTimes(2);
    });

    it('não loga "removed" quando não há tokens para remover', async () => {
      const deleteExpired = jest.fn().mockResolvedValue(0);
      PrismaRefreshTokenRepository.mockImplementation(() => ({ deleteExpired }));

      startScheduler();
      await Promise.resolve();
      await Promise.resolve();

      expect(logger.info).not.toHaveBeenCalledWith(
        '[scheduler] Expired refresh tokens removed',
        expect.anything(),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[scheduler] No expired refresh tokens to remove',
      );
    });

    it('loga erro sem derrubar o processo quando deleteExpired falha', async () => {
      const deleteExpired = jest.fn().mockRejectedValue(new Error('DB timeout'));
      PrismaRefreshTokenRepository.mockImplementation(() => ({ deleteExpired }));

      startScheduler();
      await Promise.resolve();
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalledWith(
        '[scheduler] Failed to clean up expired refresh tokens',
        { error: 'DB timeout' },
      );
    });

    it('retorna o mesmo handle em chamadas subsequentes (singleton)', () => {
      const handle1 = startScheduler();
      const handle2 = startScheduler();
      expect(handle1).toBe(handle2);
    });
  });

  describe('stopScheduler()', () => {
    it('para o intervalo e impede novas execuções', async () => {
      const deleteExpired = jest.fn().mockResolvedValue(0);
      PrismaRefreshTokenRepository.mockImplementation(() => ({ deleteExpired }));

      startScheduler();
      await Promise.resolve();
      await Promise.resolve();
      const callsAfterBoot = deleteExpired.mock.calls.length;

      stopScheduler();

      jest.advanceTimersByTime(60 * 60 * 1000);
      await Promise.resolve();

      expect(deleteExpired).toHaveBeenCalledTimes(callsAfterBoot);
    });

    it('não lança erro se chamado sem scheduler ativo', () => {
      expect(() => stopScheduler()).not.toThrow();
    });
  });
});
