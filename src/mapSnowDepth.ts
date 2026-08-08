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

function toCentimetres(raw: number | null): number | null {
  if (raw === null || raw < 0 || !Number.isFinite(raw)) return null;
  return raw * 100;
}

/**
 * Reads ECMWF snowcover for an explicit timestamp without requiring the user
 * to activate Windy's Snow depth overlay. The interpolator accepts render
 * parameters, so Snow forecast requests snowcover directly while leaving the
 * user's current overlay untouched.
 */
export async function snowDepthCmAtTime(lat: number, lon: number, timestamp: number): Promise<number | null> {
  try {
    const interpolator = await getLatLonInterpolator();
    if (!interpolator) return null;
    const params = {
      overlay: 'snowcover',
      product: 'ecmwf',
      level: 'surface',
      timestamp,
    } as any;
    const raw = await interpolator({ lat, lon } as any, undefined, params);
    return toCentimetres(scalar(raw));
  } catch (e) {
    console.warn('Snow forecast snow-depth interpolation failed', e);
    return null;
  }
}

/**
 * Loads a lightweight snow-depth series. Sampling every 3 h matches the graph's
 * precipitation cadence and avoids a large number of tile requests. The current
 * selected time can still be requested separately for an exact footer value.
 */
export async function loadSnowDepthSeriesCm(
  lat: number,
  lon: number,
  times: number[],
): Promise<(number | null)[]> {
  const out: (number | null)[] = Array(times.length).fill(null);
  if (!times.length) return out;

  const sampleIndices: number[] = [];
  let lastSample = -Infinity;
  for (let i = 0; i < times.length; i++) {
    if (times[i] - lastSample >= 3 * 3600_000 - 60_000 || i === times.length - 1) {
      sampleIndices.push(i);
      lastSample = times[i];
    }
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(6, sampleIndices.length) }, async () => {
    while (cursor < sampleIndices.length) {
      const i = sampleIndices[cursor++];
      out[i] = await snowDepthCmAtTime(lat, lon, times[i]);
    }
  });
  await Promise.all(workers);

  // Fill intervening forecast steps with the nearest preceding 3-hour value.
  let last: number | null = null;
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== null) last = out[i];
    else if (last !== null) out[i] = last;
  }
  for (let i = out.length - 2; i >= 0; i--) {
    if (out[i] === null && out[i + 1] !== null) out[i] = out[i + 1];
  }
  return out;
}

/** Backward-compatible selected-time helper. */
export async function currentMapSnowDepthCm(lat: number, lon: number): Promise<number | null> {
  let timestamp = Date.now();
  try {
    const selected = store.get('timestamp');
    if (typeof selected === 'number' && Number.isFinite(selected)) timestamp = selected;
  } catch {}
  return snowDepthCmAtTime(lat, lon, timestamp);
}
