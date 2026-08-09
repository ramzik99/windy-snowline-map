<div class="inspector">
  <div class="head">
    <div>
      <b>Windy data inspector</b>
      <small>Standalone diagnostic · ECMWF</small>
    </div>
    <button type="button" on:click={clear}>Clear</button>
  </div>

  <div class="instructions">Click/tap any map point. This inspector does not modify the Snow forecast plugin.</div>

  {#if loading}
    <div class="status">Reading Windy data…</div>
  {:else if result}
    <div class="summary">
      <span><small>Location</small><b>{result.lat.toFixed(4)}, {result.lon.toFixed(4)}</b></span>
      <span><small>Elevation</small><b>{result.elevation !== null ? `${Math.round(result.elevation)} m` : '—'}</b></span>
      <span><small>Fields</small><b>{result.keys.length}</b></span>
      <span><small>Snow-like</small><b>{result.snowKeys.length}</b></span>
    </div>

    <section>
      <h3>Snow / depth candidates</h3>
      {#if result.snowRows.length}
        <table>
          <thead><tr><th>Field</th><th>Length</th><th>First values</th></tr></thead>
          <tbody>
            {#each result.snowRows as row}
              <tr><td>{row.key}</td><td>{row.length}</td><td>{row.preview}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="empty">No point-forecast field containing snow, depth, hsnow, h-snow, snowcover or snow-depth.</div>
      {/if}
    </section>

    <section>
      <h3>Precipitation candidates</h3>
      {#if result.precipRows.length}
        <table>
          <thead><tr><th>Field</th><th>Length</th><th>First values</th></tr></thead>
          <tbody>
            {#each result.precipRows as row}
              <tr><td>{row.key}</td><td>{row.length}</td><td>{row.preview}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="empty">No precipitation-like point fields detected.</div>
      {/if}
    </section>

    <section>
      <h3>Map / store state</h3>
      <pre>{result.storeText}</pre>
    </section>

    <section>
      <h3>Current map interpolator</h3>
      <pre>{result.interpolatorText}</pre>
    </section>

    <section>
      <h3>All point-forecast fields</h3>
      <pre>{result.keys.join('\n')}</pre>
    </section>

    <div class="actions">
      <button type="button" on:click={copyReport}>Copy report</button>
      <button type="button" on:click={downloadReport}>Save TXT</button>
      {#if copied}<span>Copied ✓</span>{/if}
    </div>
  {:else}
    <div class="empty hero">No point selected yet.</div>
  {/if}
</div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import store from '@windy/store';
  import { singleclick } from '@windy/singleclick';
  import { getElevation, getMeteogramForecastData } from '@windy/fetch';
  import { getLatLonInterpolator } from '@windy/interpolator';
  import config from './pluginConfig';

  type Row = { key: string; length: number; preview: string };
  type InspectorResult = {
    lat: number;
    lon: number;
    elevation: number | null;
    keys: string[];
    snowKeys: string[];
    snowRows: Row[];
    precipRows: Row[];
    storeText: string;
    interpolatorText: string;
    rawPoint: any;
  };

  let loading = false;
  let result: InspectorResult | null = null;
  let copied = false;
  let generation = 0;

  function scalarNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') { const n = Number(value); if (Number.isFinite(n)) return n; }
    return null;
  }

  function payloadData(payload: any): Record<string, unknown> {
    if (payload?.data?.data && typeof payload.data.data === 'object') return payload.data.data;
    if (payload?.data && typeof payload.data === 'object') return payload.data;
    return {};
  }

  function previewValue(value: unknown): { length: number; preview: string } {
    if (Array.isArray(value)) {
      const values = value.slice(0, 10).map(v => typeof v === 'number' ? Number(v.toFixed?.(5) ?? v) : v);
      return { length: value.length, preview: JSON.stringify(values) };
    }
    if (value && typeof value === 'object' && typeof (value as any).length === 'number') {
      const n = Number((value as any).length);
      const arr: unknown[] = [];
      for (let i = 0; i < Math.min(10, n); i++) arr.push((value as any)[i]);
      return { length: n, preview: JSON.stringify(arr) };
    }
    return { length: value == null ? 0 : 1, preview: String(value) };
  }

  function rowsFor(data: Record<string, unknown>, matcher: (key: string) => boolean): Row[] {
    return Object.keys(data).filter(matcher).sort().map(key => ({ key, ...previewValue(data[key]) }));
  }

  function snowKey(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('snow') || k.includes('hsnow') || k.includes('h-snow') || k.includes('depth');
  }

  function precipKey(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('precip') || k.includes('rain') || k.includes('snowfall') || k.includes('past3h') || k === 'tp' || k.includes('total-precip');
  }

  function storeSnapshot(): string {
    const names = ['overlay', 'product', 'level', 'timestamp', 'availLevels', 'metric'];
    const out: Record<string, unknown> = {};
    for (const name of names) {
      try { out[name] = store.get(name as any); } catch (e) { out[name] = `unavailable: ${String(e)}`; }
    }
    return JSON.stringify(out, null, 2);
  }

  async function elevationAt(lat: number, lon: number): Promise<number | null> {
    try {
      const value = await getElevation(lat, lon) as any;
      for (const candidate of [value?.data, value?.data?.data, value?.value]) {
        const n = scalarNumber(candidate); if (n !== null) return n;
      }
    } catch {}
    return null;
  }

  async function interpolatorSnapshot(lat: number, lon: number): Promise<string> {
    const overlay = (() => { try { return store.get('overlay' as any); } catch { return null; } })();
    const product = (() => { try { return store.get('product' as any); } catch { return null; } })();
    const level = (() => { try { return store.get('level' as any); } catch { return null; } })();
    const timestamp = (() => { try { return store.get('timestamp' as any); } catch { return null; } })();
    try {
      const interpolator = await getLatLonInterpolator();
      if (!interpolator) return JSON.stringify({ overlay, product, level, timestamp, value: null, note: 'No interpolator available for currently loaded map data.' }, null, 2);
      let value: unknown = null;
      try { value = await interpolator({ lat, lon } as any); }
      catch (e) { return JSON.stringify({ overlay, product, level, timestamp, error: String(e) }, null, 2); }
      return JSON.stringify({ overlay, product, level, timestamp, value }, null, 2);
    } catch (e) {
      return JSON.stringify({ overlay, product, level, timestamp, error: String(e) }, null, 2);
    }
  }

  async function inspect(lat: number, lon: number) {
    const mine = ++generation;
    loading = true; copied = false;
    try {
      const [pointPayload, elevation, interpolatorText] = await Promise.all([
        getMeteogramForecastData('ecmwf', { lat, lon, step: 1, days: 6 }),
        elevationAt(lat, lon),
        interpolatorSnapshot(lat, lon),
      ]);
      if (mine !== generation) return;
      const data = payloadData(pointPayload);
      const keys = Object.keys(data).sort();
      const snowRows = rowsFor(data, snowKey);
      const precipRows = rowsFor(data, precipKey);
      result = {
        lat, lon, elevation, keys,
        snowKeys: snowRows.map(r => r.key),
        snowRows, precipRows,
        storeText: storeSnapshot(), interpolatorText,
        rawPoint: pointPayload,
      };
      console.group('Windy data inspector');
      console.log('Location', { lat, lon, elevation });
      console.log('All point fields', keys);
      console.table(snowRows);
      console.table(precipRows);
      console.log('Raw point response', pointPayload);
      console.log('Store', JSON.parse(result.storeText));
      console.log('Interpolator', result.interpolatorText);
      console.groupEnd();
    } catch (e) {
      if (mine !== generation) return;
      result = {
        lat, lon, elevation: null, keys: [], snowKeys: [], snowRows: [], precipRows: [],
        storeText: storeSnapshot(), interpolatorText: `Inspector failed: ${String(e)}`, rawPoint: null,
      };
    } finally {
      if (mine === generation) loading = false;
    }
  }

  function latLon(value: any): [number, number] | null {
    const lat = Number(value?.lat ?? value?.latitude ?? value?.latlng?.lat);
    const lon = Number(value?.lon ?? value?.lng ?? value?.longitude ?? value?.latlng?.lng);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
  }

  function handleClick(value: any) {
    const p = latLon(value); if (!p) return;
    void inspect(p[0], p[1]);
  }

  function reportText(): string {
    if (!result) return '';
    return [
      'WINDY DATA INSPECTOR',
      `Location: ${result.lat}, ${result.lon}`,
      `Elevation: ${result.elevation ?? 'unavailable'} m`,
      '',
      'SNOW / DEPTH CANDIDATES',
      ...(result.snowRows.length ? result.snowRows.map(r => `${r.key} | length=${r.length} | ${r.preview}`) : ['None']),
      '',
      'PRECIPITATION CANDIDATES',
      ...(result.precipRows.length ? result.precipRows.map(r => `${r.key} | length=${r.length} | ${r.preview}`) : ['None']),
      '',
      'STORE STATE', result.storeText,
      '',
      'CURRENT MAP INTERPOLATOR', result.interpolatorText,
      '',
      'ALL POINT FORECAST FIELDS', ...result.keys,
    ].join('\n');
  }

  async function copyReport() {
    const text = reportText(); if (!text) return;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => copied = false, 1600); }
    catch { copied = false; }
  }

  function downloadReport() {
    const text = reportText(); if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'windy-data-inspector.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function clear() { generation += 1; loading = false; result = null; copied = false; }

  onMount(() => singleclick.on(config.name, handleClick));
  onDestroy(() => { generation += 1; singleclick.off(config.name, handleClick); });
</script>

<style lang="less">
  .inspector { width: min(560px, calc(100vw - 18px)); max-height: 78vh; overflow-y: auto; padding: 11px; border-radius: 10px; background: rgba(20,24,29,.97); color: white; box-shadow: 0 8px 30px rgba(0,0,0,.45); font-family: Arial, sans-serif; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
  .head b { display:block; font-size:16px; }.head small { display:block; margin-top:3px; color:#84cbe9; font-size:9px; }
  button { border:1px solid rgba(255,255,255,.16); border-radius:6px; background:rgba(255,255,255,.07); color:white; padding:5px 8px; cursor:pointer; font-size:10px; font-weight:700; }
  .instructions,.status,.empty { margin-top:9px; padding:8px; border-radius:7px; background:rgba(255,255,255,.045); color:rgba(255,255,255,.72); font-size:10px; }
  .hero { padding:24px 8px; text-align:center; }
  .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:8px; }.summary span{padding:6px;border-radius:7px;background:rgba(255,255,255,.045);text-align:center}.summary small{display:block;color:rgba(255,255,255,.45);font-size:7px}.summary b{display:block;margin-top:2px;font-size:9px}
  section { margin-top:10px; } h3 { margin:0 0 5px; color:#8edfff; font-size:10px; text-transform:uppercase; letter-spacing:.4px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:8px; } th,td { padding:4px; border-bottom:1px solid rgba(255,255,255,.08); text-align:left; vertical-align:top; word-break:break-all; } th:nth-child(1),td:nth-child(1){width:34%} th:nth-child(2),td:nth-child(2){width:12%}
  pre { margin:0; padding:7px; border-radius:7px; background:#0d1217; color:#d5e2e9; white-space:pre-wrap; word-break:break-word; font-size:8px; line-height:1.35; }
  .actions { display:flex; align-items:center; gap:6px; margin-top:10px; }.actions span{font-size:9px;color:#8de39a}
  @media(max-width:520px){.inspector{width:calc(100vw - 12px);max-height:74vh;padding:9px}.summary{grid-template-columns:repeat(2,1fr)}table{font-size:7px}pre{font-size:7px}}
</style>
