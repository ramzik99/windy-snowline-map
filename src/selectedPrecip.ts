import { getPointForecastData } from '@windy/fetch';

function isNumericArrayLike(value: unknown): boolean {
  if (ArrayBuffer.isView(value as any)) return Number((value as any)?.length) > 0;
  if (!Array.isArray(value) || !value.length) return false;
  return value.some(item => typeof item === 'number' || typeof item === 'string');
}

function isPrecipKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[_\s]/g, '-');
  return (k.includes('precip') || k === 'rain' || k.startsWith('rain-') || k === 'tp')
    && !k.includes('type')
    && !k.includes('snow');
}

function collectFromRecordArray(items: unknown[], out: Record<string, unknown>) {
  if (!items.length || !items.every(item => !!item && typeof item === 'object' && !Array.isArray(item))) return;
  const keys = new Set<string>();
  for (const item of items as Record<string, unknown>[]) {
    for (const key of Object.keys(item)) if (isPrecipKey(key)) keys.add(key);
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

function collectPrecipFields(value: unknown, out: Record<string, unknown>, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 7) return;

  if (Array.isArray(value)) {
    collectFromRecordArray(value, out);
    for (const child of value.slice(0, 3)) collectPrecipFields(child, out, depth + 1);
    return;
  }

  const obj = value as Record<string, unknown>;
  for (const [key, field] of Object.entries(obj)) {
    if (isPrecipKey(key) && isNumericArrayLike(field)) out[key] = field;
  }
  for (const child of Object.values(obj)) {
    if (child && typeof child === 'object' && !isNumericArrayLike(child)) {
      collectPrecipFields(child, out, depth + 1);
    }
  }
}

export async function loadSelectedPrecipFields(lat: number, lon: number, days = 6): Promise<Record<string, unknown>> {
  try {
    const response = await getPointForecastData(
      'ecmwf',
      { lat, lon, step: 1, days, source: 'detail' } as any,
    );
    const out: Record<string, unknown> = {};
    collectPrecipFields(response as unknown, out);
    if (!Object.keys(out).length) {
      console.warn('Snowline precipitation: no precipitation field found in Windy point forecast payload');
    } else {
      console.info('Snowline precipitation fields:', Object.keys(out));
    }
    return out;
  } catch (e) {
    console.warn('Snowline point precipitation request failed', lat, lon, e);
    return {};
  }
}
