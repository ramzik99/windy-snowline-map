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
      <button class="png-button" type="button" aria-label="Download graph as PNG" title="Download PNG" on:click={downloadPng}>PNG</button>
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
      {#if chart.hasPrecip}<span><i class="snowline-chart-key-bar"></i> Precipitation</span>{/if}
      {#if chart.hasSnowDepth}<span><i class="snowline-chart-key-depth"></i> Snow depth</span>{/if}
    </div>

    <div class="plot-wrap">
      <svg
        bind:this={svgEl}
        viewBox="0 0 360 254"
        role="img"
        aria-label="Snowline, terrain, precipitation and modelled snow depth through forecast time"
        on:pointermove={handlePlotPointer}
        on:pointerdown={handlePlotPointer}
        on:pointerleave={clearTooltip}
      >
        <!-- Altitude -->
        <rect x="42" y="20" width="306" height="120" rx="8" class="plot-bg" />
        {#if chart.terrainY !== null}
          <rect x="42" y={chart.terrainY} width="306" height={Math.max(0, 140 - chart.terrainY)} class="snow-zone" />
          <line x1="42" x2="348" y1={chart.terrainY} y2={chart.terrainY} class="terrain-line" />
        {/if}
        <line x1="42" x2="348" y1="20" y2="20" class="grid" />
        <line x1="42" x2="348" y1="80" y2="80" class="grid" />
        <line x1="42" x2="348" y1="140" y2="140" class="grid" />
        <text x="37" y="24" text-anchor="end" class="axis">{chart.maxLabel}</text>
        <text x="37" y="84" text-anchor="end" class="axis">{chart.midLabel}</text>
        <text x="37" y="144" text-anchor="end" class="axis">{chart.minLabel}</text>
        <text x="48" y="33" class="panel-label">SNOWLINE ALTITUDE · m</text>
        <polyline points={chart.points} class="snowline-line" />

        <!-- Precipitation -->
        <rect x="42" y="154" width="306" height="34" rx="7" class="lower-bg" />
        <text x="48" y="165" class="panel-label precip-label">PRECIPITATION · mm/3h</text>
        {#if chart.hasPrecip}
          <text x="37" y="165" text-anchor="end" class="axis precip-axis">{chart.precipMaxLabel}</text>
          <text x="37" y="189" text-anchor="end" class="axis">0</text>
          {#each chart.precipBars as bar}
            <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="1.2" class:wet={bar.mm >= 1} class="precip-bar" />
          {/each}
        {:else}
          <text x="195" y="177" text-anchor="middle" class="empty-band">No precipitation data</text>
        {/if}

        <!-- Snow depth -->
        <rect x="42" y="198" width="306" height="34" rx="7" class="lower-bg" />
        <text x="48" y="209" class="panel-label depth-label">MODELLED SNOW DEPTH · cm</text>
        {#if chart.hasSnowDepthSeries}
          <text x="37" y="209" text-anchor="end" class="axis depth-axis">{chart.snowDepthMaxLabel}</text>
          <text x="37" y="233" text-anchor="end" class="axis">0</text>
          <polyline points={chart.snowDepthPoints} class="snow-depth-line" />
        {:else if chart.currentSnowDepth !== null}
          <circle cx={chart.currentX ?? 195} cy="221" r="4.5" class="map-depth-dot" />
          <text x="195" y="225" text-anchor="middle" class="map-depth-text">{formatSnowDepthCm(chart.currentSnowDepth)} cm at selected time · Windy map</text>
        {:else}
          <text x="195" y="221" text-anchor="middle" class="empty-band">Snow-depth time series unavailable</text>
        {/if}

        <!-- Time markers -->
        {#if chart.nowX !== null}
          <line x1={chart.nowX} x2={chart.nowX} y1="38" y2="232" class="now-line" />
          <rect x={Math.max(43, Math.min(322, chart.nowX - 13))} y="39" width="26" height="12" rx="3" class="now-tag-bg" />
          <text x={Math.max(56, Math.min(335, chart.nowX))} y="48" text-anchor="middle" class="now-tag">Now</text>
        {/if}

        {#if chart.currentX !== null && chart.currentY !== null}
          <line x1={chart.currentX} x2={chart.currentX} y1="38" y2="232" class="cursor" />
          <circle cx={chart.currentX} cy={chart.currentY} r="4.4" class="current-dot" />
        {/if}

        {#if chart.crossingX !== null && chart.terrainY !== null && crossing?.crossingTime}
          <line x1={chart.crossingX} x2={chart.crossingX} y1="38" y2="140" class="crossing-line crossing-action" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
          <circle cx={chart.crossingX} cy={chart.terrainY} r="5" class="crossing-dot crossing-action" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
        {/if}

        {#if tooltip}
          <line x1={tooltip.x} x2={tooltip.x} y1="38" y2="232" class="inspect-line" />
          {#if tooltip.snowlineY !== null}<circle cx={tooltip.x} cy={tooltip.snowlineY} r="3.8" class="inspect-dot" />{/if}
        {/if}

        <text x="42" y="249" text-anchor="start" class="axis">{chart.startLabel}</text>
        <text x="195" y="249" text-anchor="middle" class="axis">+72 h</text>
        <text x="348" y="249" text-anchor="end" class="axis">+144 h</text>
      </svg>

      {#if tooltip}
        <div class="plot-tooltip" style={`left:${tooltip.cssX}px;top:${tooltip.cssY}px;`}>
          <b>{tooltip.timeLabel}</b>
          <span>Snowline {tooltip.snowline !== null ? `${tooltip.snowline} m` : '—'}</span>
          {#if terrainM !== null}<span>Terrain {Math.round(terrainM / 10) * 10} m</span>{/if}
          {#if tooltip.terrainDifference !== null}<span>Terrain − snowline {tooltip.terrainDifference >= 0 ? '+' : ''}{tooltip.terrainDifference} m</span>{/if}
          <span>Precipitation {tooltip.precip !== null ? `${formatPrecipMm(tooltip.precip)} mm/3h` : '—'}</span>
          <span>Snow depth {tooltip.snowDepth !== null ? `${formatSnowDepthCm(tooltip.snowDepth)} cm` : '—'}</span>
          {#if tooltip.tendency}<span>Snowline tendency {tooltip.tendency}</span>{/if}
        </div>
      {/if}
    </div>

    <div class="chart-foot">
      <span><small>Snowline</small><b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
      <span><small>Terrain Δ</small><b class:positive={chart.currentTerrainDifference !== null && chart.currentTerrainDifference > 0} class:negative={chart.currentTerrainDifference !== null && chart.currentTerrainDifference < 0}>{chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}</b></span>
      <span><small>Precip</small><b class:wet={chart.currentPrecip !== null && chart.currentPrecip >= 0.05}>{chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/3h` : '—'}</b></span>
      <span><small>Snow depth</small><b class="depth-value">{chart.currentSnowDepth !== null ? `${formatSnowDepthCm(chart.currentSnowDepth)} cm` : '—'}</b></span>
    </div>

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
  import { snowDepthCmAt, formatSnowDepthCm } from './snowDepth';
  import { currentMapSnowDepthCm } from './mapSnowDepth';
  import { terrainCrossingState } from './terrainCrossing';

  export let point: any;
  export let terrainM: number | null = null;
  export let placeName = '';

  const dispatch = createEventDispatcher<{ close: void }>();
  let timestamp = Date.now();
  let realNow = Date.now();
  let mapDepthCm: number | null = null;
  let mapDepthGeneration = 0;
  let timestampListener: number | null = null;
  let overlayListener: number | null = null;
  let realNowTimer: ReturnType<typeof setInterval> | null = null;
  let chartShell: HTMLDivElement | null = null;
  let svgEl: SVGSVGElement | null = null;
  let position = { x: 24, y: 68 };
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let tooltip: TooltipData | null = null;

  type PrecipBar = { x: number; y: number; width: number; height: number; mm: number };
  type TooltipData = { x: number; cssX: number; cssY: number; snowlineY: number | null; snowline: number | null; terrainDifference: number | null; precip: number | null; snowDepth: number | null; tendency: string; timeLabel: string; };
  type ChartData = {
    points: string; terrainY: number | null; currentX: number | null; currentY: number | null; nowX: number | null; crossingX: number | null;
    minLabel: string; midLabel: string; maxLabel: string; startLabel: string; currentSnowline: number | null; currentTerrainDifference: number | null;
    currentPrecip: number | null; currentSnowDepth: number | null; precipBars: PrecipBar[]; hasPrecip: boolean; snowDepthPoints: string; hasSnowDepth: boolean; hasSnowDepthSeries: boolean;
    precipMaxLabel: string; snowDepthMaxLabel: string; minScale: number; maxScale: number; validLabel: string; currentIndex: number;
  };

  $: crossing = terrainCrossingState(point, terrainM, timestamp);
  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow, mapDepthCm);

  function nearestIndex(times: number[], target: number): number { let best = 0, distance = Infinity; times.forEach((time, index) => { const d = Math.abs(time - target); if (d < distance) { best = index; distance = d; } }); return best; }
  function snowlineAt(p: any, index: number): number | null { try { const result = wetBulbZeroHeight(buildProfile(p.forecast, index)); return result.snowLevelM !== null && Number.isFinite(result.snowLevelM) ? result.snowLevelM : null; } catch { return null; } }
  function tendencyAt(p: any, index: number): string { const now = snowlineAt(p, index); if (now === null || !p?.times?.length) return ''; const target = p.times[index] + 3 * 3600_000; if (target > p.times[p.times.length - 1] + 30 * 60_000) return ''; const next = nearestIndex(p.times, target); if (next === index) return ''; const future = snowlineAt(p, next); if (future === null) return ''; const delta = Math.round((future - now) / 10) * 10; if (Math.abs(delta) < 20) return 'steady'; return `${delta > 0 ? '↑' : '↓'}${Math.abs(delta)} m/3h`; }
  function formatDay(time: number): string { return new Date(time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }); }
  function formatTooltipTime(time: number): string { const d = new Date(time); const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }); const hh = String(d.getUTCHours()).padStart(2, '0'); return `${day} ${hh} UTC`; }
  function formatRun(time: number | null | undefined): string { if (!Number.isFinite(Number(time))) return 'ECMWF'; const d = new Date(Number(time)); const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); const hh = String(d.getUTCHours()).padStart(2, '0'); return `ECMWF ${day} ${hh}Z`; }

  async function refreshMapDepth() {
    const generation = ++mapDepthGeneration;
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) { mapDepthCm = null; return; }
    const value = await currentMapSnowDepthCm(point.lat, point.lon);
    if (generation === mapDepthGeneration) mapDepthCm = value;
  }

  function clampPosition(x: number, y: number) { const rect = chartShell?.getBoundingClientRect(); const width = rect?.width ?? 410; const height = rect?.height ?? 390; return { x: Math.max(6, Math.min(window.innerWidth - width - 6, x)), y: Math.max(6, Math.min(window.innerHeight - height - 6, y)) }; }
  function startDrag(event: PointerEvent) { if (!chartShell) return; dragPointerId = event.pointerId; const rect = chartShell.getBoundingClientRect(); dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }; try { (event.currentTarget as HTMLElement)?.setPointerCapture(event.pointerId); } catch {} window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', stopDrag, { once: true }); event.preventDefault(); event.stopPropagation(); }
  function dragMove(event: PointerEvent) { if (dragPointerId !== event.pointerId) return; position = clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y); }
  function stopDrag(event: PointerEvent) { if (dragPointerId !== event.pointerId) return; dragPointerId = null; window.removeEventListener('pointermove', dragMove); }
  function setTimeline(time: number, warning: string) { if (!Number.isFinite(time)) return; try { (store as any).set('timestamp', time); timestamp = time; tooltip = null; setTimeout(() => void refreshMapDepth(), 120); } catch (e) { console.warn(warning, e); } }
  function jumpToCrossing(time: number) { setTimeline(time, 'Snow forecast could not jump Windy timeline to terrain crossing'); }
  function resetToNow() { if (!point || !Array.isArray(point.times) || !point.times.length) return; realNow = Date.now(); const idx = nearestIndex(point.times, realNow); setTimeline(point.times[idx], 'Snow forecast could not reset Windy timeline to now'); }
  function clearTooltip() { tooltip = null; }
  function safeFilename(value: string): string { const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return cleaned || 'selected-point'; }

  async function downloadPng() {
    if (!svgEl || !chart) return;
    try {
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '1080');
      clone.setAttribute('height', '762');
      clone.querySelectorAll('.inspect-line,.inspect-dot').forEach(node => node.remove());
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `.plot-bg{fill:#171d24;stroke:#3a4652;stroke-width:1}.lower-bg{fill:#11171d;stroke:#2d3944;stroke-width:.8}.snow-zone{fill:#0d3342}.grid{stroke:#36414b;stroke-width:1}.axis{fill:#aeb8c3;font-size:8px;font-family:Arial,sans-serif}.panel-label{fill:#d6dee6;font-size:7px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:.35px}.precip-label,.precip-axis{fill:#62d2f4}.depth-label,.depth-axis{fill:#8bdc92}.terrain-line{stroke:#ffad55;stroke-width:1.4;stroke-dasharray:5 4}.snowline-line{fill:none;stroke:#66d4ff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}.now-line{stroke:#ff6658;stroke-width:1.4}.now-tag-bg{fill:#ff6658}.now-tag{fill:#fff;font-size:7px;font-family:Arial,sans-serif;font-weight:800}.cursor{stroke:#dce5ee;stroke-width:1;stroke-dasharray:2 3}.current-dot{fill:#fff;stroke:#66d4ff;stroke-width:2.2}.crossing-line{stroke:#ffe05b;stroke-width:1.4;stroke-dasharray:3 3}.crossing-dot{fill:#151b20;stroke:#ffe05b;stroke-width:2.2}.precip-bar{fill:#327d98}.precip-bar.wet{fill:#58c6e8}.snow-depth-line{fill:none;stroke:#8bdc92;stroke-width:1.9}.map-depth-dot{fill:#8bdc92;stroke:#102018;stroke-width:1}.map-depth-text{fill:#8bdc92;font-size:7px;font-family:Arial,sans-serif}.empty-band{fill:#7f8994;font-size:7px;font-family:Arial,sans-serif}`;
      clone.insertBefore(style, clone.firstChild);
      const serialized = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('PNG image render failed')); image.src = url; });

      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1010;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#10161c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff'; ctx.font = '700 40px Arial, sans-serif'; ctx.fillText('Snow forecast', 44, 54);
      ctx.fillStyle = '#d3dbe4'; ctx.font = '22px Arial, sans-serif'; ctx.fillText(placeName || 'Selected point', 44, 88);
      ctx.fillStyle = '#8f9ba7'; ctx.font = '19px Arial, sans-serif'; ctx.fillText(chart.validLabel, 44, 118);
      ctx.font = '17px Arial, sans-serif'; ctx.fillText('Snowline  ·  Terrain  ·  Precipitation  ·  Modelled snow depth', 44, 150);
      ctx.drawImage(image, 0, 166, 1080, 762);
      ctx.fillStyle = '#d3dbe4'; ctx.font = '700 18px Arial, sans-serif';
      const depthText = chart.currentSnowDepth !== null ? `${formatSnowDepthCm(chart.currentSnowDepth)} cm` : '—';
      ctx.fillText(`Selected: Snowline ${chart.currentSnowline ?? '—'} m   ·   Terrain Δ ${chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}   ·   Precip ${chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/3h` : '—'}   ·   Snow depth ${depthText}`, 44, 958);
      if (crossing?.summary) { ctx.fillStyle = '#e6cf5c'; ctx.font = '16px Arial, sans-serif'; ctx.fillText(crossing.summary, 44, 982); }
      ctx.fillStyle = '#76828e'; ctx.font = '14px Arial, sans-serif'; ctx.fillText('Snowline is a thermal boundary; local snowfall and accumulation may differ.', 44, 1002);
      URL.revokeObjectURL(url);

      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
      const pngUrl = URL.createObjectURL(png); const link = document.createElement('a'); link.href = pngUrl; link.download = `snow-forecast-${safeFilename(placeName || 'selected-point')}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    } catch (e) { console.warn('Snow forecast PNG export failed', e); }
  }

  function handlePlotPointer(event: PointerEvent) {
    if (!svgEl || !chart || !point?.times?.length) return;
    const rect = svgEl.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const vx = ((event.clientX - rect.left) / rect.width) * 360; if (vx < 42 || vx > 348) { tooltip = null; return; }
    const t0 = point.times[0], t1 = point.times[point.times.length - 1]; const target = t0 + ((vx - 42) / 306) * Math.max(1, t1 - t0); const idx = nearestIndex(point.times, target); const time = point.times[idx];
    const snowlineRaw = snowlineAt(point, idx), snowline = snowlineRaw !== null ? Math.round(snowlineRaw / 10) * 10 : null; const x = 42 + ((time - t0) / Math.max(1, t1 - t0)) * 306;
    const snowlineY = snowlineRaw !== null ? 140 - ((snowlineRaw - chart.minScale) / Math.max(1, chart.maxScale - chart.minScale)) * 120 : null;
    const precip = precipMmAt(point.forecast, idx); const directDepth = snowDepthCmAt(point.forecast, idx); const snowDepth = idx === chart.currentIndex && directDepth === null ? mapDepthCm : directDepth;
    const terrainDifference = snowlineRaw !== null && terrainM !== null && Number.isFinite(terrainM) ? Math.round((terrainM - snowlineRaw) / 10) * 10 : null;
    const cssX = Math.max(78, Math.min(rect.width - 78, (x / 360) * rect.width)); const cssY = Math.max(8, Math.min(rect.height - 110, (snowlineY !== null ? (snowlineY / 254) * rect.height - 82 : 26)));
    tooltip = { x, cssX, cssY, snowlineY, snowline, terrainDifference, precip, snowDepth, tendency: tendencyAt(point, idx), timeLabel: formatTooltipTime(time) };
  }

  function buildChart(p: any, terrain: number | null, target: number, crossingTime: number | null, realNowTime: number, fallbackDepth: number | null): ChartData | null {
    if (!p || !Array.isArray(p.times) || !p.times.length) return null;
    const entries = p.times.map((time: number, index: number) => ({ time, value: snowlineAt(p, index), index })).filter((item: any) => item.value !== null && Number.isFinite(item.value)); if (entries.length < 2) return null;
    const snowValues = entries.map((item: any) => Number(item.value)); const scaleValues = terrain !== null && Number.isFinite(terrain) ? [...snowValues, terrain] : snowValues;
    let min = Math.floor((Math.min(...scaleValues) - 150) / 100) * 100, max = Math.ceil((Math.max(...scaleValues) + 150) / 100) * 100; if (max - min < 600) { const mid = (max + min) / 2; min = Math.floor((mid - 300) / 100) * 100; max = Math.ceil((mid + 300) / 100) * 100; }
    const left = 42, right = 348, top = 20, bottom = 140, t0 = p.times[0], t1 = p.times[p.times.length - 1]; const x = (time: number) => left + ((time - t0) / Math.max(1, t1 - t0)) * (right - left); const y = (value: number) => bottom - ((value - min) / Math.max(1, max - min)) * (bottom - top);
    const points = entries.map((item: any) => `${x(item.time).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');

    const currentIndex = nearestIndex(p.times, target), currentTime = p.times[currentIndex], currentValue = snowlineAt(p, currentIndex), currentX = Number.isFinite(currentTime) ? x(currentTime) : null, currentY = currentValue !== null ? y(currentValue) : null;
    const currentTerrainDifference = currentValue !== null && terrain !== null && Number.isFinite(terrain) ? Math.round((terrain - currentValue) / 10) * 10 : null;
    const nowX = Number.isFinite(realNowTime) && realNowTime >= t0 && realNowTime <= t1 ? x(realNowTime) : null, terrainY = terrain !== null && Number.isFinite(terrain) ? Math.max(top, Math.min(bottom, y(terrain))) : null, crossingX = crossingTime !== null ? x(crossingTime) : null;

    const precipValues = p.times.map((_: number, index: number) => precipMmAt(p.forecast, index)), currentPrecip = precipValues[currentIndex] ?? null; const validPrecip = precipValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)), precipMax = validPrecip.length ? Math.max(0.1, ...validPrecip) : 0;
    const spacing = (right - left) / Math.max(1, p.times.length - 1), barWidth = Math.max(1.2, Math.min(5, spacing * 0.72)); const precipBars: PrecipBar[] = precipValues.map((mm: number | null, index: number) => { const value = mm ?? 0, height = precipMax > 0 ? Math.min(22, (value / precipMax) * 22) : 0; return { x: x(p.times[index]) - barWidth / 2, y: 188 - height, width: barWidth, height, mm: value }; }).filter(bar => bar.height > 0.15);

    const snowDepthValues = p.times.map((_: number, index: number) => snowDepthCmAt(p.forecast, index)); const validSnowDepth = snowDepthValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)); const snowDepthMax = validSnowDepth.length ? Math.max(1, ...validSnowDepth) : 0; const directCurrentDepth = snowDepthValues[currentIndex] ?? null; const currentSnowDepth = directCurrentDepth !== null ? directCurrentDepth : fallbackDepth;
    const snowDepthPoints = snowDepthValues.map((cm: number | null, index: number) => cm === null ? null : `${x(p.times[index]).toFixed(1)},${(232 - Math.min(22, (cm / snowDepthMax) * 22)).toFixed(1)}`).filter((v: string | null): v is string => v !== null).join(' ');

    const validLabel = `${formatTooltipTime(currentTime)}  ·  ${formatRun(p.runTime)}`;
    return { points, terrainY, currentX, currentY, nowX, crossingX, minLabel: `${Math.round(min)} m`, midLabel: `${Math.round((min + max) / 2)} m`, maxLabel: `${Math.round(max)} m`, startLabel: formatDay(t0), currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null, currentTerrainDifference, currentPrecip, currentSnowDepth, precipBars, hasPrecip: validPrecip.some(v => v >= 0.05), snowDepthPoints, hasSnowDepth: validSnowDepth.length > 0 || currentSnowDepth !== null, hasSnowDepthSeries: validSnowDepth.length > 1, precipMaxLabel: precipMax > 0 ? formatPrecipMm(precipMax) : '—', snowDepthMaxLabel: snowDepthMax > 0 ? formatSnowDepthCm(snowDepthMax) : '—', minScale: min, maxScale: max, validLabel, currentIndex };
  }

  onMount(() => {
    const width = Math.min(410, window.innerWidth - 24); position = { x: Math.max(6, (window.innerWidth - width) / 2), y: window.innerWidth <= 520 ? 48 : 62 };
    realNow = Date.now(); realNowTimer = setInterval(() => { realNow = Date.now(); }, 30_000);
    try {
      const current = store.get('timestamp'); if (typeof current === 'number' && Number.isFinite(current)) timestamp = current;
      timestampListener = store.on('timestamp', (value: any) => { const next = Number(value); if (Number.isFinite(next)) { timestamp = next; setTimeout(() => void refreshMapDepth(), 120); } });
      overlayListener = store.on('overlay', () => { setTimeout(() => void refreshMapDepth(), 180); });
    } catch {}
    setTimeout(() => void refreshMapDepth(), 180);
  });
  onDestroy(() => { mapDepthGeneration += 1; window.removeEventListener('pointermove', dragMove); if (realNowTimer) clearInterval(realNowTimer); if (timestampListener !== null) try { store.off(timestampListener); } catch {} if (overlayListener !== null) try { store.off(overlayListener); } catch {} });
</script>

<style lang="less">
  .chart-shell { position: fixed; z-index: 10020; width: min(410px, calc(100vw - 20px)); padding: 10px 11px 9px; border: 1px solid rgba(96,204,255,0.42); border-radius: 13px; background: linear-gradient(180deg, rgba(17,24,31,0.985), rgba(13,19,25,0.985)); color: white; box-shadow: 0 14px 38px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.035); backdrop-filter: blur(5px); }
  .chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 1px 1px 2px; }
  .chart-title { min-width: 0; flex: 1; }
  .chart-head b { display: block; font-size: 14px; line-height: 1.05; letter-spacing: .1px; }
  .chart-head small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .place-line { margin-top: 4px; max-width: 245px; color: rgba(255,255,255,0.76); font-size: 8.8px; }
  .meta-line { margin-top: 2px; max-width: 245px; color: rgba(132,204,236,0.78); font-size: 7.8px; }
  .chart-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .chart-head button { height: 25px; min-width: 25px; padding: 0 7px; border: 1px solid rgba(255,255,255,0.06); border-radius: 7px; background: rgba(255,255,255,0.075); color: rgba(255,255,255,0.84); font-size: 14px; line-height: 23px; cursor: pointer; }
  .chart-head button:hover { background: rgba(96,204,255,0.15); border-color: rgba(96,204,255,0.28); color: white; }
  .png-button, .now-button { width: auto !important; font-size: 8.5px !important; font-weight: 800; letter-spacing: .15px; }
  .drag-button { cursor: grab !important; touch-action: none; font-size: 13px !important; }
  .snowline-chart-legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 7px 3px 2px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.055); color: rgba(255,255,255,0.66); font-size: 7.8px; }
  .snowline-chart-legend span { display: inline-flex; align-items: center; gap: 4px; }
  .snowline-chart-key-line { width: 14px; height: 0; border-top: 2px solid; display: inline-block; }
  .snowline-key { border-color: #66d4ff; } .terrain-key { border-color: #ffad55; border-top-style: dashed; } .now-key { border-color: #ff6658; }
  .snowline-chart-key-cross { width: 7px; height: 7px; border-radius: 50%; border: 2px solid #ffe05b; display: inline-block; }
  .snowline-chart-key-bar { width: 12px; height: 7px; border-radius: 2px 2px 0 0; background: rgba(88,198,232,0.82); display: inline-block; }
  .snowline-chart-key-depth { width: 14px; height: 0; border-top: 2px solid #8bdc92; display: inline-block; }
  .plot-wrap { position: relative; } svg { display: block; width: 100%; height: auto; overflow: visible; touch-action: none; }
  .plot-bg { fill: rgba(255,255,255,0.027); stroke: rgba(104,138,160,0.24); stroke-width: 1; } .lower-bg { fill: rgba(255,255,255,0.018); stroke: rgba(104,138,160,0.18); stroke-width: .8; } .snow-zone { fill: rgba(45,177,222,0.09); } .grid { stroke: rgba(160,185,203,0.13); stroke-width: 1; }
  .axis { fill: rgba(218,228,236,0.58); font-size: 8px; font-family: sans-serif; } .panel-label { fill: rgba(223,232,239,0.68); font-size: 6.8px; font-family: sans-serif; font-weight: 800; letter-spacing: .35px; } .precip-axis, .precip-label { fill: rgba(98,210,244,0.95); } .depth-axis, .depth-label { fill: #8bdc92; }
  .terrain-line { stroke: #ffad55; stroke-width: 1.5; stroke-dasharray: 5 4; opacity: 0.92; } .snowline-line { fill: none; stroke: #66d4ff; stroke-width: 2.65; stroke-linecap: round; stroke-linejoin: round; }
  .now-line { stroke: #ff6658; stroke-width: 1.35; opacity: 0.92; } .now-tag-bg { fill: #ff6658; } .now-tag { fill: #fff; font-size: 7px; font-family: sans-serif; font-weight: 800; }
  .cursor { stroke: rgba(235,242,247,0.58); stroke-width: 1; stroke-dasharray: 2 3; } .current-dot { fill: #fff; stroke: #66d4ff; stroke-width: 2.3; }
  .crossing-line { stroke: rgba(255,224,91,0.80); stroke-width: 1.35; stroke-dasharray: 3 3; } .crossing-dot { fill: #12191f; stroke: #ffe05b; stroke-width: 2.2; } .crossing-action { cursor: pointer; pointer-events: stroke; } .crossing-dot.crossing-action { pointer-events: all; }
  .inspect-line { stroke: rgba(255,255,255,0.34); stroke-width: 1; } .inspect-dot { fill: #12191f; stroke: white; stroke-width: 1.6; }
  .precip-bar { fill: rgba(70,176,210,0.48); } .precip-bar.wet { fill: rgba(88,198,232,0.88); }
  .snow-depth-line { fill: none; stroke: #8bdc92; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
  .map-depth-dot { fill: #8bdc92; stroke: rgba(0,0,0,.65); stroke-width: 1; } .map-depth-text { fill: rgba(139,220,146,.95); font-size: 7px; font-family: sans-serif; } .empty-band { fill: rgba(255,255,255,.36); font-size: 7px; font-family: sans-serif; }
  .plot-tooltip { position: absolute; z-index: 4; min-width: 158px; transform: translateX(-50%); padding: 7px 9px; border-radius: 8px; background: rgba(7,12,17,0.98); border: 1px solid rgba(96,204,255,0.26); box-shadow: 0 6px 18px rgba(0,0,0,0.42); pointer-events: none; }
  .plot-tooltip b, .plot-tooltip span { display: block; white-space: nowrap; } .plot-tooltip b { font-size: 8.9px; color: white; margin-bottom: 2px; } .plot-tooltip span { margin-top: 1px; font-size: 7.8px; color: rgba(255,255,255,0.74); }
  .chart-foot { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 2px; }
  .chart-foot span { padding: 6px 3px 5px; border: 1px solid rgba(255,255,255,0.035); border-radius: 8px; background: rgba(255,255,255,0.042); text-align: center; min-width: 0; }
  .chart-foot small { display: block; color: rgba(255,255,255,0.46); font-size: 6.8px; }
  .chart-foot b { display: block; margin-top: 1px; color: white; font-size: 8.5px; white-space: nowrap; }
  .chart-foot b.positive { color: #66d4ff; } .chart-foot b.negative { color: #ffad55; } .chart-foot b.wet { color: #66d4ff; } .chart-foot b.depth-value { color: #8bdc92; }
  .forecast-note { margin-top: 5px; padding: 3px 6px; border-radius: 6px; background: rgba(255,224,91,0.055); color: rgba(255,224,91,0.86); font-size: 7.5px; text-align: center; }
  .hint { margin-top: 4px; color: rgba(255,255,255,0.34); font-size: 7px; line-height: 1.2; text-align: center; }
  .empty { padding: 22px 8px 16px; text-align: center; color: rgba(255,255,255,0.62); font-size: 10px; }
  @media (max-width: 520px) { .chart-shell { width: calc(100vw - 14px); padding: 9px; border-radius: 11px; } .place-line, .meta-line { max-width: 165px; } .plot-tooltip { min-width: 140px; } .chart-head button { padding: 0 5px; } .chart-foot { gap: 3px; } .chart-foot small { font-size: 6.3px; } .chart-foot b { font-size: 7.7px; } }
</style>
