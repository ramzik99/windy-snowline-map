import { getPointForecastData } from '@windy/fetch';

export type SnowForecastModel = 'ecmwf';

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
  return k === 'sd'
    || k === 'sde'
    || k === 'snow'
    || k.includes('snowdepth')
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
  if (!value || typeof value !== 'object' || depth > 9) return;

  if (Array.isArray(value)) {
    collectFromRecordArray(value, out);
    for (const child of value) collectSelectedFields(child, out, depth + 1);
    return;
  }

  const obj = value as Record<string, unknown>;
  for (const [key, field] of Object.entries(obj)) {
    if (isWantedKey(key) && isNumericArrayLike(field)) out[key] = field;
  }
  for (const child of Object.values(obj)) {
    if (child && typeof child === 'object' && !isNumericArrayLike(child)) collectSelectedFields(child, out, depth + 1);
  }
}

function hasSnowDepth(out: Record<string, unknown>): boolean {
  return Object.keys(out).some(isSnowDepthKey);
}

async function requestPointFields(
  model: SnowForecastModel,
  lat: number,
  lon: number,
  days: number,
  options?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await getPointForecastData(
    model,
    { lat, lon, step: 1, days, source: 'detail' } as any,
    options,
  );
  const out: Record<string, unknown> = {};
  collectSelectedFields(response as unknown, out);
  return out;
}

export async function loadSelectedPrecipFields(
  lat: number,
  lon: number,
  days = 6,
  model: SnowForecastModel = 'ecmwf',
): Promise<Record<string, unknown>> {
  try {
    const out = await requestPointFields(model, lat, lon, days);

    // Windy's generic point feed does not guarantee every map overlay. Ask once
    // more for the snow-cover view when the ordinary response omitted depth.
    // Unsupported options are ignored by the backend, so the normal feed still
    // remains the authoritative source.
    if (!hasSnowDepth(out)) {
      try {
        const snow = await requestPointFields(model, lat, lon, days, {
          overlay: 'snowcover',
          display: 'meteogram',
          extended: 'true',
        });
        for (const [key, value] of Object.entries(snow)) {
          if (isSnowDepthKey(key) && !(key in out)) out[key] = value;
        }
      } catch (e) {
        console.info('Snow forecast: ECMWF point feed has no separate snow-depth series', e);
      }
    }

    return out;
  } catch (e) {
    console.warn('Snow forecast ECMWF point-weather request failed', lat, lon, e);
    return {};
  }
}
