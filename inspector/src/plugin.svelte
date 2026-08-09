<div class="inspector">
  <div class="head">
    <div>
      <b>Windy data inspector</b>
      <small>Standalone diagnostic · ECMWF</small>
    </div>
    <button type="button" on:click={clear}>Clear</button>
  </div>

  <div class="instructions">
    Select Windy's <b>Snow depth</b> layer, then click/tap a map point. The inspector will decode every raw interpolator channel without assuming which one is snow depth.
  </div>

  {#if loading}
    <div class="status">Reading Windy data…</div>
  {:else if result}
    <div class="summary">
      <span><small>Location</small><b>{result.lat.toFixed(4)}, {result.lon.toFixed(4)}</b></span>
      <span><small>Elevation</small><b>{result.elevation !== null ? `${Math.round(result.elevation)} m` : '—'}</b></span>
      <span><small>Overlay</small><b>{result.overlay ?? '—'}</b></span>
      <span><small>Point fields</small><b>{result.keys.length}</b></span>
    </div>

    {#if result.overlay === 'snowcover'}
      <section class="important">
        <h3>Snowcover decoder</h3>
        <div class="decoder-note">
          Raw map values are shown exactly as Windy's interpolator returns them. Each numeric channel is also passed through Windy's official <b>snow</b> metric converter.
        </div>
        <pre>{result.snowDecodeText}</pre>
      </section>
    {:else}
      <section class="important">
        <h3>Snowcover decoder</h3>
        <div class="empty">Current overlay is <b>{result.overlay ?? 'unknown'}</b>. Switch Windy to <b>Snow depth</b> and click the point again.</div>
      </section>
    {/if}

    <section>
      <h3>Current map interpolator</h3>
      <pre>{result.interpolatorText}</pre>
    </section>

    <section>
      <h3>Map / store state</h3>
      <pre>{result.storeText}</pre>
    </section>

    <section>
      <h3>Snow / depth point-field candidates</h3>
      {#if result.snowRows.length}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Field</th><th>Length</th><th>First values</th></tr></thead>
            <tbody>
              {#each result.snowRows as row}
                <tr><td>{row.key}</td><td>{row.length}</td><td>{row.preview}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="empty">No snow/depth field exists in the ECMWF point forecast response.</div>
      {/if}
    </section>

    <section>
      <h3>Precipitation point-field candidates</h3>
      {#if result.precipRows.length}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Field</th><th>Length</th><th>First values</th></tr></thead>
            <tbody>
              {#each result.precipRows as row}
                <tr><td>{row.key}</td><td>{row.length}</td><td>{row.preview}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="empty">No precipitation-like point fields detected.</div>
      {/if}
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
  import metrics from '@windy/metrics';
  import { singleclick } from '@windy/singleclick';
  import { getElevation, getMeteogramForecastData } from '@windy/fetch';
  import { getLatLonInterpolator } from '@windy/interpolator';
  import config from './pluginConfig';

  type Row = { key: string; length: number; preview: string };
  type InspectorResult = {
    lat: number;
    lon: number;
    elevation: number | null;
    overlay: string | null;
    keys: string[];
    snowRows: Row[];
    precipRows: Row[];
    storeText: string;
    interpolatorText: string;
    snowDecodeText: string;
  };

  let loading = false;
  let result: InspectorResult | null = null;
  let copied = false;
  let generation = 0;

  function safeStore(name: string): any {
    try { return store.get(name as any); } catch { return null; }
  }

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
      return { length: value.length, preview: JSON.stringify(value.slice(0, 10)) };
    }
    if (value && typeof value === 'object' && typeof (value as any).length === 'number') {
      const n = Number((value as any).length); const a: unknown[] = [];
      for (let i = 0; i < Math.min(10, n); i++) a.push((value as any)[i]);
      return { length: n, preview: JSON.stringify(a) };
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
    const names = ['overlay', 'product', 'level', 'timestamp', 'availLevels', 'pickerLocation'];
    const out: Record<string, unknown> = {};
    for (const name of names) {
      try { out[name] = store.get(name as any); } catch (e) { out[name] = `unavailable: ${String(e)}`; }
    }
    try {
      out.snowMetric = {
        selected: (metrics as any)?.snow?.metric ?? null,
        available: typeof (metrics as any)?.snow?.listMetrics === 'function' ? (metrics as any).snow.listMetrics() : null,
      };
    } catch (e) { out.snowMetric = `unavailable: ${String(e)}`; }
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

  function numericChannels(value: unknown): number[] {
    if (typeof value === 'number' && Number.isFinite(value)) return [value];
    if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
    if (value && typeof value === 'object' && typeof (value as any).length === 'number') {
      const out: number[] = [];
      for (let i = 0; i < Number((value as any).length); i++) {
        const n = Number((value as any)[i]); if (Number.isFinite(n)) out.push(n);
      }
      return out;
    }
    return [];
  }

  function decodeSnow(value: unknown, overlay: string | null): string {
    const channels = numericChannels(value);
    const snowMetric: any = (metrics as any)?.snow;
    const out: any = {
      overlay,
      raw: value,
      note: 'Channel identity is intentionally not assumed. Compare decoded values with the Windy picker/legend.',
      snowMetricSelected: snowMetric?.metric ?? null,
      channels: [] as any[],
    };

    channels.forEach((raw, index) => {
      const channel: any = { index, raw };
      try { channel.userUnit = snowMetric?.convertValue?.(raw) ?? null; } catch (e) { channel.userUnitError = String(e); }
      try { channel.cm = snowMetric?.convertNumber?.(raw, 2, 'cm') ?? null; } catch (e) { channel.cmError = String(e); }
      try { channel.inches = snowMetric?.convertNumber?.(raw, 3, 'in') ?? null; } catch (e) { channel.inchesError = String(e); }
      try { channel.metres = snowMetric?.convertNumber?.(raw, 3, 'm') ?? null; } catch (e) { channel.metresError = String(e); }
      out.channels.push(channel);
    });

    if (!channels.length) out.note = 'Interpolator returned no finite numeric channels.';
    return JSON.stringify(out, null, 2);
  }

  async function interpolatorSnapshot(lat: number, lon: number): Promise<{ text: string; decode: string; overlay: string | null }> {
    const overlay = safeStore('overlay');
    const product = safeStore('product');
    const level = safeStore('level');
    const timestamp = safeStore('timestamp');
    try {
      const interpolator = await getLatLonInterpolator();
      if (!interpolator) {
        const text = JSON.stringify({ overlay, product, level, timestamp, value: null, note: 'No interpolator available for currently loaded map data.' }, null, 2);
        return { text, decode: decodeSnow(null, overlay), overlay };
      }
      try {
        const value = await interpolator({ lat, lon } as any);
        return {
          text: JSON.stringify({ overlay, product, level, timestamp, value }, null, 2),
          decode: decodeSnow(value, overlay),
          overlay,
        };
      } catch (e) {
        const text = JSON.stringify({ overlay, product, level, timestamp, error: String(e) }, null, 2);
        return { text, decode: decodeSnow(null, overlay), overlay };
      }
    } catch (e) {
      const text = JSON.stringify({ overlay, product, level, timestamp, error: String(e) }, null, 2);
      return { text, decode: decodeSnow(null, overlay), overlay };
    }
  }

  async function inspect(lat: number, lon: number) {
    const mine = ++generation; loading = true; copied = false;
    try {
      const [pointPayload, elevation, interp] = await Promise.all([
        getMeteogramForecastData('ecmwf', { lat, lon, step: 1, days: 6 }),
        elevationAt(lat, lon),
        interpolatorSnapshot(lat, lon),
      ]);
      if (mine !== generation) return;
      const data = payloadData(pointPayload);
      const keys = Object.keys(data).sort();
      result = {
        lat, lon, elevation, overlay: interp.overlay,
        keys,
        snowRows: rowsFor(data, snowKey),
        precipRows: rowsFor(data, precipKey),
        storeText: storeSnapshot(),
        interpolatorText: interp.text,
        snowDecodeText: interp.decode,
      };
      console.group('Windy data inspector');
      console.log('Snowcover decode', JSON.parse(result.snowDecodeText));
      console.log('Interpolator', JSON.parse(result.interpolatorText));
      console.log('Store', JSON.parse(result.storeText));
      console.log('All point fields', keys);
      console.log('Raw point response', pointPayload);
      console.groupEnd();
    } catch (e) {
      if (mine !== generation) return;
      result = {
        lat, lon, elevation: null, overlay: safeStore('overlay'), keys: [], snowRows: [], precipRows: [],
        storeText: storeSnapshot(), interpolatorText: `Inspector failed: ${String(e)}`, snowDecodeText: `Inspector failed: ${String(e)}`,
      };
    } finally { if (mine === generation) loading = false; }
  }

  function latLon(value: any): [number, number] | null {
    const lat = Number(value?.lat ?? value?.latitude ?? value?.latlng?.lat);
    const lon = Number(value?.lon ?? value?.lng ?? value?.longitude ?? value?.latlng?.lng);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
  }

  function handleClick(value: any) { const p = latLon(value); if (p) void inspect(p[0], p[1]); }

  function reportText(): string {
    if (!result) return '';
    return [
      'WINDY DATA INSPECTOR',
      `Location: ${result.lat}, ${result.lon}`,
      `Elevation: ${result.elevation ?? 'unavailable'} m`,
      `Overlay: ${result.overlay ?? 'unknown'}`,
      '', 'SNOWCOVER DECODER', result.snowDecodeText,
      '', 'CURRENT MAP INTERPOLATOR', result.interpolatorText,
      '', 'STORE STATE', result.storeText,
      '', 'SNOW / DEPTH POINT FIELDS',
      ...(result.snowRows.length ? result.snowRows.map(r => `${r.key} | length=${r.length} | ${r.preview}`) : ['None']),
      '', 'PRECIPITATION POINT FIELDS',
      ...(result.precipRows.length ? result.precipRows.map(r => `${r.key} | length=${r.length} | ${r.preview}`) : ['None']),
      '', 'ALL POINT FORECAST FIELDS', ...result.keys,
    ].join('\n');
  }

  async function copyReport() {
    const text = reportText(); if (!text) return;
    try { await navigator.clipboard.writeText(text); copied = true; setTimeout(() => copied = false, 1600); } catch { copied = false; }
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
  .inspector { box-sizing:border-box; width:100%; max-width:100%; max-height:calc(100vh - 110px); overflow-y:auto; overflow-x:hidden; padding:10px; border-radius:10px; background:rgba(20,24,29,.97); color:white; box-shadow:0 8px 30px rgba(0,0,0,.45); font-family:Arial,sans-serif; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; min-width:0; }.head>div{min-width:0}.head b{display:block;font-size:15px;line-height:1.1}.head small{display:block;margin-top:3px;color:#84cbe9;font-size:8px}
  button { border:1px solid rgba(255,255,255,.16); border-radius:6px; background:rgba(255,255,255,.07); color:white; padding:5px 7px; cursor:pointer; font-size:9px; font-weight:700; flex-shrink:0; }
  .instructions,.status,.empty,.decoder-note { margin-top:8px; padding:7px; border-radius:7px; background:rgba(255,255,255,.045); color:rgba(255,255,255,.72); font-size:9px; line-height:1.25; }.hero{padding:20px 7px;text-align:center}.decoder-note{margin-top:0;margin-bottom:5px;color:rgba(255,255,255,.8)}
  .summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; margin-top:7px; }.summary span{min-width:0;padding:5px;border-radius:7px;background:rgba(255,255,255,.045);text-align:center}.summary small{display:block;color:rgba(255,255,255,.45);font-size:6.5px}.summary b{display:block;margin-top:2px;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  section { margin-top:9px; min-width:0; } section.important{padding:7px;border:1px solid rgba(142,223,255,.22);border-radius:8px;background:rgba(80,190,255,.045)} h3{margin:0 0 4px;color:#8edfff;font-size:9px;text-transform:uppercase;letter-spacing:.3px}
  .table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; } table{width:100%;min-width:300px;border-collapse:collapse;table-layout:fixed;font-size:7px}th,td{padding:4px 3px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left;vertical-align:top;word-break:break-all}th:nth-child(1),td:nth-child(1){width:32%}th:nth-child(2),td:nth-child(2){width:13%}
  pre { box-sizing:border-box; width:100%; max-width:100%; margin:0; padding:6px; border-radius:7px; background:#0d1217; color:#d5e2e9; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; font-size:7px; line-height:1.3; }
  .actions { position:sticky; bottom:0; display:flex; align-items:center; flex-wrap:wrap; gap:5px; margin-top:9px; padding:7px 0 2px; background:linear-gradient(180deg,rgba(20,24,29,0),rgba(20,24,29,.98) 30%); }.actions span{font-size:8px;color:#8de39a}
  @media(max-width:520px){.inspector{max-height:calc(100vh - 90px);padding:8px}.head b{font-size:14px}table{min-width:280px;font-size:6.7px}pre{font-size:6.7px}}
</style>
