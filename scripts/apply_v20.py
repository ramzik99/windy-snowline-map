from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected text not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


# Main point card: compact current state + one next-event line.
replace(
    'src/plugin.svelte',
    "  import { contourPolylines, type ContourPolyline, type GridPoint } from './contours';",
    "  import { contourPolylines, type ContourPolyline, type GridPoint } from './contours';\n  import { nextWintryEvent } from './eventOutlook';",
)
replace(
    'src/plugin.svelte',
    "  type LabelGridArgs = { valid:string; terrain:number; snowline:number; difference:number; precip:number|null; tendency:string; hasPrecip:boolean; minSnowline24:number|null; newSnow24Cm:number; transition:string };",
    "  type LabelGridArgs = { snowline:number; difference:number; precip:number|null; hasPrecip:boolean; eventLine:string };",
)

old_helpers = '''  function metricTile(label:string,value:string,className=''){return`<span class="${className}"><small>${label}</small><strong>${value}</strong></span>`}
  function footerRow(valid:string,tendency:string){return`<div class="snowline-footer"><span>${tendency||'—'} <i>·</i> Valid ${valid}</span></div>`}
  function outlookRow(minSnowline24:number|null,newSnow24Cm:number,transition:string){const noSnow=newSnow24Cm<0.05,newSnow=noSnow?'None':formatNewSnowCm(newSnow24Cm);return`<div class="snowline-outlook"><div class="snowline-outlook-title">NEXT 24 H</div><div class="snowline-outlook-grid"><span><small>Min snowline</small><strong>${minSnowline24!==null?`${minSnowline24} m`:'—'}</strong></span><span class="${noSnow?'snowline-no-snow':''}"><small>New snow · est.</small><strong>${newSnow}</strong></span></div>${transition?`<div class="snowline-transition">${transition}</div>`:''}</div>`}
  function labelGrid(args:LabelGridArgs){
    const position=`<div class="snowline-position">${positionText(args.difference)}</div>`;
    const terrain=metricTile('Terrain',`${args.terrain} m`);
    const snowline=metricTile('Snowline',`${args.snowline} m`,'metric-snowline');
    const precip=args.hasPrecip?metricTile('Precip',args.precip!==null?`${formatPrecipMm(args.precip)} mm/3h`:'—','metric-precip'):'';
    const grid=`<div class="snowline-label-grid${args.hasPrecip?' has-precip':''}">${terrain}${snowline}${precip}</div>`;
    return`${position}${grid}${outlookRow(args.minSnowline24,args.newSnow24Cm,args.transition)}${footerRow(args.valid,args.tendency)}`;
  }'''
new_helpers = '''  function metricTile(label:string,value:string,className=''){return`<span class="${className}"><small>${label}</small><strong>${value}</strong></span>`}
  function compactEventLine(point:CachedPoint,terrainM:number,target:number){const event=nextWintryEvent(point,terrainM,target);if(!event)return'No wintry event through +144 h';const when=event.activeNow?'Current event':`Next · ${shortValid(event.startTime)}`,snow=formatNewSnowCm(event.newSnowCm),low=event.minSnowlineM!==null?` · min SL ${event.minSnowlineM} m`:'';return`${when} · ${event.dominantPhase.label} · ${snow}${low}`}
  function labelGrid(args:LabelGridArgs){
    const position=`<div class="snowline-position">${positionText(args.difference)}</div>`;
    const snowline=metricTile('Snowline',`${args.snowline} m`,'metric-snowline');
    const precip=metricTile('Precip',args.hasPrecip&&args.precip!==null?`${formatPrecipMm(args.precip)} mm/3h`:'Dry','metric-precip');
    const grid=`<div class="snowline-label-grid">${snowline}${precip}</div>`;
    return`${position}${grid}<div class="snowline-event-line">${args.eventLine}</div>`;
  }'''
replace('src/plugin.svelte', old_helpers, new_helpers)

