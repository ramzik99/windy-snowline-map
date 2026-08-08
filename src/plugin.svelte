<div class="snowline-panel">
  <div class="top-row">
    <div class="title">Snowline</div>
    <label class="switch">
      <input type="checkbox" bind:checked={enabled} on:change={toggleEnabled} />
      <span>{enabled ? 'On' : 'Off'}</span>
    </label>
  </div>

  <div class="description">
    Approximate ECMWF rain–snow boundary from wet-bulb zero height. Runs up to 144 hours only.
  </div>

  <PlaceSearch on:select={handlePlaceSelect} />

  <div class="mode-row" class:disabled={!enabled}>
    <button class:active={displayMode === 'label'} on:click={() => setDisplayMode('label')} disabled={!enabled}>Label only</button>
    <button class:active={displayMode === 'contour'} on:click={() => setDisplayMode('contour')} disabled={!enabled}>Contour only</button>
    <button class:active={displayMode === 'both'} on:click={() => setDisplayMode('both')} disabled={!enabled}>Label + contour</button>
  </div>

  <div class="micro-note">Near snowline = within ±100 m · thermal boundary, precipitation not implied</div>

  {#if enabled && (viewportLoading || probeLoading)}
    <div class="status-pill">
      <span class="status-dot"></span>
      {probeLoading ? 'Reading point…' : 'Updating contours…'}
    </div>
  {/if}
</div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { map } from '@windy/map';
  import store from '@windy/store';
  import { getElevation, getMeteogramForecastData } from '@windy/fetch';
  import PlaceSearch from './PlaceSearch.svelte';
  import { buildProfile, wetBulbZeroHeight, valueAt } from './snowLevel';
  import { contourPolylines, type GridPoint, type ContourPolyline } from './contours';

  type CachedPoint = { lat: number; lon: number; forecast: Record<string, unknown>; header: Record<string, unknown>; times: number[]; runTime: number | null; };
  type ColourStop = { value: number; color: string };
  type ViewportPoint = { lat: number; lon: number; r: number; c: number };
  type LabelCandidate = { point: [number, number]; level: number; color: string; length: number; isMajor: boolean };
  type ProbeStatus = 'above' | 'below' | 'near' | 'neutral';
  type DisplayMode = 'label' | 'contour' | 'both';
  type PlaceSelection = { lat: number; lon: number; primary: string; secondary: string; favourite?: boolean };

  let enabled = true;
  let displayMode: DisplayMode = 'both';
  let viewportLoading = false;
  let probeLoading = false;
  let cache: (CachedPoint | null)[][] = [];
  let contourLayer: any = null;
  let clickLayer: any = null;
  let clickedPoint: CachedPoint | null = null;
  let clickedLatLon: [number, number] | null = null;
  let clickedMapElevationM: number | null = null;
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  let pickerTimer: ReturnType<typeof setTimeout> | null = null;
  let pickerSyncTimer: ReturnType<typeof setInterval> | null = null;
  let generation = 0;
  let clickGeneration = 0;
  let timestampListener: number | null = null;
  let pickerLocationListener: number | null = null;
  let activeRunTime: number | null = null;
  let lastPickerKey = '';
  let suppressPickerClearUntil = 0;

  const MODEL = 'ecmwf' as const;
  const MAX_CONCURRENT = 8;
  const FORECAST_DAYS = 6;
  const MAX_FORECAST_HOURS = 144;
  const PROFILE_CACHE_MAX = 900;
  const LABEL_MIN_DISTANCE_PX = 92;
  const MIN_VALID_FRACTION = 0.35;
  const NEAR_SNOWLINE_METRES = 100;
  const PICKER_PROBE_DELAY_MS = 320;
  const PICKER_SYNC_MS = 700;
  const TENDENCY_HOURS = 3;
  const profileCache = new Map<string, CachedPoint>();

  const COLOUR_STOPS: ColourStop[] = [
    { value: 150, color: '#c51ac7' }, { value: 300, color: '#8b079e' }, { value: 450, color: '#50007f' }, { value: 600, color: '#231073' },
    { value: 750, color: '#003e91' }, { value: 1000, color: '#1688d4' }, { value: 1300, color: '#72bdf3' }, { value: 1600, color: '#b9e7c7' },
    { value: 1900, color: '#c8ef4a' }, { value: 2200, color: '#f4eb00' }, { value: 2500, color: '#ffc21a' }, { value: 2800, color: '#ff850d' },
    { value: 3250, color: '#f34412' }, { value: 4000, color: '#c41618' }, { value: 5500, color: '#850008' }, { value: 6000, color: '#3e0906' },
  ];

  function contoursEnabled(): boolean { return displayMode === 'contour' || displayMode === 'both'; }
  function labelsEnabled(): boolean { return displayMode === 'label' || displayMode === 'both'; }
  function contourIntervalForZoom(): number { const zoom = Number(map.getZoom?.() ?? 6); if (zoom <= 4) return 500; if (zoom <= 7) return 200; return 100; }
  function hexToRgb(hex: string): [number, number, number] { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgbToHex(r: number, g: number, b: number): string { const part = (v: number) => Math.round(v).toString(16).padStart(2, '0'); return `#${part(r)}${part(g)}${part(b)}`; }
  function colorForLevel(level: number): string {
    if (level <= COLOUR_STOPS[0].value) return COLOUR_STOPS[0].color;
    if (level >= COLOUR_STOPS[COLOUR_STOPS.length - 1].value) return COLOUR_STOPS[COLOUR_STOPS.length - 1].color;
    for (let i = 0; i < COLOUR_STOPS.length - 1; i++) { const a = COLOUR_STOPS[i], b = COLOUR_STOPS[i + 1]; if (level >= a.value && level <= b.value) { const f = (level - a.value) / (b.value - a.value), ca = hexToRgb(a.color), cb = hexToRgb(b.color); return rgbToHex(ca[0] + (cb[0] - ca[0]) * f, ca[1] + (cb[1] - ca[1]) * f, ca[2] + (cb[2] - ca[2]) * f); } }
    return '#ffffff';
  }

  function getStoreTimestamp(): number { try { const t = store.get('timestamp'); if (typeof t === 'number' && Number.isFinite(t)) return t; } catch {} return Date.now(); }
  function parseTime(value: unknown): number | null { if (typeof value === 'number' && Number.isFinite(value)) { if (value > 1e12) return value; if (value > 1e9) return value * 1000; } if (typeof value === 'string') { const parsed = Date.parse(value); if (Number.isFinite(parsed)) return parsed; } return null; }
  function scalarNumber(value: unknown): number | null { if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value === 'string') { const n = Number(value); if (Number.isFinite(n)) return n; } return null; }
  function buildForecastTimes(data: Record<string, unknown>, header: Record<string, unknown>): number[] {
    const hours = data['hours']; if (hours == null) return []; const n = Number((hours as any).length); if (!Number.isFinite(n) || n <= 0) return [];
    const raw: number[] = []; for (let i = 0; i < n; i++) { const v = valueAt(hours, i); if (v !== null) raw.push(v); } if (!raw.length) return [];
    let times: number[]; if (raw[0] > 1e12) times = raw; else if (raw[0] > 1e9) times = raw.map(v => v * 1000); else { const ref = parseTime(header.refTime); if (ref === null) return []; times = raw.map(h => ref + h * 3600_000); }
    const hardEnd = times[0] + MAX_FORECAST_HOURS * 3600_000; return times.filter(t => t <= hardEnd + 60_000);
  }
  function nearestIndex(times: number[], target: number): number { let bestIndex = 0, best = Infinity; times.forEach((t, i) => { const d = Math.abs(t - target); if (d < best) { best = d; bestIndex = i; } }); return bestIndex; }
  function extractPayload(payload: unknown): { forecast: Record<string, unknown>; header: Record<string, unknown> } { const p = payload as any; return { forecast: p?.data?.data && typeof p.data.data === 'object' ? p.data.data as Record<string, unknown> : {}, header: p?.data?.header && typeof p.data.header === 'object' ? p.data.header as Record<string, unknown> : {} }; }

  async function loadMapElevation(lat: number, lon: number): Promise<number | null> { try { const p = await getElevation(lat, lon) as any; for (const candidate of [p?.data, p?.data?.data, p?.value]) { const elevation = scalarNumber(candidate); if (elevation !== null) return elevation; } } catch (e) { console.warn('Snowline map elevation failed', lat, lon, e); } return null; }
  function profileKey(lat: number, lon: number): string { return `${lat.toFixed(5)},${lon.toFixed(5)}`; }
  function invalidateForNewRun(runTime: number | null) { if (runTime === null) return; if (activeRunTime === null) { activeRunTime = runTime; return; } if (Math.abs(runTime - activeRunTime) < 60_000) return; activeRunTime = runTime; profileCache.clear(); cache = []; clickedPoint = null; clickGeneration += 1; }
  function rememberProfile(point: CachedPoint) { const key = profileKey(point.lat, point.lon); profileCache.delete(key); profileCache.set(key, point); while (profileCache.size > PROFILE_CACHE_MAX) { const oldest = profileCache.keys().next().value; if (oldest === undefined) break; profileCache.delete(oldest); } }
  function cachedProfile(lat: number, lon: number): CachedPoint | null { const key = profileKey(lat, lon), point = profileCache.get(key); if (!point) return null; if (activeRunTime !== null && point.runTime !== null && Math.abs(point.runTime - activeRunTime) >= 60_000) { profileCache.delete(key); return null; } profileCache.delete(key); profileCache.set(key, point); return point; }
  async function loadPoint(lat: number, lon: number): Promise<CachedPoint | null> { const existing = cachedProfile(lat, lon); if (existing) return existing; try { const response = await getMeteogramForecastData(MODEL, { lat, lon, step: 1, days: FORECAST_DAYS }); const { forecast, header } = extractPayload(response); if (!Object.keys(forecast).length) return null; const runTime = parseTime(header.refTime); invalidateForNewRun(runTime); const point: CachedPoint = { lat, lon, forecast, header, times: buildForecastTimes(forecast, header), runTime }; rememberProfile(point); return point; } catch (e) { console.warn('Snowline point failed', lat, lon, e); return null; } }
  async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> { const out = new Array<R>(items.length); let next = 0; async function worker() { while (true) { const i = next++; if (i >= items.length) return; out[i] = await fn(items[i]); } } await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker())); return out; }
  function gridShapeForZoom(): { rows: number; cols: number } { const zoom = Number(map.getZoom?.() ?? 6), mapWidth = Number(map.getSize?.().x ?? 800); if (zoom <= 4) return { rows: 9, cols: 13 }; if (zoom <= 7) return { rows: 11, cols: 17 }; if (mapWidth < 520) return { rows: 13, cols: 19 }; return { rows: 15, cols: 21 }; }
  function buildViewportPoints(): { points: ViewportPoint[]; rows: number; cols: number } { const { rows, cols } = gridShapeForZoom(), b = map.getBounds(); const south = Math.max(-75, b.getSouth()), north = Math.min(75, b.getNorth()), west = b.getWest(), east = b.getEast(); const latStep = (north - south) / (rows - 1), lonStep = (east - west) / (cols - 1), points: ViewportPoint[] = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) points.push({ lat: south + r * latStep, lon: west + c * lonStep, r, c }); return { points, rows, cols }; }

  async function refreshViewport() {
    if (!enabled || !contoursEnabled() || viewportLoading) return; const myGeneration = ++generation; viewportLoading = true; const { points, rows, cols } = buildViewportPoints();
    try { const results = await mapLimit(points, MAX_CONCURRENT, async p => ({ ...p, result: await loadPoint(p.lat, p.lon) })); if (myGeneration !== generation || !enabled || !contoursEnabled()) return; const valid = results.filter(item => item.result && item.result.times.length).length; if (valid < Math.max(4, Math.floor(points.length * MIN_VALID_FRACTION))) { console.warn('Snowline refresh kept previous contours: too few valid profiles', valid, points.length); return; } const nextCache: (CachedPoint | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null)); for (const item of results) if (item.result) nextCache[item.r][item.c] = item.result; cache = nextCache; renderFromCache(); } finally { if (myGeneration === generation) viewportLoading = false; }
  }

  function clearContours() { if (contourLayer) { try { map.removeLayer(contourLayer); } catch {} contourLayer = null; } }
  function clearClickLayer() { if (clickLayer) { try { map.removeLayer(clickLayer); } catch {} clickLayer = null; } }
  function clearPointState() { clickGeneration += 1; probeLoading = false; clickedPoint = null; clickedLatLon = null; clickedMapElevationM = null; clearClickLayer(); }
  function statusColor(status: ProbeStatus): string { if (status === 'above') return '#46d9ff'; if (status === 'below') return '#ff9d3d'; if (status === 'near') return '#ffe45c'; return '#ffffff'; }
  function showClickLabel(lat: number, lon: number, mainText: string, detailText = '', snowlineColor = '#ffffff', status: ProbeStatus = 'neutral') { if (!labelsEnabled()) return; clearClickLayer(); clickLayer = L.layerGroup().addTo(map); const accent = statusColor(status); L.circleMarker([lat, lon], { radius: status === 'neutral' ? 4 : 5, weight: 2, color: '#ffffff', fillColor: accent, fillOpacity: 1, interactive: false }).addTo(clickLayer); const detail = detailText ? `<small>${detailText}</small>` : ''; L.marker([lat, lon], { interactive: false, zIndexOffset: 2000, icon: L.divIcon({ className: `snowline-click-label snowline-probe-${status}`, html: `<span style="--snowline-color:${snowlineColor};--probe-accent:${accent}"><b>${mainText}</b>${detail}</span>`, iconSize: [174, 54], iconAnchor: [87, 62] }) }).addTo(clickLayer); }

  function snowlineAt(point: CachedPoint, idx: number): number | null { const wbz = wetBulbZeroHeight(buildProfile(point.forecast, idx)); return wbz.snowLevelM !== null && Number.isFinite(wbz.snowLevelM) ? wbz.snowLevelM : null; }
  function tendencyText(point: CachedPoint, idx: number): string { const now = snowlineAt(point, idx); if (now === null) return ''; const target = point.times[idx] + TENDENCY_HOURS * 3600_000; if (target > point.times[point.times.length - 1] + 30 * 60_000) return ''; const futureIdx = nearestIndex(point.times, target); if (futureIdx === idx) return ''; const future = snowlineAt(point, futureIdx); if (future === null) return ''; const delta = Math.round((future - now) / 10) * 10; if (Math.abs(delta) < 20) return `→ steady`; return `${delta > 0 ? '↑' : '↓'}${Math.abs(delta)} m/${TENDENCY_HOURS}h`; }

  function updatePersistentClickLabel() {
    if (!enabled || !labelsEnabled()) { clearClickLayer(); return; } if (!clickedPoint || !clickedLatLon || !clickedPoint.times.length) return;
    const [lat, lon] = clickedLatLon, target = getStoreTimestamp(), firstTime = clickedPoint.times[0], lastTime = clickedPoint.times[clickedPoint.times.length - 1], effectiveEnd = Math.min(lastTime, firstTime + MAX_FORECAST_HOURS * 3600_000);
    if (target < firstTime - 30 * 60_000 || target > effectiveEnd + 30 * 60_000) { showClickLabel(lat, lon, 'Outside +144 h'); return; }
    const idx = nearestIndex(clickedPoint.times, target), snowline = snowlineAt(clickedPoint, idx); if (snowline === null) { showClickLabel(lat, lon, 'No snowline'); return; }
    const rounded = Math.round(snowline / 10) * 10, tendency = tendencyText(clickedPoint, idx);
    if (clickedMapElevationM !== null && Number.isFinite(clickedMapElevationM)) { const terrainRounded = Math.round(clickedMapElevationM / 10) * 10, difference = clickedMapElevationM - snowline; let status: ProbeStatus, headline: string; if (difference > NEAR_SNOWLINE_METRES) { status = 'above'; headline = '↑ ABOVE SNOWLINE'; } else if (difference < -NEAR_SNOWLINE_METRES) { status = 'below'; headline = '↓ BELOW SNOWLINE'; } else { status = 'near'; headline = '≈ NEAR SNOWLINE'; } const detail = `Here ${terrainRounded} m · SL ${rounded} m${tendency ? ` · ${tendency}` : ''}`; showClickLabel(lat, lon, headline, detail, colorForLevel(snowline), status); return; }
    showClickLabel(lat, lon, `${rounded} m`, tendency, colorForLevel(snowline));
  }

  async function probeLocation(lat: number, lon: number) { if (!enabled || !labelsEnabled() || !Number.isFinite(lat) || !Number.isFinite(lon)) return; const myClick = ++clickGeneration; clickedPoint = null; clickedMapElevationM = null; clickedLatLon = [lat, lon]; probeLoading = true; showClickLabel(lat, lon, 'Snowline …', 'Reading point'); try { const [cp, mapElevation] = await Promise.all([loadPoint(lat, lon), loadMapElevation(lat, lon)]); if (myClick !== clickGeneration || !enabled || !labelsEnabled()) return; if (!cp || !cp.times.length) { showClickLabel(lat, lon, 'No data'); return; } clickedPoint = cp; clickedMapElevationM = mapElevation; updatePersistentClickLabel(); } finally { if (myClick === clickGeneration) probeLoading = false; } }
  function handleMapClick(e: any) { if (!enabled || !labelsEnabled() || !e?.latlng) return; probeLocation(Number(e.latlng.lat), Number(e.latlng.lng)); }

  function handlePlaceSelect(event: CustomEvent<PlaceSelection>) {
    if (!enabled || !event?.detail) return;
    const { lat, lon } = event.detail;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const zoom = Math.max(Number(map.getZoom?.() ?? 7), 9);
    suppressPickerClearUntil = Number.POSITIVE_INFINITY;
    map.setView([lat, lon], Math.min(zoom, 10), { animate: true });
    setTimeout(() => {
      try { map.fire('click', { latlng: { lat, lng: lon } }); }
      catch { probeLocation(lat, lon); }
    }, 240);
  }

  function pickerLatLon(value: any): [number, number] | null { if (!value) return null; const lat = Number(value.lat ?? value.latitude), lon = Number(value.lon ?? value.lng ?? value.longitude); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null; return [lat, lon]; }
  function schedulePickerProbe(value: any, force = false) {
    if (!enabled || !labelsEnabled()) return;
    const position = pickerLatLon(value);
    if (!position) {
      if (Date.now() < suppressPickerClearUntil) return;
      lastPickerKey = '';
      if (pickerTimer) { clearTimeout(pickerTimer); pickerTimer = null; }
      clearPointState();
      return;
    }
    suppressPickerClearUntil = 0;
    const [lat, lon] = position, key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (!force && key === lastPickerKey) return;
    lastPickerKey = key;
    if (pickerTimer) clearTimeout(pickerTimer);
    pickerTimer = setTimeout(() => probeLocation(lat, lon), PICKER_PROBE_DELAY_MS);
  }
  function syncPickerFromStore(force = false) { if (!enabled || !labelsEnabled()) return; try { schedulePickerProbe(store.get('pickerLocation'), force); } catch {} }

  function lineLength(line: ContourPolyline): number { let total = 0; for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i], meanLat = (a[0] + b[0]) * 0.5 * Math.PI / 180; total += Math.hypot((b[1] - a[1]) * Math.cos(meanLat), b[0] - a[0]); } return total; }
  function midpointAlongLine(line: ContourPolyline): [number, number] | null { if (line.length < 2) return null; const lengths: number[] = []; let total = 0; for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i], meanLat = (a[0] + b[0]) * 0.5 * Math.PI / 180, d = Math.hypot((b[1] - a[1]) * Math.cos(meanLat), b[0] - a[0]); lengths.push(d); total += d; } if (total <= 0) return line[Math.floor(line.length / 2)]; const target = total / 2; let travelled = 0; for (let i = 0; i < lengths.length; i++) { const d = lengths[i]; if (travelled + d >= target) { const f = d > 0 ? (target - travelled) / d : 0, a = line[i], b = line[i + 1]; return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])]; } travelled += d; } return line[line.length - 1]; }
  function drawDeclutteredLabels(candidates: LabelCandidate[], layer: any) { if (!candidates.length) return; const mapWidth = Number(map.getSize?.().x ?? 800), maxLabels = mapWidth < 520 ? 5 : mapWidth < 900 ? 7 : 10, minDistance = mapWidth < 520 ? 82 : LABEL_MIN_DISTANCE_PX; const ordered = [...candidates].sort((a, b) => a.isMajor !== b.isMajor ? (a.isMajor ? -1 : 1) : b.length - a.length), occupied: { x: number; y: number }[] = []; let placed = 0; for (const candidate of ordered) { if (placed >= maxLabels) break; const px = map.latLngToContainerPoint(candidate.point); if (occupied.some(other => Math.hypot(px.x - other.x, px.y - other.y) < minDistance)) continue; L.marker(candidate.point, { interactive: false, icon: L.divIcon({ className: 'snowline-label', html: `<span style="--snowline-color:${candidate.color}">${candidate.level} m</span>`, iconSize: [62, 20], iconAnchor: [31, 10] }) }).addTo(layer); occupied.push({ x: px.x, y: px.y }); placed += 1; } }

  function renderFromCache() {
    if (!enabled || !contoursEnabled() || !cache.length) return; const target = getStoreTimestamp(), firstPoint = cache.flat().find((cp): cp is CachedPoint => cp !== null && cp.times.length > 0); if (!firstPoint) return; const firstTime = firstPoint.times[0], effectiveEnd = Math.min(firstPoint.times[firstPoint.times.length - 1], firstTime + MAX_FORECAST_HOURS * 3600_000); if (target < firstTime - 30 * 60_000 || target > effectiveEnd + 30 * 60_000) { clearContours(); return; }
    const field: GridPoint[][] = [];
    for (let r = 0; r < cache.length; r++) { const row: GridPoint[] = []; for (let c = 0; c < cache[r].length; c++) { const cp = cache[r][c]; if (!cp || !cp.times.length) { row.push({ lat: 0, lon: 0, value: null }); continue; } const idx = nearestIndex(cp.times, target), snowline = snowlineAt(cp, idx); row.push({ lat: cp.lat, lon: cp.lon, value: snowline }); } field.push(row); }
    const values = field.flat().map(p => p.value).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)); if (!values.length) { clearContours(); return; }
    const interval = contourIntervalForZoom(), nextLayer = L.layerGroup(), min = Math.floor(Math.min(...values) / interval) * interval, max = Math.ceil(Math.max(...values) / interval) * interval, labelCandidates: LabelCandidate[] = [];
    for (let level = min; level <= max; level += interval) { const lines = contourPolylines(field, level), is1000 = level % 1000 === 0, is500 = level % 500 === 0, contourColor = colorForLevel(level); for (const line of lines) { if (line.length < 2) continue; if (is500 || is1000) L.polyline(line, { color: '#11151b', weight: is1000 ? 4.3 : 3.0, opacity: is1000 ? 0.58 : 0.42, interactive: false, lineCap: 'round', lineJoin: 'round', smoothFactor: 0.8 }).addTo(nextLayer); L.polyline(line, { color: contourColor, weight: is1000 ? 2.9 : is500 ? 1.9 : 0.9, opacity: is1000 ? 1.0 : is500 ? 0.96 : 0.68, interactive: false, lineCap: 'round', lineJoin: 'round', smoothFactor: is500 ? 0.7 : 0.9 }).addTo(nextLayer); } const shouldLabel = interval === 100 ? is500 : is1000; if (shouldLabel && lines.length) { const longest = [...lines].sort((a, b) => lineLength(b) - lineLength(a))[0], length = lineLength(longest), labelPoint = midpointAlongLine(longest); if (labelPoint && length > 0.08) labelCandidates.push({ point: labelPoint, level, color: contourColor, length, isMajor: is1000 }); } }
    drawDeclutteredLabels(labelCandidates, nextLayer); nextLayer.addTo(map); const oldLayer = contourLayer; contourLayer = nextLayer; if (oldLayer) try { map.removeLayer(oldLayer); } catch {}
  }

  function handleMapNavigation() { if (!enabled) return; if (contoursEnabled()) { if (moveTimer) clearTimeout(moveTimer); moveTimer = setTimeout(() => refreshViewport(), 650); } if (labelsEnabled()) setTimeout(() => syncPickerFromStore(), 180); }
  function setDisplayMode(mode: DisplayMode) { if (!enabled || displayMode === mode) return; displayMode = mode; generation += 1; viewportLoading = false; if (!contoursEnabled()) clearContours(); else refreshViewport(); if (!labelsEnabled()) clearPointState(); else syncPickerFromStore(true); }
  function toggleEnabled() { if (enabled) { if (contoursEnabled()) refreshViewport(); if (labelsEnabled()) syncPickerFromStore(true); } else { generation += 1; viewportLoading = false; if (pickerTimer) { clearTimeout(pickerTimer); pickerTimer = null; } clearContours(); clearPointState(); } }

  onMount(() => {
    map.on('moveend', handleMapNavigation); map.on('zoomend', handleMapNavigation); map.on('click', handleMapClick);
    try { timestampListener = store.on('timestamp', () => { if (enabled && contoursEnabled() && cache.length && !viewportLoading) renderFromCache(); if (enabled && labelsEnabled()) updatePersistentClickLabel(); }); } catch (e) { console.warn('Snowline timeline listener unavailable', e); }
    try { pickerLocationListener = store.on('pickerLocation', (value: any) => schedulePickerProbe(value)); } catch (e) { console.warn('Snowline picker-location listener unavailable', e); }
    pickerSyncTimer = setInterval(() => syncPickerFromStore(), PICKER_SYNC_MS);
    if (contoursEnabled()) refreshViewport();
    if (labelsEnabled()) syncPickerFromStore(true);
  });
  onDestroy(() => {
    generation += 1; clickGeneration += 1;
    if (moveTimer) clearTimeout(moveTimer); if (pickerTimer) clearTimeout(pickerTimer); if (pickerSyncTimer) clearInterval(pickerSyncTimer);
    map.off('moveend', handleMapNavigation); map.off('zoomend', handleMapNavigation); map.off('click', handleMapClick);
    if (timestampListener !== null) try { store.off(timestampListener); } catch {}
    if (pickerLocationListener !== null) try { store.off(pickerLocationListener); } catch {}
    clearContours(); clearClickLayer(); profileCache.clear(); clickedPoint = null; clickedLatLon = null; clickedMapElevationM = null;
  });
