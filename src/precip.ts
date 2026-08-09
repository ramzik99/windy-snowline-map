import { valueAt } from './snowLevel';

/**
 * Ordered by preference. The ECMWF meteogram normally exposes
 * `past3hprecip-surface`; keep the aliases for payload compatibility but do
 * not choose a fuzzy field ahead of a known one.
 */
const EXACT_KEYS = [
  'past3hprecip-surface',
  'past1hprecip-surface',
  'precip-surface',
  'rain-surface',
  'precipitation-surface',
  'precipitation',
  'precip',
  'rain',
  'tp',
] as const;

/** Windy's past-hour ECMWF fields are metres of water equivalent. */
const METRE_WATER_KEYS = new Set([
  'past3hprecip-surface',
  'past1hprecip-surface',
]);

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]/g, '-');
}

function isPrecipKey(key: string): boolean {
  const k = normalizedKey(key);
  if ((EXACT_KEYS as readonly string[]).includes(k)) return true;
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

  // Prefer known fields deterministically rather than relying on object order.
  for (const wanted of EXACT_KEYS) {
    for (const [key, field] of Object.entries(obj)) {
      if (normalizedKey(key) === wanted && looksArrayLike(field)) return { key, field };
    }
  }

  // Compatibility fallback for an unfamiliar precipitation alias. Unknown
  // fields are treated as already being in mm; there is deliberately no
  // value-magnitude guessing in v6.
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
  return METRE_WATER_KEYS.has(normalizedKey(key)) ? raw * 1000 : raw;
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
