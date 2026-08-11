<script lang="ts">
  import { onDestroy } from 'svelte';
  import store from '@windy/store';
  import { getElevation, getMeteogramForecastData } from '@windy/fetch';
  import { buildProfile, valueAt } from './snowLevel';
  import { terrainDiagnostics } from './terrainDiagnostics';

  export let selected: { lat: number; lon: number } | null = null;

  let generation = 0;
  let observer: MutationObserver | null = null;
  let tempText = '—';
  let rhText = '—';

  $: if (selected) void refresh(selected.lat, selected.lon);

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

  function forecastTimes(data: Record<string, unknown>, header: Record<string, unknown>): number[] {
    const hours = data.hours;
    const length = Number((hours as any)?.length ?? 0);
    if (!Number.isFinite(length) || length <= 0) return [];
    const raw: number[] = [];
    for (let i = 0; i < length; i++) {
      const value = valueAt(hours, i);
      if (value !== null) raw.push(value);
    }
    if (!raw.length) return [];
    if (raw[0] > 1e12) return raw;
    if (raw[0] > 1e9) return raw.map(v => v * 1000);
    const ref = parseTime(header.refTime);
    return ref === null ? [] : raw.map(hour => ref + hour * 3600_000);
  }

  function nearestIndex(times: number[], target: number): number {
    let best = 0;
    let distance = Infinity;
    times.forEach((time, i) => {
      const d = Math.abs(time - target);
      if (d < distance) { distance = d; best = i; }
    });
    return best;
  }

  function elevationValue(response: any): number | null {
    for (const candidate of [response?.data, response?.data?.data, response?.value]) {
      const n = Number(candidate);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function metricClass(label: string): string {
    const key = label.toLowerCase();
    if (key === 'valid') return 'metric-valid';
    if (key === 'precip') return 'metric-precip';
    if (key === 'terrain') return 'metric-terrain';
    if (key === 'snowline') return 'metric-snowline';
    if (key.includes('terrain t')) return 'metric-temp';
    if (key.includes('terrain rh')) return 'metric-rh';
    if (key.includes('terrain Δ')) return 'metric-delta';
    if (key === 'trend') return 'metric-trend';
    return '';
  }

  function upgradeExistingCells(grid: HTMLElement) {
    grid.classList.add('wintry-metrics-upgraded');
    for (const cell of Array.from(grid.children)) {
      if (!(cell instanceof HTMLElement)) continue;
      const label = cell.querySelector('small')?.textContent?.trim() ?? '';
      const cls = metricClass(label);
      if (cls) cell.classList.add(cls);
    }
  }

  function syncLabel() {
    const card = document.querySelector('.snowline-click-label > span') as HTMLElement | null;
    const grid = document.querySelector('.snowline-click-label .snowline-label-grid') as HTMLElement | null;
    if (!card || !grid) return;

    card.classList.add('wintry-point-card-v13');
    upgradeExistingCells(grid);

    function setCell(attr: string, label: string, value: string, className: string) {
      let cell = grid!.querySelector(`[${attr}]`) as HTMLElement | null;
      if (!cell) {
        cell = document.createElement('span');
        cell.setAttribute(attr, '1');
        cell.innerHTML = `<small>${label}</small><strong></strong>`;
        grid!.appendChild(cell);
      }
      cell.classList.add(className);
      const strong = cell.querySelector('strong');
      if (strong) strong.textContent = value;
    }

    setCell('data-wintry-terrain-temp', 'Terrain T', tempText, 'metric-temp');
    setCell('data-wintry-terrain-rh', 'Terrain RH', rhText, 'metric-rh');
  }

  async function refresh(lat: number, lon: number) {
    const myGeneration = ++generation;
    tempText = '—';
    rhText = '—';
    try {
      const [forecastResponse, elevationResponse] = await Promise.all([
        getMeteogramForecastData('ecmwf', { lat, lon, step: 3, days: 6 }),
        getElevation(lat, lon),
      ]);
      if (myGeneration !== generation) return;

      const response = forecastResponse as any;
      const forecast = response?.data?.data && typeof response.data.data === 'object' ? response.data.data as Record<string, unknown> : {};
      const header = response?.data?.header && typeof response.data.header === 'object' ? response.data.header as Record<string, unknown> : {};
      const times = forecastTimes(forecast, header);
      const elevation = elevationValue(elevationResponse);
      if (elevation === null || !times.length) { queueMicrotask(syncLabel); return; }

      let target = Date.now();
      try {
        const value = store.get('timestamp');
        if (typeof value === 'number' && Number.isFinite(value)) target = value;
      } catch {}

      const profile = buildProfile(forecast, nearestIndex(times, target));
      const diagnostics = terrainDiagnostics(profile, elevation);
      if (diagnostics) {
        tempText = `${diagnostics.tempC.toFixed(1)}°C`;
        rhText = `${Math.round(diagnostics.rhPct)}%`;
      }
      queueMicrotask(syncLabel);

      observer?.disconnect();
      observer = new MutationObserver(syncLabel);
      observer.observe(document.body, { subtree: true, childList: true });
    } catch {
      queueMicrotask(syncLabel);
    }
  }

  onDestroy(() => {
    generation += 1;
    observer?.disconnect();
    observer = null;
  });
</script>

<style lang="less">
  :global(.snowline-click-label > span.wintry-point-card-v13){
    width:248px!important;
    min-height:0!important;
    padding:42px 11px 11px!important;
    gap:8px!important;
    border-width:1px!important;
    border-bottom-width:4px!important;
    border-radius:14px!important;
    background:
      radial-gradient(circle at 50% -18%,color-mix(in srgb,var(--probe-accent,white) 22%,transparent),transparent 46%),
      linear-gradient(180deg,rgba(15,23,30,.985),rgba(7,13,18,.992))!important;
    box-shadow:0 12px 34px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.055)!important;
    backdrop-filter:blur(9px);
  }

  :global(.snowline-click-label > span.wintry-point-card-v13::before){
    content:'WINTRY FORECAST';
    position:absolute;
    top:12px;
    left:78px;
    right:78px;
    color:#82949f;
    font-size:6.5px;
    line-height:1;
    font-weight:900;
    letter-spacing:1.15px;
    text-align:center;
    pointer-events:none;
  }

  :global(.snowline-click-label .wintry-point-card-v13 > b){
    margin:1px -2px 0!important;
    padding:8px 8px 7px;
    border-radius:9px;
    background:color-mix(in srgb,var(--probe-accent,white) 8%,rgba(255,255,255,.025));
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--probe-accent,white) 18%,transparent);
    color:var(--probe-accent,white)!important;
    font-size:14.5px!important;
    line-height:1.12!important;
    letter-spacing:.35px!important;
  }

  :global(.snowline-click-label .wintry-metrics-upgraded){
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:6px!important;
  }

  :global(.snowline-click-label .wintry-metrics-upgraded > span){
    position:relative;
    min-height:39px;
    box-sizing:border-box;
    padding:7px 6px 6px!important;
    border:1px solid rgba(255,255,255,.055);
    border-radius:9px!important;
    background:linear-gradient(180deg,rgba(255,255,255,.052),rgba(255,255,255,.022))!important;
    overflow:hidden;
  }

  :global(.snowline-click-label .wintry-metrics-upgraded > span::after){
    content:'';
    position:absolute;
    left:0;
    top:0;
    bottom:0;
    width:2px;
    background:rgba(255,255,255,.12);
  }

  :global(.snowline-click-label .wintry-metrics-upgraded small){
    color:#82939d!important;
    font-size:6.6px!important;
    line-height:1!important;
    font-weight:750;
    letter-spacing:.25px;
    text-transform:uppercase;
  }

  :global(.snowline-click-label .wintry-metrics-upgraded strong){
    margin-top:4px!important;
    color:#f2f7fa!important;
    font-size:9.6px!important;
    line-height:1.05!important;
    font-weight:850!important;
  }

  :global(.snowline-click-label .metric-valid){grid-column:span 1}
  :global(.snowline-click-label .metric-valid strong){font-size:9px!important}
  :global(.snowline-click-label .metric-precip::after){background:#68d5f6!important}
  :global(.snowline-click-label .metric-precip strong){color:#91e7ff!important}
  :global(.snowline-click-label .metric-terrain::after){background:#ffad59!important}
  :global(.snowline-click-label .metric-terrain strong){color:#ffd0a2!important}
  :global(.snowline-click-label .metric-snowline::after){background:var(--snowline-color,#65d5ff)!important}
  :global(.snowline-click-label .metric-snowline strong){color:#e9f8ff!important}
  :global(.snowline-click-label .metric-temp::after){background:#ff796e!important}
  :global(.snowline-click-label .metric-temp strong){color:#ffaaa3!important;font-size:10.5px!important}
  :global(.snowline-click-label .metric-rh::after){background:#64c9ff!important}
  :global(.snowline-click-label .metric-rh strong){color:#a3e1ff!important;font-size:10.5px!important}
  :global(.snowline-click-label .metric-delta::after){background:var(--probe-accent,#fff)!important}
  :global(.snowline-click-label .metric-delta strong){color:var(--probe-accent,#fff)!important}
  :global(.snowline-click-label .metric-trend::after){background:#c3a7ff!important}

  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-chart),
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-favourite),
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-share),
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-close){
    top:7px!important;
    height:28px!important;
    border-color:rgba(255,255,255,.09)!important;
    border-radius:8px!important;
    background:rgba(255,255,255,.06)!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
    transition:background .12s ease,border-color .12s ease,transform .12s ease;
  }
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-chart:hover),
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-favourite:hover),
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-share:hover),
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-close:hover){
    background:rgba(255,255,255,.12)!important;
    border-color:rgba(255,255,255,.17)!important;
    transform:translateY(-1px);
  }

  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-chart){left:7px!important;width:30px!important}
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-favourite){left:42px!important;width:30px!important}
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-share){right:42px!important;width:30px!important}
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-close){right:7px!important;width:30px!important;font-size:18px!important}

  :global(.snowline-click-label .wintry-point-card-v13 .snowline-label-detail){margin-top:0!important}
  :global(.snowline-click-label .wintry-point-card-v13 .snowline-loading){padding:19px 0 14px!important;color:#9db0bb!important}

  :global(.snowline-probe-above > span.wintry-point-card-v13){--card-glow:#46d9ff}
  :global(.snowline-probe-near > span.wintry-point-card-v13){--card-glow:#ffe45c}
  :global(.snowline-probe-below > span.wintry-point-card-v13){--card-glow:#ff9d3d}

  @media(max-width:520px){
    :global(.snowline-click-label > span.wintry-point-card-v13){width:232px!important;padding:41px 9px 9px!important;border-radius:13px!important}
    :global(.snowline-click-label .wintry-metrics-upgraded > span){min-height:37px;padding:6px 5px!important}
    :global(.snowline-click-label .wintry-metrics-upgraded strong){font-size:9.1px!important}
    :global(.snowline-click-label .metric-temp strong),
    :global(.snowline-click-label .metric-rh strong){font-size:10px!important}
    :global(.snowline-click-label .wintry-point-card-v13 > b){font-size:13.5px!important}
  }
</style>
