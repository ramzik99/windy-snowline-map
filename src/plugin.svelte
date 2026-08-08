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

  <div class="scale-wrap" aria-label="Snowline height colour scale">
    <div class="scale-bar"></div>
    <div class="scale-labels">
      <span>150</span><span>600</span><span>1000</span><span>1600</span><span>2200</span><span>2800</span><span>4000</span><span>6000</span>
    </div>
    <div class="scale-unit">metres AMSL</div>
  </div>

  <div class="legend">
    <div><span class="line minor"></span><span>100 m</span></div>
    <div><span class="line medium"></span><span>500 m + label</span></div>
    <div><span class="line major"></span><span>1000 m major</span></div>
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
  type ColourStop = { value: number; color: string };

  let enabled = true;
  let model: Model = 'ecmwf';
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
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function rgbToHex(r: number, g: number, b: number): string {
    const part = (v: number) => Math.round(v).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
  }

  function colorForLevel(level: number): string {
    if (level <= COLOUR_STOPS[0].value) return COLOUR_STOPS[0].color;
    if (level >= COLOUR_STOPS[COLOUR_STOPS.length - 1].value) return COLOUR_STOPS[COLOUR_STOPS.length - 1].color;
    for (let i = 0; i < COLOUR_STOPS.length - 1; i++) {
      const a = COLOUR_STOPS[i];
      const b = COLOUR_STOPS[i + 1];
      if (level >= a.value && level <= b.value) {
        const f = (level - a.value) / (b.value - a.value);
        const ca = hexToRgb(a.color);
        const cb = hexToRgb(b.color);
        return rgbToHex(ca[0] + (cb[0] - ca[0]) * f, ca[1] + (cb[1] - ca[1]) * f, ca[2] + (cb[2] - ca[2]) * f);
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

  function buildForecastTimes(data: Record<string, unknown>, header: Record<string, unknown>): number[] {
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

  function extractPayload(payload: unknown): { forecast: Record<string, unknown>; header: Record<string, unknown> } {
    const p = payload as any;
    return {
      forecast: p?.data?.data && typeof p.data.data === 'object' ? p.data.data as Record<string, unknown> : {},
      header: p?.data?.header && typeof p.data.header === 'object' ? p.data.header as Record<string, unknown> : {},
    };
  }

  async function loadPoint(lat: number, lon: number): Promise<CachedPoint | null> {
    try {
      const response = await getMeteogramForecastData(model, { lat, lon, step: 1, days: FORECAST_DAYS });
      const { forecast, header } = extractPayload(response);
      if (!Object.keys(forecast).length) return null;
      return { lat, lon, forecast, header, times: buildForecastTimes(forecast, header) };
    } catch (e) {
      console.warn('Snowline point failed', lat, lon, e);
      return null;
    }
  }

  async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out = new Array<R>(items.length);
    let next = 0;
    async function worker() {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
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
      for (let c = 0; c < COLS; c++) points.push({ lat: south + r * latStep, lon: west + c * lonStep, r, c });
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
    const nextCache: (CachedPoint | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (const item of results) if (item.result) nextCache[item.r][item.c] = item.result;
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

  function segmentScore(segment: any): number {
    if (!segment || segment.length < 2) return -1;
    const a = segment[0];
    const b = segment[1];
    const dy = Number(b[0]) - Number(a[0]);
    const dx = (Number(b[1]) - Number(a[1])) * Math.cos(((Number(a[0]) + Number(b[0])) / 2) * Math.PI / 180);
    return dx * dx + dy * dy;
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
      status = `Outside Snowline range · available to +${maxHour} h`;
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
        if (displayStepHours === null) displayStepHours = estimateStepHours(cp.times, target);
        const idx = nearestIndex(cp.times, target);
        const profile = buildProfile(cp.forecast, idx);
        const wbz = wetBulbZeroHeight(profile);
        row.push({ lat: cp.lat, lon: cp.lon, value: wbz.snowLevelM });
      }
      field.push(row);
    }

    clearContours();
    contourLayer = L.layerGroup().addTo(map);
    const values = field.flat().map(p => p.value).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (!values.length) {
      status = 'No WBZ values in viewport';
      return;
    }

    const min = Math.floor(Math.min(...values) / CONTOUR_INTERVAL) * CONTOUR_INTERVAL;
    const max = Math.ceil(Math.max(...values) / CONTOUR_INTERVAL) * CONTOUR_INTERVAL;
    let segmentCount = 0;

    for (let level = min; level <= max; level += CONTOUR_INTERVAL) {
      const segments = contourSegments(field, level);
      const is1000 = level % 1000 === 0;
      const is500 = level % 500 === 0;
      const contourColor = colorForLevel(level);

      for (const segment of segments) {
        if (is500) {
          L.polyline(segment, {
            color: '#11151b',
            weight: is1000 ? 4.3 : 3.0,
            opacity: is1000 ? 0.58 : 0.42,
            interactive: false,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 1.0,
          }).addTo(contourLayer);
        }
        L.polyline(segment, {
          color: contourColor,
          weight: is1000 ? 2.9 : is500 ? 1.9 : 0.82,
          opacity: is1000 ? 1.0 : is500 ? 0.96 : 0.62,
          interactive: false,
          lineCap: 'round',
          lineJoin: 'round',
          smoothFactor: 1.0,
        }).addTo(contourLayer);
        segmentCount += 1;
      }

      if (is500 && segments.length) {
        const s = [...segments].sort((a, b) => segmentScore(b) - segmentScore(a))[0];
        if (s && s.length >= 2) {
          const lat = (s[0][0] + s[1][0]) / 2;
          const lon = (s[0][1] + s[1][1]) / 2;
          L.marker([lat, lon], {
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

    const leadHours = Math.max(0, Math.round((target - firstTime) / 3600_000));
    const resolution = displayStepHours ? `${displayStepHours} h` : 'native';
    status = `+${leadHours} h · ${resolution} data · ${segmentCount} contours`;
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
    if (enabled) refreshViewport();
    else {
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
    background: rgba(45,45,45,0.95);
    color: white;
    box-shadow: 0 4px 20px rgba(0,0,0,0.28);
    font-size: 13px;
  }
  .header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
  .title { font-size: 18px; font-weight: 800; }
  .subtitle { opacity: 0.72; font-size: 11px; line-height: 1.35; }
  .row { margin-bottom: 8px; }
  label { display: grid; gap: 4px; font-size: 11px; font-weight: 700; }
  select, button { width: 100%; box-sizing: border-box; border: 0; border-radius: 6px; padding: 8px 9px; background: rgba(255,255,255,0.12); color: white; font-weight: 700; }
  select option { color: black; }
  button { margin-bottom: 8px; cursor: pointer; background: #e5403a; }
  button:disabled { opacity: 0.55; cursor: default; }
  .switch { display: flex; align-items: center; gap: 5px; }
  .status { display: flex; flex-direction: column; gap: 2px; padding: 8px; border-radius: 6px; background: rgba(255,255,255,0.08); margin-bottom: 9px; }
  .scale-wrap { margin-bottom: 9px; }
  .scale-bar {
    height: 11px;
    border-radius: 3px;
    border: 1px solid rgba(255,255,255,0.28);
    background: linear-gradient(90deg, #c51ac7 0%, #8b079e 5%, #50007f 10%, #231073 15%, #003e91 20%, #1688d4 27%, #72bdf3 34%, #b9e7c7 42%, #c8ef4a 50%, #f4eb00 58%, #ffc21a 66%, #ff850d 73%, #f34412 80%, #c41618 88%, #850008 95%, #3e0906 100%);
  }
  .scale-labels { display: flex; justify-content: space-between; margin-top: 2px; font-size: 8px; opacity: 0.82; font-variant-numeric: tabular-nums; }
  .scale-unit { margin-top: 1px; text-align: right; font-size: 9px; opacity: 0.58; }
  .legend { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 9px; }
  .legend div { display: flex; align-items: center; gap: 4px; }
  .line { width: 20px; height: 0; display: inline-block; flex: 0 0 auto; }
  .minor { border-top: 1px solid #1688d4; opacity: 0.65; }
  .medium { border-top: 2px solid #f4eb00; }
  .major { border-top: 3px solid #f34412; }
  :global(.snowline-label) { background: transparent !important; border: 0 !important; }
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