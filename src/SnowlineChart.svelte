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
    <div class="legend">
      <span><i class="line snowline-key"></i>Snowline</span>
      {#if chart.terrainY !== null}<span><i class="line terrain-key"></i>Terrain</span>{/if}
      <span><i class="line now-key"></i>Now</span>
      <span><i class="bar-key"></i>Precip</span>
    </div>

    <div class="plot-wrap">
      <svg bind:this={svgEl} viewBox="0 0 360 272" role="img" aria-label="Terrain-aware snow forecast through 144 hours" on:pointermove={handlePointer} on:pointerdown={handlePointer} on:pointerleave={() => tooltip = null}>
        <text x="42" y="11" class="section-label">SNOWLINE <tspan>m</tspan></text>
        <rect x="42" y="18" width="306" height="112" rx="8" class="plot-bg" />
        {#if chart.terrainY !== null}
          <rect x="42" y={chart.terrainY} width="306" height={Math.max(0, 130 - chart.terrainY)} class="terrain-zone" />
          <line x1="42" x2="348" y1={chart.terrainY} y2={chart.terrainY} class="terrain-line" />
        {/if}
        <line x1="42" x2="348" y1="18" y2="18" class="grid" /><line x1="42" x2="348" y1="74" y2="74" class="grid" /><line x1="42" x2="348" y1="130" y2="130" class="grid" />
        <text x="37" y="22" text-anchor="end" class="axis">{chart.maxLabel}</text><text x="37" y="78" text-anchor="end" class="axis">{chart.midLabel}</text><text x="37" y="134" text-anchor="end" class="axis">{chart.minLabel}</text>
        <polyline points={chart.points} class="snowline-line" />

        <text x="42" y="147" class="section-label precip-title">PRECIPITATION <tspan>mm/h</tspan></text>
        <rect x="42" y="153" width="306" height="34" rx="7" class="band-bg" />
        {#if chart.hasPrecip}
          <text x="37" y="158" text-anchor="end" class="axis precip-axis">{chart.precipMaxLabel}</text><text x="37" y="188" text-anchor="end" class="axis">0</text>
          {#each chart.precipBars as bar}<rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="1.2" class:wet={bar.mm >= 1} class="precip-bar" />{/each}
        {:else}<text x="195" y="175" text-anchor="middle" class="empty-band">No precipitation ≥0.1 mm/h</text>{/if}

        <text x="42" y="202" class="section-label phase-title">PRECIPITATION TYPE <tspan>profile + terrain</tspan></text>
        <rect x="42" y="208" width="306" height="27" rx="7" class="band-bg" />
        {#each chart.phaseBlocks as block}
          <rect x={block.x} y="209" width={block.width} height="25" rx="4" class={`phase-block phase-${block.key}`} />
          {#if block.width >= 12}<text x={block.x + block.width / 2} y="227" text-anchor="middle" class="phase-icon">{block.icon}</text>{/if}
        {/each}
        {#if !chart.phaseBlocks.length}<text x="195" y="226" text-anchor="middle" class="empty-band">No type to classify</text>{/if}

        {#if chart.nowX !== null}<line x1={chart.nowX} x2={chart.nowX} y1="18" y2="235" class="now-line" /><rect x={Math.max(43, Math.min(322, chart.nowX - 13))} y="20" width="26" height="12" rx="3" class="now-tag-bg" /><text x={Math.max(56, Math.min(335, chart.nowX))} y="29" text-anchor="middle" class="now-tag">Now</text>{/if}
        {#if chart.currentX !== null && chart.currentY !== null}<line x1={chart.currentX} x2={chart.currentX} y1="18" y2="235" class="cursor" /><circle cx={chart.currentX} cy={chart.currentY} r="4.2" class="current-dot" />{/if}
        {#if chart.crossingX !== null && chart.terrainY !== null && crossing?.crossingTime}<line x1={chart.crossingX} x2={chart.crossingX} y1="34" y2="130" class="crossing-line" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} /><circle cx={chart.crossingX} cy={chart.terrainY} r="4.8" class="crossing-dot" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />{/if}
        {#if tooltip}<line x1={tooltip.x} x2={tooltip.x} y1="18" y2="235" class="inspect-line" />{#if tooltip.snowlineY !== null}<circle cx={tooltip.x} cy={tooltip.snowlineY} r="3.6" class="inspect-dot" />{/if}{/if}

        <text x="42" y="263" text-anchor="start" class="axis">{chart.startLabel}</text><text x="195" y="263" text-anchor="middle" class="axis">+72 h</text><text x="348" y="263" text-anchor="end" class="axis">+144 h</text>
      </svg>

      {#if tooltip}
        <div class="tooltip" style={`left:${tooltip.cssX}px;top:${tooltip.cssY}px;`}>
          <b>{tooltip.timeLabel}</b>
          {#if tooltip.phase}<strong class={`text-${tooltip.phase.key}`}>{tooltip.phase.icon} {tooltip.phase.label}{tooltip.phase.confidence === 'low' ? ' ~' : ''}</strong>{/if}
          <span>Snowline {tooltip.snowline !== null ? `${tooltip.snowline} m` : '—'}</span>
          {#if terrainM !== null}<span>Terrain {Math.round(terrainM / 10) * 10} m</span>{/if}
          <span>Precip {tooltip.precip !== null ? `${formatPrecipMm(tooltip.precip)} mm/h` : '—'}</span>
          {#if tooltip.phase}<small>{tooltip.phase.detail}</small>{/if}
        </div>
      {/if}
    </div>

    <div class="type-key">
      <span>❄ Snow</span><span>❄ Wet snow</span><span>🌨 Mix</span><span>🌧 Rain</span><span>🧊 Ice pellets</span><span>⚠ Freezing rain</span><small>classified only at ≥0.1 mm/h</small>
    </div>

    <div class="current-card" class:active-snow={chart.currentPhase?.key === 'snow'} class:active-wet-snow={chart.currentPhase?.key === 'wet-snow'} class:active-mix={chart.currentPhase?.key === 'mix'} class:active-rain={chart.currentPhase?.key === 'rain'} class:active-ice-pellets={chart.currentPhase?.key === 'ice-pellets'} class:active-freezing-rain={chart.currentPhase?.key === 'freezing-rain'}>
      <div class="current-type">
        <small>Selected time</small>
        <b>{chart.currentPhase ? `${chart.currentPhase.icon} ${chart.currentPhase.label}` : 'No precip type'}</b>
        {#if chart.currentPhase}<em>{chart.currentPhase.detail}{chart.currentPhase.confidence === 'low' ? ' · lower confidence' : ''}</em>{/if}
      </div>
      <div class="metrics">
        <span><small>Snowline</small><b>{chart.currentSnowline !== null ? `${chart.currentSnowline} m` : '—'}</b></span>
        <span><small>Terrain Δ</small><b>{chart.currentTerrainDifference !== null ? `${chart.currentTerrainDifference >= 0 ? '+' : ''}${chart.currentTerrainDifference} m` : '—'}</b></span>
        <span><small>Precip</small><b>{chart.currentPrecip !== null ? `${formatPrecipMm(chart.currentPrecip)} mm/h` : '—'}</b></span>
        <span class="depth-card"><small>Snow depth</small>{#if snowDepthLayerActive}<b>{snowDepthLoading ? '…' : formatMapSnowDepthCm(currentSnowDepthCm)}</b>{:else}<button type="button" on:click={openSnowDepthLayer}>Open layer</button>{/if}</span>
      </div>
    </div>

    <div class="summary">{chart.phaseSummary}</div>
    {#if crossing?.summary}<div class="note">{crossing.summary}</div>{/if}
    <div class="hint">Click or search another location — this graph updates without closing.</div>
  {:else}
    <div class="empty">Snow forecast unavailable for this point.</div>
  {/if}
</div>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import store from '@windy/store';
  import { buildProfile, wetBulbZeroHeight } from './snowLevel';
  import { precipMmAt, formatPrecipMm, PRECIP_THRESHOLD_MM_H } from './precip';
  import { terrainPrecipitationType, type TerrainPrecipType, type TerrainPrecipTypeKey } from './precipType';
  import { terrainCrossingState } from './terrainCrossing';
  import { currentMapSnowDepthCm, formatMapSnowDepthCm } from './mapSnowDepth';

  export let point: any;
  export let terrainM: number | null = null;
  export let placeName = '';

  const dispatch = createEventDispatcher<{ close: void }>();
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
  let pngBusy = false;
  let chartShell: HTMLDivElement | null = null;
  let svgEl: SVGSVGElement | null = null;
  let position = { x: 24, y: 60 };
  let dragPointerId: number | null = null;
  let dragOffset = { x: 0, y: 0 };
  let tooltip: Tooltip | null = null;

  type Bar = { x: number; y: number; width: number; height: number; mm: number };
  type Block = { x: number; width: number; key: TerrainPrecipTypeKey; icon: string };
  type Tooltip = { x: number; cssX: number; cssY: number; snowlineY: number | null; snowline: number | null; precip: number | null; phase: TerrainPrecipType | null; timeLabel: string };
  type ChartData = { points: string; terrainY: number | null; currentX: number | null; currentY: number | null; nowX: number | null; crossingX: number | null; minLabel: string; midLabel: string; maxLabel: string; startLabel: string; currentSnowline: number | null; currentTerrainDifference: number | null; currentPrecip: number | null; currentPhase: TerrainPrecipType | null; precipBars: Bar[]; hasPrecip: boolean; precipMaxLabel: string; minScale: number; maxScale: number; validLabel: string; phaseBlocks: Block[]; phaseSummary: string };

  $: crossing = terrainCrossingState(point, terrainM, timestamp);
  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);
  $: if (point) { currentSnowDepthCm = null; scheduleCurrentSnowDepth(360); }

  function nearestIndex(times: number[], target: number): number { let best = 0, dist = Infinity; times.forEach((t, i) => { const d = Math.abs(t - target); if (d < dist) { dist = d; best = i; } }); return best; }
  function snowlineAt(p: any, index: number): number | null { try { const v = wetBulbZeroHeight(buildProfile(p.forecast, index)).snowLevelM; return v !== null && Number.isFinite(v) ? v : null; } catch { return null; } }
  function phaseAt(p: any, terrain: number | null, index: number): TerrainPrecipType | null { if (terrain === null || !Number.isFinite(terrain)) return null; const precip = precipMmAt(p.forecast, index); if (precip === null || precip < PRECIP_THRESHOLD_MM_H) return null; return terrainPrecipitationType(buildProfile(p.forecast, index), terrain); }
  function formatTooltipTime(time: number): string { const d = new Date(time); return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })} ${String(d.getUTCHours()).padStart(2, '0')} UTC`; }
  function formatRun(time: number | null): string { if (!Number.isFinite(Number(time))) return 'ECMWF'; return `ECMWF ${String(new Date(Number(time)).getUTCHours()).padStart(2, '0')}Z`; }

  function clampPosition(x: number, y: number) { const rect = chartShell?.getBoundingClientRect(); const w = rect?.width ?? 430, h = rect?.height ?? 520; return { x: Math.max(6, Math.min(window.innerWidth - w - 6, x)), y: Math.max(6, Math.min(window.innerHeight - h - 6, y)) }; }
  function startDrag(event: PointerEvent) { if (!chartShell) return; dragPointerId = event.pointerId; const rect = chartShell.getBoundingClientRect(); dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }; window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', stopDrag, { once: true }); event.preventDefault(); }
  function dragMove(event: PointerEvent) { if (event.pointerId === dragPointerId) position = clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y); }
  function stopDrag(event: PointerEvent) { if (event.pointerId === dragPointerId) dragPointerId = null; window.removeEventListener('pointermove', dragMove); }
  function setTimeline(time: number) { if (!Number.isFinite(time)) return; try { (store as any).set('timestamp', time); timestamp = time; tooltip = null; } catch {} }
  function jumpToCrossing(time: number) { setTimeline(time); }
  function resetToNow() { if (!point?.times?.length) return; realNow = Date.now(); setTimeline(point.times[nearestIndex(point.times, realNow)]); }

  function updateDepthState(): boolean { try { const overlay = store.get('overlay'), product = store.get('product'); snowDepthLayerActive = overlay === 'snowcover' && (!product || product === 'ecmwf'); } catch { snowDepthLayerActive = false; } if (!snowDepthLayerActive) currentSnowDepthCm = null; return snowDepthLayerActive; }
  function openSnowDepthLayer() { try { try { (store as any).set('product', 'ecmwf'); } catch {} try { (store as any).set('level', 'surface'); } catch {} (store as any).set('overlay', 'snowcover'); updateDepthState(); scheduleCurrentSnowDepth(600); } catch {} }
  function scheduleCurrentSnowDepth(delay = 300) { const generation = ++snowDepthGeneration; if (snowDepthTimer) clearTimeout(snowDepthTimer); if (!updateDepthState()) { snowDepthLoading = false; return; } snowDepthLoading = true; snowDepthTimer = setTimeout(async () => { const lat = Number(point?.lat), lon = Number(point?.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) { snowDepthLoading = false; return; } const value = await currentMapSnowDepthCm(lat, lon, timestamp); if (generation !== snowDepthGeneration) return; currentSnowDepthCm = value; snowDepthLoading = false; }, delay); }

  function buildBlocks(p: any, terrain: number | null, x: (t: number) => number, spacing: number): Block[] {
    const phases = p.times.map((_: number, i: number) => phaseAt(p, terrain, i)); const blocks: Block[] = []; let start = -1; let key: TerrainPrecipTypeKey | null = null;
    for (let i = 0; i <= phases.length; i++) { const next = i < phases.length ? phases[i]?.key ?? null : null; if (next !== key) { if (key !== null && start >= 0) { const end = i - 1, x1 = Math.max(42, x(p.times[start]) - spacing * .46), x2 = Math.min(348, x(p.times[end]) + spacing * .46); const phase = phases[start]!; blocks.push({ x: x1, width: Math.max(3, x2 - x1), key, icon: phase.icon }); } start = next === null ? -1 : i; key = next; } }
    return blocks;
  }

  function phaseSummary(phases: (TerrainPrecipType | null)[], precip: (number | null)[]): string {
    const amounts: Record<TerrainPrecipTypeKey, number> = { snow: 0, 'wet-snow': 0, mix: 0, rain: 0, 'ice-pellets': 0, 'freezing-rain': 0 }; let total = 0;
    phases.forEach((phase, i) => { const mm = precip[i]; if (!phase || mm === null || mm < PRECIP_THRESHOLD_MM_H) return; amounts[phase.key] += mm; total += mm; });
    if (total < PRECIP_THRESHOLD_MM_H) return 'Little or no precipitation to classify.';
    const ranked = (Object.entries(amounts) as [TerrainPrecipTypeKey, number][]).sort((a, b) => b[1] - a[1]); const [key, amount] = ranked[0]; const pct = Math.round(amount / total * 100);
    const labels: Record<TerrainPrecipTypeKey, string> = { snow: 'Snow', 'wet-snow': 'Wet snow', mix: 'Rain/snow mix', rain: 'Rain', 'ice-pellets': 'Ice pellets', 'freezing-rain': 'Freezing rain' };
    if (pct >= 55) return `${labels[key]} favoured for ${pct}% of forecast precipitation.`;
    return `Variable precipitation type · leading signal: ${labels[key]} (${pct}%).`;
  }

  function buildChart(p: any, terrain: number | null, target: number, crossingTime: number | null, now: number): ChartData | null {
    if (!p?.times?.length) return null;
    const entries = p.times.map((time: number, i: number) => ({ time, value: snowlineAt(p, i) })).filter((v: any) => v.value !== null && Number.isFinite(v.value)); if (entries.length < 2) return null;
    const snow = entries.map((v: any) => Number(v.value)), scaleValues = terrain !== null && Number.isFinite(terrain) ? [...snow, terrain] : snow;
    let min = Math.floor((Math.min(...scaleValues) - 150) / 100) * 100, max = Math.ceil((Math.max(...scaleValues) + 150) / 100) * 100; if (max - min < 600) { const mid = (min + max) / 2; min = Math.floor((mid - 300) / 100) * 100; max = Math.ceil((mid + 300) / 100) * 100; }
    const left = 42, right = 348, top = 18, bottom = 130, t0 = p.times[0], t1 = p.times[p.times.length - 1]; const x = (t: number) => left + (t - t0) / Math.max(1, t1 - t0) * (right - left); const y = (v: number) => bottom - (v - min) / Math.max(1, max - min) * (bottom - top);
    const points = entries.map((v: any) => `${x(v.time).toFixed(1)},${y(v.value).toFixed(1)}`).join(' '), currentIndex = nearestIndex(p.times, target), currentValue = snowlineAt(p, currentIndex), currentTime = p.times[currentIndex];
    const currentTerrainDifference = currentValue !== null && terrain !== null ? Math.round((terrain - currentValue) / 10) * 10 : null;
    const precipValues = p.times.map((_: number, i: number) => precipMmAt(p.forecast, i)), validPrecip = precipValues.filter((v: number | null): v is number => v !== null && Number.isFinite(v)), precipMax = validPrecip.length ? Math.max(PRECIP_THRESHOLD_MM_H, ...validPrecip) : 0;
    const spacing = (right - left) / Math.max(1, p.times.length - 1), barWidth = Math.max(1.2, Math.min(5, spacing * .74)); const precipBars = precipValues.map((mm: number | null, i: number) => { const value = mm ?? 0, height = precipMax > 0 ? Math.min(29, value / precipMax * 29) : 0; return { x: x(p.times[i]) - barWidth / 2, y: 187 - height, width: barWidth, height, mm: value }; }).filter((b: Bar) => b.height > .12);
    const phases = p.times.map((_: number, i: number) => phaseAt(p, terrain, i));
    return { points, terrainY: terrain !== null ? Math.max(top, Math.min(bottom, y(terrain))) : null, currentX: x(currentTime), currentY: currentValue !== null ? y(currentValue) : null, nowX: now >= t0 && now <= t1 ? x(now) : null, crossingX: crossingTime !== null ? x(crossingTime) : null, minLabel: `${Math.round(min)} m`, midLabel: `${Math.round((min + max) / 2)} m`, maxLabel: `${Math.round(max)} m`, startLabel: new Date(t0).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }), currentSnowline: currentValue !== null ? Math.round(currentValue / 10) * 10 : null, currentTerrainDifference, currentPrecip: precipValues[currentIndex] ?? null, currentPhase: phases[currentIndex], precipBars, hasPrecip: validPrecip.some(v => v >= PRECIP_THRESHOLD_MM_H), precipMaxLabel: precipMax ? formatPrecipMm(precipMax) : '—', minScale: min, maxScale: max, validLabel: `Valid ${formatTooltipTime(currentTime)} · ${formatRun(p.runTime)}`, phaseBlocks: buildBlocks(p, terrain, x, spacing), phaseSummary: phaseSummary(phases, precipValues) };
  }

  function handlePointer(event: PointerEvent) {
    if (!svgEl || !chart || !point?.times?.length) return; const rect = svgEl.getBoundingClientRect(); const vx = (event.clientX - rect.left) / rect.width * 360; if (vx < 42 || vx > 348) { tooltip = null; return; }
    const t0 = point.times[0], t1 = point.times[point.times.length - 1], idx = nearestIndex(point.times, t0 + (vx - 42) / 306 * (t1 - t0)), time = point.times[idx], raw = snowlineAt(point, idx), x = 42 + (time - t0) / Math.max(1, t1 - t0) * 306, snowlineY = raw !== null ? 130 - (raw - chart.minScale) / Math.max(1, chart.maxScale - chart.minScale) * 112 : null;
    tooltip = { x, cssX: Math.max(86, Math.min(rect.width - 86, x / 360 * rect.width)), cssY: Math.max(8, Math.min(rect.height - 112, (snowlineY !== null ? snowlineY / 272 * rect.height - 78 : 28))), snowlineY, snowline: raw !== null ? Math.round(raw / 10) * 10 : null, precip: precipMmAt(point.forecast, idx), phase: phaseAt(point, terrainM, idx), timeLabel: formatTooltipTime(time) };
  }

  async function downloadPng() {
    if (!svgEl || pngBusy || window.innerWidth <= 520) return; pngBusy = true;
    try { const clone = svgEl.cloneNode(true) as SVGSVGElement; clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', '1080'); clone.setAttribute('height', '816'); const style = document.createElementNS('http://www.w3.org/2000/svg', 'style'); style.textContent = 'text{font-family:Arial,sans-serif}.plot-bg,.band-bg{fill:#14212a;stroke:#314753}.terrain-zone{fill:#123945}.grid{stroke:#304551}.axis{fill:#b8c5cd;font-size:8px}.section-label{fill:#e5eef3;font-size:7px;font-weight:700}.snowline-line{fill:none;stroke:#67d7ff;stroke-width:2.7}.terrain-line{stroke:#ffae56;stroke-width:1.5;stroke-dasharray:5 4}.precip-bar{fill:#4baac9}.precip-bar.wet{fill:#66d4f3}.phase-block{opacity:.55}.phase-snow{fill:#55c9f0}.phase-wet-snow{fill:#9cdef2}.phase-mix{fill:#d8d267}.phase-rain{fill:#627ff0}.phase-ice-pellets{fill:#a98cf5}.phase-freezing-rain{fill:#ee7dc4}.phase-icon{fill:white;font-size:10px}.now-line{stroke:#ff6759}.now-tag-bg{fill:#ff6759}.now-tag{fill:white;font-size:7px}.cursor{stroke:#fff;stroke-dasharray:2 3}.current-dot{fill:white;stroke:#67d7ff;stroke-width:2}.crossing-line{stroke:#ffe05b;stroke-dasharray:3 3}.crossing-dot{fill:#111;stroke:#ffe05b;stroke-width:2}.empty-band{fill:#8596a2;font-size:7px}'; clone.insertBefore(style, clone.firstChild); const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob), img = new Image(); await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); img.src = url; }); const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 980; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error(); ctx.fillStyle = '#0d151b'; ctx.fillRect(0, 0, 1080, 980); ctx.fillStyle = '#fff'; ctx.font = '700 38px Arial'; ctx.fillText('Snow forecast', 44, 55); ctx.fillStyle = '#cbd7de'; ctx.font = '22px Arial'; ctx.fillText(placeName || 'Selected point', 44, 90); ctx.drawImage(img, 0, 125, 1080, 816); URL.revokeObjectURL(url); const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(v => v ? resolve(v) : reject(), 'image/png')); const href = URL.createObjectURL(png), a = document.createElement('a'); a.href = href; a.download = `snow-forecast-${(placeName || 'point').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 30000); } catch (e) { console.warn('Snow forecast PNG export failed', e); } finally { pngBusy = false; }
  }

  onMount(() => {
    const width = Math.min(430, window.innerWidth - 16); position = { x: Math.max(6, (window.innerWidth - width) / 2), y: window.innerWidth <= 520 ? 34 : 54 }; realNow = Date.now(); realNowTimer = setInterval(() => realNow = Date.now(), 30000);
    try { const t = store.get('timestamp'); if (typeof t === 'number') timestamp = t; timestampListener = store.on('timestamp', (v: any) => { const n = Number(v); if (Number.isFinite(n)) timestamp = n; scheduleCurrentSnowDepth(320); }); } catch {}
    try { overlayListener = store.on('overlay', () => scheduleCurrentSnowDepth(420)); } catch {} try { productListener = store.on('product', () => scheduleCurrentSnowDepth(420)); } catch {} updateDepthState(); scheduleCurrentSnowDepth(420);
  });
  onDestroy(() => { snowDepthGeneration++; if (snowDepthTimer) clearTimeout(snowDepthTimer); if (realNowTimer) clearInterval(realNowTimer); window.removeEventListener('pointermove', dragMove); if (timestampListener !== null) try { store.off(timestampListener); } catch {} if (overlayListener !== null) try { store.off(overlayListener); } catch {} if (productListener !== null) try { store.off(productListener); } catch {} });
</script>

<style lang="less">
  .chart-shell{position:fixed;z-index:10020;width:min(430px,calc(100vw - 16px));padding:11px 12px 10px;border:1px solid rgba(98,213,255,.38);border-radius:14px;background:linear-gradient(180deg,rgba(15,24,31,.99),rgba(9,17,23,.99));color:white;box-shadow:0 16px 42px rgba(0,0,0,.56);backdrop-filter:blur(6px)}
  .chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.chart-title{min-width:0;flex:1}.chart-title b{display:block;font-size:15px}.chart-title small,.chart-title em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal}.chart-title small{margin-top:3px;color:rgba(255,255,255,.78);font-size:9px}.chart-title em{margin-top:2px;color:rgba(112,206,244,.8);font-size:8px}.chart-actions{display:flex;gap:4px}.chart-actions button{height:26px;min-width:26px;padding:0 7px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.075);color:#fff;font-size:12px;font-weight:800;cursor:pointer}.chart-actions button:hover{background:rgba(98,213,255,.15)}.png-button{font-size:8px!important}.drag-button{cursor:grab!important;touch-action:none}
  .legend{display:flex;flex-wrap:wrap;gap:8px;margin:7px 3px 4px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.67);font-size:7.6px}.legend span{display:inline-flex;align-items:center;gap:4px}.line{width:14px;border-top:2px solid}.snowline-key{border-color:#65d5ff}.terrain-key{border-color:#ffae56;border-top-style:dashed}.now-key{border-color:#ff6658}.bar-key{width:11px;height:7px;border-radius:2px 2px 0 0;background:#5ec8e9}
  .plot-wrap{position:relative}svg{display:block;width:100%;height:auto;overflow:visible;touch-action:none}.plot-bg,.band-bg{fill:rgba(255,255,255,.025);stroke:rgba(104,151,177,.22);stroke-width:1}.terrain-zone{fill:rgba(55,190,232,.09)}.grid{stroke:rgba(160,196,216,.13)}.axis{fill:rgba(220,231,238,.58);font-size:8px;font-family:sans-serif}.section-label{fill:rgba(226,236,243,.84);font-size:6.8px;font-family:sans-serif;font-weight:800;letter-spacing:.35px}.section-label tspan{fill:rgba(255,255,255,.4);font-weight:500}.precip-title,.precip-axis{fill:#64d4f5}.phase-title{fill:#e8d86d}.terrain-line{stroke:#ffae56;stroke-width:1.5;stroke-dasharray:5 4}.snowline-line{fill:none;stroke:#65d5ff;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round}.now-line{stroke:#ff6658;stroke-width:1.35}.now-tag-bg{fill:#ff6658}.now-tag{fill:#fff;font-size:7px;font-family:sans-serif;font-weight:800}.cursor{stroke:rgba(235,243,248,.6);stroke-width:1;stroke-dasharray:2 3}.current-dot{fill:#fff;stroke:#65d5ff;stroke-width:2.3}.crossing-line{stroke:#ffe05b;stroke-width:1.3;stroke-dasharray:3 3;cursor:pointer}.crossing-dot{fill:#12191f;stroke:#ffe05b;stroke-width:2.1;cursor:pointer}.inspect-line{stroke:rgba(255,255,255,.34)}.inspect-dot{fill:#12191f;stroke:#fff;stroke-width:1.5}.precip-bar{fill:rgba(70,176,210,.5)}.precip-bar.wet{fill:#5ec8e9}.phase-block{opacity:.43}.phase-snow{fill:#4ac7ef}.phase-wet-snow{fill:#9bdff3}.phase-mix{fill:#d8d267}.phase-rain{fill:#6686f4}.phase-ice-pellets{fill:#9d85ee}.phase-freezing-rain{fill:#ed77bf}.phase-icon{fill:#fff;font-size:10px;font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif}.empty-band{fill:rgba(255,255,255,.36);font-size:7px;font-family:sans-serif}
  .tooltip{position:absolute;z-index:4;min-width:168px;transform:translateX(-50%);padding:7px 9px;border-radius:9px;background:rgba(5,12,17,.99);border:1px solid rgba(98,213,255,.28);box-shadow:0 7px 20px rgba(0,0,0,.44);pointer-events:none}.tooltip b,.tooltip strong,.tooltip span,.tooltip small{display:block;white-space:nowrap}.tooltip b{font-size:8.8px}.tooltip strong{margin:3px 0;font-size:9px}.tooltip span{font-size:7.7px;color:rgba(255,255,255,.76)}.tooltip small{margin-top:3px;color:rgba(255,224,91,.76);font-size:6.8px}.text-snow{color:#69dafd}.text-wet-snow{color:#b4edfb}.text-mix{color:#e8df73}.text-rain{color:#8caaff}.text-ice-pellets{color:#b9a6ff}.text-freezing-rain{color:#ff9bd6}
  .type-key{display:flex;align-items:center;flex-wrap:wrap;gap:5px 9px;margin:2px 3px 6px;color:rgba(255,255,255,.7);font-size:7px}.type-key span{white-space:nowrap}.type-key small{width:100%;color:rgba(255,255,255,.34);font-size:6.5px}
  .current-card{margin-top:4px;padding:7px;border:1px solid rgba(255,255,255,.07);border-left:3px solid rgba(255,255,255,.28);border-radius:9px;background:rgba(255,255,255,.035)}.active-snow{border-left-color:#4ac7ef}.active-wet-snow{border-left-color:#9bdff3}.active-mix{border-left-color:#d8d267}.active-rain{border-left-color:#6686f4}.active-ice-pellets{border-left-color:#9d85ee}.active-freezing-rain{border-left-color:#ed77bf}.current-type{text-align:center}.current-type small{display:block;color:rgba(255,255,255,.42);font-size:6.5px;text-transform:uppercase;letter-spacing:.5px}.current-type b{display:block;margin-top:2px;font-size:11px}.current-type em{display:block;margin-top:2px;color:rgba(255,224,91,.72);font-size:6.8px;font-style:normal}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px}.metrics span{padding:5px 2px;border-radius:7px;background:rgba(255,255,255,.04);text-align:center;min-width:0}.metrics small{display:block;color:rgba(255,255,255,.43);font-size:5.8px}.metrics b{display:block;margin-top:1px;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.depth-card button{margin-top:2px;padding:2px 5px;border:1px solid rgba(141,227,154,.42);border-radius:5px;background:rgba(141,227,154,.09);color:#9ae7a6;font-size:5.8px;font-weight:800;cursor:pointer}
  .summary{margin-top:6px;padding:5px 7px;border-radius:7px;background:rgba(98,213,255,.06);border:1px solid rgba(98,213,255,.1);color:rgba(224,239,247,.88);font-size:7.8px;font-weight:700;text-align:center}.note{margin-top:4px;color:rgba(255,224,91,.82);font-size:7.2px;text-align:center}.hint{margin-top:5px;color:rgba(255,255,255,.32);font-size:6.7px;text-align:center}.empty{padding:25px 8px;text-align:center;color:rgba(255,255,255,.62);font-size:10px}
  @media(max-width:520px){.chart-shell{width:calc(100vw - 12px);padding:9px;border-radius:12px}.png-button{display:none!important}.chart-title small,.chart-title em{max-width:180px}.type-key{gap:4px 7px}.metrics{gap:3px}.metrics small{font-size:5.3px}.metrics b{font-size:6.5px}.tooltip{min-width:148px}}
</style>
