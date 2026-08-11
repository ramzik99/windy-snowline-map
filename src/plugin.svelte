{#if panelHidden}
  <button class="show-panel" type="button" aria-label="Show Wintry forecast panel" on:click={() => panelHidden = false}>❄ Wintry forecast</button>
{:else}
  <div class="snowline-panel">
    <div class="top-row">
      <div class="title">Wintry forecast</div>
      <div class="top-controls">
        <button class="info-button" class:active={infoOpen} type="button" aria-label="How Wintry forecast works" title="How it works" on:click={() => infoOpen = true}>i</button>
        <button class="hide-button" type="button" aria-label="Hide Wintry forecast panel" title="Hide" on:click={() => panelHidden = true}>−</button>
        <label class="switch"><input type="checkbox" bind:checked={enabled} on:change={toggleEnabled} /><span>{enabled ? 'On' : 'Off'}</span></label>
      </div>
    </div>

    <PlaceSearch on:select={handlePlaceSelect} on:clear={handleSearchClear} />

    {#if enabled && (viewportLoading || probeLoading)}
      <div class="status-pill"><span class="status-dot"></span>{probeLoading ? 'Reading point…' : 'Updating contours…'}</div>
    {/if}
  </div>
{/if}

{#if chartOpen && clickedPoint}
  <SnowlineChart
    point={clickedPoint}
    terrainM={clickedMapElevationM}
    placeName={clickedPlaceName || 'Selected point'}
    bind:tab={forecastTab}
    on:close={() => chartOpen = false}
  />
{/if}

{#if infoOpen}
  <div class="info-overlay" role="presentation" on:click={() => infoOpen = false}>
    <div class="info-window" role="dialog" aria-modal="true" aria-label="How Wintry forecast works" on:click|stopPropagation>
      <div class="info-head">
        <b>How Wintry forecast works</b>
        <button type="button" aria-label="Close information" title="Close" on:click={() => infoOpen = false}>×</button>
      </div>
      <div class="info-body">
        <div><b>Snowline:</b> ECMWF temperature, dew point and geopotential height are converted to a wet-bulb profile. The lowest 0°C wet-bulb crossing is used as a thermal snowline proxy, out to +144 h.</div>
        <div><b>Local point:</b> the profile is intersected with Windy terrain. The point card shows terrain temperature, wet-bulb temperature and RH. With precipitation ≥0.1 mm/3h, the plugin also diagnoses precipitation type and estimates forecast-created new snow.</div>
        <div><b>Convective snow:</b> ⚡❄ marks a profile-based convective-snow environment when snow or wet snow coincides with a steep low/mid-level lapse rate and a moist dendritic-growth layer. It is not a lightning forecast.</div>
        <div><b>Map controls:</b> while Wintry forecast is open, a left-click moves the Wintry point. Minimising the panel does not disable point selection.</div>
        <div><b>Forecast:</b> use the chart button on a point card for the 144-hour graph and forecast sounding.</div>
        <div class="info-caveat">Snowline, precipitation type, convective-snow potential and new snow are profile-based diagnostics. New snow is not existing snow depth, and a displayed snowline does not imply precipitation.</div>
      </div>
    </div>
  </div>
{/if}

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { getElevation, getMeteogramForecastData } from '@windy/fetch';
  import PlaceSearch from './PlaceSearch.svelte';
  import SnowlineChart from './SnowlineChart.svelte';
  import { buildProfile, wetBulbZeroHeight, valueAt } from './snowLevel';
  import { formatPrecipMm, precipMmAt, PRECIP_THRESHOLD_MM_H } from './precip';
  import { terrainPrecipitationType, type TerrainPrecipType } from './precipType';
  import { terrainDiagnostics } from './terrainDiagnostics';
  import { estimateNewSnowStep, formatNewSnowCm } from './snowAccum';
  import { loadSelectedPrecipFields } from './selectedPrecip';
  import { contourPolylines, type ContourPolyline, type GridPoint } from './contours';

  type CachedPoint = {
    lat: number;
    lon: number;
    forecast: Record<string, unknown>;
    header: Record<string, unknown>;
    times: number[];
    runTime: number | null;
    step: number;
  };
  type ColourStop = { value: number; color: string };
  type ViewportPoint = { lat: number; lon: number; r: number; c: number };
  type LabelCandidate = { point: [number, number]; level: number; color: string; length: number; isMajor: boolean };
  type ProbeStatus = 'above' | 'below' | 'near' | 'neutral';
  type PointSource = 'search' | 'map-click';
  type PlaceSelection = { lat: number; lon: number; primary: string; secondary: string };
  type LabelGridArgs = {
    valid: string;
    terrain: number;
    snowline: number;
    difference: number;
    precip: number | null;
    tendency: string;
    confidence: string;
    tempC: number | null;
    wetBulbC: number | null;
    rhPct: number | null;
    newSnowCm: number | null;
  };

  const MODEL = 'ecmwf' as const;
  const MAX_CONCURRENT = 12;
  const CONTOUR_STEP_H = 3;
  const FORECAST_DAYS = 6;
  const MAX_FORECAST_HOURS = 144;
  const PROFILE_CACHE_MAX = 1600;
  const LABEL_MIN_DISTANCE_PX = 92;
  const MIN_VALID_FRACTION = 0.32;
  const POSITION_NEAR_SNOWLINE_METRES = 100;
  const TENDENCY_HOURS = 3;
  const FAVOURITES_STORAGE_KEY = 'snowline:favourites:v1';
  const FAVOURITES_CHANGED_EVENT = 'wintry:favourites-changed';

  let enabled = true;
  let panelHidden = false;
  let infoOpen = false;
  let chartOpen = false;
  let forecastTab: 'graph' | 'sounding' = 'graph';
  let viewportLoading = false;
  let refreshQueued = false;
  let probeLoading = false;
  let cache: (CachedPoint | null)[][] = [];
  let contourLayer: any = null;
  let clickLayer: any = null;
  let clickedPoint: CachedPoint | null = null;
  let clickedLatLon: [number, number] | null = null;
  let clickedMapElevationM: number | null = null;
  let clickedPlaceName: string | null = null;
  let pointSource: PointSource | null = null;
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let clickGeneration = 0;
  let timestampListener: number | null = null;
  let activeRunTime: number | null = null;

  const profileCache = new Map<string, CachedPoint>();

  const COLOUR_STOPS: ColourStop[] = [
    { value: 150, color: '#c51ac7' }, { value: 300, color: '#8b079e' }, { value: 450, color: '#50007f' }, { value: 600, color: '#231073' },
    { value: 750, color: '#003e91' }, { value: 1000, color: '#1688d4' }, { value: 1300, color: '#72bdf3' }, { value: 1600, color: '#b9e7c7' },
    { value: 1900, color: '#c8ef4a' }, { value: 2200, color: '#f4eb00' }, { value: 2500, color: '#ffc21a' }, { value: 2800, color: '#ff850d' },
    { value: 3250, color: '#f34412' }, { value: 4000, color: '#c41618' }, { value: 5500, color: '#850008' }, { value: 6000, color: '#3e0906' },
  ];

  function contourIntervalForZoom(): number {
    const zoom = Number(map.getZoom?.() ?? 6);
    if (zoom <= 4) return 500;
    if (zoom <= 7) return 200;
    return 100;
  }

  function hexToRgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '');
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }

  function rgbToHex(r: number, g: number, b: number): string {
    const part = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
  }

  function colorForLevel(level: number): string {
    if (level <= COLOUR_STOPS[0].value) return COLOUR_STOPS[0].color;
    if (level >= COLOUR_STOPS[COLOUR_STOPS.length - 1].value) return COLOUR_STOPS[COLOUR_STOPS.length - 1].color;
    for (let i = 0; i < COLOUR_STOPS.length - 1; i++) {
      const lower = COLOUR_STOPS[i];
      const upper = COLOUR_STOPS[i + 1];
      if (level < lower.value || level > upper.value) continue;
      const fraction = (level - lower.value) / (upper.value - lower.value);
      const a = hexToRgb(lower.color);
      const b = hexToRgb(upper.color);
      return rgbToHex(a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction, a[2] + (b[2] - a[2]) * fraction);
    }
    return '#ffffff';
  }

  function getStoreTimestamp(): number {
    try {
      const timestamp = store.get('timestamp');
      if (typeof timestamp === 'number' && Number.isFinite(timestamp)) return timestamp;
    } catch {}
    return Date.now();
  }

  function parseTime(value: unknown): number | null {
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

  function scalarNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  function buildForecastTimes(data: Record<string, unknown>, header: Record<string, unknown>): number[] {
    const hours = data.hours;
    if (hours == null) return [];
    const length = Number((hours as any).length);
    if (!Number.isFinite(length) || length <= 0) return [];
    const raw: number[] = [];
    for (let i = 0; i < length; i++) {
      const value = valueAt(hours, i);
      if (value !== null) raw.push(value);
    }
    if (!raw.length) return [];
    let times: number[];
    if (raw[0] > 1e12) times = raw;
    else if (raw[0] > 1e9) times = raw.map(value => value * 1000);
    else {
      const referenceTime = parseTime(header.refTime);
      if (referenceTime === null) return [];
      times = raw.map(hour => referenceTime + hour * 3600_000);
    }
    const hardEnd = times[0] + MAX_FORECAST_HOURS * 3600_000;
    return times.filter(time => time <= hardEnd + 60_000);
  }

  function nearestIndex(times: number[], target: number): number {
    let bestIndex = 0;
    let bestDistance = Infinity;
    times.forEach((time, index) => {
      const distance = Math.abs(time - target);
      if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
    });
    return bestIndex;
  }

  function extractPayload(payload: unknown): { forecast: Record<string, unknown>; header: Record<string, unknown> } {
    const response = payload as any;
    return {
      forecast: response?.data?.data && typeof response.data.data === 'object' ? response.data.data as Record<string, unknown> : {},
      header: response?.data?.header && typeof response.data.header === 'object' ? response.data.header as Record<string, unknown> : {},
    };
  }

  async function loadMapElevation(lat: number, lon: number): Promise<number | null> {
    try {
      const response = await getElevation(lat, lon) as any;
      for (const candidate of [response?.data, response?.data?.data, response?.value]) {
        const elevation = scalarNumber(candidate);
        if (elevation !== null) return elevation;
      }
    } catch (error) { console.warn('Wintry forecast map elevation failed', lat, lon, error); }
    return null;
  }

  function profileKey(lat: number, lon: number, step: number): string { return `${step}:${lat.toFixed(4)},${lon.toFixed(4)}`; }

  function invalidateForNewRun(runTime: number | null) {
    if (runTime === null) return;
    if (activeRunTime === null) { activeRunTime = runTime; return; }
    if (Math.abs(runTime - activeRunTime) < 60_000) return;
    activeRunTime = runTime;
    profileCache.clear();
    cache = [];
  }

  function rememberProfile(point: CachedPoint) {
    const key = profileKey(point.lat, point.lon, point.step);
    profileCache.delete(key);
    profileCache.set(key, point);
    while (profileCache.size > PROFILE_CACHE_MAX) {
      const oldest = profileCache.keys().next().value;
      if (oldest === undefined) break;
      profileCache.delete(oldest);
    }
  }

  function cachedProfile(lat: number, lon: number, step: number): CachedPoint | null {
    const key = profileKey(lat, lon, step);
    const point = profileCache.get(key);
    if (!point) return null;
    if (activeRunTime !== null && point.runTime !== null && Math.abs(point.runTime - activeRunTime) >= 60_000) {
      profileCache.delete(key);
      return null;
    }
    profileCache.delete(key);
    profileCache.set(key, point);
    return point;
  }

  async function loadPoint(lat: number, lon: number, step = 1): Promise<CachedPoint | null> {
    const cached = cachedProfile(lat, lon, step);
    if (cached) return cached;
    try {
      const response = await getMeteogramForecastData(MODEL, { lat, lon, step, days: FORECAST_DAYS });
      const { forecast, header } = extractPayload(response);
      if (!Object.keys(forecast).length) return null;
      const runTime = parseTime(header.refTime);
      invalidateForNewRun(runTime);
      const point: CachedPoint = { lat, lon, forecast, header, times: buildForecastTimes(forecast, header), runTime, step };
      rememberProfile(point);
      return point;
    } catch (error) {
      console.warn('Wintry forecast point request failed', lat, lon, error);
      return null;
    }
  }

  async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const output = new Array<R>(items.length);
    let next = 0;
    async function worker() {
      while (true) {
        const index = next++;
        if (index >= items.length) return;
        output[index] = await fn(items[index]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return output;
  }

  function gridShapeForZoom(): { rows: number; cols: number } {
    const zoom = Number(map.getZoom?.() ?? 6);
    if (zoom <= 4) return { rows: 9, cols: 15 };
    if (zoom <= 6) return { rows: 13, cols: 21 };
    if (zoom <= 8) return { rows: 17, cols: 27 };
    return { rows: 19, cols: 31 };
  }

  function buildViewportPoints(): { points: ViewportPoint[]; rows: number; cols: number } {
    const { rows, cols } = gridShapeForZoom();
    const bounds = map.getBounds();
    const south = Math.max(-75, bounds.getSouth());
    const north = Math.min(75, bounds.getNorth());
    const west = bounds.getWest();
    const east = bounds.getEast();
    const latStep = (north - south) / (rows - 1);
    const lonStep = (east - west) / (cols - 1);
    const points: ViewportPoint[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) points.push({ lat: south + r * latStep, lon: west + c * lonStep, r, c });
    return { points, rows, cols };
  }

  async function refreshViewport() {
    if (!enabled) return;
    if (viewportLoading) { refreshQueued = true; return; }
    refreshQueued = false;
    const myGeneration = ++generation;
    viewportLoading = true;
    const { points, rows, cols } = buildViewportPoints();
    try {
      const results = await mapLimit(points, MAX_CONCURRENT, async point => ({ ...point, result: await loadPoint(point.lat, point.lon, CONTOUR_STEP_H) }));
      if (myGeneration !== generation || !enabled) return;
      const valid = results.filter(item => item.result?.times.length).length;
      if (valid < Math.max(4, Math.floor(points.length * MIN_VALID_FRACTION))) return;
      const nextCache: (CachedPoint | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
      for (const item of results) if (item.result) nextCache[item.r][item.c] = item.result;
      cache = nextCache;
      renderFromCache();
    } finally {
      if (myGeneration === generation) viewportLoading = false;
      if (refreshQueued && enabled) { refreshQueued = false; setTimeout(refreshViewport, 0); }
    }
  }

  function clearContours() { if (!contourLayer) return; try { map.removeLayer(contourLayer); } catch {} contourLayer = null; }
  function clearClickLayer() { if (!clickLayer) return; try { map.removeLayer(clickLayer); } catch {} clickLayer = null; }

  function clearPointState(closeChart = true) {
    clickGeneration += 1;
    probeLoading = false;
    if (closeChart) chartOpen = false;
    clickedPoint = null;
    clickedLatLon = null;
    clickedMapElevationM = null;
    clickedPlaceName = null;
    pointSource = null;
    clearClickLayer();
  }

  function statusColor(status: ProbeStatus): string {
    if (status === 'above') return '#46d9ff';
    if (status === 'below') return '#ff9d3d';
    if (status === 'near') return '#ffe45c';
    return '#ffffff';
  }
  function statusForDifference(differenceM: number): ProbeStatus {
    if (differenceM > POSITION_NEAR_SNOWLINE_METRES) return 'above';
    if (differenceM < -POSITION_NEAR_SNOWLINE_METRES) return 'below';
    return 'near';
  }
  function positionText(differenceM: number): string {
    const rounded = Math.round(Math.abs(differenceM) / 10) * 10;
    if (differenceM > POSITION_NEAR_SNOWLINE_METRES) return `${rounded} m above snowline`;
    if (differenceM < -POSITION_NEAR_SNOWLINE_METRES) return `${rounded} m below snowline`;
    return `Within ${POSITION_NEAR_SNOWLINE_METRES} m of snowline`;
  }
  function shortValid(time: number): string {
    const date = new Date(time);
    return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${String(date.getUTCHours()).padStart(2, '0')}Z`;
  }
  function confidenceLabel(phase: TerrainPrecipType | null): string {
    if (!phase) return '—';
    if (phase.confidence === 'high') return 'High';
    if (phase.confidence === 'medium') return 'Medium';
    return 'Low';
  }
  function formatCoordinate(lat: number, lon: number): string {
    const latHemisphere = lat >= 0 ? 'N' : 'S';
    const lonHemisphere = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latHemisphere}, ${Math.abs(lon).toFixed(4)}°${lonHemisphere}`;
  }
  function formatUtc(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
  }
  function formatLead(runTime: number | null, validTime: number): string {
    if (runTime === null || !Number.isFinite(runTime)) return 'Unavailable';
    return `+${Math.max(0, Math.round((validTime - runTime) / 3600_000))} h`;
  }
  function snowlineAt(point: CachedPoint, index: number): number | null {
    const result = wetBulbZeroHeight(buildProfile(point.forecast, index));
    return result.snowLevelM !== null && Number.isFinite(result.snowLevelM) ? result.snowLevelM : null;
  }
  function tendencyText(point: CachedPoint, index: number): string {
    const now = snowlineAt(point, index);
    if (now === null) return '';
    const target = point.times[index] + TENDENCY_HOURS * 3600_000;
    if (target > point.times[point.times.length - 1] + 30 * 60_000) return '';
    const futureIndex = nearestIndex(point.times, target);
    if (futureIndex === index) return '';
    const future = snowlineAt(point, futureIndex);
    if (future === null) return '';
    const delta = Math.round((future - now) / 10) * 10;
    if (Math.abs(delta) < 20) return '→ Steady';
    return `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)} m/3h`;
  }

  function currentNewSnowCm(precip: number | null, phase: TerrainPrecipType | null): number | null {
    if (!phase || precip === null) return null;
    if (phase.key !== 'snow' && phase.key !== 'wet-snow' && phase.key !== 'mix') return null;
    return estimateNewSnowStep(precip, phase, 0, 3).cumulativeCm;
  }

  async function resolvePlaceName(lat: number, lon: number): Promise<string> {
    if (clickedPlaceName) return clickedPlaceName;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`);
      if (response.ok) {
        const data = await response.json() as any;
        const address = data?.address ?? {};
        const local = data?.name || address.city || address.town || address.village || address.municipality || address.county;
        const country = address.country;
        if (local && country) return `${local}, ${country}`;
        if (local) return String(local);
      }
    } catch {}
    return 'Selected point';
  }

  async function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus(); textarea.select(); document.execCommand('copy'); textarea.remove();
  }

  function favouriteKey(lat: number, lon: number): string { return `${lat.toFixed(5)},${lon.toFixed(5)}`; }
  function readFavourites(): any[] {
    try { const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }
  function isCurrentFavourite(): boolean {
    if (!clickedLatLon) return false;
    const key = favouriteKey(clickedLatLon[0], clickedLatLon[1]);
    return readFavourites().some(item => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)) && favouriteKey(Number(item.lat), Number(item.lon)) === key);
  }

  async function toggleCurrentFavourite(button: HTMLButtonElement) {
    if (!clickedLatLon) return;
    const [lat, lon] = clickedLatLon;
    const key = favouriteKey(lat, lon);
    let items = readFavourites();
    const exists = items.some(item => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)) && favouriteKey(Number(item.lat), Number(item.lon)) === key);
    if (exists) items = items.filter(item => !(Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)) && favouriteKey(Number(item.lat), Number(item.lon)) === key));
    else {
      const name = await resolvePlaceName(lat, lon);
      const parts = name.split(',').map(value => value.trim()).filter(Boolean);
      items = [{ lat, lon, primary: parts[0] || 'Saved point', secondary: parts.slice(1).join(', ') }, ...items].slice(0, 30);
    }
    try { localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(items)); } catch {}
    window.dispatchEvent(new CustomEvent(FAVOURITES_CHANGED_EVENT));
    button.textContent = exists ? '☆' : '★';
    button.classList.toggle('saved', !exists);
    button.title = exists ? 'Save location' : 'Remove saved location';
    button.setAttribute('aria-label', button.title);
  }

  async function shareCurrentPoint(button: HTMLButtonElement) {
    if (!clickedPoint || !clickedLatLon || !clickedPoint.times.length) return;
    const point = clickedPoint;
    const [lat, lon] = clickedLatLon;
    const index = nearestIndex(point.times, getStoreTimestamp());
    const validTime = point.times[index];
    const profile = buildProfile(point.forecast, index);
    const snowline = snowlineAt(point, index);
    const precip = precipMmAt(point.forecast, index);
    const diagnostics = clickedMapElevationM !== null ? terrainDiagnostics(profile, clickedMapElevationM) : null;
    const phase = clickedMapElevationM !== null && precip !== null && precip >= PRECIP_THRESHOLD_MM_H ? terrainPrecipitationType(profile, clickedMapElevationM) : null;
    const newSnow = currentNewSnowCm(precip, phase);
    button.textContent = '…';
    try {
      const placeName = await resolvePlaceName(lat, lon);
      const text = [
        'Wintry forecast · terrain-aware', `Place: ${placeName}`, `Coordinates: ${formatCoordinate(lat, lon)}`,
        `Valid: ${formatUtc(validTime)}`, `Lead: ${formatLead(point.runTime, validTime)}`,
        `Snowline: ${snowline !== null ? `${Math.round(snowline / 10) * 10} m` : 'Unavailable'}`,
        `Terrain: ${clickedMapElevationM !== null ? `${Math.round(clickedMapElevationM / 10) * 10} m` : 'Unavailable'}`,
        diagnostics ? `Terrain T / Tw / RH: ${diagnostics.tempC.toFixed(1)}°C / ${diagnostics.wetBulbC.toFixed(1)}°C / ${Math.round(diagnostics.rhPct)}%` : '',
        `Precipitation: ${precip !== null ? `${formatPrecipMm(precip)} mm/3h` : 'Unavailable'}`,
        `Type: ${phase ? phase.label : 'Not classified'}`,
        newSnow !== null ? `Estimated new snow (3h): ${formatNewSnowCm(newSnow)}` : '',
        phase ? `Profile: ${phase.detail}` : '',
        'Atmospheric profile: ECMWF · local elevation: Windy terrain.',
      ].filter(Boolean).join('\n');
      await copyText(text);
      button.textContent = '✓';
      setTimeout(() => { if (button.isConnected) button.textContent = 'share'; }, 1200);
    } catch {
      button.textContent = '!';
      setTimeout(() => { if (button.isConnected) button.textContent = 'share'; }, 1200);
    }
  }

  function labelGrid(args: LabelGridArgs): string {
    const thermo = [
      args.tempC !== null ? `<span class="metric-temp"><small>Terrain T</small><strong>${args.tempC.toFixed(1)}°C</strong></span>` : '',
      args.wetBulbC !== null ? `<span class="metric-tw"><small>Wet bulb</small><strong>${args.wetBulbC.toFixed(1)}°C</strong></span>` : '',
      args.rhPct !== null ? `<span class="metric-rh"><small>RH</small><strong>${Math.round(args.rhPct)}%</strong></span>` : '',
    ].filter(Boolean).join('');
    const newSnow = args.newSnowCm !== null ? `<span class="metric-snow"><small>New snow · est.</small><strong>${formatNewSnowCm(args.newSnowCm)}</strong></span>` : '';
    return `<div class="snowline-position">${positionText(args.difference)}</div>
      <div class="snowline-thermo">${thermo}</div>
      <div class="snowline-label-grid">
        <span><small>Terrain</small><strong>${args.terrain} m</strong></span>
        <span class="metric-snowline"><small>Snowline</small><strong>${args.snowline} m</strong></span>
        <span class="metric-precip"><small>Precip</small><strong>${args.precip !== null ? `${formatPrecipMm(args.precip)} mm/3h` : '—'}</strong></span>
        ${newSnow}
        <span><small>Snowline trend</small><strong>${args.tendency || '—'}</strong></span>
        <span><small>Confidence</small><strong>${args.confidence}</strong></span>
      </div>
      <div class="snowline-valid">Valid ${args.valid}</div>`;
  }

  function showClickLabel(lat: number, lon: number, mainText: string, detailHtml = '', snowlineColor = '#ffffff', status: ProbeStatus = 'neutral') {
    clearClickLayer();
    clickLayer = L.layerGroup().addTo(map);
    const accent = statusColor(status);
    L.circleMarker([lat, lon], { radius: status === 'neutral' ? 4 : 5, weight: 2, color: '#ffffff', fillColor: accent, fillOpacity: 1, interactive: false }).addTo(clickLayer);
    const detail = detailHtml ? `<div class="snowline-label-detail">${detailHtml}</div>` : '';
    const saved = isCurrentFavourite();
    const actions = clickedPoint && clickedLatLon
      ? `<button class="snowline-label-chart" type="button" aria-label="Open forecast" title="Open forecast">📊</button>
         <button class="snowline-label-favourite${saved ? ' saved' : ''}" type="button" aria-label="${saved ? 'Remove saved location' : 'Save location'}" title="${saved ? 'Remove saved location' : 'Save location'}">${saved ? '★' : '☆'}</button>
         <button class="snowline-label-share" type="button" aria-label="Copy Wintry forecast details" title="Copy Wintry forecast details">share</button>` : '';
    const marker = L.marker([lat, lon], {
      interactive: true, bubblingMouseEvents: false, zIndexOffset: 2000,
      icon: L.divIcon({ className: `snowline-click-label snowline-probe-${status}`, html: `<span style="--snowline-color:${snowlineColor};--probe-accent:${accent}">${actions}<button class="snowline-label-close" type="button" aria-label="Close Wintry forecast label" title="Close">×</button><div class="snowline-card-kicker">WINTRY FORECAST</div><b>${mainText}</b>${detail}</span>`, iconSize: [248, 238], iconAnchor: [124, 246] }),
    }).addTo(clickLayer);
    marker.on('click', (event: any) => {
      const original = event?.originalEvent;
      const target = original?.target as HTMLElement | undefined;
      const graph = target?.closest?.('.snowline-label-chart');
      const favourite = target?.closest?.('.snowline-label-favourite') as HTMLButtonElement | null;
      const share = target?.closest?.('.snowline-label-share') as HTMLButtonElement | null;
      const close = target?.closest?.('.snowline-label-close');
      if (!graph && !favourite && !share && !close) return;
      try { L.DomEvent.stop(original); } catch {}
      if (graph) { if (clickedPoint) { forecastTab = 'graph'; chartOpen = true; } return; }
      if (favourite) { void toggleCurrentFavourite(favourite); return; }
      if (share) { void shareCurrentPoint(share); return; }
      clearPointState(true);
    });
  }

  function updatePersistentClickLabel() {
    if (!enabled) { clearClickLayer(); return; }
    if (!clickedPoint || !clickedLatLon || !clickedPoint.times.length) return;
    const [lat, lon] = clickedLatLon;
    const target = getStoreTimestamp();
    const firstTime = clickedPoint.times[0];
    const effectiveEnd = Math.min(clickedPoint.times[clickedPoint.times.length - 1], firstTime + MAX_FORECAST_HOURS * 3600_000);
    if (target < firstTime - 30 * 60_000 || target > effectiveEnd + 30 * 60_000) { showClickLabel(lat, lon, 'Outside +144 h'); return; }
    const index = nearestIndex(clickedPoint.times, target);
    const validTime = clickedPoint.times[index];
    const profile = buildProfile(clickedPoint.forecast, index);
    const snowlineResult = wetBulbZeroHeight(profile);
    const snowline = snowlineResult.snowLevelM !== null && Number.isFinite(snowlineResult.snowLevelM) ? snowlineResult.snowLevelM : null;
    if (snowline === null) { showClickLabel(lat, lon, 'No snowline'); return; }
    const roundedSnowline = Math.round(snowline / 10) * 10;
    const tendency = tendencyText(clickedPoint, index);
    const precip = precipMmAt(clickedPoint.forecast, index);
    const hasPrecip = precip !== null && precip >= PRECIP_THRESHOLD_MM_H;
    if (clickedMapElevationM !== null && Number.isFinite(clickedMapElevationM)) {
      const terrainRounded = Math.round(clickedMapElevationM / 10) * 10;
      const difference = clickedMapElevationM - snowline;
      const status = statusForDifference(difference);
      const diagnostics = terrainDiagnostics(profile, clickedMapElevationM);
      const phase = hasPrecip ? terrainPrecipitationType(profile, clickedMapElevationM) : null;
      const newSnow = currentNewSnowCm(precip, phase);
      const grid = labelGrid({
        valid: shortValid(validTime), terrain: terrainRounded, snowline: roundedSnowline,
        difference, precip, tendency, confidence: phase ? confidenceLabel(phase) : '—',
        tempC: diagnostics?.tempC ?? null, wetBulbC: diagnostics?.wetBulbC ?? null,
        rhPct: diagnostics?.rhPct ?? null, newSnowCm: newSnow,
      });
      if (phase) {
        const confidenceMark = phase.confidence === 'low' ? ' ~' : '';
        showClickLabel(lat, lon, `${phase.icon} ${phase.label.toUpperCase()}${confidenceMark}`, grid, colorForLevel(snowline), status);
        return;
      }
      const headline = status === 'above' ? '❄ ABOVE SNOWLINE' : status === 'below' ? '↓ BELOW SNOWLINE' : '≈ NEAR SNOWLINE';
      showClickLabel(lat, lon, headline, grid, colorForLevel(snowline), status);
      return;
    }
    showClickLabel(lat, lon, `${roundedSnowline} m`, `<div class="snowline-label-grid"><span><small>Valid</small><strong>${shortValid(validTime)}</strong></span><span><small>Trend</small><strong>${tendency || '—'}</strong></span></div>`, colorForLevel(snowline), 'neutral');
  }

  async function probeLocation(lat: number, lon: number, source: PointSource, placeName: string | null = null) {
    if (!enabled || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const keepChartOpen = chartOpen;
    const myClick = ++clickGeneration;
    clickedLatLon = [lat, lon];
    clickedPlaceName = placeName;
    pointSource = source;
    probeLoading = true;
    showClickLabel(lat, lon, 'Snowline …', '<div class="snowline-loading">Reading profile</div>');
    try {
      const [point, mapElevation, precipFields] = await Promise.all([loadPoint(lat, lon, 1), loadMapElevation(lat, lon), loadSelectedPrecipFields(lat, lon, FORECAST_DAYS)]);
      if (myClick !== clickGeneration || pointSource !== source || !enabled) return;
      if (!point || !point.times.length) { showClickLabel(lat, lon, 'No data'); return; }
      clickedPoint = Object.keys(precipFields).length ? { ...point, forecast: { ...point.forecast, ...precipFields } } : point;
      clickedMapElevationM = mapElevation;
      if (keepChartOpen) chartOpen = true;
      updatePersistentClickLabel();
    } finally { if (myClick === clickGeneration) probeLoading = false; }
  }

  export function selectMapPoint(lat: number, lon: number) {
    if (!enabled || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    void probeLocation(lat, lon, 'map-click');
  }

  function handlePlaceSelect(event: CustomEvent<PlaceSelection>) {
    if (!enabled || !event?.detail) return;
    const { lat, lon, primary, secondary } = event.detail;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const placeName = [primary, secondary].map(value => String(value ?? '').trim()).filter(Boolean).join(', ');
    pointSource = 'search';
    map.panTo([lat, lon], { animate: true });
    setTimeout(() => { if (pointSource === 'search') void probeLocation(lat, lon, 'search', placeName || null); }, 120);
  }

  function handleSearchClear() { if (pointSource === 'search' && !chartOpen) clearPointState(true); }

  function lineLength(line: ContourPolyline): number {
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      const meanLat = (a[0] + b[0]) * 0.5 * Math.PI / 180;
      total += Math.hypot((b[1] - a[1]) * Math.cos(meanLat), b[0] - a[0]);
    }
    return total;
  }

  function midpointAlongLine(line: ContourPolyline): [number, number] | null {
    if (line.length < 2) return null;
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      const meanLat = (a[0] + b[0]) * 0.5 * Math.PI / 180;
      const distance = Math.hypot((b[1] - a[1]) * Math.cos(meanLat), b[0] - a[0]);
      lengths.push(distance); total += distance;
    }
    if (total <= 0) return line[Math.floor(line.length / 2)];
    let travelled = 0;
    for (let i = 0; i < lengths.length; i++) {
      if (travelled + lengths[i] >= total / 2) {
        const fraction = (total / 2 - travelled) / Math.max(1e-6, lengths[i]);
        const a = line[i], b = line[i + 1];
        return [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])];
      }
      travelled += lengths[i];
    }
    return line[line.length - 1];
  }

  function drawDeclutteredLabels(candidates: LabelCandidate[], layer: any) {
    const mapWidth = Number(map.getSize?.().x ?? 800);
    const maxLabels = mapWidth < 520 ? 5 : mapWidth < 900 ? 7 : 10;
    const minDistance = mapWidth < 520 ? 82 : LABEL_MIN_DISTANCE_PX;
    const ordered = [...candidates].sort((a, b) => a.isMajor !== b.isMajor ? (a.isMajor ? -1 : 1) : b.length - a.length);
    const occupied: { x: number; y: number }[] = [];
    let placed = 0;
    for (const candidate of ordered) {
      if (placed >= maxLabels) break;
      const pixel = map.latLngToContainerPoint(candidate.point);
      if (occupied.some(other => Math.hypot(pixel.x - other.x, pixel.y - other.y) < minDistance)) continue;
      L.marker(candidate.point, { interactive: false, icon: L.divIcon({ className: 'snowline-label', html: `<span style="--snowline-color:${candidate.color}">${candidate.level} m</span>`, iconSize: [62, 20], iconAnchor: [31, 10] }) }).addTo(layer);
      occupied.push({ x: pixel.x, y: pixel.y }); placed += 1;
    }
  }

  function renderFromCache() {
    if (!enabled || !cache.length) return;
    const target = getStoreTimestamp();
    const firstPoint = cache.flat().find((point): point is CachedPoint => point !== null && point.times.length > 0);
    if (!firstPoint) return;
    const firstTime = firstPoint.times[0];
    const effectiveEnd = Math.min(firstPoint.times[firstPoint.times.length - 1], firstTime + MAX_FORECAST_HOURS * 3600_000);
    if (target < firstTime - 30 * 60_000 || target > effectiveEnd + 30 * 60_000) { clearContours(); return; }
    const field: GridPoint[][] = [];
    for (let r = 0; r < cache.length; r++) {
      const row: GridPoint[] = [];
      for (let c = 0; c < cache[r].length; c++) {
        const point = cache[r][c];
        if (!point || !point.times.length) { row.push({ lat: 0, lon: 0, value: null }); continue; }
        const index = nearestIndex(point.times, target);
        row.push({ lat: point.lat, lon: point.lon, value: snowlineAt(point, index) });
      }
      field.push(row);
    }
    const values = field.flat().map(point => point.value).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (!values.length) { clearContours(); return; }
    const interval = contourIntervalForZoom();
    const nextLayer = L.layerGroup();
    const min = Math.floor(Math.min(...values) / interval) * interval;
    const max = Math.ceil(Math.max(...values) / interval) * interval;
    const labelCandidates: LabelCandidate[] = [];
    for (let level = min; level <= max; level += interval) {
      const lines = contourPolylines(field, level);
      const is1000 = level % 1000 === 0;
      const is500 = level % 500 === 0;
      const contourColor = colorForLevel(level);
      for (const line of lines) {
        if (line.length < 2) continue;
        if (is500 || is1000) L.polyline(line, { color: '#11151b', weight: is1000 ? 4.0 : 2.7, opacity: is1000 ? 0.54 : 0.38, interactive: false, lineCap: 'round', lineJoin: 'round', smoothFactor: 0.82 }).addTo(nextLayer);
        L.polyline(line, { color: contourColor, weight: is1000 ? 2.7 : is500 ? 1.8 : 0.9, opacity: is1000 ? 1 : is500 ? 0.94 : 0.7, interactive: false, lineCap: 'round', lineJoin: 'round', smoothFactor: is1000 ? 0.68 : is500 ? 0.76 : 0.96 }).addTo(nextLayer);
      }
      const shouldLabel = interval === 100 ? is500 : is1000;
      if (shouldLabel && lines.length) {
        const longest = [...lines].sort((a, b) => lineLength(b) - lineLength(a))[0];
        const length = lineLength(longest);
        const labelPoint = midpointAlongLine(longest);
        if (labelPoint && length > 0.08) labelCandidates.push({ point: labelPoint, level, color: contourColor, length, isMajor: is1000 });
      }
    }
    drawDeclutteredLabels(labelCandidates, nextLayer);
    nextLayer.addTo(map);
    const oldLayer = contourLayer;
    contourLayer = nextLayer;
    if (oldLayer) try { map.removeLayer(oldLayer); } catch {}
  }

  function handleMapNavigation() {
    if (!enabled) return;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(refreshViewport, 350);
  }

  function toggleEnabled() {
    if (enabled) { refreshViewport(); if (clickedPoint) updatePersistentClickLabel(); return; }
    generation += 1;
    viewportLoading = false;
    refreshQueued = false;
    if (moveTimer) { clearTimeout(moveTimer); moveTimer = null; }
    clearContours();
    clearPointState(true);
  }

  onMount(() => {
    map.on('moveend', handleMapNavigation);
    map.on('zoomend', handleMapNavigation);
    try {
      timestampListener = store.on('timestamp', () => {
        if (enabled && cache.length && !viewportLoading) renderFromCache();
        if (enabled) updatePersistentClickLabel();
      });
    } catch {}
    refreshViewport();
  });

  onDestroy(() => {
    generation += 1;
    clickGeneration += 1;
    refreshQueued = false;
    if (moveTimer) clearTimeout(moveTimer);
    map.off('moveend', handleMapNavigation);
    map.off('zoomend', handleMapNavigation);
    if (timestampListener !== null) try { store.off(timestampListener); } catch {}
    clearContours();
    clearClickLayer();
    profileCache.clear();
  });
</script>

<style lang="less">
  .snowline-panel{width:260px;padding:9px 10px;border-radius:9px;background:rgba(38,42,46,.96);color:white;box-shadow:0 4px 16px rgba(0,0,0,.28)}
  .top-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.top-controls{display:flex;align-items:center;gap:7px}.title{font-size:16px;font-weight:800}.switch{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;white-space:nowrap}.switch input{margin:0;width:15px;height:15px}
  .hide-button,.info-button{width:22px;height:22px;padding:0;border:1px solid rgba(255,255,255,.14);border-radius:6px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.78);font-size:15px;font-weight:800;cursor:pointer}.info-button{font-family:Georgia,serif;font-size:14px;font-style:italic}.info-button.active{border-color:rgba(80,190,255,.65);color:white}
  .show-panel{padding:7px 10px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(38,42,46,.96);color:#fff;box-shadow:0 3px 12px rgba(0,0,0,.24);font-size:11px;font-weight:800;cursor:pointer}
  .status-pill{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;padding:4px 7px;border-radius:6px;background:rgba(10,14,18,.72);color:rgba(255,255,255,.92);font-size:10px;font-weight:700}.status-dot{width:7px;height:7px;border-radius:50%;background:#70d7ff;animation:snowline-pulse 1s ease-in-out infinite}@keyframes snowline-pulse{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
  .info-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.30)}.info-window{width:min(360px,calc(100vw - 24px));max-height:min(74vh,540px);overflow:hidden;border:1px solid rgba(80,190,255,.48);border-radius:10px;background:rgba(24,28,32,.99);color:white;box-shadow:0 8px 30px rgba(0,0,0,.48)}.info-head{display:flex;justify-content:space-between;align-items:center;padding:9px 10px 7px;border-bottom:1px solid rgba(255,255,255,.10);font-size:12px}.info-head button{width:22px;height:22px;border:0;border-radius:6px;background:rgba(255,255,255,.08);color:white;font-size:17px;cursor:pointer}.info-body{max-height:calc(min(74vh,540px) - 40px);overflow-y:auto;padding:9px 10px 10px;font-size:10px;line-height:1.4;color:rgba(255,255,255,.84)}.info-body>div+div{margin-top:8px}.info-caveat{padding-top:8px;border-top:1px solid rgba(255,255,255,.10);color:rgba(255,228,92,.90)}
  :global(.snowline-label),:global(.snowline-click-label){background:transparent!important;border:0!important}:global(.snowline-label span){display:inline-block;padding:1px 4px 1px 6px;border-radius:3px;border-left:4px solid var(--snowline-color,white);background:rgba(15,17,20,.86);color:white;font-size:10px;font-weight:800;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.8);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
  :global(.snowline-click-label){pointer-events:auto!important}:global(.snowline-click-label>span){position:relative;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:7px;width:248px;min-height:218px;box-sizing:border-box;padding:38px 11px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.16);border-top:3px solid var(--probe-accent,rgba(255,255,255,.4));border-bottom:5px solid var(--snowline-color,white);background:rgba(9,14,18,.985);color:white;text-align:center;white-space:normal;text-shadow:none;box-shadow:0 9px 26px rgba(0,0,0,.58)}
  :global(.snowline-card-kicker){position:absolute;top:12px;left:74px;right:74px;color:#71838e;font-size:6.5px;line-height:1;font-weight:900;letter-spacing:1px;text-align:center;pointer-events:none}
  :global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-favourite){position:absolute;top:7px;height:27px;padding:0;border:1px solid rgba(255,255,255,.10);border-radius:7px;background:rgba(255,255,255,.065);color:#eaf2f6;font-size:12px;line-height:25px;font-weight:800;text-shadow:none;cursor:pointer;pointer-events:auto}:global(.snowline-label-close){right:7px;width:27px;font-size:17px}:global(.snowline-label-share){right:40px;width:27px;font-size:0;background-repeat:no-repeat;background-position:center;background-size:14px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='18' cy='5' r='3'/%3E%3Ccircle cx='6' cy='12' r='3'/%3E%3Ccircle cx='18' cy='19' r='3'/%3E%3Cpath d='M8.6 10.5l6.8-4M8.6 13.5l6.8 4'/%3E%3C/svg%3E")}:global(.snowline-label-chart){left:7px;width:29px;font-size:15px}:global(.snowline-label-favourite){left:42px;width:29px;font-size:16px;color:#aab6bd}:global(.snowline-label-favourite.saved){color:#ffe45c;border-color:rgba(255,228,92,.42);background:rgba(255,228,92,.08)}
  :global(.snowline-click-label b){display:block;margin:0 0 1px;padding:6px 7px;border-radius:7px;background:rgba(255,255,255,.035);color:var(--probe-accent,white);font-size:15px;line-height:1.1;font-weight:900;letter-spacing:.25px}:global(.snowline-label-detail){width:100%}
  :global(.snowline-position){padding:5px 7px;border-radius:7px;background:rgba(255,255,255,.055);color:var(--probe-accent,white);font-size:9.5px;line-height:1.1;font-weight:850}
  :global(.snowline-thermo){display:grid;grid-template-columns:repeat(3,1fr);gap:5px;width:100%}:global(.snowline-thermo span){min-width:0;padding:5px 3px;border-radius:7px;background:rgba(255,255,255,.04)}:global(.snowline-thermo small),:global(.snowline-label-grid small){display:block;color:#83949e;font-size:6.7px;line-height:1;text-transform:uppercase;letter-spacing:.2px}:global(.snowline-thermo strong){display:block;margin-top:3px;color:#eef5f8;font-size:10.2px;line-height:1;font-weight:850}:global(.snowline-thermo .metric-temp strong){color:#ffb09f}:global(.snowline-thermo .metric-tw strong){color:#b7e9ff}:global(.snowline-thermo .metric-rh strong){color:#9fdcff}
  :global(.snowline-label-grid){display:grid;grid-template-columns:1fr 1fr;gap:5px;width:100%}:global(.snowline-label-grid span){min-width:0;padding:5px 4px;border-radius:7px;background:rgba(255,255,255,.04);text-align:center}:global(.snowline-label-grid strong){display:block;margin-top:3px;color:#eef5f8;font-size:9px;line-height:1.08;font-weight:800;white-space:normal;overflow:visible}:global(.snowline-label-grid .metric-snowline strong){color:#dff6ff}:global(.snowline-label-grid .metric-precip strong){color:#9fe5ff}:global(.snowline-label-grid .metric-snow strong){color:#d8f5ff;font-size:10px}
  :global(.snowline-valid){margin-top:0;color:#71838e;font-size:7px;line-height:1;font-weight:750;letter-spacing:.15px}:global(.snowline-loading){padding:24px 0 18px;color:#9fb0ba;font-size:10px}
  :global(.snowline-probe-above>span){background:linear-gradient(180deg,rgba(8,25,34,.99),rgba(8,14,18,.99))}:global(.snowline-probe-below>span){background:linear-gradient(180deg,rgba(32,21,12,.99),rgba(18,13,10,.99))}:global(.snowline-probe-near>span){background:linear-gradient(180deg,rgba(29,27,11,.99),rgba(17,16,9,.99))}
  @media(max-width:520px){.snowline-panel{width:235px;max-width:calc(100vw - 28px);padding:8px 9px}.info-overlay{align-items:flex-start;padding-top:54px}:global(.snowline-click-label>span){width:232px;min-height:210px;padding:37px 9px 9px}:global(.snowline-card-kicker){left:70px;right:70px}:global(.snowline-click-label b){font-size:14px}:global(.snowline-label-grid strong){font-size:8.5px}:global(.snowline-thermo strong){font-size:9.6px}:global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-favourite){height:27px;line-height:25px}}
</style>
