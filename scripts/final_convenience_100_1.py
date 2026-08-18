from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)

# Point card: concise at-a-glance summary + tap summary to jump to the next wintry period.
p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(
    t,
    "type LabelGridArgs = { valid:string; terrain:number; snowline:number; difference:number; precip:number|null; hasPrecip:boolean; eventLine:string };",
    "type LabelGridArgs = { valid:string; terrain:number; snowline:number; difference:number; precip:number|null; hasPrecip:boolean; eventLine:string; canJump:boolean };",
    'LabelGridArgs',
)
t = replace_once(
    t,
    "let cache:(CachedPoint|null)[][]=[], contourLayer:any=null, clickLayer:any=null, clickedPoint:CachedPoint|null=null, clickedLatLon:[number,number]|null=null, clickedMapElevationM:number|null=null, clickedPlaceName:string|null=null, pointSource:PointSource|null=null;",
    "let cache:(CachedPoint|null)[][]=[], contourLayer:any=null, clickLayer:any=null, clickedPoint:CachedPoint|null=null, clickedLatLon:[number,number]|null=null, clickedMapElevationM:number|null=null, clickedPlaceName:string|null=null, pointSource:PointSource|null=null, clickedNextEventTime:number|null=null;",
    'clicked point state',
)
t = replace_once(
    t,
    "function clearPointState(closeChart=true){clickGeneration++;probeLoading=false;if(closeChart)chartOpen=false;clickedPoint=null;clickedLatLon=null;clickedMapElevationM=null;clickedPlaceName=null;pointSource=null;clearClickLayer()}",
    "function clearPointState(closeChart=true){clickGeneration++;probeLoading=false;if(closeChart)chartOpen=false;clickedPoint=null;clickedLatLon=null;clickedMapElevationM=null;clickedPlaceName=null;pointSource=null;clickedNextEventTime=null;clearClickLayer()}",
    'clear point state',
)
old = "function compactEventLine(point:CachedPoint,terrainM:number,target:number){const event=nextWintryEvent(point,terrainM,target);if(!event)return'No wintry event through +144 h';const when=event.activeNow?'Current':`Next · ${shortValid(event.startTime)}`,snow=event.newSnowCm>0.05?` · est. ${formatSnow(event.newSnowCm,unitSystem)}`:'';return`${when} · ${event.dominantPhase.label}${snow}`}"
new = "function compactEventSummary(point:CachedPoint,terrainM:number,target:number,currentLabel:string){const event=nextWintryEvent(point,terrainM,target),now=currentLabel==='Dry'?'Dry now':`${currentLabel} now`;if(!event)return{text:`${now} · No wintry event through +144 h`,jumpTime:null as number|null};const snow=event.newSnowCm>0.05?` · est. ${formatSnow(event.newSnowCm,unitSystem)}`:'';if(event.activeNow)return{text:`${now}${snow}`,jumpTime:null as number|null};return{text:`${now} · ${event.dominantPhase.label} ${shortValid(event.startTime)}${snow}`,jumpTime:event.startTime}}"
t = replace_once(t, old, new, 'compact event summary')
old_grid = '''  function labelGrid(args:LabelGridArgs){
    const terrain=metricTile('Terrain',formatElevation(args.terrain,unitSystem),'metric-terrain');
    const snowline=metricTile('Snowline',formatElevation(args.snowline,unitSystem),'metric-snowline');
    const relation=`<div class=\"snowline-compact-relation\">${positionText(args.difference)}<span>${args.hasPrecip&&args.precip!==null?`Precip ${formatPrecip(args.precip,unitSystem)}`:'Dry'}</span></div>`;
    const grid=`<div class=\"snowline-label-grid\">${terrain}${snowline}</div>`;
    return`<div class=\"snowline-valid\">${args.valid}</div>${grid}${relation}<div class=\"snowline-event-line\">${args.eventLine}</div>`;
  }'''
new_grid = '''  function labelGrid(args:LabelGridArgs){
    const terrain=metricTile('Terrain',formatElevation(args.terrain,unitSystem),'metric-terrain');
    const snowline=metricTile('Snowline',formatElevation(args.snowline,unitSystem),'metric-snowline');
    const relation=`<div class=\"snowline-compact-relation\">${positionText(args.difference)}<span>${args.hasPrecip&&args.precip!==null?`Precip ${formatPrecip(args.precip,unitSystem)}`:'Dry'}</span></div>`;
    const grid=`<div class=\"snowline-label-grid\">${terrain}${snowline}</div>`;
    const summary=args.canJump?`<button class=\"snowline-event-line snowline-event-jump\" type=\"button\" title=\"Jump to next wintry period\" aria-label=\"Jump to next wintry period\">${args.eventLine}<span>›</span></button>`:`<div class=\"snowline-event-line\">${args.eventLine}</div>`;
    return`<div class=\"snowline-valid\">${args.valid}</div>${grid}${relation}${summary}`;
  }'''
