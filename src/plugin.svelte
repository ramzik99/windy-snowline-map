<div class="snowline-panel">
  <div class="panel-copy">
    <div class="title">Snowline</div>
    <div class="description">
      Level that separates snow from rain, estimated from wet-bulb freezing level using ECMWF. Runs up to 144 hours only.
    </div>
  </div>
  <label class="switch">
    <input type="checkbox" bind:checked={enabled} on:change={toggleEnabled} />
    <span>{enabled ? 'On' : 'Off'}</span>
  </label>
</div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { getMeteogramForecastData } from '@windy/fetch';

  import { buildProfile, wetBulbZeroHeight, valueAt } from './snowLevel';
  import { contourPolylines, type GridPoint, type ContourPolyline } from './contours';

  type CachedPoint = {
    lat: number;
    lon: number;
    forecast: Record<string, unknown>;
    header: Record<string, unknown>;
    times: number[];
  };

  type ColourStop = { value: number; color: string };
  type ViewportPoint = { lat: number; lon: number; r: number; c: number };

  let enabled = true;
  let loading = false;
  let cache: (CachedPoint | null)[][] = [];
  let contourLayer: any = null;
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let timestampListener: number | null = null;

  const MODEL = 'ecmwf' as const;
  const MAX_CONCURRENT = 8;
  const FORECAST_DAYS = 6;
  const MAX_FORECAST_HOURS = 144;
  const CONTOUR_INTERVAL = 100;

  const COLOUR_STOPS: ColourStop[] = [
    { value: 150,  color: '#c51ac7' },
    { value: 300,  color: '#8b079e' },
    { value: 450,  color: '#50007f' },
    { value: 600,  color: '#231073' },
    { value: 750,  color: '#003e91' },
    { value: 1000, color: '#1688d4' },
    { value: 1300, color: '#72bdf3' },
    { value: 1600, color: '#b9e7c7' },
    { value: 1900, color: '#c8ef4a' },
    { value: 2200, color: '#f4eb00' },
    { value: 2500, color: '#ffc21a' },
    { value: 2800, color: '#ff850d' },
    { value: 3250, color: '#f34412' },
    { value: 4000, color: '#c41618' },
    { value: 5500, color: '#850008' },
    { value: 6000, color: '#3e0906' },
  ];

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  function rgbToHex(r: number, g: number, b: number): string {
    const part = (v: number) => Math.round(v).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
  }

  function colorForLevel(level: number): string {
    if (level <= COLOUR_STOPS[0].value) return COLOUR_STOPS[0].color;
    if (level >= COLOUR_STOPS[COLOUR_STOPS.length - 1].value) {
      return COLOUR_STOPS[COLOUR_STOPS.length - 1].color;
    }

    for (let i = 0; i < COLOUR_STOPS.length - 1; i++) {
      const a = COLOUR_STOPS[i];
      const b = COLOUR_STOPS[i + 1];
      if (level >= a.value && level <= b.value) {
        const f = (level - a.value) / (b.value - a.value);
        const ca = hexToRgb(a.color);
        const cb = hexToRgb(b.color);
        return rgbToHex(
          ca[0] + (cb[0] - ca[0]) * f,
          ca[1] + (cb[1] - ca[1]) * f,
          ca[2] + (cb[2] - ca[2]) * f
        );
      }
    }

    return '#ffffff';
  }

  function getStoreTimestamp(): number {
    try {
      const t = store.get('timestamp');
      if (typeof t === 'number' && Number.isFinite(t)) return t;
    } catch {}
    return Date.now();
  }

  function parseRefTime(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 1e12) return value;
      if (value > 1e9) return value * 1000;
    }
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  function buildForecastTimes(
    data: Record<string, unknown>,
    header: Record<string, unknown>
  ): number[] {
    const hours = data['hours'];
    if (hours == null) return [];

    const n = Number((hours as any).length);
    if (!Number.isFinite(n) || n <= 0) return [];

    const raw: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = valueAt(hours, i);
      if (v !== null) raw.push(v);
    }
    if (!raw.length) return [];

    let times: number[];
    if (raw[0] > 1e12) {
      times = raw;
    } else if (raw[0] > 1e9) {
      times = raw.map(v => v * 1000);
    } else {
      const ref = parseRefTime(header.refTime);
      if (ref === null) return [];
      times = raw.map(h => ref + h * 3600_000);
    }

    if (!times.length) return [];
    const first = times[0];
    const hardEnd = first + MAX_FORECAST_HOURS * 3600_000;
    return times.filter(t => t <= hardEnd + 60_000);
  }

  function nearestIndex(times: number[], target: number): number {
    let bestIndex = 0;
    let best = Infinity;
    times.forEach((t, i) => {
      const d = Math.abs(t - target);
      if (d < best) {
        best = d;
        bestIndex = i;
      }
    });
    return bestIndex;
  }

  function extractPayload(payload: unknown): {
    forecast: Record<string, unknown>;
    header: Record<string, unknown>;
  } {
    const p = payload as any;
    return {
      forecast:
        p?.data?.data && typeof p.data.data === 'object'
          ? p.data.data as Record<string, unknown>
          : {},
      header:
        p?.data?.header && typeof p.data.header === 'object'
          ? p.data.header as Record<string, unknown>
          : {},
    };
  }

  async function loadPoint(lat: number, lon: number): Promise<CachedPoint | null> {
    try {
      const response = await getMeteogramForecastData(
        MODEL,
        { lat, lon, step: 1, days: FORECAST_DAYS }
      );
      const { forecast, header } = extractPayload(response);
      if (!Object.keys(forecast).length) return null;

      return {
        lat,
        lon,
        forecast,
        header,
        times: buildForecastTimes(forecast, header),
      };
    } catch (e) {
      console.warn('Snowline point failed', lat, lon, e);
      return null;
    }
  }

  async function mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const out = new Array<R>(items.length);
    let next = 0;

    async function worker() {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, () => worker())
    );
    return out;
  }

  function gridShapeForZoom(): { rows: number; cols: number } {
    const zoom = Number(map.getZoom?.() ?? 6);

    // Save requests when viewing a continent, retain the proven 17×11 regional
    // grid for normal use, and add detail only when the user zooms locally.
    if (zoom <= 4) return { rows: 9, cols: 13 };   // 117 profiles
    if (zoom <= 7) return { rows: 11, cols: 17 }; // 187 profiles
    return { rows: 15, cols: 21 };                // 315 profiles
  }

  function buildViewportPoints(): {
    points: ViewportPoint[];
    rows: number;
    cols: number;
  } {
    const { rows, cols } = gridShapeForZoom();
    const b = map.getBounds();
    const south = Math.max(-75, b.getSouth());
    const north = Math.min(75, b.getNorth());
    const west = b.getWest();
    const east = b.getEast();
    const latStep = (north - south) / (rows - 1);
    const lonStep = (east - west) / (cols - 1);

    const points: ViewportPoint[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        points.push({
          lat: south + r * latStep,
          lon: west + c * lonStep,
          r,
          c,
        });
      }
    }

    return { points, rows, cols };
  }

  async function refreshViewport() {
    if (!enabled || loading) return;

    const myGeneration = ++generation;
    loading = true;
    const { points, rows, cols } = buildViewportPoints();

    const results = await mapLimit(points, MAX_CONCURRENT, async p => {
      const result = await loadPoint(p.lat, p.lon);
      return { ...p, result };
    });

    if (myGeneration !== generation) {
      loading = false;
      return;
    }

    const nextCache: (CachedPoint | null)[][] = Array.from(
      { length: rows },
      () => Array(cols).fill(null)
    );

    for (const item of results) {
      if (item.result) nextCache[item.r][item.c] = item.result;
    }

    cache = nextCache;
    loading = false;
    renderFromCache();
  }

  function clearContours() {
    if (contourLayer) {
      try { map.removeLayer(contourLayer); } catch {}
      contourLayer = null;
    }
  }

  function lineLength(line: ContourPolyline): number {
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const meanLat = (a[0] + b[0]) * 0.5 * Math.PI / 180;
      const dy = b[0] - a[0];
      const dx = (b[1] - a[1]) * Math.cos(meanLat);
      total += Math.hypot(dx, dy);
    }
    return total;
  }

  function midpointAlongLine(line: ContourPolyline): [number, number] | null {
    if (line.length < 2) return null;

    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const meanLat = (a[0] + b[0]) * 0.5 * Math.PI / 180;
      const dy = b[0] - a[0];
      const dx = (b[1] - a[1]) * Math.cos(meanLat);
      const d = Math.hypot(dx, dy);
      lengths.push(d);
      total += d;
    }

    if (total <= 0) return line[Math.floor(line.length / 2)];

    const target = total / 2;
    let travelled = 0;
    for (let i = 0; i < lengths.length; i++) {
      const d = lengths[i];
      if (travelled + d >= target) {
        const f = d > 0 ? (target - travelled) / d : 0;
        const a = line[i];
        const b = line[i + 1];
        return [
          a[0] + f * (b[0] - a[0]),
          a[1] + f * (b[1] - a[1]),
        ];
      }
      travelled += d;
    }

    return line[line.length - 1];
  }

  function renderFromCache() {
    if (!enabled || !cache.length) {
      clearContours();
      return;
    }

    const target = getStoreTimestamp();
    const firstPoint = cache.flat().find(
      (cp): cp is CachedPoint => cp !== null && cp.times.length > 0
    );

    if (!firstPoint) {
      clearContours();
      return;
    }

    const firstTime = firstPoint.times[0];
    const hardEnd = firstTime + MAX_FORECAST_HOURS * 3600_000;
    const lastAvailable = firstPoint.times[firstPoint.times.length - 1];
    const effectiveEnd = Math.min(hardEnd, lastAvailable);

    if (target < firstTime - 30 * 60_000 || target > effectiveEnd + 30 * 60_000) {
      clearContours();
      return;
    }

    const field: GridPoint[][] = [];
    for (let r = 0; r < cache.length; r++) {
      const row: GridPoint[] = [];
      for (let c = 0; c < cache[r].length; c++) {
        const cp = cache[r][c];
        if (!cp || !cp.times.length) {
          row.push({ lat: 0, lon: 0, value: null });
          continue;
        }

        const idx = nearestIndex(cp.times, target);
        const profile = buildProfile(cp.forecast, idx);
        const wbz = wetBulbZeroHeight(profile);
        row.push({ lat: cp.lat, lon: cp.lon, value: wbz.snowLevelM });
      }
      field.push(row);
    }

    clearContours();
    contourLayer = L.layerGroup().addTo(map);

    const values = field
      .flat()
      .map(p => p.value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (!values.length) return;

    const min = Math.floor(Math.min(...values) / CONTOUR_INTERVAL) * CONTOUR_INTERVAL;
    const max = Math.ceil(Math.max(...values) / CONTOUR_INTERVAL) * CONTOUR_INTERVAL;

    for (let level = min; level <= max; level += CONTOUR_INTERVAL) {
      const lines = contourPolylines(field, level);
      const is1000 = level % 1000 === 0;
      const is500 = level % 500 === 0;
      const contourColor = colorForLevel(level);

      for (const line of lines) {
        if (line.length < 2) continue;

        if (is500) {
          L.polyline(line, {
            color: '#11151b',
            weight: is1000 ? 4.3 : 3.0,
            opacity: is1000 ? 0.58 : 0.42,
            interactive: false,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 0.8,
          }).addTo(contourLayer);
        }

        L.polyline(line, {
          color: contourColor,
          weight: is1000 ? 2.9 : is500 ? 1.9 : 0.82,
          opacity: is1000 ? 1.0 : is500 ? 0.96 : 0.62,
          interactive: false,
          lineCap: 'round',
          lineJoin: 'round',
          smoothFactor: is500 ? 0.7 : 0.9,
        }).addTo(contourLayer);
      }

      if (is500 && lines.length) {
        const longest = [...lines].sort((a, b) => lineLength(b) - lineLength(a))[0];
        const labelPoint = midpointAlongLine(longest);

        if (labelPoint && lineLength(longest) > 0.08) {
          L.marker(labelPoint, {
            interactive: false,
            icon: L.divIcon({
              className: 'snowline-label',
              html: `<span style="--snowline-color:${contourColor}">${level} m</span>`,
              iconSize: [62, 20],
              iconAnchor: [31, 10],
            }),
          }).addTo(contourLayer);
        }
      }
    }
  }

  function scheduleViewportRefresh() {
    if (!enabled) return;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => refreshViewport(), 650);
  }

  function toggleEnabled() {
    if (enabled) {
      refreshViewport();
    } else {
      generation += 1;
      loading = false;
      clearContours();
    }
  }

  onMount(() => {
    map.on('moveend', scheduleViewportRefresh);
    map.on('zoomend', scheduleViewportRefresh);

    try {
      timestampListener = store.on('timestamp', () => {
        if (enabled && cache.length && !loading) renderFromCache();
      });
    } catch (e) {
      console.warn('Snowline timeline listener unavailable', e);
    }

    refreshViewport();
  });

  onDestroy(() => {
    generation += 1;
    if (moveTimer) clearTimeout(moveTimer);
    map.off('moveend', scheduleViewportRefresh);
    map.off('zoomend', scheduleViewportRefresh);

    if (timestampListener !== null) {
      try { store.off(timestampListener); } catch {}
    }

    clearContours();
  });
</script>

<style lang="less">
  .snowline-panel {
    width: 220px;
    padding: 8px 9px;
    border-radius: 8px;
    background: rgba(45,45,45,0.94);
    color: white;
    box-shadow: 0 3px 12px rgba(0,0,0,0.24);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .panel-copy {
    min-width: 0;
    flex: 1 1 auto;
  }

  .title {
    font-size: 16px;
    line-height: 1.05;
    font-weight: 800;
    margin-bottom: 4px;
  }

  .description {
    font-size: 10px;
    line-height: 1.28;
    opacity: 0.72;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    padding-top: 1px;
  }

  .switch input {
    margin: 0;
    width: 15px;
    height: 15px;
  }

  @media (max-width: 520px) {
    .snowline-panel {
      width: 195px;
      padding: 7px 8px;
    }

    .description {
      font-size: 9.5px;
    }
  }

  :global(.snowline-label) {
    background: transparent !important;
    border: 0 !important;
  }

  :global(.snowline-label span) {
    display: inline-block;
    padding: 1px 4px 1px 6px;
    border-radius: 3px;
    border-left: 4px solid var(--snowline-color, white);
    background: rgba(15,17,20,0.86);
    color: white;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12);
  }
</style>