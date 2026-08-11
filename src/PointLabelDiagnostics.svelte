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

  function syncLabel() {
    const grid = document.querySelector('.snowline-click-label .snowline-label-grid') as HTMLElement | null;
    if (!grid) return;

    function setCell(attr: string, label: string, value: string) {
      let cell = grid!.querySelector(`[${attr}]`) as HTMLElement | null;
      if (!cell) {
        cell = document.createElement('span');
        cell.setAttribute(attr, '1');
        cell.innerHTML = `<small>${label}</small><strong></strong>`;
        grid!.appendChild(cell);
      }
      const strong = cell.querySelector('strong');
      if (strong) strong.textContent = value;
    }

    setCell('data-wintry-terrain-temp', 'Terrain T', tempText);
    setCell('data-wintry-terrain-rh', 'Terrain RH', rhText);
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
