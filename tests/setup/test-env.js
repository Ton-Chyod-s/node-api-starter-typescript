/**
 * Garante que as variáveis de ambiente obrigatórias estejam definidas
 * antes de qualquer módulo ser carregado nos testes.
 * Adicionado via jest.config.cjs → setupFiles.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
process.env.KEY_JWT = process.env.KEY_JWT || 'test-secret-key';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'test-issuer';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'test-audience';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
process.env.SENTRY_DSN = process.env.SENTRY_DSN || '';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
process.env.PASSWORD_RESET_PATH = process.env.PASSWORD_RESET_PATH || '/reset-password/{token}';
process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '15';
