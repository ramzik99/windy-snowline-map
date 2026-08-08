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
 * Reads the snow-cover renderer that Windy is already displaying on the map.
 * Windy's snowcover renderer uses metres internally; the plugin graph uses cm.
 * This is a best-effort fallback for the selected time only when the Snow depth
 * overlay is active. It never changes the user's overlay or timeline.
 */
export async function currentMapSnowDepthCm(lat: number, lon: number): Promise<number | null> {
  try {
    if (store.get('overlay') !== 'snowcover') return null;
    const interpolator = await getLatLonInterpolator();
    if (!interpolator) return null;
    const raw = await interpolator({ lat, lon } as any);
    const metres = scalar(raw);
    if (metres === null || metres < 0) return null;
    return metres * 100;
  } catch (e) {
    console.warn('Snow forecast map snow-depth interpolation failed', e);
    return null;
  }
}
