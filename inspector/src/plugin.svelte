<div class="inspector">
  <div class="head">
    <div>
      <b>Windy data inspector</b>
      <small>ECMWF · point forecast vs meteogram vs renderer</small>
    </div>
    <button type="button" on:click={clear}>Clear</button>
  </div>

  <div class="instructions">
    Click/tap any map point. This version tests both <b>getPointForecastData()</b> and <b>getMeteogramForecastData()</b>, recursively scans every returned path for snow/depth fields, and also records the active map interpolator.
  </div>

  {#if loading}
    <div class="status">Testing ECMWF point APIs…</div>
  {:else if result}
    <div class="summary">
      <span><small>Location</small><b>{result.lat.toFixed(4)}, {result.lon.toFixed(4)}</b></span>
      <span><small>Elevation</small><b>{result.elevation !== null ? `${Math.round(result.elevation)} m` : '—'}</b></span>
      <span><small>Point paths</small><b>{result.pointPaths.length}</b></span>
      <span><small>Meteogram paths</small><b>{result.meteogramPaths.length}</b></span>
    </div>

    <section class="important">
      <div class="section-head"><h3>Snow-depth verdict</h3></div>
      {#if result.pointSnow.length}
        <div class="success">Possible snow/depth fields found in <b>getPointForecastData()</b>. Copy the report and send it back.</div>
        <pre>{rowsText(result.pointSnow)}</pre>
      {:else}
        <div class="empty">No snow/depth-named path found in <b>getPointForecastData()</b>.</div>
      {/if}
      {#if result.meteogramSnow.length}
        <div class="success secondary">Possible snow/depth fields found in <b>getMeteogramForecastData()</b>.</div>
        <pre>{rowsText(result.meteogramSnow)}</pre>
      {:else}
        <div class="empty compact">No snow/depth-named path found in the meteogram response.</div>
      {/if}
    </section>

    <section>
      <h3>Point forecast · snow/depth candidates</h3>
      <pre>{result.pointSnow.length ? rowsText(result.pointSnow) : 'None'}</pre>
    </section>

    <section>
      <h3>Point forecast · all recursive paths</h3>
      <pre>{rowsText(result.pointPaths)}</pre>
    </section>

    <section>
      <h3>Meteogram · snow/depth candidates</h3>
      <pre>{result.meteogramSnow.length ? rowsText(result.meteogramSnow) : 'None'}</pre>
    </section>

    <section>
      <h3>Meteogram · all recursive paths</h3>
      <pre>{rowsText(result.meteogramPaths)}</pre>
    </section>

    <section>
      <h3>Current map interpolator</h3>
      <pre>{result.interpolatorText}</pre>
    </section>

    <section>
      <h3>Map / store state</h3>
      <pre>{result.storeText}</pre>
    </section>

    <section>
      <h3>Point API status / top-level payload</h3>
      <pre>{result.pointTop}</pre>
    </section>

    <div class="actions">
      <button type="button" on:click={copyReport}>{copied ? 'Copied ✓' : 'Copy full report'}</button>
      <button type="button" on:click={downloadReport}>Save TXT</button>
    </div>
  {:else}
    <div class="empty hero">No point selected yet.</div>
  {/if}
</div>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import store from '@windy/store';
  import { singleclick } from '@windy/singleclick';
  import { getElevation, getMeteogramForecastData, getPointForecastData } from '@windy/fetch';
  import { getLatLonInterpolator } from '@windy/interpolator';
  import config from './pluginConfig';

  type PathRow = { path: string; kind: string; length: number; preview: string };
  type InspectorResult = {
    lat: number;
    lon: number;
    elevation: number | null;
    pointPaths: PathRow[];
    meteogramPaths: PathRow[];
    pointSnow: PathRow[];
    meteogramSnow: PathRow[];
    interpolatorText: string;
    storeText: string;
    pointTop: string;
  };

  let loading = false;
  let copied = false;
  let generation = 0;
  let result: InspectorResult | null = null;

  function safeStore(name: string): any {
    try { return store.get(name as any); } catch { return null; }
  }

  function preview(value: any): string {
    try {
      if (Array.isArray(value)) return JSON.stringify(value.slice(0, 12));
      if (value && typeof value === 'object' && typeof value.length === 'number') {
        const out: any[] = [];
        for (let i = 0; i < Math.min(12, Number(value.length)); i++) out.push(value[i]);
        return JSON.stringify(out);
      }
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      return String(text ?? value).slice(0, 300);
    } catch { return String(value).slice(0, 300); }
  }

  function flatten(value: any, root = 'payload', depth = 0, seen = new WeakSet<object>()): PathRow[] {
    if (depth > 10) return [{ path: root, kind: 'depth-limit', length: 0, preview: '' }];
    if (value == null || typeof value !== 'object') {
      return [{ path: root, kind: typeof value, length: 1, preview: preview(value) }];
    }

    if (Array.isArray(value) || typeof value.length === 'number') {
      const length = Number(value.length) || 0;
      return [{ path: root, kind: 'array', length, preview: preview(value) }];
    }

    if (seen.has(value)) return [{ path: root, kind: 'circular', length: 0, preview: '' }];
    seen.add(value);

    const keys = Object.keys(value);
    if (!keys.length) return [{ path: root, kind: 'object', length: 0, preview: '{}' }];
    const rows: PathRow[] = [];
    for (const key of keys) {
      const child = value[key];
      const path = `${root}.${key}`;
      if (child && typeof child === 'object' && !Array.isArray(child) && typeof child.length !== 'number') {
        rows.push(...flatten(child, path, depth + 1, seen));
      } else {
        const length = Array.isArray(child) || (child && typeof child === 'object' && typeof child.length === 'number') ? Number(child.length) || 0 : 1;
        rows.push({ path, kind: Array.isArray(child) ? 'array' : typeof child, length, preview: preview(child) });
      }
    }
    return rows;
  }

  function snowPath(row: PathRow): boolean {
    const p = row.path.toLowerCase();
    const exactish = /(^|[._-])(sd|sde|sdor|hsnow|snowd|snowdepth|snow_depth|snow-cover|snowcover)([._-]|$)/.test(p);
    return exactish || p.includes('snow') || p.includes('depth');
  }

  function rowsText(rows: PathRow[]): string {
    return rows.map(r => `${r.path} | ${r.kind} | n=${r.length} | ${r.preview}`).join('\n');
  }

  function storeSnapshot(): string {
    const names = ['overlay', 'product', 'level', 'timestamp', 'availLevels', 'pickerLocation'];
    const out: Record<string, unknown> = {};
    for (const name of names) {
      try { out[name] = store.get(name as any); } catch (e) { out[name] = `unavailable: ${String(e)}`; }
    }
    return JSON.stringify(out, null, 2);
  }

  async function elevationAt(lat: number, lon: number): Promise<number | null> {
    try {
      const payload: any = await getElevation(lat, lon);
      for (const candidate of [payload?.data, payload?.data?.data, payload?.value]) {
        const n = Number(candidate); if (Number.isFinite(n)) return n;
      }
    } catch {}
    return null;
  }

  async function interpolatorSnapshot(lat: number, lon: number): Promise<string> {
    const meta = { overlay: safeStore('overlay'), product: safeStore('product'), level: safeStore('level'), timestamp: safeStore('timestamp') };
    try {
      const interpolator = await getLatLonInterpolator();
      if (!interpolator) return JSON.stringify({ ...meta, value: null, note: 'No active interpolator.' }, null, 2);
      const value = await interpolator({ lat, lon } as any);
      return JSON.stringify({ ...meta, value }, null, 2);
    } catch (e) {
      return JSON.stringify({ ...meta, error: String(e) }, null, 2);
    }
  }

  function topSummary(payload: any): string {
    try {
      const out: any = {
        topLevelKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
        dataKeys: payload?.data && typeof payload.data === 'object' ? Object.keys(payload.data) : [],
        nestedDataKeys: payload?.data?.data && typeof payload.data.data === 'object' ? Object.keys(payload.data.data) : [],
        header: payload?.data?.header ?? payload?.header ?? null,
      };
      return JSON.stringify(out, null, 2);
    } catch (e) { return String(e); }
  }

  async function inspect(lat: number, lon: number) {
    const mine = ++generation;
    loading = true;
    copied = false;
    try {
      const pointPromise = getPointForecastData('ecmwf', { lat, lon, step: 1 } as any).catch((e: any) => ({ __error: String(e) } as any));
      const meteogramPromise = getMeteogramForecastData('ecmwf', { lat, lon, step: 1, days: 6 } as any).catch((e: any) => ({ __error: String(e) } as any));
      const [pointPayload, meteogramPayload, elevation, interpolatorText] = await Promise.all([
        pointPromise,
        meteogramPromise,
        elevationAt(lat, lon),
        interpolatorSnapshot(lat, lon),
      ]);
      if (mine !== generation) return;

      const pointPaths = flatten(pointPayload).sort((a, b) => a.path.localeCompare(b.path));
      const meteogramPaths = flatten(meteogramPayload).sort((a, b) => a.path.localeCompare(b.path));
      const pointSnow = pointPaths.filter(snowPath);
      const meteogramSnow = meteogramPaths.filter(snowPath);

      result = {
        lat, lon, elevation,
        pointPaths, meteogramPaths, pointSnow, meteogramSnow,
        interpolatorText,
        storeText: storeSnapshot(),
        pointTop: topSummary(pointPayload),
      };

      console.group('Windy snow-depth API probe');
      console.log('getPointForecastData raw', pointPayload);
      console.log('getPointForecastData snow candidates', pointSnow);
      console.log('getMeteogramForecastData raw', meteogramPayload);
      console.log('getMeteogramForecastData snow candidates', meteogramSnow);
      console.log('Interpolator', interpolatorText);
      console.groupEnd();
    } catch (e) {
      if (mine !== generation) return;
      const errorRow = { path: 'error', kind: 'error', length: 1, preview: String(e) };
      result = { lat, lon, elevation: null, pointPaths: [errorRow], meteogramPaths: [], pointSnow: [], meteogramSnow: [], interpolatorText: String(e), storeText: storeSnapshot(), pointTop: String(e) };
    } finally {
      if (mine === generation) loading = false;
    }
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
      'WINDY SNOW-DEPTH API PROBE',
      `Location: ${result.lat}, ${result.lon}`,
      `Elevation: ${result.elevation ?? 'unavailable'} m`,
      '', 'POINT FORECAST SNOW/DEPTH CANDIDATES', rowsText(result.pointSnow) || 'None',
      '', 'POINT FORECAST ALL RECURSIVE PATHS', rowsText(result.pointPaths),
      '', 'METEOGRAM SNOW/DEPTH CANDIDATES', rowsText(result.meteogramSnow) || 'None',
      '', 'METEOGRAM ALL RECURSIVE PATHS', rowsText(result.meteogramPaths),
      '', 'CURRENT MAP INTERPOLATOR', result.interpolatorText,
      '', 'STORE STATE', result.storeText,
      '', 'POINT API TOP-LEVEL SUMMARY', result.pointTop,
    ].join('\n');
  }

  async function writeClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
    const textarea = document.createElement('textarea');
    textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
    document.body.appendChild(textarea); textarea.focus(); textarea.select();
    const ok = document.execCommand('copy'); textarea.remove();
    if (!ok) throw new Error('Clipboard copy failed');
  }

  async function copyReport() {
    const text = reportText(); if (!text) return;
    try { await writeClipboard(text); copied = true; setTimeout(() => copied = false, 1800); } catch { copied = false; }
  }

  function downloadReport() {
    const text = reportText(); if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'windy-snow-depth-api-probe.txt';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function clear() { generation += 1; loading = false; result = null; copied = false; }

  onMount(() => singleclick.on(config.name, handleClick));
  onDestroy(() => { generation += 1; singleclick.off(config.name, handleClick); });
</script>

<style lang="less">
  .inspector { box-sizing:border-box; width:100%; max-width:100%; max-height:calc(100vh - 110px); overflow:auto; padding:10px; border-radius:10px; background:rgba(20,24,29,.97); color:white; box-shadow:0 8px 30px rgba(0,0,0,.45); font-family:Arial,sans-serif; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }.head b{display:block;font-size:15px}.head small{display:block;margin-top:3px;color:#84cbe9;font-size:8px}
  button { border:1px solid rgba(255,255,255,.16); border-radius:6px; background:rgba(255,255,255,.07); color:white; padding:5px 7px; cursor:pointer; font-size:9px; font-weight:700; }
  .instructions,.status,.empty,.success { margin-top:8px; padding:7px; border-radius:7px; background:rgba(255,255,255,.045); color:rgba(255,255,255,.72); font-size:9px; line-height:1.3; }.hero{padding:20px 7px;text-align:center}.success{color:#aaf0b5;border:1px solid rgba(141,227,154,.28);background:rgba(141,227,154,.07)}.success.secondary{margin-top:6px}.compact{margin-top:5px}
  .summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; margin-top:7px; }.summary span{padding:5px;border-radius:7px;background:rgba(255,255,255,.045);text-align:center}.summary small{display:block;color:rgba(255,255,255,.45);font-size:6.5px}.summary b{display:block;margin-top:2px;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  section { margin-top:9px; } section.important{padding:7px;border:1px solid rgba(142,223,255,.22);border-radius:8px;background:rgba(80,190,255,.045)} h3{margin:0 0 4px;color:#8edfff;font-size:9px;text-transform:uppercase;letter-spacing:.3px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:6px}
  pre { box-sizing:border-box; width:100%; margin:0; padding:6px; border-radius:7px; background:#0d1217; color:#d5e2e9; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; font-size:7px; line-height:1.3; }
  .actions { position:sticky; bottom:0; display:flex; gap:5px; margin-top:9px; padding:7px 0 2px; background:linear-gradient(180deg,rgba(20,24,29,0),rgba(20,24,29,.98) 30%); }
  @media(max-width:520px){.inspector{max-height:calc(100vh - 90px);padding:8px}.head b{font-size:14px}pre{font-size:6.6px}}
</style>
