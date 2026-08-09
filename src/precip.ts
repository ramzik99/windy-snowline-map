import { valueAt } from './snowLevel';

/**
 * Ordered by preference. With the plugin requesting a 1-hour point step,
 * prefer Windy's explicit past-hour field whenever it is available. The
 * past-3-hour field remains a deterministic fallback and is converted to an
 * average hourly rate.
 */
const EXACT_KEYS = [
  'past1hprecip-surface',
  'past3hprecip-surface',
  'precip-surface',
  'rain-surface',
  'precipitation-surface',
  'precipitation',
  'precip',
  'rain',
  'tp',
] as const;

/** Windy's explicit past-hour ECMWF precipitation fields are metres of water equivalent. */
const METRE_WATER_KEYS = new Set([
  'past1hprecip-surface',
  'past3hprecip-surface',
]);

/** Equivalent of the former 0.1 mm/3h measurable-precipitation threshold. */
export const PRECIP_THRESHOLD_MM_H = 0.1 / 3;

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

  for (const wanted of EXACT_KEYS) {
    for (const [key, field] of Object.entries(obj)) {
      if (normalizedKey(key) === wanted && looksArrayLike(field)) return { key, field };
    }
  }

  // Compatibility fallback for unfamiliar precipitation aliases. Because the
  // point request itself is hourly, unknown aliases are interpreted as mm/h;
  // no value-magnitude guessing is used.
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

function accumulationHours(key: string): number {
  const k = normalizedKey(key);
  if (k === 'past3hprecip-surface') return 3;
  return 1;
}

function toHourlyMillimetres(key: string, raw: number): number {
  const k = normalizedKey(key);
  const mm = METRE_WATER_KEYS.has(k) ? raw * 1000 : raw;
  return mm / accumulationHours(k);
}

/** Average precipitation rate in millimetres per hour. */
export function precipMmAt(data: Record<string, unknown>, index: number): number | null {
  const found = findPrecipField(data);
  if (!found) return null;
  const raw = valueAt(found.field, index);
  if (raw === null || !Number.isFinite(raw)) return null;
  return Math.max(0, toHourlyMillimetres(found.key, raw));
}

export function precipFieldName(data: Record<string, unknown>): string | null {
  return findPrecipField(data)?.key ?? null;
}

export function formatPrecipMm(mm: number): string {
  if (mm < 0.005) return '0';
  if (mm < 0.1) return mm.toFixed(2).replace(/0$/, '');
  if (mm < 1) return mm.toFixed(1);
  if (mm < 10) return mm.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(mm));
}
