import store from '@windy/store';
import { getLatLonInterpolator } from '@windy/interpolator';

function scalar(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const n = Number(item);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Windy's public interpolator follows the renderer currently loaded by Windy.
 * It cannot reliably fetch an unrelated overlay in the background. Therefore
 * this helper is only a secondary fallback when snowcover already happens to
 * be rendered. The preferred v5.0.1 source is the ECMWF point forecast payload.
 *
 * The snowcover renderer returns the displayed depth scale, so the value is
 * already treated as centimetres here (no x100 conversion).
 */
export async function snowDepthCmAtTime(lat: number, lon: number, _timestamp: number): Promise<number | null> {
  try {
    if (store.get('overlay') !== 'snowcover') return null;
    const interpolator = await getLatLonInterpolator();
    if (!interpolator) return null;
    const raw = await interpolator({ lat, lon } as any);
    const value = scalar(raw);
    return value !== null && value >= 0 ? value : null;
  } catch (e) {
    console.warn('Snow forecast snow-depth interpolation failed', e);
    return null;
  }
}

export async function loadSnowDepthSeriesCm(
  lat: number,
  lon: number,
  times: number[],
): Promise<(number | null)[]> {
  const out: (number | null)[] = Array(times.length).fill(null);
  if (!times.length || store.get('overlay') !== 'snowcover') return out;

  // The active renderer can only represent the currently selected Windy time,
  // so expose that one value rather than inventing a 144-hour time series.
  let selected = Date.now();
  try {
    const t = store.get('timestamp');
    if (typeof t === 'number' && Number.isFinite(t)) selected = t;
  } catch {}

  let best = 0;
  let distance = Infinity;
  times.forEach((time, index) => {
    const d = Math.abs(time - selected);
    if (d < distance) { distance = d; best = index; }
  });
  out[best] = await snowDepthCmAtTime(lat, lon, times[best]);
  return out;
}

export async function currentMapSnowDepthCm(lat: number, lon: number): Promise<number | null> {
  let timestamp = Date.now();
  try {
    const selected = store.get('timestamp');
    if (typeof selected === 'number' && Number.isFinite(selected)) timestamp = selected;
  } catch {}
  return snowDepthCmAtTime(lat, lon, timestamp);
}
