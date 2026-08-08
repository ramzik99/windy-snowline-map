import { valueAt } from './snowLevel';

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]/g, '-');
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

function toCentimetres(key: string, raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 0) return null;
  const k = normaliseKey(key);

  if (k.includes('-cm') || k.endsWith('cm')) return raw;
  if (k.includes('-mm') || k.endsWith('mm')) return raw / 10;

  // Windy's rendered snow-cover values are already on the displayed snow-depth
  // scale. Do not multiply these by 100 (that produced values such as 1664 cm
  // from a 16.64 cm map value).
  if (k.includes('snowcover') || k.includes('snow-cover')) return raw;

  // ECMWF/WMO aliases sd/sde/H_SNOW are model-native depth-like fields and are
  // normally represented in metres in the raw point payload.
  return raw * 100;
}

export function snowDepthCmAt(forecast: Record<string, unknown>, index: number): number | null {
  for (const [key, field] of Object.entries(forecast)) {
    if (!isSnowDepthKey(key)) continue;
    const raw = valueAt(field, index);
    if (raw === null) continue;
    const cm = toCentimetres(key, raw);
    if (cm !== null) return cm;
  }
  return null;
}

export function formatSnowDepthCm(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value < 10) return value.toFixed(1);
  return String(Math.round(value));
}
