<div class="snowline-panel">
  <div class="header">
    <div>
      <div class="title">❄️ Snowline</div>
      <div class="subtitle">WBZ proxy · 100 m contours · forecast to +144 h</div>
    </div>
    <label class="switch">
      <input type="checkbox" bind:checked={enabled} on:change={toggleEnabled} />
      <span>On</span>
    </label>
  </div>

  <div class="row">
    <label>
      Model
      <select bind:value={model} on:change={modelChanged}>
        <option value="ecmwf">ECMWF</option>
        <option value="gfs">GFS</option>
        <option value="icon">ICON</option>
      </select>
    </label>

    <label>
      Interval
      <select bind:value={contourInterval} on:change={renderFromCache}>
        <option value={100}>100 m</option>
        <option value={250}>250 m</option>
        <option value={500}>500 m</option>
        <option value={1000}>1000 m</option>
      </select>
    </label>
  </div>

  <button on:click={refreshViewport} disabled={loading || !enabled}>
    {loading ? `Loading ${loaded}/${total}…` : 'Refresh viewport'}
  </button>

  <div class="status">
    <strong>{status}</strong>
    {#if lastTimestamp}
      <span>{new Date(lastTimestamp).toLocaleString()}</span>
    {/if}
  </div>

  <div class="legend">
    <span class="minor-line"></span><span>100 m contours</span>
    <span class="major-line"></span><span>500 m labelled</span>
  </div>

  <div class="note">
    17×11 fast grid. Native timing is used: 1-hourly to ~90 h and 3-hourly to +144 h.
    Values beyond the available forecast are not extrapolated.
  </div>
</div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { getMeteogramForecastData } from '@windy/fetch';

  import { buildProfile, wetBulbZeroHeight, valueAt } from './snowLevel';
  import { contourSegments, type GridPoint } from './contours';

  type Model = 'ecmwf' | 'gfs' | 'icon';

  type CachedPoint = {
    lat: number;
    lon: number;
    forecast: Record<string, unknown>;
    header: Record<string, unknown>;
    times: number[];
  };

  let enabled = true;
  let model: Model = 'ecmwf';
  let contourInterval = 100;

  let loading = false;
  let loaded = 0;
  let total = 0;
  let status = 'Waiting for map…';
  let lastTimestamp: number | null = null;

  let cache: (CachedPoint | null)[][] = [];
  let contourLayer: any = null;
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let timestampListener: number | null = null;

  const ROWS = 11;
  const COLS = 17;
  const MAX_CONCURRENT = 8;
  const FORECAST_DAYS = 6;

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

    if (raw[0] > 1e12) return raw;
    if (raw[0] > 1e9) return raw.map(v => v * 1000);

    const ref = parseRefTime(header.refTime);
    if (ref === null) return [];
    return raw.map(h => ref + h * 3600_000);
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

  function estimateStepHours(times: number[], target: number): number | null {
    if (times.length < 2) return null;
    const idx = nearestIndex(times, target);
    let dt: number | null = null;
    if (idx > 0) dt = Math.abs(times[idx] - times[idx - 1]);
    if (idx < times.length - 1) {
      const next = Math.abs(times[idx + 1] - times[idx]);
      dt = dt === null ? next : Math.min(dt, next);
    }
    return dt === null ? null : Math.round(dt / 3600_000);
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
        model,
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

  function buildViewportPoints(): { lat: number; lon: number; r: number; c: number }[] {
    const b = map.getBounds();
    const south = Math.max(-75, b.getSouth());
    const north = Math.min(75, b.getNorth());
    const west = b.getWest();
    const east = b.getEast();
    const latStep = (north - south) / (ROWS - 1);
    const lonStep = (east - west) / (COLS - 1);

    const points = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        points.push({
          lat: south + r * latStep,
          lon: west + c * lonStep,
          r,
          c,
        });
      }
    }
    return points;
  }

  async function refreshViewport() {
    if (!enabled || loading) return;

    const myGeneration = ++generation;
    loading = true;
    loaded = 0;
    status = 'Fetching forecast profiles…';

    const points = buildViewportPoints();
    total = points.length;

    const results = await mapLimit(points, MAX_CONCURRENT, async p => {
      const result = await loadPoint(p.lat, p.lon);
      loaded += 1;
      return { ...p, result };
    });

    if (myGeneration !== generation) return;

    const nextCache: (CachedPoint | null)[][] = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(null)
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

  function renderFromCache() {
    if (!enabled || !cache.length) {
      clearContours();
      return;
    }

    const target = getStoreTimestamp();
    lastTimestamp = target;

    const firstPoint = cache.flat().find((cp): cp is CachedPoint => cp !== null && cp.times.length > 0);
    if (!firstPoint) {
      clearContours();
      status = 'No forecast data in viewport';
      return;
    }

    const firstTime = firstPoint.times[0];
    const lastTime = firstPoint.times[firstPoint.times.length - 1];
    if (target < firstTime - 30 * 60_000 || target > lastTime + 30 * 60_000) {
      clearContours();
      const maxHour = Math.round((lastTime - firstTime) / 3600_000);
      status = `Outside Snowline forecast range · available to +${maxHour} h`;
      return;
    }

    const field: GridPoint[][] = [];
    let displayStepHours: number | null = null;

    for (let r = 0; r < cache.length; r++) {
      const row: GridPoint[] = [];
      for (let c = 0; c < cache[r].length; c++) {
        const cp = cache[r][c];
        if (!cp || !cp.times.length) {
          row.push({ lat: 0, lon: 0, value: null });
          continue;
        }

        if (displayStepHours === null) {
          displayStepHours = estimateStepHours(cp.times, target);
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

    if (!values.length) {
      status = 'No WBZ values in viewport';
      return;
    }

    const min = Math.floor(Math.min(...values) / contourInterval) * contourInterval;
    const max = Math.ceil(Math.max(...values) / contourInterval) * contourInterval;

    let segmentCount = 0;

    for (let level = min; level <= max; level += contourInterval) {
      const segments = contourSegments(field, level);
      const is1000 = level % 1000 === 0;
      const is500 = level % 500 === 0;

      for (const segment of segments) {
        L.polyline(segment, {
          color: is1000 ? '#8fd3ff' : is500 ? '#d8f1ff' : '#ffffff',
          weight: is1000 ? 2.8 : is500 ? 2.0 : 0.9,
          opacity: is1000 ? 1.0 : is500 ? 0.94 : 0.55,
          interactive: false,
        }).addTo(contourLayer);
        segmentCount += 1;
      }

      // Keep the map readable: label the important 500 m contours only.
      if (is500 && segments.length) {
        const s = segments[Math.floor(segments.length / 2)];
        const lat = (s[0][0] + s[1][0]) / 2;
        const lon = (s[0][1] + s[1][1]) / 2;

        L.marker([lat, lon], {
          interactive: false,
          icon: L.divIcon({
            className: 'snowline-label',
            html: `<span>${level} m</span>`,
            iconSize: [58, 18],
            iconAnchor: [29, 9],
          }),
        }).addTo(contourLayer);
      }
    }

    const leadHours = Math.max(0, Math.round((target - firstTime) / 3600_000));
    const resolution = displayStepHours ? `${displayStepHours} h` : 'native';
    status = `+${leadHours} h · ${resolution} data · ${COLS}×${ROWS} grid`;
  }

  function scheduleViewportRefresh() {
    if (!enabled) return;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => refreshViewport(), 650);
  }

  function modelChanged() {
    cache = [];
    clearContours();
    refreshViewport();
  }

  function toggleEnabled() {
    if (enabled) {
      refreshViewport();
    } else {
      generation += 1;
      clearContours();
      status = 'Overlay off';
    }
  }

  onMount(() => {
    status = 'Starting…';
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
    width: 292px;
    padding: 12px;
    border-radius: 10px;
    background: rgba(45, 45, 45, 0.95);
    color: white;
    box-shadow: 0 4px 20px rgba(0,0,0,0.28);
    font-size: 13px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
  }

  .title { font-size: 18px; font-weight: 800; }
  .subtitle, .note { opacity: 0.72; font-size: 11px; line-height: 1.35; }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  label { display: grid; gap: 4px; font-size: 11px; font-weight: 700; }

  select, button {
    width: 100%;
    box-sizing: border-box;
    border: 0;
    border-radius: 6px;
    padding: 8px 9px;
    background: rgba(255,255,255,0.12);
    color: white;
    font-weight: 700;
  }

  select option { color: black; }

  button {
    margin-bottom: 8px;
    cursor: pointer;
    background: #e5403a;
  }

  button:disabled { opacity: 0.55; cursor: default; }
  .switch { display: flex; align-items: center; gap: 5px; }

  .status {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-radius: 6px;
    background: rgba(255,255,255,0.08);
    margin-bottom: 8px;
  }

  .legend {
    display: grid;
    grid-template-columns: 28px auto 28px auto;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 10px;
    opacity: 0.9;
  }

  .minor-line { width: 26px; border-top: 1px solid white; opacity: 0.65; }
  .major-line { width: 26px; border-top: 2px solid #d8f1ff; }

  :global(.snowline-label) {
    background: transparent !important;
    border: 0 !important;
  }

  :global(.snowline-label span) {
    display: inline-block;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(18,18,18,0.82);
    color: white;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12);
  }
</style>