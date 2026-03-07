type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown> | Error | undefined;

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getCurrentLevel(): LogLevel {
  const raw = String(process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'))
    .toLowerCase()
    .trim();

  return raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' ? raw : 'info';
}

function normalizeMeta(meta?: LogMeta): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  if (meta instanceof Error) {
    return {
      errorName: meta.name,
      errorMessage: meta.message,
      stack: meta.stack,
    };
  }

  return meta;
}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[getCurrentLevel()];
}

function write(level: Exclude<LogLevel, 'debug'>, message: string, meta?: LogMeta) {
  if (!shouldLog(level)) return;

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...normalizeMeta(meta),
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    if (!shouldLog('debug')) return;

    const payload = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      ...normalizeMeta(meta),
    };

    console.debug(JSON.stringify(payload));
  },

  info(message: string, meta?: LogMeta) {
    write('info', message, meta);
  },

  warn(message: string, meta?: LogMeta) {
    write('warn', message, meta);
  },

  error(message: string, meta?: LogMeta) {
    write('error', message, meta);
  },
};
