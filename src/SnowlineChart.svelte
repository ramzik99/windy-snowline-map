<div
  class="chart-shell"
  role="dialog"
  aria-modal="false"
  aria-label="Snowline forecast graph"
  bind:this={chartShell}
  style={`left:${position.x}px;top:${position.y}px;transform:none;`}
>
  <div class="chart-head">
    <div>
      <b>Snowline forecast</b>
      <small>{placeName || 'Selected point'} · ECMWF</small>
    </div>
    <div class="chart-actions">
      <button class="now-button" type="button" aria-label="Reset Windy timeline to now" title="Back to now" on:click={resetToNow}>↺ Now</button>
      <button class="drag-button" type="button" aria-label="Drag snowline graph" title="Drag graph" on:pointerdown={startDrag}>↕</button>
      <button type="button" aria-label="Close snowline graph" title="Close" on:click={() => dispatch('close')}>×</button>
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
      <span><i class="snowline-chart-key-dot"></i> Selected</span>
      {#if crossing?.crossingTime}<span><i class="snowline-chart-key-cross"></i> Crossing</span>{/if}
      {#if chart.hasPrecip}<span><i class="snowline-chart-key-bar"></i> Precip</span>{/if}
    </div>

    <div class="plot-wrap">
      <svg
        bind:this={svgEl}
        viewBox="0 0 360 205"
        role="img"
        aria-label="Snowline height and precipitation through forecast time"
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
          <line
            x1={chart.crossingX}
            x2={chart.crossingX}
            y1="14"
            y2="152"
            class="crossing-line crossing-action"
            on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)}
          />
          <circle
            cx={chart.crossingX}
            cy={chart.terrainY}
            r="5"
            class="crossing-dot crossing-action"
            on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)}
          />
        {/if}

        {#if tooltip}
          <line x1={tooltip.x} x2={tooltip.x} y1="14" y2="177" class="inspect-line" />
          {#if tooltip.snowlineY !== null}<circle cx={tooltip.x} cy={tooltip.snowlineY} r="3.8" class="inspect-dot" />{/if}
        {/if}

        {#if chart.hasPrecip}
          <text x="34" y="169" text-anchor="end" class="axis precip-axis">P</text>
          <line x1="38" x2="348" y1="177" y2="177" class="precip-base" />
          {#each chart.precipBars as bar}
            <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="1" class:wet={bar.mm >= 1} class="precip-bar" />
          {/each}
        {/if}

        <text x="38" y="197" text-anchor="start" class="axis">{chart.startLabel}</text>
        <text x="193" y="197" text-anchor="middle" class="axis">+72 h</text>
        <text x="348" y="197" text-anchor="end" class="axis">+144 h</text>
      </svg>

      {#if tooltip}
        <div class="plot-tooltip" style={`left:${tooltip.cssX}px;top:${tooltip.cssY}px;`}>
          <b>{tooltip.timeLabel}</b>
          <span>SL {tooltip.snowline !== null ? `${tooltip.snowline} m` : '—'}</span>
          {#if tooltip.terrainDifference !== null}<span>Δ terrain {tooltip.terrainDifference >= 0 ? '+' : ''}{tooltip.terrainDifference} m</span>{/if}
          {#if tooltip.precip !== null}<span>💧 {formatPrecipMm(tooltip.precip)} mm/3h</span>{/if}
        </div>
      {/if}
    </div>

    <div class="chart-foot">
      <span>Min <b>{chart.minSnowline} m</b></span>
      <span>Selected <b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
      <span>Δ terrain <b class:positive={chart.currentTerrainDifference !== null && chart.currentTerrainDifference > 0} class:negative={chart.currentTerrainDifference !== null && chart.currentTerrainDifference < 0}>{chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}</b></span>
      <span>Max <b>{chart.maxSnowline} m</b></span>
    </div>

    <div class="forecast-summary">{chart.summaryLine}</div>
    <div class="hint">Tap graph for exact values · Tap crossing marker to jump timeline</div>
  {:else}
    <div class="empty">No snowline series is available for this point.</div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';
  import { buildProfile, wetBulbZeroHeight } from './snowLevel';
  import { precipMmAt, formatPrecipMm } from './precip';
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
  type TooltipData = {
    x: number;
    cssX: number;
    cssY: number;
    snowlineY: number | null;
    snowline: number | null;
    terrainDifference: number | null;
    precip: number | null;
    timeLabel: string;
  };
  type ChartData = {
    points: string;
    terrainY: number | null;
    currentX: number | null;
    currentY: number | null;
    nowX: number | null;
    crossingX: number | null;
    minLabel: string;
    midLabel: string;
    maxLabel: string;
    startLabel: string;
    minSnowline: number;
    maxSnowline: number;
    currentSnowline: number | null;
    currentTerrainDifference: number | null;
    precipBars: PrecipBar[];
    hasPrecip: boolean;
    summaryLine: string;
    minScale: number;
    maxScale: number;
  };

  $: crossing = terrainCrossingState(point, terrainM, timestamp);
  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);

  function nearestIndex(times: number[], target: number): number {
    let best = 0, distance = Infinity;
    times.forEach((time, index) => {
      const d = Math.abs(time - target);
      if (d < distance) { best = index; distance = d; }
    });
    return best;
  }

  function snowlineAt(p: any, index: number): number | null {
    try {
      const result = wetBulbZeroHeight(buildProfile(p.forecast, index));
      return result.snowLevelM !== null && Number.isFinite(result.snowLevelM) ? result.snowLevelM : null;
    } catch {
      return null;
    }
  }

  function formatDay(time: number): string {
    const d = new Date(time);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }

  function formatShortUtc(time: number): string {
    const d = new Date(time);
    const day = d.toLocaleDateString(undefined, { weekday: 'short' });
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return `${day} ${hh} UTC`;
  }

  function formatTooltipTime(time: number): string {
    const d = new Date(time);
    const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return `${day} · ${hh} UTC`;
  }

  function clampPosition(x: number, y: number) {
    const rect = chartShell?.getBoundingClientRect();
    const width = rect?.width ?? 390;
    const height = rect?.height ?? 320;
    return {
      x: Math.max(6, Math.min(window.innerWidth - width - 6, x)),
      y: Math.max(6, Math.min(window.innerHeight - height - 6, y)),
    };
  }

  function startDrag(event: PointerEvent) {
    if (!chartShell) return;
    dragPointerId = event.pointerId;
    const rect = chartShell.getBoundingClientRect();
    dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    try { (event.currentTarget as HTMLElement)?.setPointerCapture(event.pointerId); } catch {}
    window.addEventListener('pointermove', dragMove);
    window.addEventListener('pointerup', stopDrag, { once: true });
    event.preventDefault();
    event.stopPropagation();
  }

  function dragMove(event: PointerEvent) {
    if (dragPointerId !== event.pointerId) return;
    position = clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
  }

  function stopDrag(event: PointerEvent) {
    if (dragPointerId !== event.pointerId) return;
    dragPointerId = null;
    window.removeEventListener('pointermove', dragMove);
  }

  function setTimeline(time: number, warning: string) {
    if (!Number.isFinite(time)) return;
    try {
      (store as any).set('timestamp', time);
      timestamp = time;
      tooltip = null;
    } catch (e) {
      console.warn(warning, e);
    }
  }

  function jumpToCrossing(time: number) {
    setTimeline(time, 'Snowline could not jump Windy timeline to terrain crossing');
  }

  function resetToNow() {
    if (!point || !Array.isArray(point.times) || !point.times.length) return;
    realNow = Date.now();
    const idx = nearestIndex(point.times, realNow);
    setTimeline(point.times[idx], 'Snowline could not reset Windy timeline to now');
  }

  function clearTooltip() { tooltip = null; }

  function handlePlotPointer(event: PointerEvent) {
    if (!svgEl || !chart || !point?.times?.length) return;
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const vx = ((event.clientX - rect.left) / rect.width) * 360;
    if (vx < 38 || vx > 348) { tooltip = null; return; }

    const t0 = point.times[0];
    const t1 = point.times[point.times.length - 1];
    const target = t0 + ((vx - 38) / 310) * Math.max(1, t1 - t0);
    const idx = nearestIndex(point.times, target);
    const time = point.times[idx];
    const snowlineRaw = snowlineAt(point, idx);
    const snowline = snowlineRaw !== null ? Math.round(snowlineRaw / 10) * 10 : null;
    const x = 38 + ((time - t0) / Math.max(1, t1 - t0)) * 310;
    const snowlineY = snowlineRaw !== null
      ? 152 - ((snowlineRaw - chart.minScale) / Math.max(1, chart.maxScale - chart.minScale)) * (152 - 14)
      : null;
    const precip = precipMmAt(point.forecast, idx);
    const terrainDifference = snowlineRaw !== null && terrainM !== null && Number.isFinite(terrainM)
      ? Math.round((terrainM - snowlineRaw) / 10) * 10
      : null;

    const cssX = Math.max(72, Math.min(rect.width - 72, ((x / 360) * rect.width)));
    const cssY = Math.max(8, Math.min(rect.height - 72, (snowlineY !== null ? (snowlineY / 205) * rect.height - 58 : 24)));
    tooltip = { x, cssX, cssY, snowlineY, snowline, terrainDifference, precip, timeLabel: formatTooltipTime(time) };
  }

  function buildChart(p: any, terrain: number | null, target: number, crossingTime: number | null, realNowTime: number): ChartData | null {
    if (!p || !Array.isArray(p.times) || !p.times.length) return null;
    const entries = p.times.map((time: number, index: number) => ({ time, value: snowlineAt(p, index), index }))
      .filter((item: any) => item.value !== null && Number.isFinite(item.value));
    if (entries.length < 2) return null;

    const snowValues = entries.map((item: any) => Number(item.value));
    const scaleValues = terrain !== null && Number.isFinite(terrain) ? [...snowValues, terrain] : snowValues;
    let min = Math.floor((Math.min(...scaleValues) - 150) / 100) * 100;
    let max = Math.ceil((Math.max(...scaleValues) + 150) / 100) * 100;
    if (max - min < 600) { const mid = (max + min) / 2; min = Math.floor((mid - 300) / 100) * 100; max = Math.ceil((mid + 300) / 100) * 100; }

    const left = 38, right = 348, top = 14, bottom = 152;
    const t0 = p.times[0], t1 = p.times[p.times.length - 1];
    const x = (time: number) => left + ((time - t0) / Math.max(1, t1 - t0)) * (right - left);
    const y = (value: number) => bottom - ((value - min) / Math.max(1, max - min)) * (bottom - top);
    const points = entries.map((item: any) => `${x(item.time).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');

    const currentIndex = nearestIndex(p.times, target);
    const currentValue = snowlineAt(p, currentIndex);
    const currentX = Number.isFinite(p.times[currentIndex]) ? x(p.times[currentIndex]) : null;
    const currentY = currentValue !== null ? y(currentValue) : null;
    const currentTerrainDifference = currentValue !== null && terrain !== null && Number.isFinite(terrain)
      ? Math.round((terrain - currentValue) / 10) * 10
      : null;
    const nowX = Number.isFinite(realNowTime) && realNowTime >= t0 && realNowTime <= t1 ? x(realNowTime) : null;
    const terrainY = terrain !== null && Number.isFinite(terrain) ? Math.max(top, Math.min(bottom, y(terrain))) : null;
    const crossingX = crossingTime !== null ? x(crossingTime) : null;

    const precipValues = p.times.map((_: number, index: number) => precipMmAt(p.forecast, index));
    const validPrecip = precipValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v));
    const precipMax = validPrecip.length ? Math.max(0.1, ...validPrecip) : 0;
    const spacing = (right - left) / Math.max(1, p.times.length - 1);
    const barWidth = Math.max(1.2, Math.min(5, spacing * 0.72));
    const precipBars: PrecipBar[] = precipValues.map((mm: number | null, index: number) => {
      const value = mm ?? 0;
      const height = precipMax > 0 ? Math.min(17, (value / precipMax) * 17) : 0;
      return { x: x(p.times[index]) - barWidth / 2, y: 177 - height, width: barWidth, height, mm: value };
    }).filter(bar => bar.height > 0.15);

    const minEntry = entries.reduce((best: any, item: any) => item.value < best.value ? item : best, entries[0]);
    let peakPrecip: number | null = null;
    let peakPrecipTime: number | null = null;
    precipValues.forEach((value: number | null, index: number) => {
      if (value === null || !Number.isFinite(value)) return;
      if (peakPrecip === null || value > peakPrecip) { peakPrecip = value; peakPrecipTime = p.times[index]; }
    });

    const summaryParts = [`Min ${formatShortUtc(minEntry.time)}`];
    if (peakPrecip !== null && peakPrecip >= 0.05 && peakPrecipTime !== null) {
      summaryParts.push(`Peak precip ${formatPrecipMm(peakPrecip)} mm · ${formatShortUtc(peakPrecipTime)}`);
    }

    return {
      points,
      terrainY,
      currentX,
      currentY,
      nowX,
      crossingX,
      minLabel: `${Math.round(min)} m`,
      midLabel: `${Math.round((min + max) / 2)} m`,
      maxLabel: `${Math.round(max)} m`,
      startLabel: formatDay(t0),
      minSnowline: Math.round(Math.min(...snowValues) / 10) * 10,
      maxSnowline: Math.round(Math.max(...snowValues) / 10) * 10,
      currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null,
      currentTerrainDifference,
      precipBars,
      hasPrecip: validPrecip.some(v => v >= 0.05),
      summaryLine: summaryParts.join(' · '),
      minScale: min,
      maxScale: max,
    };
  }

  onMount(() => {
    const width = Math.min(390, window.innerWidth - 24);
    position = { x: Math.max(6, (window.innerWidth - width) / 2), y: window.innerWidth <= 520 ? 58 : 68 };
    realNow = Date.now();
    realNowTimer = setInterval(() => { realNow = Date.now(); }, 30_000);
    try {
      const current = store.get('timestamp');
      if (typeof current === 'number' && Number.isFinite(current)) timestamp = current;
      timestampListener = store.on('timestamp', (value: any) => {
        const next = Number(value);
        if (Number.isFinite(next)) timestamp = next;
      });
    } catch {}
  });

  onDestroy(() => {
    window.removeEventListener('pointermove', dragMove);
    if (realNowTimer) clearInterval(realNowTimer);
    if (timestampListener !== null) try { store.off(timestampListener); } catch {}
  });
</script>

<style lang="less">
  .chart-shell { position: fixed; z-index: 10020; width: min(390px, calc(100vw - 24px)); padding: 10px 10px 9px; border: 1px solid rgba(80,190,255,0.45); border-radius: 11px; background: rgba(20,24,29,0.975); color: white; box-shadow: 0 10px 34px rgba(0,0,0,0.48); backdrop-filter: blur(4px); }
  .chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .chart-head b { display: block; font-size: 13px; line-height: 1.05; }
  .chart-head small { display: block; margin-top: 3px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,0.58); font-size: 9px; }
  .chart-actions { display: flex; gap: 5px; }
  .chart-head button { width: 23px; height: 23px; padding: 0; border: 0; border-radius: 6px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.82); font-size: 17px; line-height: 20px; cursor: pointer; }
  .chart-head button:hover { background: rgba(255,255,255,0.17); color: white; }
  .now-button { width: auto !important; min-width: 46px; padding: 0 7px !important; font-size: 10px !important; line-height: 21px !important; font-weight: 800; white-space: nowrap; }
  .drag-button { cursor: grab !important; touch-action: none; font-size: 14px !important; }
  .drag-button:active { cursor: grabbing !important; }
  .crossing-summary { margin-top: 7px; padding: 5px 8px; border-radius: 7px; background: rgba(255,255,255,0.05); border-left: 3px solid rgba(255,255,255,0.35); }
  .crossing-summary.down { border-left-color: #70d7ff; background: rgba(70,217,255,0.08); }
  .crossing-summary.up { border-left-color: #ffb15b; background: rgba(255,177,91,0.08); }
  .crossing-summary b { display: block; font-size: 9.5px; }
  .snowline-chart-legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 7px 2px 1px; padding: 0; background: transparent !important; color: rgba(255,255,255,0.68); font-size: 8.2px; }
  .snowline-chart-legend span { display: inline-flex; align-items: center; gap: 4px; padding: 0; background: transparent !important; }
  .snowline-chart-key-line { width: 14px; height: 0; border-top: 2px solid; display: inline-block; background: transparent !important; }
  .snowline-chart-key-line.snowline-key { border-color: #70d7ff; }
  .snowline-chart-key-line.terrain-key { border-color: #ffb15b; border-top-style: dashed; }
  .snowline-chart-key-line.now-key { border-color: #ff6b57; }
  .snowline-chart-key-dot { width: 6px; height: 6px; border-radius: 50%; background: white; display: inline-block; }
  .snowline-chart-key-cross { width: 7px; height: 7px; border-radius: 50%; border: 2px solid #ffe45c; display: inline-block; }
  .snowline-chart-key-bar { width: 12px; height: 7px; border-radius: 2px 2px 0 0; background: rgba(70,217,255,0.72); display: inline-block; }
  .plot-wrap { position: relative; }
  svg { display: block; width: 100%; height: auto; margin-top: 1px; overflow: visible; touch-action: none; }
  .plot-bg { fill: rgba(255,255,255,0.025); stroke: rgba(255,255,255,0.07); stroke-width: 1; }
  .snow-zone { fill: rgba(70,217,255,0.07); }
  .grid { stroke: rgba(255,255,255,0.08); stroke-width: 1; }
  .axis { fill: rgba(255,255,255,0.52); font-size: 8px; font-family: sans-serif; }
  .precip-axis { fill: rgba(112,215,255,0.78); font-weight: 700; }
  .terrain-line { stroke: #ffb15b; stroke-width: 1.4; stroke-dasharray: 5 4; opacity: 0.88; }
  .snowline-line { fill: none; stroke: #70d7ff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .now-line { stroke: #ff6b57; stroke-width: 1.5; opacity: 0.92; }
  .now-tag-bg { fill: rgba(255,107,87,0.92); }
  .now-tag { fill: #ffffff; font-size: 7px; font-family: sans-serif; font-weight: 800; }
  .cursor { stroke: rgba(255,255,255,0.48); stroke-width: 1; stroke-dasharray: 2 3; }
  .current-dot { fill: #ffffff; stroke: #70d7ff; stroke-width: 2.2; }
  .crossing-line { stroke: rgba(255,228,92,0.7); stroke-width: 1.4; stroke-dasharray: 3 3; }
  .crossing-dot { fill: #15191e; stroke: #ffe45c; stroke-width: 2.2; }
  .crossing-action { cursor: pointer; pointer-events: stroke; }
  .crossing-dot.crossing-action { pointer-events: all; }
  .inspect-line { stroke: rgba(255,255,255,0.3); stroke-width: 1; }
  .inspect-dot { fill: #15191e; stroke: white; stroke-width: 1.6; }
  .precip-base { stroke: rgba(112,215,255,0.18); stroke-width: 1; }
  .precip-bar { fill: rgba(70,217,255,0.48); }
  .precip-bar.wet { fill: rgba(70,217,255,0.82); }
  .plot-tooltip { position: absolute; z-index: 4; min-width: 112px; transform: translateX(-50%); padding: 5px 7px; border-radius: 6px; background: rgba(8,11,15,0.96); border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 4px 12px rgba(0,0,0,0.35); pointer-events: none; }
  .plot-tooltip b, .plot-tooltip span { display: block; white-space: nowrap; }
  .plot-tooltip b { font-size: 8.7px; color: white; }
  .plot-tooltip span { margin-top: 1px; font-size: 8px; color: rgba(255,255,255,0.72); }
  .chart-foot { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: -2px; }
  .chart-foot span { padding: 5px 3px; border-radius: 6px; background: rgba(255,255,255,0.045); color: rgba(255,255,255,0.62); text-align: center; font-size: 8.2px; }
  .chart-foot b { color: white; font-size: 9px; }
  .chart-foot b.positive { color: #70d7ff; }
  .chart-foot b.negative { color: #ffb15b; }
  .forecast-summary { margin-top: 5px; padding: 4px 6px; border-radius: 6px; background: rgba(255,255,255,0.035); color: rgba(255,255,255,0.58); font-size: 7.8px; line-height: 1.25; text-align: center; }
  .hint { margin-top: 5px; color: rgba(255,255,255,0.38); font-size: 7.5px; line-height: 1.2; text-align: center; }
  .empty { padding: 22px 8px 16px; text-align: center; color: rgba(255,255,255,0.62); font-size: 10px; }
  @media (max-width: 520px) {
    .chart-shell { width: calc(100vw - 20px); padding: 9px 8px 8px; }
    .chart-head small { max-width: 180px; }
    .plot-tooltip { min-width: 104px; }
    .chart-foot span { font-size: 7.6px; }
    .chart-foot b { font-size: 8.4px; }
  }
</style>
