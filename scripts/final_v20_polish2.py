from pathlib import Path

p = Path('src/plugin.svelte')
text = p.read_text(encoding='utf-8')

pairs = [
("  type LabelGridArgs = { snowline:number; difference:number; precip:number|null; hasPrecip:boolean; eventLine:string };",
 "  type LabelGridArgs = { valid:string; terrain:number; snowline:number; difference:number; precip:number|null; hasPrecip:boolean; eventLine:string };"),
("        <div><b>Point card:</b> answers what is happening at the selected terrain now, then gives a compact next-24-hour outlook.</div>",
 "        <div><b>Point card:</b> gives terrain elevation, current snowline relationship and precipitation, plus one concise next-event line through +144 h.</div>"),
("  function labelGrid(args:LabelGridArgs){\n    const position=`<div class=\"snowline-position\">${positionText(args.difference)}</div>`;\n    const snowline=metricTile('Snowline',`${args.snowline} m`,'metric-snowline');\n    const precip=metricTile('Precip',args.hasPrecip&&args.precip!==null?`${formatPrecipMm(args.precip)} mm/3h`:'Dry','metric-precip');\n    const grid=`<div class=\"snowline-label-grid\">${snowline}${precip}</div>`;\n    return`${position}${grid}<div class=\"snowline-event-line\">${args.eventLine}</div>`;\n  }",
 "  function labelGrid(args:LabelGridArgs){\n    const terrain=metricTile('Terrain',`${args.terrain} m`,'metric-terrain');\n    const snowline=metricTile('Snowline',`${args.snowline} m`,'metric-snowline');\n    const relation=`<div class=\"snowline-compact-relation\">${positionText(args.difference)}<span>${args.hasPrecip&&args.precip!==null?`Precip ${formatPrecipMm(args.precip)} mm/3h`:'Dry'}</span></div>`;\n    const grid=`<div class=\"snowline-label-grid\">${terrain}${snowline}</div>`;\n    return`<div class=\"snowline-valid\">${args.valid}</div>${grid}${relation}<div class=\"snowline-event-line\">${args.eventLine}</div>`;\n  }"),
("grid=labelGrid({snowline:rounded,difference,precip,hasPrecip,eventLine});",
 "grid=labelGrid({valid:shortValid(valid),terrain,snowline:rounded,difference,precip,hasPrecip,eventLine});"),
("iconSize:[224,166],iconAnchor:[112,174]", "iconSize:[224,176],iconAnchor:[112,184]"),
(":global(.snowline-click-label>span){position:relative;display:flex;flex-direction:column;gap:5px;width:224px;min-height:132px;box-sizing:border-box;padding:37px 9px 8px;",
 ":global(.snowline-click-label>span){position:relative;display:flex;flex-direction:column;gap:5px;width:224px;min-height:142px;box-sizing:border-box;padding:37px 8px 8px;"),
(":global(.snowline-label-grid strong),:global(.snowline-outlook-grid strong){display:block;margin-top:3px;color:#eef5f8;font-size:9.5px;line-height:1.05;font-weight:850}:global(.metric-snowline strong){color:#dff6ff}:global(.metric-precip strong){color:#9fe5ff}",
 ":global(.snowline-label-grid strong),:global(.snowline-outlook-grid strong){display:block;margin-top:3px;color:#eef5f8;font-size:9.5px;line-height:1.05;font-weight:850}:global(.metric-terrain strong){color:#ffd39a}:global(.metric-snowline strong){color:#dff6ff}:global(.metric-precip strong){color:#9fe5ff}"),
(":global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-size:8px;line-height:1.2;font-weight:800}:global(.snowline-loading)",
 ":global(.snowline-valid){margin:-1px 0 0;color:#7f919b;font-size:7px;line-height:1;font-weight:800;text-align:center}:global(.snowline-compact-relation){display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;box-sizing:border-box;padding:5px 6px;border-radius:7px;background:rgba(255,255,255,.045);color:var(--probe-accent,white);font-size:8px;line-height:1.1;font-weight:850;text-align:left}:global(.snowline-compact-relation strong){display:inline!important;padding:0!important;background:none!important;color:inherit!important;font-size:8px!important;letter-spacing:0!important}:global(.snowline-compact-relation small){display:none}:global(.snowline-compact-relation span){color:#aebbc2;font-weight:750;white-space:nowrap}:global(.snowline-event-line){width:100%;box-sizing:border-box;padding:6px 7px;border-radius:7px;background:rgba(110,203,255,.055);color:#dce9ef;text-align:left;font-size:8px;line-height:1.2;font-weight:800}:global(.snowline-loading)"),
("@media(max-width:520px){.snowline-panel{width:235px;max-width:calc(100vw - 28px);padding:8px 9px}.info-overlay{align-items:flex-start;padding-top:54px}:global(.snowline-click-label>span){width:216px;min-height:128px;padding:37px 8px 8px}",
 "@media(max-width:520px){.snowline-panel{width:235px;max-width:calc(100vw - 28px);padding:8px 9px}.info-overlay{align-items:flex-start;padding-top:54px}:global(.snowline-click-label>span){width:216px;min-height:138px;padding:37px 8px 8px}")
]

