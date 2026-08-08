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
      <small>{placeName || 'Selected point'} · ECMWF</small>
    </div>
    <div class="chart-actions">
      <button class="png-button" type="button" aria-label="Download graph as PNG" title="Download PNG" on:click={downloadPng}>PNG</button>
      <button class="now-button" type="button" aria-label="Reset Windy timeline to now" title="Back to now" on:click={resetToNow}>Now</button>
      <button class="drag-button" type="button" aria-label="Drag snow forecast graph" title="Drag graph" on:pointerdown={startDrag}>↕</button>
      <button type="button" aria-label="Close snow forecast graph" title="Close" on:click={() => dispatch('close')}>×</button>
    </div>
  </div>

  {#if crossing}
    <div class:down={crossing.direction === 'below'} class:up={crossing.direction === 'above'} class="crossing-summary">
      <b>{crossing.summary}</b>
    </div>
  {/if}

  {#if chart && chart.points}
    <div class="snowline-chart-legend">
      <span><i class="snowline-chart-key-line snowline-key"></i> Snowline</span>
      {#if chart.terrainY !== null}<span><i class="snowline-chart-key-line terrain-key"></i> Terrain</span>{/if}
      <span><i class="snowline-chart-key-line now-key"></i> Now</span>
      {#if crossing?.crossingTime}<span><i class="snowline-chart-key-cross"></i> Crossing</span>{/if}
      {#if chart.hasPrecip}<span><i class="snowline-chart-key-bar"></i> Precip</span>{/if}
      {#if chart.hasSnowDepth}<span><i class="snowline-chart-key-depth"></i> Snow depth</span>{/if}
    </div>

    <div class="plot-wrap">
      <svg
        bind:this={svgEl}
        viewBox="0 0 360 205"
        role="img"
        aria-label="Snowline height, precipitation and snow depth through forecast time"
        on:pointermove={handlePlotPointer}
        on:pointerdown={handlePlotPointer}
        on:pointerleave={clearTooltip}
      >
        <rect x="38" y="14" width="310" height="138" rx="7" class="plot-bg" />

        {#if chart.terrainY !== null}
          <rect x="38" y={chart.terrainY} width="310" height={Math.max(0, 152 - chart.terrainY)} class="snow-zone" />
          <line x1="38" x2="348" y1={chart.terrainY} y2={chart.terrainY} class="terrain-line" />
        {/if}

        <line x1="38" x2="348" y1="14" y2="14" class="grid" />
        <line x1="38" x2="348" y1="83" y2="83" class="grid" />
        <line x1="38" x2="348" y1="152" y2="152" class="grid" />

        <text x="34" y="18" text-anchor="end" class="axis">{chart.maxLabel}</text>
        <text x="34" y="87" text-anchor="end" class="axis">{chart.midLabel}</text>
        <text x="34" y="156" text-anchor="end" class="axis">{chart.minLabel}</text>

        <polyline points={chart.points} class="snowline-line" />

        {#if chart.nowX !== null}
          <line x1={chart.nowX} x2={chart.nowX} y1="14" y2="177" class="now-line" />
          <rect x={Math.max(39, Math.min(322, chart.nowX - 13))} y="15" width="26" height="12" rx="3" class="now-tag-bg" />
          <text x={Math.max(52, Math.min(335, chart.nowX))} y="24" text-anchor="middle" class="now-tag">Now</text>
        {/if}

        {#if chart.currentX !== null && chart.currentY !== null}
          <line x1={chart.currentX} x2={chart.currentX} y1="14" y2="177" class="cursor" />
          <circle cx={chart.currentX} cy={chart.currentY} r="4.4" class="current-dot" />
        {/if}

        {#if chart.crossingX !== null && chart.terrainY !== null && crossing?.crossingTime}
          <line x1={chart.crossingX} x2={chart.crossingX} y1="14" y2="152" class="crossing-line crossing-action" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
          <circle cx={chart.crossingX} cy={chart.terrainY} r="5" class="crossing-dot crossing-action" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
        {/if}

        {#if tooltip}
          <line x1={tooltip.x} x2={tooltip.x} y1="14" y2="177" class="inspect-line" />
          {#if tooltip.snowlineY !== null}<circle cx={tooltip.x} cy={tooltip.snowlineY} r="3.8" class="inspect-dot" />{/if}
        {/if}

        {#if chart.hasPrecip || chart.hasSnowDepth}
          <line x1="38" x2="348" y1="177" y2="177" class="precip-base" />
        {/if}
        {#if chart.hasPrecip}
          <text x="34" y="169" text-anchor="end" class="axis precip-axis">P</text>
          {#each chart.precipBars as bar}
            <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="1" class:wet={bar.mm >= 1} class="precip-bar" />
          {/each}
        {/if}
        {#if chart.hasSnowDepth}
          <text x="34" y="177" text-anchor="end" class="axis depth-axis">SD</text>
          <polyline points={chart.snowDepthPoints} class="snow-depth-line" />
        {/if}

        <text x="38" y="197" text-anchor="start" class="axis">{chart.startLabel}</text>
        <text x="193" y="197" text-anchor="middle" class="axis">+72 h</text>
        <text x="348" y="197" text-anchor="end" class="axis">+144 h</text>
      </svg>

      {#if tooltip}
        <div class="plot-tooltip" style={`left:${tooltip.cssX}px;top:${tooltip.cssY}px;`}>
          <b>{tooltip.timeLabel}</b>
          <span>Snowline {tooltip.snowline !== null ? `${tooltip.snowline} m` : '—'}</span>
          {#if tooltip.terrainDifference !== null}<span>Δ terrain {tooltip.terrainDifference >= 0 ? '+' : ''}{tooltip.terrainDifference} m</span>{/if}
          {#if tooltip.precip !== null}<span>Precip {formatPrecipMm(tooltip.precip)} mm/3h</span>{/if}
          {#if tooltip.snowDepth !== null}<span>Snow depth {formatSnowDepthCm(tooltip.snowDepth)} cm</span>{/if}
        </div>
      {/if}
    </div>

    <div class="chart-foot">
      <span>Snowline <b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
      <span>Precip <b class:wet={chart.currentPrecip !== null && chart.currentPrecip >= 0.05}>{chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/3h` : '—'}</b></span>
      <span>Snow depth <b class="depth-value">{chart.currentSnowDepth !== null ? `${formatSnowDepthCm(chart.currentSnowDepth)} cm` : '—'}</b></span>
    </div>

    <div class="hint">Tap graph for exact values · Tap crossing to jump</div>
  {:else}
    <div class="empty">No snowline series is available for this point.</div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';
  import { buildProfile, wetBulbZeroHeight } from './snowLevel';
  import { precipMmAt, formatPrecipMm } from './precip';
  import { snowDepthCmAt, formatSnowDepthCm } from './snowDepth';
  import { terrainCrossingState } from './terrainCrossing';

  export let point: any;
  export let terrainM: number | null = null;
  export let placeName = '';

  const dispatch = createEventDispatcher<{ close: void }>();
  let timestamp = Date.now();
  let realNow = Date.now();
  let timestampListener: number | null = null;
  let realNowTimer: ReturnType<typeof setInterval> | null = null;
  let chartShell: HTMLDivElement | null = null;
  let svgEl: SVGSVGElement | null = null;
  let position = { x: 24, y: 68 };
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let tooltip: TooltipData | null = null;

  type PrecipBar = { x: number; y: number; width: number; height: number; mm: number };
  type TooltipData = { x: number; cssX: number; cssY: number; snowlineY: number | null; snowline: number | null; terrainDifference: number | null; precip: number | null; snowDepth: number | null; timeLabel: string; };
  type ChartData = {
    points: string; terrainY: number | null; currentX: number | null; currentY: number | null; nowX: number | null; crossingX: number | null;
    minLabel: string; midLabel: string; maxLabel: string; startLabel: string; minSnowline: number; maxSnowline: number;
    currentSnowline: number | null; currentTerrainDifference: number | null; currentPrecip: number | null; currentSnowDepth: number | null;
    precipBars: PrecipBar[]; hasPrecip: boolean; snowDepthPoints: string; hasSnowDepth: boolean; summaryLine: string; minScale: number; maxScale: number;
  };

  $: crossing = terrainCrossingState(point, terrainM, timestamp);
  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);

  function nearestIndex(times: number[], target: number): number { let best = 0, distance = Infinity; times.forEach((time, index) => { const d = Math.abs(time - target); if (d < distance) { best = index; distance = d; } }); return best; }
  function snowlineAt(p: any, index: number): number | null { try { const result = wetBulbZeroHeight(buildProfile(p.forecast, index)); return result.snowLevelM !== null && Number.isFinite(result.snowLevelM) ? result.snowLevelM : null; } catch { return null; } }
  function formatDay(time: number): string { return new Date(time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }); }
  function formatShortUtc(time: number): string { const d = new Date(time); const day = d.toLocaleDateString(undefined, { weekday: 'short' }); const hh = String(d.getUTCHours()).padStart(2, '0'); return `${day} ${hh} UTC`; }
  function formatTooltipTime(time: number): string { const d = new Date(time); const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }); const hh = String(d.getUTCHours()).padStart(2, '0'); return `${day} · ${hh} UTC`; }

  function clampPosition(x: number, y: number) { const rect = chartShell?.getBoundingClientRect(); const width = rect?.width ?? 390; const height = rect?.height ?? 320; return { x: Math.max(6, Math.min(window.innerWidth - width - 6, x)), y: Math.max(6, Math.min(window.innerHeight - height - 6, y)) }; }
  function startDrag(event: PointerEvent) { if (!chartShell) return; dragPointerId = event.pointerId; const rect = chartShell.getBoundingClientRect(); dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }; try { (event.currentTarget as HTMLElement)?.setPointerCapture(event.pointerId); } catch {} window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', stopDrag, { once: true }); event.preventDefault(); event.stopPropagation(); }
  function dragMove(event: PointerEvent) { if (dragPointerId !== event.pointerId) return; position = clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y); }
  function stopDrag(event: PointerEvent) { if (dragPointerId !== event.pointerId) return; dragPointerId = null; window.removeEventListener('pointermove', dragMove); }
  function setTimeline(time: number, warning: string) { if (!Number.isFinite(time)) return; try { (store as any).set('timestamp', time); timestamp = time; tooltip = null; } catch (e) { console.warn(warning, e); } }
  function jumpToCrossing(time: number) { setTimeline(time, 'Snow forecast could not jump Windy timeline to terrain crossing'); }
  function resetToNow() { if (!point || !Array.isArray(point.times) || !point.times.length) return; realNow = Date.now(); const idx = nearestIndex(point.times, realNow); setTimeline(point.times[idx], 'Snow forecast could not reset Windy timeline to now'); }
  function clearTooltip() { tooltip = null; }

  function safeFilename(value: string): string {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || 'selected-point';
  }

  async function downloadPng() {
    if (!svgEl) return;
    try {
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '720');
      clone.setAttribute('height', '410');
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `
        .plot-bg{fill:#171b20;stroke:#38404a;stroke-width:1}.snow-zone{fill:#102a35}.grid{stroke:#3a4048;stroke-width:1}.axis{fill:#aeb7c2;font-size:8px;font-family:Arial,sans-serif}.precip-axis{fill:#70d7ff;font-weight:700}.depth-axis{fill:#8fe388;font-weight:700}.terrain-line{stroke:#ffb15b;stroke-width:1.4;stroke-dasharray:5 4}.snowline-line{fill:none;stroke:#70d7ff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}.now-line{stroke:#ff6b57;stroke-width:1.5}.now-tag-bg{fill:#ff6b57}.now-tag{fill:#fff;font-size:7px;font-family:Arial,sans-serif;font-weight:800}.cursor{stroke:#d9e0e8;stroke-width:1;stroke-dasharray:2 3}.current-dot{fill:#fff;stroke:#70d7ff;stroke-width:2.2}.crossing-line{stroke:#ffe45c;stroke-width:1.4;stroke-dasharray:3 3}.crossing-dot{fill:#15191e;stroke:#ffe45c;stroke-width:2.2}.inspect-line,.inspect-dot{display:none}.precip-base{stroke:#2b5968;stroke-width:1}.precip-bar{fill:#397f9a}.precip-bar.wet{fill:#70d7ff}.snow-depth-line{fill:none;stroke:#8fe388;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}`;
      clone.insertBefore(style, clone.firstChild);
      const serialized = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('PNG image render failed')); image.src = url; });

      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#14181d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px Arial, sans-serif';
      ctx.fillText('Snow forecast', 28, 34);
      ctx.fillStyle = '#aeb7c2';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(`${placeName || 'Selected point'} · ECMWF`, 28, 60);
      ctx.drawImage(image, 0, 78, 720, 410);
      URL.revokeObjectURL(url);

      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
      const pngUrl = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `snow-forecast-${safeFilename(placeName || 'selected-point')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    } catch (e) {
      console.warn('Snow forecast PNG export failed', e);
    }
  }

  function handlePlotPointer(event: PointerEvent) {
    if (!svgEl || !chart || !point?.times?.length) return;
    const rect = svgEl.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const vx = ((event.clientX - rect.left) / rect.width) * 360; if (vx < 38 || vx > 348) { tooltip = null; return; }
    const t0 = point.times[0], t1 = point.times[point.times.length - 1]; const target = t0 + ((vx - 38) / 310) * Math.max(1, t1 - t0); const idx = nearestIndex(point.times, target); const time = point.times[idx];
    const snowlineRaw = snowlineAt(point, idx), snowline = snowlineRaw !== null ? Math.round(snowlineRaw / 10) * 10 : null; const x = 38 + ((time - t0) / Math.max(1, t1 - t0)) * 310;
    const snowlineY = snowlineRaw !== null ? 152 - ((snowlineRaw - chart.minScale) / Math.max(1, chart.maxScale - chart.minScale)) * 138 : null;
    const precip = precipMmAt(point.forecast, idx); const snowDepth = snowDepthCmAt(point.forecast, idx);
    const terrainDifference = snowlineRaw !== null && terrainM !== null && Number.isFinite(terrainM) ? Math.round((terrainM - snowlineRaw) / 10) * 10 : null;
    const cssX = Math.max(72, Math.min(rect.width - 72, (x / 360) * rect.width)); const cssY = Math.max(8, Math.min(rect.height - 80, (snowlineY !== null ? (snowlineY / 205) * rect.height - 66 : 24)));
    tooltip = { x, cssX, cssY, snowlineY, snowline, terrainDifference, precip, snowDepth, timeLabel: formatTooltipTime(time) };
  }

  function buildChart(p: any, terrain: number | null, target: number, crossingTime: number | null, realNowTime: number): ChartData | null {
    if (!p || !Array.isArray(p.times) || !p.times.length) return null;
    const entries = p.times.map((time: number, index: number) => ({ time, value: snowlineAt(p, index), index })).filter((item: any) => item.value !== null && Number.isFinite(item.value)); if (entries.length < 2) return null;
    const snowValues = entries.map((item: any) => Number(item.value)); const scaleValues = terrain !== null && Number.isFinite(terrain) ? [...snowValues, terrain] : snowValues;
    let min = Math.floor((Math.min(...scaleValues) - 150) / 100) * 100, max = Math.ceil((Math.max(...scaleValues) + 150) / 100) * 100; if (max - min < 600) { const mid = (max + min) / 2; min = Math.floor((mid - 300) / 100) * 100; max = Math.ceil((mid + 300) / 100) * 100; }
    const left = 38, right = 348, top = 14, bottom = 152; const t0 = p.times[0], t1 = p.times[p.times.length - 1]; const x = (time: number) => left + ((time - t0) / Math.max(1, t1 - t0)) * (right - left); const y = (value: number) => bottom - ((value - min) / Math.max(1, max - min)) * (bottom - top);
    const points = entries.map((item: any) => `${x(item.time).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');
    const currentIndex = nearestIndex(p.times, target), currentValue = snowlineAt(p, currentIndex), currentX = Number.isFinite(p.times[currentIndex]) ? x(p.times[currentIndex]) : null, currentY = currentValue !== null ? y(currentValue) : null;
    const currentTerrainDifference = currentValue !== null && terrain !== null && Number.isFinite(terrain) ? Math.round((terrain - currentValue) / 10) * 10 : null;
    const nowX = Number.isFinite(realNowTime) && realNowTime >= t0 && realNowTime <= t1 ? x(realNowTime) : null, terrainY = terrain !== null && Number.isFinite(terrain) ? Math.max(top, Math.min(bottom, y(terrain))) : null, crossingX = crossingTime !== null ? x(crossingTime) : null;

    const precipValues = p.times.map((_: number, index: number) => precipMmAt(p.forecast, index)); const currentPrecip = precipMmAt(p.forecast, currentIndex); const validPrecip = precipValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)); const precipMax = validPrecip.length ? Math.max(0.1, ...validPrecip) : 0;
    const spacing = (right - left) / Math.max(1, p.times.length - 1), barWidth = Math.max(1.2, Math.min(5, spacing * 0.72)); const precipBars: PrecipBar[] = precipValues.map((mm: number | null, index: number) => { const value = mm ?? 0, height = precipMax > 0 ? Math.min(17, (value / precipMax) * 17) : 0; return { x: x(p.times[index]) - barWidth / 2, y: 177 - height, width: barWidth, height, mm: value }; }).filter(bar => bar.height > 0.15);

    const snowDepthValues = p.times.map((_: number, index: number) => snowDepthCmAt(p.forecast, index)); const validSnowDepth = snowDepthValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)); const snowDepthMax = validSnowDepth.length ? Math.max(1, ...validSnowDepth) : 0; const currentSnowDepth = snowDepthCmAt(p.forecast, currentIndex);
    const snowDepthPoints = snowDepthValues.map((cm: number | null, index: number) => cm === null ? null : `${x(p.times[index]).toFixed(1)},${(177 - Math.min(17, (cm / snowDepthMax) * 17)).toFixed(1)}`).filter((v: string | null): v is string => v !== null).join(' ');

    const minEntry = entries.reduce((best: any, item: any) => item.value < best.value ? item : best, entries[0]); let peakPrecip: number | null = null, peakPrecipTime: number | null = null; precipValues.forEach((value: number | null, index: number) => { if (value === null || !Number.isFinite(value)) return; if (peakPrecip === null || value > peakPrecip) { peakPrecip = value; peakPrecipTime = p.times[index]; } });
    const summaryParts = [`Min ${formatShortUtc(minEntry.time)}`]; if (peakPrecip !== null && peakPrecip >= 0.05 && peakPrecipTime !== null) summaryParts.push(`Peak precip ${formatPrecipMm(peakPrecip)} mm · ${formatShortUtc(peakPrecipTime)}`); if (validSnowDepth.length) summaryParts.push(`Max depth ${formatSnowDepthCm(Math.max(...validSnowDepth))} cm`);

    return { points, terrainY, currentX, currentY, nowX, crossingX, minLabel: `${Math.round(min)} m`, midLabel: `${Math.round((min + max) / 2)} m`, maxLabel: `${Math.round(max)} m`, startLabel: formatDay(t0), minSnowline: Math.round(Math.min(...snowValues) / 10) * 10, maxSnowline: Math.round(Math.max(...snowValues) / 10) * 10, currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null, currentTerrainDifference, currentPrecip, currentSnowDepth, precipBars, hasPrecip: validPrecip.some(v => v >= 0.05), snowDepthPoints, hasSnowDepth: validSnowDepth.length > 1, summaryLine: summaryParts.join(' · '), minScale: min, maxScale: max };
  }

  onMount(() => { const width = Math.min(390, window.innerWidth - 24); position = { x: Math.max(6, (window.innerWidth - width) / 2), y: window.innerWidth <= 520 ? 58 : 68 }; realNow = Date.now(); realNowTimer = setInterval(() => { realNow = Date.now(); }, 30_000); try { const current = store.get('timestamp'); if (typeof current === 'number' && Number.isFinite(current)) timestamp = current; timestampListener = store.on('timestamp', (value: any) => { const next = Number(value); if (Number.isFinite(next)) timestamp = next; }); } catch {} });
  onDestroy(() => { window.removeEventListener('pointermove', dragMove); if (realNowTimer) clearInterval(realNowTimer); if (timestampListener !== null) try { store.off(timestampListener); } catch {} });
</script>

<style lang="less">
  .chart-shell { position: fixed; z-index: 10020; width: min(390px, calc(100vw - 24px)); padding: 9px 10px 8px; border: 1px solid rgba(80,190,255,0.42); border-radius: 10px; background: rgba(20,24,29,0.975); color: white; box-shadow: 0 10px 34px rgba(0,0,0,0.48); backdrop-filter: blur(4px); }
  .chart-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .chart-title { min-width: 0; }
  .chart-head b { display: block; font-size: 12.5px; line-height: 1.05; }
  .chart-head small { display: block; margin-top: 2px; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,0.55); font-size: 8.5px; }
  .chart-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .chart-head button { height: 22px; min-width: 22px; padding: 0 6px; border: 0; border-radius: 5px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.82); font-size: 14px; line-height: 20px; cursor: pointer; }
  .chart-head button:hover { background: rgba(255,255,255,0.17); color: white; }
  .png-button, .now-button { width: auto !important; font-size: 8.5px !important; font-weight: 800; }
  .drag-button { cursor: grab !important; touch-action: none; font-size: 13px !important; }
  .crossing-summary { margin-top: 6px; padding: 4px 7px; border-radius: 6px; background: rgba(255,255,255,0.05); border-left: 3px solid rgba(255,255,255,0.35); }
  .crossing-summary.down { border-left-color: #70d7ff; background: rgba(70,217,255,0.08); }
  .crossing-summary.up { border-left-color: #ffb15b; background: rgba(255,177,91,0.08); }
  .crossing-summary b { display: block; font-size: 9px; }
  .snowline-chart-legend { display: flex; flex-wrap: wrap; gap: 7px; margin: 6px 2px 0; color: rgba(255,255,255,0.66); font-size: 7.9px; }
  .snowline-chart-legend span { display: inline-flex; align-items: center; gap: 4px; }
  .snowline-chart-key-line { width: 13px; height: 0; border-top: 2px solid; display: inline-block; }
  .snowline-key { border-color: #70d7ff; } .terrain-key { border-color: #ffb15b; border-top-style: dashed; } .now-key { border-color: #ff6b57; }
  .snowline-chart-key-cross { width: 7px; height: 7px; border-radius: 50%; border: 2px solid #ffe45c; display: inline-block; }
  .snowline-chart-key-bar { width: 12px; height: 7px; border-radius: 2px 2px 0 0; background: rgba(70,217,255,0.72); display: inline-block; }
  .snowline-chart-key-depth { width: 13px; height: 0; border-top: 2px solid #8fe388; display: inline-block; }
  .plot-wrap { position: relative; } svg { display: block; width: 100%; height: auto; margin-top: 0; overflow: visible; touch-action: none; }
  .plot-bg { fill: rgba(255,255,255,0.025); stroke: rgba(255,255,255,0.07); stroke-width: 1; } .snow-zone { fill: rgba(70,217,255,0.07); } .grid { stroke: rgba(255,255,255,0.08); stroke-width: 1; }
  .axis { fill: rgba(255,255,255,0.52); font-size: 8px; font-family: sans-serif; } .precip-axis { fill: rgba(112,215,255,0.78); font-weight: 700; } .depth-axis { fill: #8fe388; font-weight: 700; }
  .terrain-line { stroke: #ffb15b; stroke-width: 1.4; stroke-dasharray: 5 4; opacity: 0.88; } .snowline-line { fill: none; stroke: #70d7ff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .now-line { stroke: #ff6b57; stroke-width: 1.5; opacity: 0.92; } .now-tag-bg { fill: rgba(255,107,87,0.92); } .now-tag { fill: #fff; font-size: 7px; font-family: sans-serif; font-weight: 800; }
  .cursor { stroke: rgba(255,255,255,0.48); stroke-width: 1; stroke-dasharray: 2 3; } .current-dot { fill: #fff; stroke: #70d7ff; stroke-width: 2.2; }
  .crossing-line { stroke: rgba(255,228,92,0.7); stroke-width: 1.4; stroke-dasharray: 3 3; } .crossing-dot { fill: #15191e; stroke: #ffe45c; stroke-width: 2.2; } .crossing-action { cursor: pointer; pointer-events: stroke; } .crossing-dot.crossing-action { pointer-events: all; }
  .inspect-line { stroke: rgba(255,255,255,0.3); stroke-width: 1; } .inspect-dot { fill: #15191e; stroke: white; stroke-width: 1.6; }
  .precip-base { stroke: rgba(112,215,255,0.18); stroke-width: 1; } .precip-bar { fill: rgba(70,217,255,0.42); } .precip-bar.wet { fill: rgba(70,217,255,0.72); }
  .snow-depth-line { fill: none; stroke: #8fe388; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .plot-tooltip { position: absolute; z-index: 4; min-width: 120px; transform: translateX(-50%); padding: 5px 7px; border-radius: 6px; background: rgba(8,11,15,0.96); border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 4px 12px rgba(0,0,0,0.35); pointer-events: none; }
  .plot-tooltip b, .plot-tooltip span { display: block; white-space: nowrap; } .plot-tooltip b { font-size: 8.7px; color: white; } .plot-tooltip span { margin-top: 1px; font-size: 8px; color: rgba(255,255,255,0.72); }
  .chart-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: -2px; }
  .chart-foot span { padding: 5px 3px; border-radius: 6px; background: rgba(255,255,255,0.045); color: rgba(255,255,255,0.60); text-align: center; font-size: 7.5px; min-width: 0; }
  .chart-foot b { display: block; color: white; font-size: 8.5px; white-space: nowrap; }
  .chart-foot b.wet { color: #70d7ff; } .chart-foot b.depth-value { color: #8fe388; }
  .hint { margin-top: 4px; color: rgba(255,255,255,0.36); font-size: 7.2px; line-height: 1.2; text-align: center; }
  .empty { padding: 22px 8px 16px; text-align: center; color: rgba(255,255,255,0.62); font-size: 10px; }
  @media (max-width: 520px) { .chart-shell { width: calc(100vw - 20px); padding: 8px; } .chart-head small { max-width: 120px; } .plot-tooltip { min-width: 108px; } .chart-head button { padding: 0 5px; } }
</style>