t = replace_once(t, old_grid, new_grid, 'label grid')
old_show = "const original=event?.originalEvent,target=original?.target as HTMLElement|undefined,graph=target?.closest?.('.snowline-label-chart'),fav=target?.closest?.('.snowline-label-favourite') as HTMLButtonElement|null,share=target?.closest?.('.snowline-label-share') as HTMLButtonElement|null,close=target?.closest?.('.snowline-label-close');if(!graph&&!fav&&!share&&!close)return;try{L.DomEvent.stop(original)}catch{}if(graph){if(clickedPoint){forecastTab='graph';chartOpen=true}return}if(fav){void toggleCurrentFavourite(fav);return}if(share){void shareCurrentPoint(share);return}clearPointState(true)"
new_show = "const original=event?.originalEvent,target=original?.target as HTMLElement|undefined,graph=target?.closest?.('.snowline-label-chart'),jump=target?.closest?.('.snowline-event-jump'),fav=target?.closest?.('.snowline-label-favourite') as HTMLButtonElement|null,share=target?.closest?.('.snowline-label-share') as HTMLButtonElement|null,close=target?.closest?.('.snowline-label-close');if(!graph&&!jump&&!fav&&!share&&!close)return;try{L.DomEvent.stop(original)}catch{}if(graph){if(clickedPoint){forecastTab='graph';chartOpen=true}return}if(jump&&clickedNextEventTime!==null){try{(store as any).set('timestamp',clickedNextEventTime)}catch{}forecastTab='graph';chartOpen=true;return}if(fav){void toggleCurrentFavourite(fav);return}if(share){void shareCurrentPoint(share);return}clearPointState(true)"
t = replace_once(t, old_show, new_show, 'marker click actions')
old_update = "function updatePersistentClickLabel(){if(!enabled){clearClickLayer();return}if(!clickedPoint||!clickedLatLon||!clickedPoint.times.length)return;const[lat,lon]=clickedLatLon,target=getStoreTimestamp(),first=clickedPoint.times[0],end=Math.min(clickedPoint.times.at(-1)!,first+MAX_FORECAST_HOURS*3600_000);"
new_update = "function updatePersistentClickLabel(){if(!enabled){clearClickLayer();return}if(!clickedPoint||!clickedLatLon||!clickedPoint.times.length)return;clickedNextEventTime=null;const[lat,lon]=clickedLatLon,target=getStoreTimestamp(),first=clickedPoint.times[0],end=Math.min(clickedPoint.times.at(-1)!,first+MAX_FORECAST_HOURS*3600_000);"
t = replace_once(t, old_update, new_update, 'update point start')
old_inner = "const terrain=Math.round(clickedMapElevationM/10)*10,difference=clickedMapElevationM-snowline,status=statusForDifference(difference),phase=hasPrecip?terrainPrecipitationType(profile,clickedMapElevationM):null,eventLine=compactEventLine(clickedPoint,clickedMapElevationM,target),grid=labelGrid({valid:shortValid(valid),terrain,snowline:rounded,difference,precip,hasPrecip,eventLine});"
new_inner = "const terrain=Math.round(clickedMapElevationM/10)*10,difference=clickedMapElevationM-snowline,status=statusForDifference(difference),phase=hasPrecip?terrainPrecipitationType(profile,clickedMapElevationM):null,summary=compactEventSummary(clickedPoint,clickedMapElevationM,target,phase?phase.label:'Dry');clickedNextEventTime=summary.jumpTime;const grid=labelGrid({valid:shortValid(valid),terrain,snowline:rounded,difference,precip,hasPrecip,eventLine:summary.text,canJump:summary.jumpTime!==null});"
t = replace_once(t, old_inner, new_inner, 'point summary construction')
old_css = ":global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-size:8px;line-height:1.2;font-weight:800}"
new_css = ":global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border:0;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-family:inherit;font-size:8px;line-height:1.2;font-weight:800}:global(button.snowline-event-line){display:flex;align-items:center;justify-content:space-between;gap:6px;cursor:pointer;pointer-events:auto}:global(button.snowline-event-line:hover){background:rgba(110,203,255,.11)}:global(button.snowline-event-line span){flex:0 0 auto;color:#8edcff;font-size:14px;line-height:8px}"
t = replace_once(t, old_css, new_css, 'summary row css')
p.write_text(t, encoding='utf-8')

# Forecast: tapping any time selects it; Sounding then opens at that exact selected time.
p = Path('src/SnowlineChart.svelte')
t = p.read_text(encoding='utf-8')
old_pointer = "    const t0 = point.times[0], t1 = point.times[point.times.length - 1], idx = nearestIndex(point.times, t0 + (vx - 42) / 306 * (t1 - t0)), time = point.times[idx], x = 42 + (time - t0) / Math.max(1, t1 - t0) * 306;\n    tooltip = {"
new_pointer = "    const t0 = point.times[0], t1 = point.times[point.times.length - 1], idx = nearestIndex(point.times, t0 + (vx - 42) / 306 * (t1 - t0)), time = point.times[idx], x = 42 + (time - t0) / Math.max(1, t1 - t0) * 306;\n    if (event.type === 'pointerdown') setTimeline(time);\n    tooltip = {"
t = replace_once(t, old_pointer, new_pointer, 'forecast tap selection')
t = replace_once(
    t,
    '<div class="hint">Tap the forecast for values · Sounding shows optional vertical detail</div>',
    '<div class="hint">Tap to select a time · Sounding opens that selected time</div>',
    'forecast hint',
)
p.write_text(t, encoding='utf-8')

# Final feature release version.
p = Path('package.json')
t = p.read_text(encoding='utf-8')
t = replace_once(t, '"version": "100.0.1"', '"version": "100.1.0"', 'package version')
p.write_text(t, encoding='utf-8')

p = Path('src/pluginConfig.ts')
t = p.read_text(encoding='utf-8')
t = replace_once(t, "version: '100.0.1'", "version: '100.1.0'", 'plugin config version')
p.write_text(t, encoding='utf-8')

# Mark the feature set as intentionally frozen in the README.
p = Path('README.md')
t = p.read_text(encoding='utf-8')
needle = '## v100: convenience first\n\n'
if needle in t and 'Feature-complete' not in t:
    t = t.replace(needle, needle + '**Feature-complete:** v100.1 focuses on five-second answers and depth on demand. Future releases are intended to be bug fixes and UI polish rather than new forecast metrics.\n\n', 1)
p.write_text(t, encoding='utf-8')
