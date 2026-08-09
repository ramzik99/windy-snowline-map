<div
  class="chart-shell"
  role="dialog"
  aria-modal="false"
  aria-label="Snow forecast graph"
  bind:this={chartShell}
  style={`left:${position.x}px;top:${position.y}px;transform:none;`}
>
  <div class="chart-head">
    <div class="chart-title">
      <b>Snow forecast</b>
      <small class="place-line">{placeName || 'Selected point'}</small>
      <small class="meta-line">{chart?.validLabel ?? 'ECMWF forecast'}</small>
    </div>
    <div class="chart-actions">
      <button class="png-button" type="button" aria-label="Save graph as PNG" title="Save PNG" on:click={downloadPng}>PNG</button>
      <button class="now-button" type="button" aria-label="Reset Windy timeline to now" title="Back to now" on:click={resetToNow}>Now</button>
      <button class="drag-button" type="button" aria-label="Drag snow forecast graph" title="Drag graph" on:pointerdown={startDrag}>↕</button>
      <button type="button" aria-label="Close snow forecast graph" title="Close" on:click={() => dispatch('close')}>×</button>
    </div>
  </div>

  {#if chart && chart.points}
    <div class="snowline-chart-legend">
      <span><i class="snowline-chart-key-line snowline-key"></i> Snowline</span>
      {#if chart.terrainY !== null}<span><i class="snowline-chart-key-line terrain-key"></i> Terrain</span>{/if}
      <span><i class="snowline-chart-key-line now-key"></i> Now</span>
      {#if crossing?.crossingTime}<span><i class="snowline-chart-key-cross"></i> Crossing</span>{/if}
      <span><i class="snowline-chart-key-bar"></i> Precipitation</span>
    </div>

    <div class="plot-wrap">
      <svg
        bind:this={svgEl}
        viewBox="0 0 360 270"
        role="img"
        aria-label="Snowline, terrain, precipitation and precipitation type through forecast time"
        on:pointermove={handlePlotPointer}
        on:pointerdown={handlePlotPointer}
        on:pointerleave={clearTooltip}
      >
        <text x="42" y="11" class="section-label">SNOWLINE ALTITUDE <tspan class="unit">m</tspan></text>
        <rect x="42" y="18" width="306" height="112" rx="8" class="plot-bg" />
        {#if chart.terrainY !== null}
          <rect x="42" y={chart.terrainY} width="306" height={Math.max(0, 130 - chart.terrainY)} class="snow-zone" />
          <line x1="42" x2="348" y1={chart.terrainY} y2={chart.terrainY} class="terrain-line" />
        {/if}
        <line x1="42" x2="348" y1="18" y2="18" class="grid" />
        <line x1="42" x2="348" y1="74" y2="74" class="grid" />
        <line x1="42" x2="348" y1="130" y2="130" class="grid" />
        <text x="37" y="22" text-anchor="end" class="axis">{chart.maxLabel}</text>
        <text x="37" y="78" text-anchor="end" class="axis">{chart.midLabel}</text>
        <text x="37" y="134" text-anchor="end" class="axis">{chart.minLabel}</text>
        <polyline points={chart.points} class="snowline-line" />

        <text x="42" y="147" class="section-label precip-label">PRECIPITATION <tspan class="unit">mm/3h</tspan></text>
        <rect x="42" y="153" width="306" height="34" rx="7" class="lower-bg" />
        {#if chart.hasPrecip}
          <text x="37" y="158" text-anchor="end" class="axis precip-axis">{chart.precipMaxLabel}</text>
          <text x="37" y="188" text-anchor="end" class="axis">0</text>
          {#each chart.precipBars as bar}
            <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="1.2" class:wet={bar.mm >= 1} class="precip-bar" />
          {/each}
        {:else}
          <text x="195" y="175" text-anchor="middle" class="empty-band">No measurable precipitation</text>
        {/if}

        <text x="42" y="202" class="section-label phase-label">PRECIPITATION TYPE <tspan class="unit">terrain vs snowline</tspan></text>
        <rect x="42" y="208" width="306" height="27" rx="7" class="phase-bg" />
        {#each chart.phaseBlocks as block}
          <rect x={block.x} y="209" width={block.width} height="25" rx="5" class={`phase-block phase-${block.kind}`} />
          <text x={block.x + block.width / 2} y="227" text-anchor="middle" class="phase-icon">{block.icon}</text>
        {/each}
        {#if !chart.phaseBlocks.length}
          <text x="195" y="226" text-anchor="middle" class="empty-band">No precipitation phase to classify</text>
        {/if}

        {#if chart.nowX !== null}
          <line x1={chart.nowX} x2={chart.nowX} y1="18" y2="235" class="now-line" />
          <rect x={Math.max(43, Math.min(322, chart.nowX - 13))} y="20" width="26" height="12" rx="3" class="now-tag-bg" />
          <text x={Math.max(56, Math.min(335, chart.nowX))} y="29" text-anchor="middle" class="now-tag">Now</text>
        {/if}

        {#if chart.currentX !== null && chart.currentY !== null}
          <line x1={chart.currentX} x2={chart.currentX} y1="18" y2="235" class="cursor" />
          <circle cx={chart.currentX} cy={chart.currentY} r="4.4" class="current-dot" />
        {/if}

        {#if chart.crossingX !== null && chart.terrainY !== null && crossing?.crossingTime}
          <line x1={chart.crossingX} x2={chart.crossingX} y1="34" y2="130" class="crossing-line crossing-action" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
          <circle cx={chart.crossingX} cy={chart.terrainY} r="5" class="crossing-dot crossing-action" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
        {/if}

        {#if tooltip}
          <line x1={tooltip.x} x2={tooltip.x} y1="18" y2="235" class="inspect-line" />
          {#if tooltip.snowlineY !== null}<circle cx={tooltip.x} cy={tooltip.snowlineY} r="3.8" class="inspect-dot" />{/if}
        {/if}

        <text x="42" y="261" text-anchor="start" class="axis">{chart.startLabel}</text>
        <text x="195" y="261" text-anchor="middle" class="axis">+72 h</text>
        <text x="348" y="261" text-anchor="end" class="axis">+144 h</text>
      </svg>

      {#if tooltip}
        <div class="plot-tooltip" style={`left:${tooltip.cssX}px;top:${tooltip.cssY}px;`}>
          <b>{tooltip.timeLabel}</b>
          <span>Snowline {tooltip.snowline !== null ? `${tooltip.snowline} m` : '—'}</span>
          {#if terrainM !== null}<span>Terrain {Math.round(terrainM / 10) * 10} m</span>{/if}
          {#if tooltip.terrainDifference !== null}<span>Terrain − snowline {tooltip.terrainDifference >= 0 ? '+' : ''}{tooltip.terrainDifference} m</span>{/if}
          <span>Precipitation {tooltip.precip !== null ? `${formatPrecipMm(tooltip.precip)} mm/3h` : '—'}</span>
          {#if tooltip.phase}<span class={`tooltip-phase phase-text-${tooltip.phase.kind}`}>{tooltip.phase.icon} {tooltip.phase.label}</span>{/if}
          {#if tooltip.tendency}<span>Snowline tendency {tooltip.tendency}</span>{/if}
        </div>
      {/if}
    </div>

    <div class="phase-legend">
      <span>❄ Snow ≥ snowline</span><span>🌨 Mix 0–100 m below</span><span>🌧 Rain &gt;100 m below</span><small>shown only with ≥0.1 mm/3h</small>
    </div>

    <div class="chart-foot with-depth">
      <span><small>Snowline</small><b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
      <span><small>Terrain Δ</small><b class:positive={chart.currentTerrainDifference !== null && chart.currentTerrainDifference > 0} class:negative={chart.currentTerrainDifference !== null && chart.currentTerrainDifference < 0}>{chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}</b></span>
      <span><small>Precip</small><b class:wet={chart.currentPrecip !== null && chart.currentPrecip >= 0.05}>{chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/3h` : '—'}</b></span>
      <span class="depth-card">
        <small>Snow depth</small>
        {#if snowDepthLayerActive}
          <b class="depth-value">{snowDepthLoading ? '…' : formatMapSnowDepthCm(currentSnowDepthCm)}</b>
        {:else}
          <button class="depth-layer-button" type="button" title="Switch Windy to Snow depth" aria-label="Switch Windy to Snow depth layer" on:click={openSnowDepthLayer}>Open layer</button>
        {/if}
      </span>
      <span class="phase-card"><small>Type</small><b>{chart.currentPhase ? `${chart.currentPhase.icon} ${chart.currentPhase.label}` : '—'}</b></span>
    </div>

    {#if snowDepthLayerActive}
      <div class="depth-note">Snow depth is read from Windy ECMWF Snow depth at the selected timestep.</div>
    {:else}
      <div class="depth-note muted">Tap <b>Open layer</b> to switch Windy to Snow depth and show the modelled depth here.</div>
    {/if}
    <div class="forecast-summary">{chart.phaseSummary}</div>
    {#if crossing?.summary}<div class="forecast-note">{crossing.summary}</div>{/if}
    <div class="hint">Tap the graph for exact values · crossing marker jumps to that time</div>
  {:else}
    <div class="empty">Snowline unavailable for this point.</div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';
  import { buildProfile, wetBulbZeroHeight } from './snowLevel';
  import { precipMmAt, formatPrecipMm } from './precip';
  import { terrainCrossingState } from './terrainCrossing';
  import { currentMapSnowDepthCm, formatMapSnowDepthCm } from './mapSnowDepth';

  export let point: any;
  export let terrainM: number | null = null;
  export let placeName = '';

  const dispatch = createEventDispatcher<{ close: void }>();
  const PHASE_PRECIP_THRESHOLD = 0.1;
  const MIX_BELOW_SNOWLINE_M = 100;

  let timestamp = Date.now();
  let realNow = Date.now();
  let timestampListener: number | null = null;
  let overlayListener: number | null = null;
  let productListener: number | null = null;
  let realNowTimer: ReturnType<typeof setInterval> | null = null;
  let snowDepthTimer: ReturnType<typeof setTimeout> | null = null;
  let snowDepthGeneration = 0;
  let currentSnowDepthCm: number | null = null;
  let snowDepthLayerActive = false;
  let snowDepthLoading = false;
  let chartShell: HTMLDivElement | null = null;
  let svgEl: SVGSVGElement | null = null;
  let position = { x: 24, y: 68 };
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let tooltip: TooltipData | null = null;

  type Bar = { x: number; y: number; width: number; height: number; mm?: number };
  type PhaseKind = 'snow' | 'mix' | 'rain';
  type Phase = { kind: PhaseKind; icon: string; label: string };
  type PhaseBlock = { x: number; width: number; kind: PhaseKind; icon: string };
  type TooltipData = { x: number; cssX: number; cssY: number; snowlineY: number | null; snowline: number | null; terrainDifference: number | null; precip: number | null; phase: Phase | null; tendency: string; timeLabel: string; };
  type ChartData = {
    points: string; terrainY: number | null; currentX: number | null; currentY: number | null; nowX: number | null; crossingX: number | null;
    minLabel: string; midLabel: string; maxLabel: string; startLabel: string; currentSnowline: number | null; currentTerrainDifference: number | null;
    currentPrecip: number | null; currentPhase: Phase | null; precipBars: Bar[]; hasPrecip: boolean;
    precipMaxLabel: string; minScale: number; maxScale: number; validLabel: string; currentIndex: number; phaseBlocks: PhaseBlock[]; phaseSummary: string;
  };

  $: crossing = terrainCrossingState(point, terrainM, timestamp);
  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);

  function nearestIndex(times: number[], target: number): number { let best = 0, distance = Infinity; times.forEach((time, index) => { const d = Math.abs(time - target); if (d < distance) { best = index; distance = d; } }); return best; }
  function snowlineAt(p: any, index: number): number | null { try { const result = wetBulbZeroHeight(buildProfile(p.forecast, index)); return result.snowLevelM !== null && Number.isFinite(result.snowLevelM) ? result.snowLevelM : null; } catch { return null; } }
  function phaseAt(p: any, terrain: number | null, index: number): Phase | null {
    if (terrain === null || !Number.isFinite(terrain)) return null;
    const precip = precipMmAt(p.forecast, index); if (precip === null || precip < PHASE_PRECIP_THRESHOLD) return null;
    const snowline = snowlineAt(p, index); if (snowline === null) return null;
    const delta = terrain - snowline;
    if (delta >= 0) return { kind: 'snow', icon: '❄', label: 'Snow' };
    if (delta >= -MIX_BELOW_SNOWLINE_M) return { kind: 'mix', icon: '🌨', label: 'Mix' };
    return { kind: 'rain', icon: '🌧', label: 'Rain' };
  }
  function tendencyAt(p: any, index: number): string { const now = snowlineAt(p, index); if (now === null || !p?.times?.length) return ''; const target = p.times[index] + 3 * 3600_000; if (target > p.times[p.times.length - 1] + 30 * 60_000) return ''; const next = nearestIndex(p.times, target); if (next === index) return ''; const future = snowlineAt(p, next); if (future === null) return ''; const delta = Math.round((future - now) / 10) * 10; if (Math.abs(delta) < 20) return 'steady'; return `${delta > 0 ? '↑' : '↓'}${Math.abs(delta)} m/3h`; }
  function formatDay(time: number): string { return new Date(time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }); }
  function formatTooltipTime(time: number): string { const d = new Date(time); const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }); const hh = String(d.getUTCHours()).padStart(2, '0'); return `${day} ${hh} UTC`; }
  function formatRun(time: number | null | undefined): string { if (!Number.isFinite(Number(time))) return 'ECMWF'; const d = new Date(Number(time)); const hh = String(d.getUTCHours()).padStart(2, '0'); return `ECMWF ${hh}Z`; }

  function clampPosition(x: number, y: number) { const rect = chartShell?.getBoundingClientRect(); const width = rect?.width ?? 430; const height = rect?.height ?? 490; return { x: Math.max(6, Math.min(window.innerWidth - width - 6, x)), y: Math.max(6, Math.min(window.innerHeight - height - 6, y)) }; }
  function startDrag(event: PointerEvent) { if (!chartShell) return; dragPointerId = event.pointerId; const rect = chartShell.getBoundingClientRect(); dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }; try { (event.currentTarget as HTMLElement)?.setPointerCapture(event.pointerId); } catch {} window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', stopDrag, { once: true }); event.preventDefault(); event.stopPropagation(); }
  function dragMove(event: PointerEvent) { if (dragPointerId !== event.pointerId) return; position = clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y); }
  function stopDrag(event: PointerEvent) { if (dragPointerId !== event.pointerId) return; dragPointerId = null; window.removeEventListener('pointermove', dragMove); }
  function setTimeline(time: number, warning: string) { if (!Number.isFinite(time)) return; try { (store as any).set('timestamp', time); timestamp = time; tooltip = null; } catch (e) { console.warn(warning, e); } }
  function jumpToCrossing(time: number) { setTimeline(time, 'Snow forecast could not jump Windy timeline to terrain crossing'); }
  function resetToNow() { if (!point || !Array.isArray(point.times) || !point.times.length) return; realNow = Date.now(); const idx = nearestIndex(point.times, realNow); setTimeline(point.times[idx], 'Snow forecast could not reset Windy timeline to now'); }
  function clearTooltip() { tooltip = null; }
  function safeFilename(value: string): string { const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return cleaned || 'selected-point'; }

  function updateSnowDepthLayerState(): boolean {
    try {
      const overlay = store.get('overlay');
      const product = store.get('product');
      snowDepthLayerActive = overlay === 'snowcover' && (!product || product === 'ecmwf');
    } catch { snowDepthLayerActive = false; }
    if (!snowDepthLayerActive) currentSnowDepthCm = null;
    return snowDepthLayerActive;
  }

  function openSnowDepthLayer() {
    try {
      try { (store as any).set('product', 'ecmwf'); } catch {}
      try { (store as any).set('level', 'surface'); } catch {}
      (store as any).set('overlay', 'snowcover');
      updateSnowDepthLayerState();
      scheduleCurrentSnowDepth(520);
    } catch (e) {
      console.warn('Snow forecast could not switch to Snow depth layer', e);
    }
  }

  function scheduleCurrentSnowDepth(delay = 260) {
    const myGeneration = ++snowDepthGeneration;
    if (snowDepthTimer) { clearTimeout(snowDepthTimer); snowDepthTimer = null; }
    if (!updateSnowDepthLayerState()) { snowDepthLoading = false; return; }
    snowDepthLoading = true;
    snowDepthTimer = setTimeout(async () => {
      snowDepthTimer = null;
      const lat = Number(point?.lat), lon = Number(point?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) { if (myGeneration === snowDepthGeneration) snowDepthLoading = false; return; }
      const value = await currentMapSnowDepthCm(lat, lon, timestamp);
      if (myGeneration !== snowDepthGeneration) return;
      currentSnowDepthCm = value;
      snowDepthLoading = false;
    }, delay);
  }

  function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, value: string, accent = '#ffffff') {
    ctx.fillStyle = '#151f26'; ctx.strokeStyle = '#263640'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 88, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#81909a'; ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y + 29);
    ctx.fillStyle = accent; ctx.font = '700 25px Arial'; ctx.fillText(value, x + w / 2, y + 62); ctx.textAlign = 'left';
  }

  async function savePngBlob(png: Blob, filename: string) {
    const isMobileLike = window.innerWidth <= 520 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isMobileLike && typeof navigator.share === 'function') {
      try {
        const file = new File([png], filename, { type: 'image/png' });
        const canShare = typeof (navigator as any).canShare !== 'function' || (navigator as any).canShare({ files: [file] });
        if (canShare) { await navigator.share({ files: [file], title: 'Snow forecast' }); return; }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.warn('Snow forecast mobile share failed; falling back to download', e);
      }
    }
    const pngUrl = URL.createObjectURL(png);
    const link = document.createElement('a'); link.href = pngUrl; link.download = filename; link.rel = 'noopener'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    if (isMobileLike) setTimeout(() => { try { window.open(pngUrl, '_blank', 'noopener'); } catch {} }, 80);
    setTimeout(() => URL.revokeObjectURL(pngUrl), 5000);
  }

  async function downloadPng() {
    if (!svgEl || !chart) return;
    try {
      let exportSnowDepth = currentSnowDepthCm;
      if (snowDepthLayerActive && exportSnowDepth === null) {
        const lat = Number(point?.lat), lon = Number(point?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          exportSnowDepth = await currentMapSnowDepthCm(lat, lon, timestamp);
          if (exportSnowDepth !== null) currentSnowDepthCm = exportSnowDepth;
        }
      }

      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', '1080'); clone.setAttribute('height', '810');
      clone.querySelectorAll('.inspect-line,.inspect-dot').forEach(node => node.remove());
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `.plot-bg{fill:#17222b;stroke:#344957;stroke-width:1}.lower-bg,.phase-bg{fill:#101920;stroke:#2b3d48;stroke-width:.8}.snow-zone{fill:#103746}.grid{stroke:#334752;stroke-width:1}.axis{fill:#b4c0c9;font-size:8px;font-family:Arial,sans-serif}.section-label{fill:#d8e4ec;font-size:7px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:.35px}.unit{fill:#8395a2;font-weight:400}.precip-label,.precip-axis{fill:#64d4f5}.phase-label{fill:#e8d86d}.terrain-line{stroke:#ffae56;stroke-width:1.5;stroke-dasharray:5 4}.snowline-line{fill:none;stroke:#65d5ff;stroke-width:2.6}.now-line{stroke:#ff6658;stroke-width:1.35}.now-tag-bg{fill:#ff6658}.now-tag{fill:#fff;font-size:7px;font-family:Arial,sans-serif;font-weight:800}.cursor{stroke:#dce7ee;stroke-width:1;stroke-dasharray:2 3}.current-dot{fill:#fff;stroke:#65d5ff;stroke-width:2.3}.crossing-line{stroke:#ffe05b;stroke-width:1.35;stroke-dasharray:3 3}.crossing-dot{fill:#12191f;stroke:#ffe05b;stroke-width:2.2}.precip-bar{fill:#3b90ac}.precip-bar.wet{fill:#5ec8e9}.phase-block{opacity:.28}.phase-snow{fill:#64d4f5}.phase-mix{fill:#d9d467}.phase-rain{fill:#678eff}.phase-icon{fill:#fff;font-size:10px;font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif}.empty-band{fill:#788793;font-size:7px;font-family:Arial,sans-serif}`;
      clone.insertBefore(style, clone.firstChild);
      const serialized = new XMLSerializer().serializeToString(clone); const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(svgBlob); const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('PNG image render failed')); image.src = url; });

      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1310; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#0d151b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = '700 42px Arial'; ctx.fillText('Snow forecast', 44, 58);
      ctx.fillStyle = '#d4dde4'; ctx.font = '23px Arial'; ctx.fillText(placeName || 'Selected point', 44, 94);
      ctx.fillStyle = '#86bcd4'; ctx.font = '19px Arial'; ctx.fillText(chart.validLabel, 44, 124);
      ctx.font = '18px Arial'; ctx.fillStyle = '#65d5ff'; ctx.fillText('— Snowline', 44, 158); ctx.fillStyle = '#ffae56'; ctx.fillText('– – Terrain', 200, 158); ctx.fillStyle = '#ff6658'; ctx.fillText('— Now', 350, 158); ctx.fillStyle = '#5ec8e9'; ctx.fillText('▮ Precipitation', 470, 158);
      ctx.drawImage(image, 0, 180, 1080, 810); URL.revokeObjectURL(url);

      ctx.fillStyle = '#dce6ec'; ctx.font = '700 20px Arial'; ctx.fillText('Precipitation type', 44, 1022);
      ctx.font = '19px Arial'; ctx.fillText('❄ Snow ≥ snowline   ·   🌨 Mix 0–100 m below   ·   🌧 Rain >100 m below', 44, 1054);
      ctx.fillStyle = '#7f909b'; ctx.font = '16px Arial'; ctx.fillText('Shown only when precipitation is ≥0.1 mm/3h', 44, 1081);

      const hasDepth = exportSnowDepth !== null;
      const cards = hasDepth ? 5 : 4;
      const cardGap = 10, cardW = (992 - (cards - 1) * cardGap) / cards, cardY = 1104;
      const delta = chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—';
      let cardIndex = 0;
      drawCard(ctx, 44 + cardIndex++ * (cardW + cardGap), cardY, cardW, 'Snowline', chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—', '#65d5ff');
      drawCard(ctx, 44 + cardIndex++ * (cardW + cardGap), cardY, cardW, 'Terrain Δ', delta, chart.currentTerrainDifference !== null && chart.currentTerrainDifference < 0 ? '#ffae56' : '#65d5ff');
      drawCard(ctx, 44 + cardIndex++ * (cardW + cardGap), cardY, cardW, 'Precip', chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/3h` : '—', '#65d5ff');
      if (hasDepth) drawCard(ctx, 44 + cardIndex++ * (cardW + cardGap), cardY, cardW, 'Snow depth', formatMapSnowDepthCm(exportSnowDepth), '#8de39a');
      drawCard(ctx, 44 + cardIndex * (cardW + cardGap), cardY, cardW, 'Type', chart.currentPhase ? `${chart.currentPhase.icon} ${chart.currentPhase.label}` : '—', '#ffffff');

      ctx.fillStyle = '#d8e4ec'; ctx.font = '700 20px Arial'; ctx.textAlign = 'center'; ctx.fillText(chart.phaseSummary, 540, 1222); ctx.textAlign = 'left';
      if (hasDepth) { ctx.fillStyle = '#8de39a'; ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.fillText('Snow depth: current Windy ECMWF Snow depth map value at the selected timestep.', 540, 1252); ctx.textAlign = 'left'; }
      if (crossing?.summary) { ctx.fillStyle = '#ffe05b'; ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.fillText(crossing.summary, 540, hasDepth ? 1280 : 1250); ctx.textAlign = 'left'; }
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
      await savePngBlob(png, `snow-forecast-${safeFilename(placeName || 'selected-point')}.png`);
    } catch (e) { console.warn('Snow forecast PNG export failed', e); }
  }

  function handlePlotPointer(event: PointerEvent) {
    if (!svgEl || !chart || !point?.times?.length) return;
    const rect = svgEl.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const vx = ((event.clientX - rect.left) / rect.width) * 360; if (vx < 42 || vx > 348) { tooltip = null; return; }
    const t0 = point.times[0], t1 = point.times[point.times.length - 1]; const target = t0 + ((vx - 42) / 306) * Math.max(1, t1 - t0); const idx = nearestIndex(point.times, target); const time = point.times[idx];
    const snowlineRaw = snowlineAt(point, idx), snowline = snowlineRaw !== null ? Math.round(snowlineRaw / 10) * 10 : null; const x = 42 + ((time - t0) / Math.max(1, t1 - t0)) * 306;
    const snowlineY = snowlineRaw !== null ? 130 - ((snowlineRaw - chart.minScale) / Math.max(1, chart.maxScale - chart.minScale)) * 112 : null;
    const precip = precipMmAt(point.forecast, idx); const terrainDifference = snowlineRaw !== null && terrainM !== null && Number.isFinite(terrainM) ? Math.round((terrainM - snowlineRaw) / 10) * 10 : null;
    const cssX = Math.max(82, Math.min(rect.width - 82, (x / 360) * rect.width)); const cssY = Math.max(8, Math.min(rect.height - 105, (snowlineY !== null ? (snowlineY / 270) * rect.height - 78 : 28)));
    tooltip = { x, cssX, cssY, snowlineY, snowline, terrainDifference, precip, phase: phaseAt(point, terrainM, idx), tendency: tendencyAt(point, idx), timeLabel: formatTooltipTime(time) };
  }

  function buildPhaseBlocks(p: any, terrain: number | null, x: (time: number) => number, spacing: number): PhaseBlock[] {
    const phases = p.times.map((_: number, i: number) => phaseAt(p, terrain, i)); const blocks: PhaseBlock[] = [];
    let start = -1; let kind: PhaseKind | null = null;
    for (let i = 0; i <= phases.length; i++) {
      const nextKind = i < phases.length ? phases[i]?.kind ?? null : null;
      if (nextKind !== kind) {
        if (kind !== null && start >= 0) {
          const end = i - 1; const x1 = Math.max(42, x(p.times[start]) - spacing * 0.46); const x2 = Math.min(348, x(p.times[end]) + spacing * 0.46);
          const icon = kind === 'snow' ? '❄' : kind === 'mix' ? '🌨' : '🌧'; blocks.push({ x: x1, width: Math.max(3, x2 - x1), kind, icon });
        }
        start = nextKind === null ? -1 : i; kind = nextKind;
      }
    }
    return blocks;
  }

  function phaseSummary(phases: (Phase | null)[]): string {
    const active = phases.filter((p): p is Phase => p !== null); if (!active.length) return 'Little or no precipitation to classify.';
    const counts = { snow: 0, mix: 0, rain: 0 }; active.forEach(p => counts[p.kind]++); const total = active.length;
    if (counts.snow / total >= 0.6) return 'Mostly snow when precipitation occurs.';
    if (counts.rain / total >= 0.6) return 'Mostly rain when precipitation occurs.';
    if (counts.mix / total >= 0.45) return 'Mixed precipitation is common just below the snowline.';
    if (counts.snow > 0 && counts.rain > 0) return 'A transition between rain and snow is forecast.';
    return 'Precipitation type varies through the forecast.';
  }

  function buildChart(p: any, terrain: number | null, target: number, crossingTime: number | null, realNowTime: number): ChartData | null {
    if (!p || !Array.isArray(p.times) || !p.times.length) return null;
    const entries = p.times.map((time: number, index: number) => ({ time, value: snowlineAt(p, index), index })).filter((item: any) => item.value !== null && Number.isFinite(item.value)); if (entries.length < 2) return null;
    const snowValues = entries.map((item: any) => Number(item.value)); const scaleValues = terrain !== null && Number.isFinite(terrain) ? [...snowValues, terrain] : snowValues;
    let min = Math.floor((Math.min(...scaleValues) - 150) / 100) * 100, max = Math.ceil((Math.max(...scaleValues) + 150) / 100) * 100; if (max - min < 600) { const mid = (max + min) / 2; min = Math.floor((mid - 300) / 100) * 100; max = Math.ceil((mid + 300) / 100) * 100; }
    const left = 42, right = 348, top = 18, bottom = 130, t0 = p.times[0], t1 = p.times[p.times.length - 1]; const x = (time: number) => left + ((time - t0) / Math.max(1, t1 - t0)) * (right - left); const y = (value: number) => bottom - ((value - min) / Math.max(1, max - min)) * (bottom - top);
    const points = entries.map((item: any) => `${x(item.time).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');
    const currentIndex = nearestIndex(p.times, target), currentTime = p.times[currentIndex], currentValue = snowlineAt(p, currentIndex), currentX = Number.isFinite(currentTime) ? x(currentTime) : null, currentY = currentValue !== null ? y(currentValue) : null;
    const currentTerrainDifference = currentValue !== null && terrain !== null && Number.isFinite(terrain) ? Math.round((terrain - currentValue) / 10) * 10 : null;
    const nowX = Number.isFinite(realNowTime) && realNowTime >= t0 && realNowTime <= t1 ? x(realNowTime) : null, terrainY = terrain !== null && Number.isFinite(terrain) ? Math.max(top, Math.min(bottom, y(terrain))) : null, crossingX = crossingTime !== null ? x(crossingTime) : null;
    const spacing = (right - left) / Math.max(1, p.times.length - 1), barWidth = Math.max(1.2, Math.min(5, spacing * 0.74));
    const precipValues = p.times.map((_: number, i: number) => precipMmAt(p.forecast, i)), currentPrecip = precipValues[currentIndex] ?? null; const validPrecip = precipValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)), precipMax = validPrecip.length ? Math.max(0.1, ...validPrecip) : 0;
    const precipBars: Bar[] = precipValues.map((mm: number | null, i: number) => { const value = mm ?? 0, height = precipMax > 0 ? Math.min(29, (value / precipMax) * 29) : 0; return { x: x(p.times[i]) - barWidth / 2, y: 187 - height, width: barWidth, height, mm: value }; }).filter(bar => bar.height > 0.12);
    const phases = p.times.map((_: number, i: number) => phaseAt(p, terrain, i)); const currentPhase = phases[currentIndex]; const phaseBlocks = buildPhaseBlocks(p, terrain, x, spacing);
    const validLabel = `Valid ${formatTooltipTime(currentTime)} · ${formatRun(p.runTime)}`;
    return { points, terrainY, currentX, currentY, nowX, crossingX, minLabel: `${Math.round(min)} m`, midLabel: `${Math.round((min + max) / 2)} m`, maxLabel: `${Math.round(max)} m`, startLabel: formatDay(t0), currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null, currentTerrainDifference, currentPrecip, currentPhase, precipBars, hasPrecip: validPrecip.some(v => v >= 0.05), precipMaxLabel: precipMax > 0 ? formatPrecipMm(precipMax) : '—', minScale: min, maxScale: max, validLabel, currentIndex, phaseBlocks, phaseSummary: phaseSummary(phases) };
  }

  onMount(() => {
    const width = Math.min(430, window.innerWidth - 20); position = { x: Math.max(6, (window.innerWidth - width) / 2), y: window.innerWidth <= 520 ? 36 : 54 };
    realNow = Date.now(); realNowTimer = setInterval(() => { realNow = Date.now(); }, 30_000);
    try {
      const current = store.get('timestamp'); if (typeof current === 'number' && Number.isFinite(current)) timestamp = current;
      timestampListener = store.on('timestamp', (value: any) => { const next = Number(value); if (Number.isFinite(next)) timestamp = next; scheduleCurrentSnowDepth(320); });
    } catch {}
    try { overlayListener = store.on('overlay', () => { updateSnowDepthLayerState(); scheduleCurrentSnowDepth(420); }); } catch {}
    try { productListener = store.on('product', () => { updateSnowDepthLayerState(); scheduleCurrentSnowDepth(420); }); } catch {}
    updateSnowDepthLayerState();
    scheduleCurrentSnowDepth(420);
  });

  onDestroy(() => {
    snowDepthGeneration += 1;
    if (snowDepthTimer) clearTimeout(snowDepthTimer);
    window.removeEventListener('pointermove', dragMove);
    if (realNowTimer) clearInterval(realNowTimer);
    if (timestampListener !== null) try { store.off(timestampListener); } catch {}
    if (overlayListener !== null) try { store.off(overlayListener); } catch {}
    if (productListener !== null) try { store.off(productListener); } catch {}
  });
</script>

<style lang="less">
  .chart-shell { position: fixed; z-index: 10020; width: min(430px, calc(100vw - 16px)); padding: 11px 12px 10px; border: 1px solid rgba(98,213,255,0.40); border-radius: 14px; background: linear-gradient(180deg, rgba(15,24,31,0.99), rgba(10,18,24,0.99)); color: white; box-shadow: 0 16px 42px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.035); backdrop-filter: blur(6px); }
  .chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 1px 1px 3px; }
  .chart-title { min-width: 0; flex: 1; } .chart-head b { display: block; font-size: 15px; line-height: 1.05; letter-spacing: .1px; }
  .chart-head small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .place-line { margin-top: 4px; max-width: 270px; color: rgba(255,255,255,0.78); font-size: 9px; } .meta-line { margin-top: 2px; max-width: 270px; color: rgba(120,206,241,0.82); font-size: 8px; }
  .chart-actions { display: flex; gap: 4px; flex-shrink: 0; } .chart-head button { height: 26px; min-width: 26px; padding: 0 7px; border: 1px solid rgba(255,255,255,0.07); border-radius: 7px; background: rgba(255,255,255,0.075); color: rgba(255,255,255,0.86); font-size: 14px; line-height: 24px; cursor: pointer; }
  .chart-head button:hover { background: rgba(98,213,255,0.15); border-color: rgba(98,213,255,0.30); color: white; } .png-button, .now-button { width: auto !important; font-size: 8.5px !important; font-weight: 800; } .drag-button { cursor: grab !important; touch-action: none; }
  .snowline-chart-legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 7px 3px 4px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.67); font-size: 7.7px; }
  .snowline-chart-legend span { display: inline-flex; align-items: center; gap: 4px; } .snowline-chart-key-line { width: 14px; height: 0; border-top: 2px solid; display: inline-block; }
  .snowline-key { border-color: #65d5ff; } .terrain-key { border-color: #ffae56; border-top-style: dashed; } .now-key { border-color: #ff6658; } .snowline-chart-key-cross { width: 7px; height: 7px; border-radius: 50%; border: 2px solid #ffe05b; display: inline-block; } .snowline-chart-key-bar { width: 12px; height: 7px; border-radius: 2px 2px 0 0; background: #5ec8e9; display: inline-block; }
  .plot-wrap { position: relative; } svg { display: block; width: 100%; height: auto; overflow: visible; touch-action: none; }
  .plot-bg { fill: rgba(255,255,255,0.028); stroke: rgba(104,151,177,0.25); stroke-width: 1; } .lower-bg, .phase-bg { fill: rgba(255,255,255,0.018); stroke: rgba(104,151,177,0.18); stroke-width: .8; } .snow-zone { fill: rgba(55,190,232,0.095); } .grid { stroke: rgba(160,196,216,0.13); stroke-width: 1; }
  .axis { fill: rgba(220,231,238,0.58); font-size: 8px; font-family: sans-serif; } .section-label { fill: rgba(226,236,243,0.82); font-size: 6.8px; font-family: sans-serif; font-weight: 800; letter-spacing: .35px; } .section-label .unit, .unit { fill: rgba(255,255,255,0.42); font-weight: 500; letter-spacing: 0; } .precip-label, .precip-axis { fill: #64d4f5; } .phase-label { fill: #e8d86d; }
  .terrain-line { stroke: #ffae56; stroke-width: 1.5; stroke-dasharray: 5 4; opacity: .93; } .snowline-line { fill: none; stroke: #65d5ff; stroke-width: 2.7; stroke-linecap: round; stroke-linejoin: round; }
  .now-line { stroke: #ff6658; stroke-width: 1.35; opacity: .9; } .now-tag-bg { fill: #ff6658; } .now-tag { fill: #fff; font-size: 7px; font-family: sans-serif; font-weight: 800; } .cursor { stroke: rgba(235,243,248,0.60); stroke-width: 1; stroke-dasharray: 2 3; } .current-dot { fill: #fff; stroke: #65d5ff; stroke-width: 2.3; }
  .crossing-line { stroke: rgba(255,224,91,0.82); stroke-width: 1.35; stroke-dasharray: 3 3; } .crossing-dot { fill: #12191f; stroke: #ffe05b; stroke-width: 2.2; } .crossing-action { cursor: pointer; pointer-events: stroke; } .crossing-dot.crossing-action { pointer-events: all; }
  .inspect-line { stroke: rgba(255,255,255,0.34); stroke-width: 1; } .inspect-dot { fill: #12191f; stroke: white; stroke-width: 1.6; }
  .precip-bar { fill: rgba(70,176,210,0.50); } .precip-bar.wet { fill: #5ec8e9; }
  .phase-block { opacity: .30; } .phase-snow { fill: #64d4f5; } .phase-mix { fill: #d9d467; } .phase-rain { fill: #678eff; } .phase-icon { fill: white; font-size: 10px; font-family: 'Segoe UI Emoji','Apple Color Emoji',sans-serif; } .empty-band { fill: rgba(255,255,255,.36); font-size: 7px; font-family: sans-serif; }
  .plot-tooltip { position: absolute; z-index: 4; min-width: 164px; transform: translateX(-50%); padding: 7px 9px; border-radius: 8px; background: rgba(5,12,17,0.985); border: 1px solid rgba(98,213,255,0.28); box-shadow: 0 7px 20px rgba(0,0,0,0.44); pointer-events: none; }
  .plot-tooltip b, .plot-tooltip span { display: block; white-space: nowrap; } .plot-tooltip b { font-size: 8.9px; color: white; margin-bottom: 2px; } .plot-tooltip span { margin-top: 1px; font-size: 7.8px; color: rgba(255,255,255,0.75); } .tooltip-phase { margin-top: 3px !important; font-weight: 800; } .phase-text-snow { color: #74dcff !important; } .phase-text-mix { color: #e8df73 !important; } .phase-text-rain { color: #8caaff !important; }
  .phase-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; margin: 2px 3px 6px; color: rgba(255,255,255,.72); font-size: 7.4px; } .phase-legend span { white-space: nowrap; } .phase-legend small { color: rgba(255,255,255,.35); font-size: 6.7px; }
  .chart-foot { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 2px; } .chart-foot.with-depth { grid-template-columns: repeat(5, 1fr); }
  .chart-foot span { padding: 6px 2px 5px; border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; background: rgba(255,255,255,0.043); text-align: center; min-width: 0; } .chart-foot small { display: block; color: rgba(255,255,255,0.45); font-size: 6.2px; } .chart-foot b { display: block; margin-top: 1px; color: white; font-size: 7.8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .chart-foot b.positive { color: #65d5ff; } .chart-foot b.negative { color: #ffae56; } .chart-foot b.wet { color: #65d5ff; } .chart-foot b.depth-value { color: #8de39a; } .phase-card b { font-size: 7.4px; }
  .depth-card { display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .depth-layer-button { margin-top:2px; min-width:0; padding:2px 6px; border:1px solid rgba(141,227,154,.45); border-radius:5px; background:rgba(141,227,154,.10); color:#8de39a; font-size:6.7px; line-height:1.2; font-weight:800; cursor:pointer; white-space:nowrap; }
  .depth-layer-button:hover { background:rgba(141,227,154,.20); border-color:rgba(141,227,154,.75); color:#b6f1bf; }
  .depth-note { margin-top: 4px; color: rgba(141,227,154,.72); font-size: 6.7px; line-height: 1.2; text-align: center; } .depth-note.muted { color:rgba(255,255,255,.40); } .depth-note b { color:#8de39a; }
  .forecast-summary { margin-top: 6px; padding: 5px 7px; border-radius: 7px; background: rgba(98,213,255,0.065); border: 1px solid rgba(98,213,255,0.10); color: rgba(224,239,247,0.86); font-size: 7.8px; font-weight: 700; text-align: center; }
  .forecast-note { margin-top: 4px; padding: 3px 6px; border-radius: 6px; background: rgba(255,224,91,0.055); color: rgba(255,224,91,0.86); font-size: 7.4px; text-align: center; } .hint { margin-top: 4px; color: rgba(255,255,255,0.32); font-size: 6.8px; text-align: center; } .empty { padding: 22px 8px 16px; text-align: center; color: rgba(255,255,255,0.62); font-size: 10px; }
  @media (max-width: 520px) { .chart-shell { width: calc(100vw - 12px); padding: 9px; border-radius: 12px; } .place-line, .meta-line { max-width: 175px; } .plot-tooltip { min-width: 142px; } .chart-head button { padding: 0 5px; } .chart-foot { gap: 3px; } .chart-foot.with-depth { grid-template-columns: repeat(5, minmax(0, 1fr)); } .chart-foot small { font-size: 5.4px; } .chart-foot b { font-size: 6.7px; } .depth-layer-button { font-size:5.8px; padding:2px 4px; } .phase-legend { gap: 4px 7px; } }
</style>