old_update = "const rounded=Math.round(snowline/10)*10,tendency=tendencyText(clickedPoint,index),precip=precipMmAt(clickedPoint.forecast,index),hasPrecip=precip!==null&&precip>=PRECIP_THRESHOLD_MM_H;if(clickedMapElevationM!==null&&Number.isFinite(clickedMapElevationM)){const terrain=Math.round(clickedMapElevationM/10)*10,difference=clickedMapElevationM-snowline,status=statusForDifference(difference),phase=hasPrecip?terrainPrecipitationType(profile,clickedMapElevationM):null,outlook=outlook24(clickedPoint,index,clickedMapElevationM),grid=labelGrid({valid:shortValid(valid),terrain,snowline:rounded,difference,precip,tendency,hasPrecip,minSnowline24:outlook.minSnowlineM,newSnow24Cm:outlook.newSnowCm,transition:outlook.transition});"
new_update = "const rounded=Math.round(snowline/10)*10,tendency=tendencyText(clickedPoint,index),precip=precipMmAt(clickedPoint.forecast,index),hasPrecip=precip!==null&&precip>=PRECIP_THRESHOLD_MM_H;if(clickedMapElevationM!==null&&Number.isFinite(clickedMapElevationM)){const terrain=Math.round(clickedMapElevationM/10)*10,difference=clickedMapElevationM-snowline,status=statusForDifference(difference),phase=hasPrecip?terrainPrecipitationType(profile,clickedMapElevationM):null,eventLine=compactEventLine(clickedPoint,clickedMapElevationM,target),grid=labelGrid({snowline:rounded,difference,precip,hasPrecip,eventLine});"
replace('src/plugin.svelte', old_update, new_update)
replace('src/plugin.svelte', 'iconSize:[236,212],iconAnchor:[118,220]', 'iconSize:[224,166],iconAnchor:[112,174]')
replace('src/plugin.svelte', 'width:236px;min-height:172px;', 'width:224px;min-height:132px;')
replace('src/plugin.svelte', ':global(.snowline-footer){width:100%;padding:2px 0 0;color:#75858e;text-align:center;font-size:7.2px;line-height:1.1;font-weight:700}:global(.snowline-footer i){padding:0 3px;color:#4f5e66;font-style:normal}:global(.snowline-loading)', ':global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-size:8px;line-height:1.2;font-weight:800}:global(.snowline-loading)')
replace('src/plugin.svelte', 'width:224px;min-height:166px;', 'width:216px;min-height:128px;')
replace('src/plugin.svelte', '<div><b>Point card:</b> answers what is happening at the selected terrain now, then gives a compact next-24-hour outlook.</div>', '<div><b>Point card:</b> deliberately stays compact: current precipitation type, terrain versus snowline, snowline, precipitation and one next-event line.</div>')
replace('src/plugin.svelte', '<div><b>Graph:</b> shows when conditions change through +144 h: snowline, precipitation, precipitation type and estimated new snow. A listed next phase change can be used to jump to that time.</div>', '<div><b>Event intelligence:</b> scans through +144 h for the next terrain-relevant wintry event and summarises timing, dominant type, minimum snowline, peak precipitation and estimated new snow.</div>')

# Forecast window: event intelligence replaces the old 24 h summary card.
replace(
    'src/SnowlineChart.svelte',
    "  import { estimateNewSnowStep, formatNewSnowCm } from './snowAccum';",
    "  import { estimateNewSnowStep, formatNewSnowCm } from './snowAccum';\n  import { nextWintryEvent } from './eventOutlook';",
)
old_card = '''    <div class="outlook24">
      <b>Next 24 h</b>
      <span>{chart.min24Snowline !== null ? `Min snowline ${chart.min24Snowline} m` : 'Snowline unavailable'} · New snow {formatNewSnowCm(chart.newSnow24h)}</span>
      {#if chart.nextChangeLabel && chart.nextChangeTime !== null}<button type="button" title="Jump to this change" on:click={jumpToNextChange}>{chart.nextChangeLabel} →</button>{/if}
    </div>'''
new_card = '''    <div class="outlook24 event-intelligence">
      <b>{event?.activeNow ? 'Current wintry event' : 'Next wintry event'}</b>
      {#if event}
        <span>{event.dominantPhase.icon} {event.dominantPhase.label} · {formatEventRange(event.startTime, event.endTime)}</span>
        <span>Min snowline {event.minSnowlineM !== null ? `${event.minSnowlineM} m` : '—'} · Peak precip {formatPrecipMm(event.peakPrecipMm3h)} mm/3h · New snow {formatNewSnowCm(event.newSnowCm)}</span>
        {#if !event.activeNow}<button type="button" title="Jump to event start" on:click={jumpToEvent}>Go to event →</button>{/if}
      {:else}
        <span>No terrain-relevant wintry precipitation detected through +144 h.</span>
      {/if}
    </div>'''
replace('src/SnowlineChart.svelte', old_card, new_card)
replace(
    'src/SnowlineChart.svelte',
    "  $: crossing = terrainCrossingState(point, terrainM, timestamp);\n  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);",
    "  $: crossing = terrainCrossingState(point, terrainM, timestamp);\n  $: event = nextWintryEvent(point, terrainM, timestamp);\n  $: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);",
)
replace(
    'src/SnowlineChart.svelte',
    "  function jumpToNextChange() { const time = chart?.nextChangeTime; if (time !== null && time !== undefined) setTimeline(time); }",
    "  function jumpToNextChange() { const time = chart?.nextChangeTime; if (time !== null && time !== undefined) setTimeline(time); }\n  function jumpToEvent() { if (event?.startTime) setTimeline(event.startTime); }\n  function formatEventRange(start:number,end:number){const a=formatShortTime(start),b=new Date(end).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});return start===end?a:`${a}–${b}`; }",
)

# Major version and public documentation.
replace('package.json', '"version": "16.0.3"', '"version": "20.0.0"')
replace('src/pluginConfig.ts', "version: '16.0.3'", "version: '20.0.0'")
replace('README.md', '**16.0.3**', '**20.0.0**')
replace('README.md', '- A 3-hour snowline tendency\n- Quick controls for the forecast graph, favourites, sharing and closing', '- A deliberately simplified map label: current precipitation type, terrain relation, snowline and precipitation\n- A single next-event line for the first terrain-relevant wintry event through +144 h\n- Quick controls for the forecast graph, favourites, sharing and closing')
replace('README.md', '- A **144-hour graph** of snowline, precipitation, precipitation type and estimated new snow', '- A **144-hour graph** of snowline, precipitation, precipitation type and estimated new snow\n- **v20 event intelligence**: next/current wintry-event timing, dominant type, minimum snowline, peak precipitation and estimated new snow')
replace('README.md', '- `src/snowAccum.ts` — estimated forecast-created new snow', '- `src/snowAccum.ts` — estimated forecast-created new snow\n- `src/eventOutlook.ts` — v20 next-wintry-event detection and summary')

print('v20 source edits applied')
