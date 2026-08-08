import { getPointForecastData } from '@windy/fetch';

export type SnowForecastModel = 'ecmwf' | 'gfs' | 'icon';

function isNumericArrayLike(value: unknown): boolean {
  if (ArrayBuffer.isView(value as any)) return Number((value as any)?.length) > 0;
  if (!Array.isArray(value) || !value.length) return false;
  return value.some(item => typeof item === 'number' || typeof item === 'string');
}

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]/g, '-');
}

function isPrecipKey(key: string): boolean {
  const k = normaliseKey(key);
  return (k.includes('precip') || k === 'rain' || k.startsWith('rain-') || k === 'tp')
    && !k.includes('type')
    && !k.includes('snow');
}

function isSnowDepthKey(key: string): boolean {
  const k = normaliseKey(key);
  return k.includes('snowdepth')
    || k.includes('snow-depth')
    || k.includes('snowcover')
    || k.includes('snow-cover')
    || k === 'h-snow'
    || k === 'hsnow'
    || k.startsWith('h-snow-')
    || k.startsWith('hsnow-');
}

function isWantedKey(key: string): boolean {
  return isPrecipKey(key) || isSnowDepthKey(key);
}

function collectFromRecordArray(items: unknown[], out: Record<string, unknown>) {
  if (!items.length || !items.every(item => !!item && typeof item === 'object' && !Array.isArray(item))) return;
  const keys = new Set<string>();
  for (const item of items as Record<string, unknown>[]) {
    for (const key of Object.keys(item)) if (isWantedKey(key)) keys.add(key);
  }
  for (const key of keys) {
    const values = (items as Record<string, unknown>[]).map(item => {
      const raw = item[key];
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    });
    if (values.some(value => value !== null)) out[key] = values;
  }
}

function collectSelectedFields(value: unknown, out: Record<string, unknown>, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 7) return;

  if (Array.isArray(value)) {
    collectFromRecordArray(value, out);
    for (const child of value.slice(0, 3)) collectSelectedFields(child, out, depth + 1);
    return;
  }

  const obj = value as Record<string, unknown>;
  for (const [key, field] of Object.entries(obj)) {
    if (isWantedKey(key) && isNumericArrayLike(field)) out[key] = field;
  }
  for (const child of Object.values(obj)) {
    if (child && typeof child === 'object' && !isNumericArrayLike(child)) {
      collectSelectedFields(child, out, depth + 1);
    }
  }
}

export async function loadSelectedPrecipFields(
  lat: number,
  lon: number,
  days = 6,
  model: SnowForecastModel = 'ecmwf',
): Promise<Record<string, unknown>> {
  try {
    const response = await getPointForecastData(
      model,
      { lat, lon, step: 1, days, source: 'detail' } as any,
    );
    const out: Record<string, unknown> = {};
    collectSelectedFields(response as unknown, out);
    if (!Object.keys(out).length) {
      console.warn(`Snow forecast ${model}: no precipitation or snow-depth field found in Windy point forecast payload`);
    }
    return out;
  } catch (e) {
    console.warn(`Snow forecast ${model} point-weather request failed`, lat, lon, e);
    return {};
  }
}
