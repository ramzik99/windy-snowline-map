import store from '@windy/store';
import { getLatLonInterpolator } from '@windy/interpolator';

function decodeSnowcover(raw: unknown): number | null {
  let value: number | null = null;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    value = raw;
  } else if (Array.isArray(raw) && raw.length) {
    const channel0 = Number(raw[0]);
    if (Number.isFinite(channel0)) value = channel0;
  } else if (
    raw &&
    typeof raw === 'object' &&
    typeof (raw as any).length === 'number' &&
    Number((raw as any).length) > 0
  ) {
    const channel0 = Number((raw as any)[0]);
    if (Number.isFinite(channel0)) value = channel0;
  }

  return value !== null && value >= 0 ? value : null;
}

function safeGet(name: string): any {
  try { return store.get(name as any); } catch { return null; }
}

/**
 * Snow depth source verified with the standalone inspector:
 * ECMWF `snowcover` renderer channel 0 is the displayed snow-depth scalar,
 * on Windy's centimetre snow-depth scale.
 *
 * IMPORTANT: Windy's public interpolator only interpolates already-loaded
 * renderer tiles. This helper NEVER changes the user's overlay, product,
 * level or timestamp. It first asks the interpolator for snowcover using
 * explicit render parameters; this can succeed when snowcover tiles are
 * already available/cached. If Windy currently has Snow depth rendered, it
 * also falls back to the active renderer.
 *
 * We intentionally do not "pre-warm" snowcover by store.set('overlay', ...),
 * because that changes the visible Windy map and can cause overlay oscillation.
 * No precipitation/snowfall-derived depth is fabricated.
 */
export async function currentMapSnowDepthCm(
  lat: number,
  lon: number,
  timestamp?: number,
): Promise<number | null> {
  let selectedTimestamp = Number(timestamp);
  if (!Number.isFinite(selectedTimestamp)) {
    const t = safeGet('timestamp');
    if (typeof t === 'number' && Number.isFinite(t)) selectedTimestamp = t;
  }

  try {
    const interpolator = await getLatLonInterpolator();
    if (!interpolator) return null;

    const params: any = {
      overlay: 'snowcover',
      product: 'ecmwf',
      level: 'surface',
    };
    if (Number.isFinite(selectedTimestamp)) params.timestamp = selectedTimestamp;

    // Safe attempt: never mutates Windy's visible store state.
    try {
      const raw = await interpolator({ lat, lon } as any, undefined, params);
      const value = decodeSnowcover(raw);
      if (value !== null) return value;
    } catch {}

    // Safe fallback if Snow depth is already the active/loaded renderer.
    try {
      const overlay = safeGet('overlay');
      const product = safeGet('product');
      if (overlay === 'snowcover' && (!product || product === 'ecmwf')) {
        const raw = await interpolator({ lat, lon } as any);
        const value = decodeSnowcover(raw);
        if (value !== null) return value;
      }
    } catch {}

    return null;
  } catch (e) {
    console.warn('Snow forecast snow-depth interpolation failed', e);
    return null;
  }
}

export function formatMapSnowDepthCm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 1) return `${value.toFixed(1)} cm`;
  return `${value.toFixed(0)} cm`;
}
