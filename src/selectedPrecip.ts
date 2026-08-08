import { getPointForecastData } from '@windy/fetch';

function isArrayLike(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (ArrayBuffer.isView(value as any)) return Number((value as any)?.length) > 0;
  return !!value && typeof value === 'object' && Number.isFinite(Number((value as any)?.length));
}

function isPrecipKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[_\s]/g, '-');
  return (k.includes('precip') || k === 'rain' || k.startsWith('rain-') || k === 'tp')
    && !k.includes('type')
    && !k.includes('snow');
}

function collectPrecipFields(value: unknown, out: Record<string, unknown>, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return;
  const obj = value as Record<string, unknown>;

  for (const [key, field] of Object.entries(obj)) {
    if (isPrecipKey(key) && isArrayLike(field)) out[key] = field;
  }

  for (const child of Object.values(obj)) {
    if (child && typeof child === 'object' && !isArrayLike(child)) {
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
