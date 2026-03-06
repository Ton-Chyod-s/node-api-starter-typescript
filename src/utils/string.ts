import ms from 'ms';
import type { StringValue } from 'ms';

type CorsOrigin = '*' | string | string[];

export function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;

  const v = value.trim().toLowerCase();
  if (!v) return undefined;

  if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(v)) return false;

  throw new Error(`Boolean inválido: "${value}". Use true/false (ou 1/0).`);
}

export function parseBooleanOr(value: string | undefined, def: boolean): boolean {
  const parsed = parseBoolean(value);
  return parsed === undefined ? def : parsed;
}

export function normalizeOptionalString(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const v = value.trim();
  return v ? v : undefined;
}

export function normalizePem(value?: string): string | undefined {
  const v = normalizeOptionalString(value);
  if (!v) return undefined;
  return v.replace(/\\n/g, '\n').trim();
}

export function parseStringList(value?: string): string[] {
  const v = String(value ?? '').trim();
  if (!v) return [];

  return v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function preprocessOptional(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

export function parseTrustProxy(value?: string): boolean | number | undefined {
  if (value === undefined) return undefined;

  const v = value.trim();
  if (!v) return undefined;

  const lower = v.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;

  if (/^\d+$/.test(v)) return Number(v);

  throw new Error(`TRUST_PROXY inválido: "${value}". Use "true", "false" ou um inteiro (ex: 1).`);
}

export function parseExpiresIn(value?: string): number | StringValue | undefined {
  if (!value) return undefined;

  const v = value.trim();

  if (/^\d+$/.test(v)) return Number(v);

  if (!/^\d+(\.\d+)?(ms|s|m|h|d|w|y)$/i.test(v)) {
    throw new Error(
      `JWT_EXPIRES_IN inválido: "${value}". Use ex: "3600" (segundos) ou "1d", "2h", "15m".`,
    );
  }

  return v as StringValue;
}

export function expiresInToMs(expiresIn?: number | StringValue): number | undefined {
  if (expiresIn === undefined) return undefined;

  if (typeof expiresIn === 'number') return expiresIn * 1000;

  const parsed = ms(expiresIn);
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCorsOrigin(raw: unknown): CorsOrigin {
  const value = String(raw ?? '').trim();

  if (value === '*') return '*';

  if (value.includes(',')) {
    const list = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return list.length === 1 ? list[0] : list;
  }

  return value;
}