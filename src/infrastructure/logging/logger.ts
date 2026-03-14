type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown> | Error | undefined;

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function getCurrentLevel(): LogLevel {
  const raw = String(
    process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  )
    .toLowerCase()
    .trim();

  return raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' ? raw : 'info';
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[getCurrentLevel()];
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

function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function getLevelLabel(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return `${colors.magenta}DEBUG${colors.reset}`;
    case 'info':
      return `${colors.blue}INFO ${colors.reset}`;
    case 'warn':
      return `${colors.yellow}WARN ${colors.reset}`;
    case 'error':
      return `${colors.red}ERROR${colors.reset}`;
  }
}

function colorizeValue(value: unknown): string {
  if (value === null) return `${colors.gray}null${colors.reset}`;
  if (value === undefined) return `${colors.gray}undefined${colors.reset}`;
  if (typeof value === 'string') return `${colors.cyan}"${value}"${colors.reset}`;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${colors.magenta}${String(value)}${colors.reset}`;
  }

  return `${colors.gray}${JSON.stringify(value)}${colors.reset}`;
}

function formatMetaForDev(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return '';

  return Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${colors.dim}${key}${colors.reset}=${colorizeValue(value)}`)
    .join(' ');
}

function writeToConsole(level: LogLevel, line: string): void {
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) return;

  const now = new Date();
  const normalizedMeta = normalizeMeta(meta);

  if (isProduction()) {
    const payload = {
      level,
      message,
      timestamp: now.toISOString(),
      ...normalizedMeta,
    };

    writeToConsole(level, JSON.stringify(payload));
    return;
  }

  const timestamp = `${colors.gray}${formatTimestamp(now)}${colors.reset}`;
  const levelLabel = getLevelLabel(level);
  const metaText = formatMetaForDev(normalizedMeta);

  const line =
    `${timestamp} ${levelLabel} ${colors.bold}${message}${colors.reset}` +
    (metaText ? `  ${metaText}` : '');

  writeToConsole(level, line);

  if (normalizedMeta?.stack && typeof normalizedMeta.stack === 'string') {
    console.error(`${colors.gray}${normalizedMeta.stack}${colors.reset}`);
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    write('debug', message, meta);
  },

  info(message: string, meta?: LogMeta): void {
    write('info', message, meta);
  },

  warn(message: string, meta?: LogMeta): void {
    write('warn', message, meta);
  },

  error(message: string, meta?: LogMeta): void {
    write('error', message, meta);
  },
};