</script>

<style lang="less">
  .snowline-panel { width: 224px; padding: 8px 9px; border-radius: 8px; background: rgba(45,45,45,0.95); color: white; box-shadow: 0 3px 12px rgba(0,0,0,0.24); }
  .top-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .title { font-size: 16px; line-height: 1.05; font-weight: 800; }
  .description { margin-top: 4px; font-size: 10px; line-height: 1.25; opacity: 0.74; }
  .switch { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; white-space: nowrap; }
  .switch input { margin: 0; width: 15px; height: 15px; }
  .mode-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 7px; opacity: 1; }
  .mode-row.disabled { opacity: 0.45; }
  .mode-row button { min-width: 0; padding: 5px 3px; border: 1px solid rgba(255,255,255,0.16); border-radius: 6px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.72); font-size: 8.7px; line-height: 1.1; font-weight: 700; cursor: pointer; }
  .mode-row button.active { background: rgba(29,161,242,0.22); border-color: rgba(80,190,255,0.72); color: white; }
  .mode-row button:disabled { cursor: default; }
  .micro-note { margin-top: 5px; font-size: 8.7px; line-height: 1.2; opacity: 0.58; }
  .status-pill { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; padding: 4px 7px; border-radius: 6px; background: rgba(10,14,18,0.72); color: rgba(255,255,255,0.92); font-size: 10px; line-height: 1; font-weight: 700; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #70d7ff; box-shadow: 0 0 0 2px rgba(112,215,255,0.18); animation: snowline-pulse 1s ease-in-out infinite; }
  @keyframes snowline-pulse { 0%,100% { opacity: 0.45; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
  @media (max-width: 520px) { .snowline-panel { width: 200px; padding: 7px 8px; } .description { font-size: 9.5px; } .mode-row button { font-size: 8.1px; } .micro-note { font-size: 8.2px; } }
  :global(.snowline-label), :global(.snowline-click-label) { background: transparent !important; border: 0 !important; }
  :global(.snowline-label span) { display: inline-block; padding: 1px 4px 1px 6px; border-radius: 3px; border-left: 4px solid var(--snowline-color, white); background: rgba(15,17,20,0.86); color: white; font-size: 10px; font-weight: 800; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.8); box-shadow: 0 0 0 1px rgba(255,255,255,0.12); }
  :global(.snowline-click-label span) { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 126px; padding: 5px 8px 4px; border-radius: 8px; border: 2px solid var(--probe-accent, rgba(255,255,255,0.4)); border-bottom: 4px solid var(--snowline-color, white); background: rgba(12,14,17,0.96); color: white; text-align: center; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.8); box-shadow: 0 3px 10px rgba(0,0,0,0.38); }
  :global(.snowline-click-label b) { color: var(--probe-accent, white); font-size: 13px; line-height: 1.05; font-weight: 900; letter-spacing: 0.25px; }
  :global(.snowline-click-label small) { font-size: 9px; line-height: 1.1; font-weight: 700; opacity: 0.9; }
  :global(.snowline-probe-above span) { background: rgba(8,27,38,0.97); }
  :global(.snowline-probe-below span) { background: rgba(39,23,10,0.97); }
  :global(.snowline-probe-near span) { background: rgba(38,34,10,0.97); }
</style>
