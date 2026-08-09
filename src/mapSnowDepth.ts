import store from '@windy/store';
import { getLatLonInterpolator } from '@windy/interpolator';

/**
 * Snow depth source verified with the standalone inspector:
 * ECMWF `snowcover` renderer channel 0 is the displayed snow-depth scalar,
 * on Windy's centimetre snow-depth scale.
 *
 * Windy's coordinate interpolator accepts render parameters. We therefore
 * request the `snowcover` renderer explicitly for the currently selected
 * Windy timestamp instead of requiring the user to have Snow depth active.
 * If that renderer is unavailable, we fall back to the already-loaded active
 * snowcover renderer when possible.
 *
 * This is still a current-timestep value only. No 144 h depth series is
 * fabricated from precipitation or snowfall.
 */
export async function currentMapSnowDepthCm(
  lat: number,
  lon: number,
  timestamp?: number,
): Promise<number | null> {
  try {
    let selectedTimestamp = timestamp;
    if (!Number.isFinite(Number(selectedTimestamp))) {
      try {
        const t = store.get('timestamp');
        if (typeof t === 'number' && Number.isFinite(t)) selectedTimestamp = t;
      } catch {}
    }

    const interpolator = await getLatLonInterpolator();
    if (!interpolator) return null;

    const decode = (raw: unknown): number | null => {
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
    };

    const params: any = {
      overlay: 'snowcover',
      product: 'ecmwf',
      level: 'surface',
    };
    if (Number.isFinite(Number(selectedTimestamp))) params.timestamp = Number(selectedTimestamp);

    try {
      const requested = await interpolator({ lat, lon } as any, undefined, params);
      const decoded = decode(requested);
      if (decoded !== null) return decoded;
    } catch (e) {
      console.warn('Snow forecast explicit snowcover interpolation failed', e);
    }

    // Fallback: if Snow depth is already the active map renderer, use it.
    try {
      const overlay = store.get('overlay');
      const product = store.get('product');
      if (overlay === 'snowcover' && (!product || product === 'ecmwf')) {
        const active = await interpolator({ lat, lon } as any);
        return decode(active);
      }
    } catch {}

    return null;
  } catch (e) {
    console.warn('Snow forecast current snow-depth interpolation failed', e);
    return null;
  }
}

export function formatMapSnowDepthCm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 1) return `${value.toFixed(1)} cm`;
  return `${value.toFixed(0)} cm`;
}
