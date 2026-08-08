<div class="chart-shell" role="dialog" aria-modal="false" aria-label="Snowline forecast graph">
  <div class="chart-head">
    <div>
      <b>Snowline forecast</b>
      <small>{placeName || 'Selected point'} · ECMWF</small>
    </div>
    <button type="button" aria-label="Close snowline graph" title="Close" on:click={() => dispatch('close')}>×</button>
  </div>

  {#if chart && chart.points}
    <div class="snowline-chart-legend">
      <span><i class="snowline-chart-key-line snowline-key"></i> Snowline</span>
      {#if chart.terrainY !== null}<span><i class="snowline-chart-key-line terrain-key"></i> Terrain {Math.round(terrainM ?? 0)} m</span>{/if}
      <span><i class="snowline-chart-key-dot"></i> Selected time</span>
      {#if chart.hasPrecip}<span><i class="snowline-chart-key-bar"></i> Precip mm/3h</span>{/if}
    </div>

    <svg viewBox="0 0 360 205" role="img" aria-label="Snowline height and precipitation through forecast time">
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

      {#if chart.currentX !== null && chart.currentY !== null}
        <line x1={chart.currentX} x2={chart.currentX} y1="14" y2="177" class="cursor" />
        <circle cx={chart.currentX} cy={chart.currentY} r="4.4" class="current-dot" />
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

    <div class="chart-foot">
      <span>Min <b>{chart.minSnowline} m</b></span>
      <span>Now <b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
      <span>Max <b>{chart.maxSnowline} m</b></span>
    </div>
    {#if chart.currentPrecip !== null && chart.currentPrecip >= 0.05}
      <div class="precip-now">💧 {formatPrecipMm(chart.currentPrecip)} mm/3h at selected time</div>
    {/if}
    <div class="hint">Blue shading marks heights below local terrain. Precipitation bars show ECMWF 3-hour water-equivalent accumulation.</div>
  {:else}
    <div class="empty">No snowline series is available for this point.</div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';
  import { buildProfile, wetBulbZeroHeight } from './snowLevel';
  import { precipMmAt, formatPrecipMm } from './precip';

  export let point: any;
  export let terrainM: number | null = null;
  export let placeName = '';

  const dispatch = createEventDispatcher<{ close: void }>();
  let timestamp = Date.now();
  let timestampListener: number | null = null;

  type PrecipBar = { x: number; y: number; width: number; height: number; mm: number };
  type ChartData = {
    points: string;
    terrainY: number | null;
    currentX: number | null;
    currentY: number | null;
    minLabel: string;
    midLabel: string;
    maxLabel: string;
    startLabel: string;
    minSnowline: number;
    maxSnowline: number;
    currentSnowline: number | null;
    currentPrecip: number | null;
    precipBars: PrecipBar[];
    hasPrecip: boolean;
  };

  $: chart = buildChart(point, terrainM, timestamp);

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

  function buildChart(p: any, terrain: number | null, target: number): ChartData | null {
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
    const terrainY = terrain !== null && Number.isFinite(terrain) ? Math.max(top, Math.min(bottom, y(terrain))) : null;

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

    return {
      points,
      terrainY,
      currentX,
      currentY,
      minLabel: `${Math.round(min)} m`,
      midLabel: `${Math.round((min + max) / 2)} m`,
      maxLabel: `${Math.round(max)} m`,
      startLabel: formatDay(t0),
      minSnowline: Math.round(Math.min(...snowValues) / 10) * 10,
      maxSnowline: Math.round(Math.max(...snowValues) / 10) * 10,
      currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null,
      currentPrecip: precipMmAt(p.forecast, currentIndex),
      precipBars,
      hasPrecip: validPrecip.some(v => v >= 0.05),
    };
  }

  onMount(() => {
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
    if (timestampListener !== null) try { store.off(timestampListener); } catch {}
  });
</script>

<style lang="less">
  .chart-shell {
    position: fixed; z-index: 10020; left: 50%; top: 68px; transform: translateX(-50%);
    width: min(390px, calc(100vw - 24px)); padding: 10px 10px 9px;
    border: 1px solid rgba(80,190,255,0.45); border-radius: 11px;
    background: rgba(20,24,29,0.975); color: white;
    box-shadow: 0 10px 34px rgba(0,0,0,0.48); backdrop-filter: blur(4px);
  }
  .chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .chart-head b { display: block; font-size: 13px; line-height: 1.05; }
  .chart-head small { display: block; margin-top: 3px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,0.58); font-size: 9px; }
  .chart-head button { width: 23px; height: 23px; padding: 0; border: 0; border-radius: 6px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.82); font-size: 17px; line-height: 20px; cursor: pointer; }
  .chart-head button:hover { background: rgba(255,255,255,0.17); color: white; }
  .snowline-chart-legend { display: flex; flex-wrap: wrap; gap: 9px; margin: 8px 2px 1px; padding: 0; background: transparent !important; color: rgba(255,255,255,0.7); font-size: 8.5px; }
  .snowline-chart-legend span { display: inline-flex; align-items: center; gap: 4px; padding: 0; background: transparent !important; }
  .snowline-chart-key-line { width: 14px; height: 0; border-top: 2px solid; display: inline-block; background: transparent !important; }
  .snowline-chart-key-line.snowline-key { border-color: #70d7ff; }
  .snowline-chart-key-line.terrain-key { border-color: #ffb15b; border-top-style: dashed; }
  .snowline-chart-key-dot { width: 6px; height: 6px; border-radius: 50%; background: white; display: inline-block; }
  .snowline-chart-key-bar { width: 12px; height: 7px; border-radius: 2px 2px 0 0; background: rgba(70,217,255,0.72); display: inline-block; }
  svg { display: block; width: 100%; height: auto; margin-top: 1px; overflow: visible; }
  .plot-bg { fill: rgba(255,255,255,0.025); stroke: rgba(255,255,255,0.07); stroke-width: 1; }
  .snow-zone { fill: rgba(70,217,255,0.07); }
  .grid { stroke: rgba(255,255,255,0.08); stroke-width: 1; }
  .axis { fill: rgba(255,255,255,0.52); font-size: 8px; font-family: sans-serif; }
  .precip-axis { fill: rgba(112,215,255,0.78); font-weight: 700; }
  .terrain-line { stroke: #ffb15b; stroke-width: 1.4; stroke-dasharray: 5 4; opacity: 0.88; }
  .snowline-line { fill: none; stroke: #70d7ff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .cursor { stroke: rgba(255,255,255,0.48); stroke-width: 1; stroke-dasharray: 2 3; }
  .current-dot { fill: #ffffff; stroke: #70d7ff; stroke-width: 2.2; }
  .precip-base { stroke: rgba(112,215,255,0.18); stroke-width: 1; }
  .precip-bar { fill: rgba(70,217,255,0.48); }
  .precip-bar.wet { fill: rgba(70,217,255,0.82); }
  .chart-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: -2px; }
  .chart-foot span { padding: 5px 4px; border-radius: 6px; background: rgba(255,255,255,0.045); color: rgba(255,255,255,0.62); text-align: center; font-size: 8.7px; }
  .chart-foot b { color: white; font-size: 9.5px; }
  .precip-now { margin-top: 5px; padding: 4px 7px; border-radius: 6px; background: rgba(70,217,255,0.08); color: rgba(170,235,255,0.92); text-align: center; font-size: 8.3px; font-weight: 700; }
  .hint { margin-top: 6px; color: rgba(255,255,255,0.44); font-size: 7.8px; line-height: 1.25; text-align: center; }
  .empty { padding: 22px 8px 16px; text-align: center; color: rgba(255,255,255,0.62); font-size: 10px; }
  @media (max-width: 520px) {
    .chart-shell { top: 58px; width: calc(100vw - 20px); padding: 9px 8px 8px; }
    .chart-head small { max-width: 235px; }
  }
</style>
