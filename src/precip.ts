import { valueAt } from './snowLevel';

const EXACT_KEYS = [
  'past3hprecip-surface',
  'past1hprecip-surface',
  'precip-surface',
  'rain-surface',
  'rain',
  'precip',
  'precipitation-surface',
  'precipitation',
  'tp',
];

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]/g, '-');
}

function isPrecipKey(key: string): boolean {
  const k = normalizedKey(key);
  if (EXACT_KEYS.includes(k)) return true;
  return (k.includes('precip') || k === 'rain' || k.startsWith('rain-') || k === 'tp')
    && !k.includes('type')
    && !k.includes('snow');
}

function looksArrayLike(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (ArrayBuffer.isView(value as any)) return Number((value as any)?.length) > 0;
  return !!value && typeof value === 'object' && Number.isFinite(Number((value as any)?.length));
}

function findPrecipField(value: unknown, depth = 0): { key: string; field: unknown } | null {
  if (!value || typeof value !== 'object' || depth > 5) return null;
  const obj = value as Record<string, unknown>;

  for (const [key, field] of Object.entries(obj)) {
    if (isPrecipKey(key) && looksArrayLike(field)) return { key, field };
  }
  for (const child of Object.values(obj)) {
    if (child && typeof child === 'object' && !looksArrayLike(child)) {
      const found = findPrecipField(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function toMillimetres(key: string, raw: number): number {
  const k = normalizedKey(key);
  // Windy precipitation fields are commonly metres of water equivalent.
  // Very small raw values are therefore treated as metres. Larger values are
  // already effectively millimetres in some point-forecast payload variants.
  if (k.includes('past3hprecip') || k.includes('past1hprecip')) return raw * 1000;
  if (Math.abs(raw) < 0.02) return raw * 1000;
  return raw;
}

export function precipMmAt(data: Record<string, unknown>, index: number): number | null {
  const found = findPrecipField(data);
  if (!found) return null;
  const raw = valueAt(found.field, index);
  if (raw === null || !Number.isFinite(raw)) return null;
  return Math.max(0, toMillimetres(found.key, raw));
}

export function precipFieldName(data: Record<string, unknown>): string | null {
  return findPrecipField(data)?.key ?? null;
}

export function formatPrecipMm(mm: number): string {
  if (mm < 0.05) return '0';
  if (mm < 1) return mm.toFixed(1);
  if (mm < 10) return mm.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(mm));
}
