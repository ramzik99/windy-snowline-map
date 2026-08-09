import { valueAt } from './snowLevel';

/**
 * Ordered by preference. Point forecasts are requested hourly, so use Windy's
 * explicit past-hour precipitation field when available. The past-3-hour field
 * is a deterministic fallback and is converted to an average hourly rate.
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

const METRE_WATER_KEYS = new Set([
  'past1hprecip-surface',
  'past3hprecip-surface',
]);

/** Minimum hourly precipitation rate used for precipitation-type diagnosis. */
export const PRECIP_THRESHOLD_MM_H = 0.1;

type PrecipField = { key: string; field: unknown };
const precipFieldCache = new WeakMap<object, PrecipField | null>();

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]/g, '-');
}

function isPrecipKey(key: string): boolean {
  const normalized = normalizedKey(key);
  if ((EXACT_KEYS as readonly string[]).includes(normalized)) return true;
  return (normalized.includes('precip') || normalized === 'rain' || normalized.startsWith('rain-') || normalized === 'tp')
    && !normalized.includes('type')
    && !normalized.includes('snow');
}

function looksArrayLike(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (ArrayBuffer.isView(value as any)) return Number((value as any)?.length) > 0;
  return !!value && typeof value === 'object' && Number.isFinite(Number((value as any)?.length));
}

function findPrecipFieldUncached(value: unknown, depth = 0): PrecipField | null {
  if (!value || typeof value !== 'object' || depth > 5) return null;
  const object = value as Record<string, unknown>;

  for (const wanted of EXACT_KEYS) {
    for (const [key, field] of Object.entries(object)) {
      if (normalizedKey(key) === wanted && looksArrayLike(field)) return { key, field };
    }
  }

  // Compatibility fallback for unfamiliar precipitation aliases. Unknown aliases
  // are interpreted as mm/h because the point request itself is hourly.
  for (const [key, field] of Object.entries(object)) {
    if (isPrecipKey(key) && looksArrayLike(field)) return { key, field };
  }

  for (const child of Object.values(object)) {
    if (child && typeof child === 'object' && !looksArrayLike(child)) {
      const found = findPrecipFieldUncached(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findPrecipField(data: Record<string, unknown>): PrecipField | null {
  const cached = precipFieldCache.get(data);
  if (cached !== undefined) return cached;
  const found = findPrecipFieldUncached(data);
  precipFieldCache.set(data, found);
  return found;
}

function accumulationHours(key: string): number {
  return normalizedKey(key) === 'past3hprecip-surface' ? 3 : 1;
}

function toHourlyMillimetres(key: string, raw: number): number {
  const normalized = normalizedKey(key);
  const millimetres = METRE_WATER_KEYS.has(normalized) ? raw * 1000 : raw;
  return millimetres / accumulationHours(normalized);
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