for old, new in pairs:
    if old not in text:
        raise SystemExit(f'Missing expected text: {old[:110]}')
    text = text.replace(old, new, 1)

old = "const point=clickedPoint,[lat,lon]=clickedLatLon,index=nearestIndex(point.times,getStoreTimestamp()),validTime=point.times[index],profile=buildProfile(point.forecast,index),snowline=snowlineAt(point,index),precip=precipMmAt(point.forecast,index),phase=clickedMapElevationM!==null?phaseAt(point,index,clickedMapElevationM):null,outlook=clickedMapElevationM!==null?outlook24(point,index,clickedMapElevationM):null;"
new = "const point=clickedPoint,[lat,lon]=clickedLatLon,index=nearestIndex(point.times,getStoreTimestamp()),validTime=point.times[index],profile=buildProfile(point.forecast,index),snowline=snowlineAt(point,index),precip=precipMmAt(point.forecast,index),phase=clickedMapElevationM!==null?phaseAt(point,index,clickedMapElevationM):null,event=clickedMapElevationM!==null?nextWintryEvent(point,clickedMapElevationM,validTime):null;"
if old not in text:
    raise SystemExit('Missing share preamble')
text = text.replace(old, new, 1)

old = "outlook?.minSnowlineM!==null&&outlook?`24 h minimum snowline: ${outlook.minSnowlineM} m`:'',outlook?`24 h estimated new snow: ${formatNewSnowCm(outlook.newSnowCm)}`:'',outlook?.transition?`Next change: ${outlook.transition}`:''"
new = "event?`${event.activeNow?'Current':'Next'} wintry event: ${formatLocal(event.startTime)} to ${formatLocal(event.endTime)}`:'',event?`Event dominant type: ${event.dominantPhase.label}`:'',event?.minSnowlineM!==null&&event?`Event minimum snowline: ${event.minSnowlineM} m`:'',event?`Event peak precipitation: ${formatPrecipMm(event.peakPrecipMm3h)} mm/3h`:'',event?`Event estimated new snow: ${formatNewSnowCm(event.newSnowCm)}`:''"
if old not in text:
    raise SystemExit('Missing legacy share outlook fields')
text = text.replace(old, new, 1)

p.write_text(text, encoding='utf-8')

r = Path('README.md')
readme = r.read_text(encoding='utf-8')
old = "- A deliberately simplified map label: current precipitation type, terrain relation, snowline and precipitation"
new = "- A deliberately simplified map label: current precipitation type, **terrain elevation**, snowline, terrain/snowline relationship, precipitation and valid local time"
if old in readme:
    readme = readme.replace(old, new, 1)
r.write_text(readme, encoding='utf-8')
