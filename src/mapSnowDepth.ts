import store from '@windy/store';
import { getLatLonInterpolator } from '@windy/interpolator';

/**
 * Verified against Windy's Snow depth picker with the standalone inspector:
 * the active ECMWF `snowcover` renderer returns an array whose channel 0 is
 * the displayed snow-depth scalar, on Windy's centimetre snow-depth scale.
 *
 * This helper deliberately reads ONLY the currently rendered Windy timestep.
 * It does not switch overlays or timestamps and it does not fabricate a
 * +144 h snow-depth series from precipitation/snowfall.
 */
export async function currentMapSnowDepthCm(lat: number, lon: number): Promise<number | null> {
  try {
    if (store.get('overlay') !== 'snowcover') return null;

    const product = store.get('product');
    if (product && product !== 'ecmwf') return null;

    const interpolator = await getLatLonInterpolator();
    if (!interpolator) return null;

    const raw = await interpolator({ lat, lon } as any);
    let value: number | null = null;

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      value = raw;
    } else if (Array.isArray(raw) && raw.length) {
      const channel0 = Number(raw[0]);
      if (Number.isFinite(channel0)) value = channel0;
    } else if (raw && typeof raw === 'object' && typeof (raw as any).length === 'number' && Number((raw as any).length) > 0) {
      const channel0 = Number((raw as any)[0]);
      if (Number.isFinite(channel0)) value = channel0;
    }

    return value !== null && value >= 0 ? value : null;
  } catch (e) {
    console.warn('Snow forecast current snow-depth interpolation failed', e);
    return null;
  }
}

export function formatMapSnowDepthCm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 1) return `${value.toFixed(1)} cm`;
  if (value < 100) return `${value.toFixed(0)} cm`;
  return `${value.toFixed(0)} cm`;
}
