import store from '@windy/store';
import { getLatLonInterpolator } from '@windy/interpolator';

let hiddenLoadPromise: Promise<number | null> | null = null;

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

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeGet(name: string): any {
  try { return store.get(name as any); } catch { return null; }
}

/**
 * Windy's public interpolator only interpolates renderer tiles that have been
 * loaded. First try the explicit render-parameter path. If snowcover tiles are
 * not yet present, this function automatically pre-warms Windy's ECMWF
 * snowcover renderer, samples verified channel 0 (centimetres), and restores
 * the user's visible map state immediately afterwards.
 *
 * During the pre-warm, weather-renderer canvas/image output is hidden so the
 * user does not see the Snow depth layer flash on screen. The user's overlay,
 * product, level and timestamp are restored in a finally block.
 *
 * This is a current-selected-timestep value only. It does not fabricate a
 * 144-hour snow-depth series from precipitation or snowfall.
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
    if (interpolator) {
      const params: any = {
        overlay: 'snowcover',
        product: 'ecmwf',
        level: 'surface',
      };
      if (Number.isFinite(selectedTimestamp)) params.timestamp = selectedTimestamp;

      try {
        const raw = await interpolator({ lat, lon } as any, undefined, params);
        const value = decodeSnowcover(raw);
        if (value !== null) return value;
      } catch {}

      try {
        if (safeGet('overlay') === 'snowcover' && (!safeGet('product') || safeGet('product') === 'ecmwf')) {
          const raw = await interpolator({ lat, lon } as any);
          const value = decodeSnowcover(raw);
          if (value !== null) return value;
        }
      } catch {}
    }
  } catch {}

  // Only one hidden renderer pre-warm at a time. Concurrent chart refreshes
  // share the same request instead of repeatedly toggling Windy store state.
  if (hiddenLoadPromise) return hiddenLoadPromise;

  hiddenLoadPromise = (async () => {
    const original = {
      overlay: safeGet('overlay'),
      product: safeGet('product'),
      level: safeGet('level'),
      timestamp: safeGet('timestamp'),
    };

    const style = document.createElement('style');
    style.setAttribute('data-snow-forecast-hidden-renderer', 'true');
    style.textContent = `
      .leaflet-overlay-pane canvas,
      .leaflet-overlay-pane img {
        visibility: hidden !important;
      }
    `;

    try {
      document.head.appendChild(style);

      // Set product first where accepted, then snowcover/surface/timestamp.
      try { (store as any).set('product', 'ecmwf'); } catch {}
      try { (store as any).set('level', 'surface'); } catch {}
      try { (store as any).set('overlay', 'snowcover'); } catch {}
      if (Number.isFinite(selectedTimestamp)) {
        try { (store as any).set('timestamp', selectedTimestamp); } catch {}
      }

      // Give Windy's renderer time to request/decode its tiles. Poll rather
      // than relying on an undocumented renderer-loaded event.
      for (let attempt = 0; attempt < 8; attempt++) {
        await wait(attempt === 0 ? 260 : 180);
        try {
          const interp = await getLatLonInterpolator();
          if (!interp) continue;
          const raw = await interp({ lat, lon } as any);
          const value = decodeSnowcover(raw);
          if (value !== null) return value;
        } catch {}
      }

      return null;
    } catch (e) {
      console.warn('Snow forecast hidden snowcover pre-warm failed', e);
      return null;
    } finally {
      // Restore the map exactly to the user's previous state.
      try { if (original.product != null) (store as any).set('product', original.product); } catch {}
      try { if (original.level != null) (store as any).set('level', original.level); } catch {}
      try { if (original.overlay != null) (store as any).set('overlay', original.overlay); } catch {}
      try { if (typeof original.timestamp === 'number' && Number.isFinite(original.timestamp)) (store as any).set('timestamp', original.timestamp); } catch {}

      // Keep renderer output hidden briefly while the original overlay redraws.
      await wait(120);
      try { style.remove(); } catch {}
    }
  })();

  try {
    return await hiddenLoadPromise;
  } finally {
    hiddenLoadPromise = null;
  }
}

export function formatMapSnowDepthCm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 1) return `${value.toFixed(1)} cm`;
  return `${value.toFixed(0)} cm`;
}
