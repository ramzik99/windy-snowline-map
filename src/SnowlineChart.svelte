<div class="chart-shell" role="dialog" aria-modal="false" aria-label="Snow forecast graph" bind:this={chartShell} style={`left:${position.x}px;top:${position.y}px;transform:none;`}>
  <div class="chart-head">
    <div class="chart-title">
      <b>Snow forecast</b>
      <small>{placeName || 'Selected point'}</small>
      <em>{chart?.validLabel ?? 'ECMWF profile · Windy terrain'}</em>
    </div>
    <div class="chart-actions">
      <button class="png-button" type="button" title="Download PNG" aria-label="Download PNG" disabled={pngBusy} on:click={downloadPng}>{pngBusy ? '…' : 'PNG'}</button>
      <button type="button" title="Back to now" aria-label="Back to now" on:click={resetToNow}>Now</button>
      <button class="drag-button" type="button" title="Drag graph" aria-label="Drag graph" on:pointerdown={startDrag}>↕</button>
      <button type="button" title="Close" aria-label="Close graph" on:click={() => dispatch('close')}>×</button>
    </div>
  </div>

  {#if chart}
    <div class="legend" aria-label="Graph legend">
      <span><i class="line snowline-key"></i>Snowline</span>
      {#if chart.terrainY !== null}<span><i class="line terrain-key"></i>Terrain</span>{/if}
      <span><i class="bar-key"></i>Precip</span>
      <span><i class="line newsnow-key"></i>New snow</span>
      <span><i class="line now-key"></i>Now</span>
    </div>

    <div class="plot-wrap">
      <svg bind:this={svgEl} viewBox="0 0 360 310" role="img" aria-label="Terrain-aware snow forecast through 144 hours" on:pointermove={handlePointer} on:pointerdown={handlePointer} on:pointerleave={() => tooltip = null}>
        <text x="42" y="11" class="section-label">SNOWLINE <tspan>m</tspan></text>
        <rect x="42" y="18" width="306" height="112" rx="8" class="plot-bg" />
        {#if chart.terrainY !== null}
          <rect x="42" y={chart.terrainY} width="306" height={Math.max(0, 130 - chart.terrainY)} class="terrain-zone" />
          <line x1="42" x2="348" y1={chart.terrainY} y2={chart.terrainY} class="terrain-line" />
        {/if}
        <line x1="42" x2="348" y1="18" y2="18" class="grid" />
        <line x1="42" x2="348" y1="74" y2="74" class="grid" />
        <line x1="42" x2="348" y1="130" y2="130" class="grid" />
        <text x="37" y="22" text-anchor="end" class="axis">{chart.maxLabel}</text>
        <text x="37" y="78" text-anchor="end" class="axis">{chart.midLabel}</text>
        <text x="37" y="134" text-anchor="end" class="axis">{chart.minLabel}</text>
        <polyline points={chart.points} class="snowline-line" />

        <text x="42" y="147" class="section-label precip-title">PRECIP <tspan>mm/h</tspan></text>
        <rect x="42" y="153" width="306" height="36" rx="7" class="band-bg" />
        {#if chart.hasPrecip}
          <text x="37" y="159" text-anchor="end" class="axis precip-axis">{chart.precipMaxLabel}</text>
          <text x="37" y="190" text-anchor="end" class="axis">0</text>
          {#each chart.precipBars as bar}<rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="1.1" class="precip-bar" class:wet={bar.mm >= 1} />{/each}
        {:else}
          <text x="195" y="175" text-anchor="middle" class="empty-band">Dry</text>
        {/if}

        <text x="42" y="205" class="section-label phase-title">TYPE</text>
        <rect x="42" y="211" width="306" height="25" rx="7" class="band-bg phase-base" />
        {#each chart.phaseBlocks as block}
          <rect x={block.x} y="212" width={block.width} height="23" rx="3" class={`phase-block phase-${block.key}`} />
          {#if block.width >= 9}<text x={block.x + block.width / 2} y="229" text-anchor="middle" class="phase-icon">{block.icon}</text>{/if}
        {/each}

        <text x="42" y="252" class="section-label snow-title">NEW SNOW <tspan>est. cm</tspan></text>
        <rect x="42" y="258" width="306" height="27" rx="7" class="band-bg" />
        {#if chart.newSnowMax > 0.05}
          <text x="37" y="264" text-anchor="end" class="axis snow-axis">{chart.newSnowMaxLabel}</text>
          <polyline points={chart.newSnowPoints} class="new-snow-line" />
          <path d={chart.newSnowArea} class="new-snow-area" />
        {:else}
          <text x="195" y="275" text-anchor="middle" class="empty-band">0 cm</text>
        {/if}

        {#if chart.nowX !== null}
          <line x1={chart.nowX} x2={chart.nowX} y1="18" y2="285" class="now-line" />
          <rect x={Math.max(43, Math.min(322, chart.nowX - 13))} y="20" width="26" height="12" rx="3" class="now-tag-bg" />
          <text x={Math.max(56, Math.min(335, chart.nowX))} y="29" text-anchor="middle" class="now-tag">Now</text>
        {/if}
        {#if chart.currentX !== null && chart.currentY !== null}
          <line x1={chart.currentX} x2={chart.currentX} y1="18" y2="285" class="cursor" />
          <circle cx={chart.currentX} cy={chart.currentY} r="4.2" class="current-dot" />
        {/if}
        {#if chart.crossingX !== null && chart.terrainY !== null && crossing?.crossingTime}
          <line x1={chart.crossingX} x2={chart.crossingX} y1="34" y2="130" class="crossing-line" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
          <circle cx={chart.crossingX} cy={chart.terrainY} r="4.8" class="crossing-dot" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />
        {/if}
        {#if tooltip}<line x1={tooltip.x} x2={tooltip.x} y1="18" y2="285" class="inspect-line" />{/if}

        <text x="42" y="305" text-anchor="start" class="axis">{chart.startLabel}</text>
        <text x="195" y="305" text-anchor="middle" class="axis">+72 h</text>
        <text x="348" y="305" text-anchor="end" class="axis">+144 h</text>
      </svg>

      {#if tooltip}
        <div class="tooltip" style={`left:${tooltip.cssX}px;top:${tooltip.cssY}px;`}>
          <b>{tooltip.timeLabel}</b>
          {#if tooltip.phase}<strong class={`text-${tooltip.phase.key}`}>{tooltip.phase.icon} {tooltip.phase.label}{tooltip.phase.confidence === 'low' ? ' ~' : ''}</strong>{/if}
          <div class="tip-grid">
            <span>SL <b>{tooltip.snowline !== null ? `${tooltip.snowline} m` : '—'}</b></span>
            <span>Precip <b>{tooltip.precip !== null ? `${formatPrecipMm(tooltip.precip)} mm/h` : '—'}</b></span>
            <span>New snow <b>{formatNewSnowCm(tooltip.newSnow)}</b></span>
            {#if terrainM !== null}<span>Terrain <b>{Math.round(terrainM / 10) * 10} m</b></span>{/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="type-key">
      <span><i class="swatch phase-snow"></i>Snow</span>
      <span><i class="swatch phase-wet-snow"></i>Wet snow</span>
      <span><i class="swatch phase-mix"></i>Mix</span>
      <span><i class="swatch phase-rain"></i>Rain</span>
      <span><i class="swatch phase-ice-pellets"></i>Ice</span>
      <span><i class="swatch phase-freezing-rain"></i>Frz rain</span>
    </div>

    <div class="current-card" class:active-snow={chart.currentPhase?.key === 'snow'} class:active-wet-snow={chart.currentPhase?.key === 'wet-snow'} class:active-mix={chart.currentPhase?.key === 'mix'} class:active-rain={chart.currentPhase?.key === 'rain'} class:active-ice-pellets={chart.currentPhase?.key === 'ice-pellets'} class:active-freezing-rain={chart.currentPhase?.key === 'freezing-rain'}>
      <div class="current-type">
        <b>{chart.currentPhase ? `${chart.currentPhase.icon} ${chart.currentPhase.label}${chart.currentPhase.confidence === 'low' ? ' ~' : ''}` : 'No precip type'}</b>
        {#if chart.currentPhase}<em>{chart.currentPhase.detail}</em>{/if}
      </div>
      <div class="metrics">
        <span><small>Snowline</small><b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
        <span><small>Terrain Δ</small><b>{chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}</b></span>
        <span><small>Precip</small><b>{chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/h` : '—'}</b></span>
        <span><small>New snow</small><b>{formatNewSnowCm(chart.currentNewSnow)}</b></span>
      </div>
    </div>

    <div class="summary">{chart.phaseSummary}</div>
    {#if crossing?.summary}<div class="note">{crossing.summary}</div>{/if}
    <div class="hint">Tap graph for values · click/search map to change location</div>
  {:else}
    <div class="empty">Snow forecast unavailable.</div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';
  import { buildProfile, wetBulbZeroHeight } from './snowLevel';
  import { precipMmAt, formatPrecipMm, PRECIP_THRESHOLD_MM_H } from './precip';
  import { terrainPrecipitationType, type TerrainPrecipType, type TerrainPrecipTypeKey } from './precipType';
  import { terrainCrossingState } from './terrainCrossing';
  import { estimateNewSnowStep, formatNewSnowCm } from './snowAccum';

  export let point: any;
  export let terrainM: number | null = null;
  export let placeName = '';

  const dispatch = createEventDispatcher<{ close: void }>();
  let timestamp = Date.now();
  let realNow = Date.now();
  let timestampListener: number | null = null;
  let realNowTimer: ReturnType<typeof setInterval> | null = null;
  let pngBusy = false;
  let chartShell: HTMLDivElement | null = null;
  let svgEl: SVGSVGElement | null = null;
  let position = { x: 24, y: 60 };
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let tooltip: Tooltip | null = null;

  type Bar = { x: number; y: number; width: number; height: number; mm: number };
  type Block = { x: number; width: number; key: TerrainPrecipTypeKey; icon: string };
  type Tooltip = { x: number; cssX: number; cssY: number; snowline: number | null; precip: number | null; phase: TerrainPrecipType | null; newSnow: number; timeLabel: string };
  type ChartData = {
    points: string; terrainY: number | null; currentX: number | null; currentY: number | null; nowX: number | null; crossingX: number | null;
    minLabel: string; midLabel: string; maxLabel: string; startLabel: string; currentSnowline: number | null; currentTerrainDifference: number | null;
    currentPrecip: number | null; currentPhase: TerrainPrecipType | null; currentNewSnow: number; precipBars: Bar[]; hasPrecip: boolean; precipMaxLabel: string;
    minScale: number; maxScale: number; validLabel: string; phaseBlocks: Block[]; phaseSummary: string; newSnowPoints: string; newSnowArea: string; newSnowMax: number; newSnowMaxLabel: string; cumulativeNewSnow: number[];
  };

  $: crossing = terrainCrossingState(point, terrainM, timestamp);
  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);

  function nearestIndex(times: number[], target: number): number { let best = 0, dist = Infinity; times.forEach((t, i) => { const d = Math.abs(t - target); if (d < dist) { dist = d; best = i; } }); return best; }
  function snowlineAt(p: any, index: number): number | null { try { const v = wetBulbZeroHeight(buildProfile(p.forecast, index)).snowLevelM; return v !== null && Number.isFinite(v) ? v : null; } catch { return null; } }
  function phaseAt(p: any, terrain: number | null, index: number): TerrainPrecipType | null { if (terrain === null || !Number.isFinite(terrain)) return null; const precip = precipMmAt(p.forecast, index); if (precip === null || precip < PRECIP_THRESHOLD_MM_H) return null; return terrainPrecipitationType(buildProfile(p.forecast, index), terrain); }
  function formatTooltipTime(time: number): string { const d = new Date(time); return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })} ${String(d.getUTCHours()).padStart(2, '0')} UTC`; }
  function formatRun(time: number | null): string { if (!Number.isFinite(Number(time))) return 'ECMWF'; return `ECMWF ${String(new Date(Number(time)).getUTCHours()).padStart(2, '0')}Z`; }

  function clampPosition(x: number, y: number) { const rect = chartShell?.getBoundingClientRect(); const w = rect?.width ?? 430, h = rect?.height ?? 570; return { x: Math.max(6, Math.min(window.innerWidth - w - 6, x)), y: Math.max(6, Math.min(window.innerHeight - h - 6, y)) }; }
  function startDrag(event: PointerEvent) { if (!chartShell) return; dragPointerId = event.pointerId; const rect = chartShell.getBoundingClientRect(); dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }; window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', stopDrag, { once: true }); event.preventDefault(); }
  function dragMove(event: PointerEvent) { if (event.pointerId === dragPointerId) position = clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y); }
  function stopDrag(event: PointerEvent) { if (event.pointerId === dragPointerId) dragPointerId = null; window.removeEventListener('pointermove', dragMove); }
  function setTimeline(time: number) { if (!Number.isFinite(time)) return; try { (store as any).set('timestamp', time); timestamp = time; tooltip = null; } catch {} }
  function jumpToCrossing(time: number) { setTimeline(time); }
  function resetToNow() { if (!point?.times?.length) return; realNow = Date.now(); setTimeline(point.times[nearestIndex(point.times, realNow)]); }

  function buildBlocks(p: any, phases: (TerrainPrecipType | null)[], x: (t: number) => number, spacing: number): Block[] {
    const blocks: Block[] = []; let start = -1; let key: TerrainPrecipTypeKey | null = null;
    for (let i = 0; i <= phases.length; i++) {
      const next = i < phases.length ? phases[i]?.key ?? null : null;
      if (next !== key) {
        if (key !== null && start >= 0) {
          const end = i - 1, x1 = Math.max(42, x(p.times[start]) - spacing * .48), x2 = Math.min(348, x(p.times[end]) + spacing * .48), phase = phases[start]!;
          blocks.push({ x: x1, width: Math.max(2.2, x2 - x1), key, icon: phase.icon });
        }
        start = next === null ? -1 : i; key = next;
      }
    }
    return blocks;
  }

  function phaseSummary(phases: (TerrainPrecipType | null)[], precip: (number | null)[], newSnow: number[]): string {
    const amounts: Record<TerrainPrecipTypeKey, number> = { snow: 0, 'wet-snow': 0, mix: 0, rain: 0, 'ice-pellets': 0, 'freezing-rain': 0 }; let total = 0;
    phases.forEach((phase, i) => { const mm = precip[i]; if (!phase || mm === null || mm < PRECIP_THRESHOLD_MM_H) return; amounts[phase.key] += mm; total += mm; });
    const finalSnow = newSnow.length ? newSnow[newSnow.length - 1] : 0;
    if (total < PRECIP_THRESHOLD_MM_H) return 'Dry forecast · no meaningful precipitation.';
    const ranked = (Object.entries(amounts) as [TerrainPrecipTypeKey, number][]).sort((a, b) => b[1] - a[1]); const [key, amount] = ranked[0], pct = Math.round(amount / total * 100);
    const labels: Record<TerrainPrecipTypeKey, string> = { snow: 'Snow', 'wet-snow': 'Wet snow', mix: 'Mix', rain: 'Rain', 'ice-pellets': 'Ice pellets', 'freezing-rain': 'Freezing rain' };
    return `${labels[key]} ${pct}% · new snow est. ${formatNewSnowCm(finalSnow)}`;
  }

  function buildChart(p: any, terrain: number | null, target: number, crossingTime: number | null, now: number): ChartData | null {
    if (!p?.times?.length) return null;
    const entries = p.times.map((time: number, i: number) => ({ time, value: snowlineAt(p, i) })).filter((v: any) => v.value !== null && Number.isFinite(v.value)); if (entries.length < 2) return null;
    const snow = entries.map((v: any) => Number(v.value)), scaleValues = terrain !== null && Number.isFinite(terrain) ? [...snow, terrain] : snow;
    let min = Math.floor((Math.min(...scaleValues) - 150) / 100) * 100, max = Math.ceil((Math.max(...scaleValues) + 150) / 100) * 100; if (max - min < 600) { const mid = (min + max) / 2; min = Math.floor((mid - 300) / 100) * 100; max = Math.ceil((mid + 300) / 100) * 100; }
    const left = 42, right = 348, top = 18, bottom = 130, t0 = p.times[0], t1 = p.times[p.times.length - 1];
    const x = (t: number) => left + (t - t0) / Math.max(1, t1 - t0) * (right - left), y = (v: number) => bottom - (v - min) / Math.max(1, max - min) * (bottom - top);
    const points = entries.map((v: any) => `${x(v.time).toFixed(1)},${y(v.value).toFixed(1)}`).join(' '), currentIndex = nearestIndex(p.times, target), currentValue = snowlineAt(p, currentIndex), currentTime = p.times[currentIndex];
    const currentTerrainDifference = currentValue !== null && terrain !== null ? Math.round((terrain - currentValue) / 10) * 10 : null;
    const precipValues = p.times.map((_: number, i: number) => precipMmAt(p.forecast, i)), validPrecip = precipValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)), precipMax = validPrecip.length ? Math.max(PRECIP_THRESHOLD_MM_H, ...validPrecip) : 0;
    const spacing = (right - left) / Math.max(1, p.times.length - 1), barWidth = Math.max(1.1, Math.min(4.5, spacing * .78));
    const precipBars = precipValues.map((mm: number | null, i: number) => { const value = mm ?? 0, height = precipMax > 0 ? Math.min(30, value / precipMax * 30) : 0; return { x: x(p.times[i]) - barWidth / 2, y: 188 - height, width: barWidth, height, mm: value }; }).filter((b: Bar) => b.height > .1);
    const phases = p.times.map((_: number, i: number) => phaseAt(p, terrain, i));

    const cumulativeNewSnow: number[] = []; let running = 0;
    for (let i = 0; i < p.times.length; i++) {
      const dt = i === 0 ? 1 : Math.max(.25, Math.min(3, (p.times[i] - p.times[i - 1]) / 3600_000));
      running = estimateNewSnowStep(precipValues[i], phases[i], running, dt).cumulativeCm;
      cumulativeNewSnow.push(running);
    }
    const newSnowMax = Math.max(0, ...cumulativeNewSnow), snowTop = 259, snowBottom = 284;
    const snowY = (v: number) => snowBottom - (newSnowMax > 0 ? v / newSnowMax * (snowBottom - snowTop) : 0);
    const newSnowPoints = cumulativeNewSnow.map((v, i) => `${x(p.times[i]).toFixed(1)},${snowY(v).toFixed(1)}`).join(' ');
    const newSnowArea = cumulativeNewSnow.length ? `M ${x(p.times[0]).toFixed(1)} ${snowBottom} L ${newSnowPoints.replace(/,/g, ' ')} L ${x(p.times[p.times.length - 1]).toFixed(1)} ${snowBottom} Z` : '';

    return {
      points, terrainY: terrain !== null ? Math.max(top, Math.min(bottom, y(terrain))) : null, currentX: x(currentTime), currentY: currentValue !== null ? y(currentValue) : null,
      nowX: now >= t0 && now <= t1 ? x(now) : null, crossingX: crossingTime !== null ? x(crossingTime) : null,
      minLabel: `${Math.round(min)} m`, midLabel: `${Math.round((min + max) / 2)} m`, maxLabel: `${Math.round(max)} m`, startLabel: new Date(t0).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
      currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null, currentTerrainDifference, currentPrecip: precipValues[currentIndex] ?? null,
      currentPhase: phases[currentIndex], currentNewSnow: cumulativeNewSnow[currentIndex] ?? 0, precipBars, hasPrecip: validPrecip.some(v => v >= PRECIP_THRESHOLD_MM_H),
      precipMaxLabel: precipMax ? formatPrecipMm(precipMax) : '—', minScale: min, maxScale: max, validLabel: `Valid ${formatTooltipTime(currentTime)} · ${formatRun(p.runTime)}`,
      phaseBlocks: buildBlocks(p, phases, x, spacing), phaseSummary: phaseSummary(phases, precipValues, cumulativeNewSnow), newSnowPoints, newSnowArea, newSnowMax, newSnowMaxLabel: formatNewSnowCm(newSnowMax).replace(' cm', ''), cumulativeNewSnow,
    };
  }

  function handlePointer(event: PointerEvent) {
    if (!svgEl || !chart || !point?.times?.length) return;
    const rect = svgEl.getBoundingClientRect(), vx = (event.clientX - rect.left) / rect.width * 360;
    if (vx < 42 || vx > 348) { tooltip = null; return; }
    const t0 = point.times[0], t1 = point.times[point.times.length - 1], idx = nearestIndex(point.times, t0 + (vx - 42) / 306 * (t1 - t0)), time = point.times[idx], x = 42 + (time - t0) / Math.max(1, t1 - t0) * 306;
    tooltip = { x, cssX: Math.max(92, Math.min(rect.width - 92, x / 360 * rect.width)), cssY: 44, snowline: (() => { const v = snowlineAt(point, idx); return v === null ? null : Math.round(v / 10) * 10; })(), precip: precipMmAt(point.forecast, idx), phase: phaseAt(point, terrainM, idx), newSnow: chart.cumulativeNewSnow[idx] ?? 0, timeLabel: formatTooltipTime(time) };
  }

  async function downloadPng() {
    if (!svgEl || !chart || pngBusy || window.innerWidth <= 520) return;
    pngBusy = true;
    try {
      const clone = svgEl.cloneNode(true) as SVGSVGElement; clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', '1080'); clone.setAttribute('height', '930');
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = 'text{font-family:Arial,sans-serif}.plot-bg,.band-bg{fill:#14212a;stroke:#314753}.terrain-zone{fill:#123945}.grid{stroke:#304551}.axis{fill:#b8c5cd;font-size:8px}.section-label{fill:#dfeaf0;font-size:7px;font-weight:700}.snowline-line{fill:none;stroke:#67d7ff;stroke-width:2.7}.terrain-line{stroke:#ffae56;stroke-width:1.5;stroke-dasharray:5 4}.precip-bar{fill:#3794b8}.precip-bar.wet{fill:#64d4f5}.phase-snow{fill:#36bde8}.phase-wet-snow{fill:#8fd9ed}.phase-mix{fill:#e4c94e}.phase-rain{fill:#4c72e8}.phase-ice-pellets{fill:#8d72e8}.phase-freezing-rain{fill:#e45aa9}.phase-block{opacity:.92}.phase-icon{fill:white;font-size:10px}.new-snow-line{fill:none;stroke:#82e398;stroke-width:2}.new-snow-area{fill:#82e398;opacity:.18}.now-line{stroke:#ff6759}.now-tag-bg{fill:#ff6759}.now-tag{fill:white;font-size:7px}.cursor{stroke:#fff;stroke-dasharray:2 3}.current-dot{fill:white;stroke:#67d7ff;stroke-width:2}.crossing-line{stroke:#ffe05b;stroke-dasharray:3 3}.crossing-dot{fill:#111;stroke:#ffe05b;stroke-width:2}.empty-band{fill:#8596a2;font-size:7px}';
      clone.insertBefore(style, clone.firstChild);
      const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob), img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1280; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No canvas');
      ctx.fillStyle = '#0d151b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff'; ctx.font = '700 44px Arial'; ctx.fillText('Snow forecast', 52, 62);
      ctx.fillStyle = '#cbd7de'; ctx.font = '24px Arial'; ctx.fillText(placeName || 'Selected point', 52, 100);
      ctx.fillStyle = '#72cef4'; ctx.font = '20px Arial'; ctx.fillText(chart.validLabel, 52, 132);
      ctx.drawImage(img, 45, 155, 1110, 955); URL.revokeObjectURL(url);
      let y = 1142; ctx.fillStyle = '#ffffff'; ctx.font = '700 30px Arial'; ctx.fillText(chart.currentPhase ? `${chart.currentPhase.icon} ${chart.currentPhase.label}${chart.currentPhase.confidence === 'low' ? ' ~' : ''}` : 'No precip type', 52, y);
      y += 34; ctx.fillStyle = '#b8c8d1'; ctx.font = '22px Arial';
      const metrics = [`Snowline ${chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}`, `Terrain Δ ${chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}`, `Precip ${chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/h` : '—'}`, `New snow ${formatNewSnowCm(chart.currentNewSnow)}`];
      ctx.fillText(metrics.join('   ·   '), 52, y);
      y += 38; ctx.fillStyle = '#dfeaf0'; ctx.font = '700 21px Arial'; ctx.fillText(chart.phaseSummary, 52, y);
      y += 30; ctx.fillStyle = '#8799a4'; ctx.font = '18px Arial'; ctx.fillText('New snow is a terrain-aware forecast estimate from precipitation type and wet-bulb profile; it is not total pre-existing snowpack.', 52, y);
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(v => v ? resolve(v) : reject(new Error('PNG failed')), 'image/png'));
      const href = URL.createObjectURL(png), a = document.createElement('a'); a.href = href; a.download = `snow-forecast-${(placeName || 'point').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 30000);
    } catch (e) { console.warn('Snow forecast PNG export failed', e); } finally { pngBusy = false; }
  }

  onMount(() => {
    const width = Math.min(430, window.innerWidth - 16); position = { x: Math.max(6, (window.innerWidth - width) / 2), y: window.innerWidth <= 520 ? 34 : 54 };
    realNow = Date.now(); realNowTimer = setInterval(() => realNow = Date.now(), 30000);
    try { const t = store.get('timestamp'); if (typeof t === 'number') timestamp = t; timestampListener = store.on('timestamp', (v: any) => { const n = Number(v); if (Number.isFinite(n)) timestamp = n; }); } catch {}
  });
  onDestroy(() => { if (realNowTimer) clearInterval(realNowTimer); window.removeEventListener('pointermove', dragMove); if (timestampListener !== null) try { store.off(timestampListener); } catch {} });
</script>

<style lang="less">
  .chart-shell{position:fixed;z-index:10020;width:min(430px,calc(100vw - 16px));padding:11px 12px 10px;border:1px solid rgba(98,213,255,.35);border-radius:14px;background:linear-gradient(180deg,rgba(15,24,31,.99),rgba(9,17,23,.99));color:white;box-shadow:0 16px 42px rgba(0,0,0,.56);backdrop-filter:blur(6px)}
  .chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.chart-title{min-width:0;flex:1}.chart-title b{display:block;font-size:15px}.chart-title small,.chart-title em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal}.chart-title small{margin-top:3px;color:rgba(255,255,255,.76);font-size:9px}.chart-title em{margin-top:2px;color:rgba(112,206,244,.8);font-size:8px}.chart-actions{display:flex;gap:4px}.chart-actions button{height:26px;min-width:26px;padding:0 7px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.075);color:#fff;font-size:12px;font-weight:800;cursor:pointer}.chart-actions button:hover{background:rgba(98,213,255,.15)}.png-button{font-size:8px!important}.drag-button{cursor:grab!important;touch-action:none}
  .legend{display:flex;flex-wrap:wrap;gap:7px 11px;margin:7px 3px 3px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);color:#9fb0ba;font-size:7.5px;text-shadow:none}.legend span{display:inline-flex;align-items:center;gap:4px}.line{width:14px;border-top:2px solid}.snowline-key{border-color:#65d5ff}.terrain-key{border-color:#ffae56;border-top-style:dashed}.now-key{border-color:#ff6658}.newsnow-key{border-color:#82e398}.bar-key{width:11px;height:7px;border-radius:2px 2px 0 0;background:#5ec8e9}
  .plot-wrap{position:relative}svg{display:block;width:100%;height:auto;overflow:visible;touch-action:none}.plot-bg,.band-bg{fill:rgba(255,255,255,.025);stroke:rgba(104,151,177,.22);stroke-width:1}.terrain-zone{fill:rgba(55,190,232,.09)}.grid{stroke:rgba(160,196,216,.13)}.axis{fill:rgba(220,231,238,.58);font-size:8px;font-family:sans-serif}.section-label{fill:rgba(226,236,243,.84);font-size:6.8px;font-family:sans-serif;font-weight:800;letter-spacing:.35px}.section-label tspan{fill:rgba(255,255,255,.4);font-weight:500}.precip-title,.precip-axis{fill:#64d4f5}.phase-title{fill:#e8d86d}.snow-title,.snow-axis{fill:#82e398}.terrain-line{stroke:#ffae56;stroke-width:1.5;stroke-dasharray:5 4}.snowline-line{fill:none;stroke:#65d5ff;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round}.now-line{stroke:#ff6658;stroke-width:1.25}.now-tag-bg{fill:#ff6658}.now-tag{fill:#fff;font-size:7px;font-family:sans-serif;font-weight:800}.cursor{stroke:rgba(235,243,248,.58);stroke-width:1;stroke-dasharray:2 3}.current-dot{fill:#fff;stroke:#65d5ff;stroke-width:2.3}.crossing-line{stroke:#ffe05b;stroke-width:1.3;stroke-dasharray:3 3;cursor:pointer}.crossing-dot{fill:#12191f;stroke:#ffe05b;stroke-width:2.1;cursor:pointer}.inspect-line{stroke:rgba(255,255,255,.32)}.precip-bar{fill:#3f9fbe;opacity:.7}.precip-bar.wet{fill:#67d6f5;opacity:.95}.phase-base{fill:#0d161c}.phase-block{opacity:.9}.phase-snow{fill:#29bce8}.phase-wet-snow{fill:#8edcef}.phase-mix{fill:#e7ca45}.phase-rain{fill:#4b72e8}.phase-ice-pellets{fill:#8a70e8}.phase-freezing-rain{fill:#e45cae}.phase-icon{fill:#fff;font-size:9.5px;font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;paint-order:stroke;stroke:rgba(0,0,0,.45);stroke-width:.7px}.new-snow-area{fill:#82e398;opacity:.16}.new-snow-line{fill:none;stroke:#82e398;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.empty-band{fill:rgba(255,255,255,.34);font-size:7px;font-family:sans-serif}
  .tooltip{position:absolute;z-index:4;min-width:176px;transform:translateX(-50%);padding:7px 9px;border-radius:9px;background:rgba(5,12,17,.99);border:1px solid rgba(98,213,255,.25);box-shadow:0 7px 20px rgba(0,0,0,.44);pointer-events:none}.tooltip>b{display:block;font-size:8.8px}.tooltip>strong{display:block;margin:3px 0 5px;font-size:9.2px}.tip-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 9px}.tip-grid span{font-size:7.3px;color:#8fa0aa}.tip-grid b{color:#eaf3f7;font-weight:800}.text-snow{color:#69dafd}.text-wet-snow{color:#b4edfb}.text-mix{color:#e8df73}.text-rain{color:#8caaff}.text-ice-pellets{color:#b9a6ff}.text-freezing-rain{color:#ff9bd6}
  .type-key{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px;margin:2px 3px 6px;color:#9fb0ba;font-size:6.9px;text-shadow:none}.type-key span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.swatch{display:inline-block;width:8px;height:8px;border-radius:2px}
  .current-card{margin-top:4px;padding:7px;border:1px solid rgba(255,255,255,.07);border-left:3px solid rgba(255,255,255,.28);border-radius:9px;background:rgba(255,255,255,.035)}.active-snow{border-left-color:#29bce8}.active-wet-snow{border-left-color:#8edcef}.active-mix{border-left-color:#e7ca45}.active-rain{border-left-color:#4b72e8}.active-ice-pellets{border-left-color:#8a70e8}.active-freezing-rain{border-left-color:#e45cae}.current-type{text-align:center}.current-type b{display:block;font-size:11px}.current-type em{display:block;margin-top:2px;color:#c3a94c;font-size:6.8px;font-style:normal}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px}.metrics span{padding:5px 2px;border-radius:7px;background:rgba(255,255,255,.04);text-align:center;min-width:0}.metrics small{display:block;color:#7f909a;font-size:5.8px}.metrics b{display:block;margin-top:1px;font-size:7px;white-space:nowrap}
  .summary{margin-top:6px;padding:5px 7px;border-radius:7px;background:rgba(98,213,255,.06);border:1px solid rgba(98,213,255,.1);color:#dceaf0;font-size:7.8px;font-weight:700;text-align:center}.note{margin-top:4px;color:#d7bc4e;font-size:7.2px;text-align:center}.hint{margin-top:5px;color:#66757e;font-size:6.7px;text-align:center}.empty{padding:25px 8px;text-align:center;color:#8a9aa4;font-size:10px}
  @media(max-width:520px){.chart-shell{width:calc(100vw - 12px);padding:9px;border-radius:12px}.png-button{display:none!important}.chart-title small,.chart-title em{max-width:180px}.legend{gap:5px 8px}.type-key{gap:4px 7px}.metrics{gap:3px}.metrics small{font-size:5.3px}.metrics b{font-size:6.4px}.tooltip{min-width:158px}}
</style>
