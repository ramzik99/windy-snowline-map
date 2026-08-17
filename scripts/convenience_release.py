from pathlib import Path

p=Path('src/plugin.svelte')
t=p.read_text(encoding='utf-8')
t=t.replace("<div><b>Event intelligence:</b> scans through +144 h for the next terrain-relevant wintry event and summarises timing, dominant type, minimum snowline, peak precipitation and estimated new snow.</div>","<div><b>Next wintry period:</b> scans through +144 h and shows when it starts, the expected precipitation type and estimated new snow.</div>")
old="function compactEventLine(point:CachedPoint,terrainM:number,target:number){const event=nextWintryEvent(point,terrainM,target);if(!event)return'No wintry event through +144 h';const when=event.activeNow?'Current':`Next · ${shortValid(event.startTime)}`;return`${when} · ${event.dominantPhase.label}`}"
new="function compactEventLine(point:CachedPoint,terrainM:number,target:number){const event=nextWintryEvent(point,terrainM,target);if(!event)return'No wintry event through +144 h';const when=event.activeNow?'Current':`Next · ${shortValid(event.startTime)}`,snow=event.newSnowCm>0.05?` · est. ${formatSnow(event.newSnowCm,unitSystem)}`:'';return`${when} · ${event.dominantPhase.label}${snow}`}"
if old not in t: raise SystemExit('compactEventLine anchor not found')
t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

p=Path('src/SnowlineChart.svelte')
t=p.read_text(encoding='utf-8')
t=t.replace('viewBox="0 0 360 274"','viewBox="0 0 360 324"',1)
anchor='        {#if chart.nowX !== null}\n'
block='''        <text x="42" y="268" class="section-label snow-title">NEW SNOW <tspan>{units === 'imperial' ? 'est. in' : 'est. cm'}</tspan></text>\n        <rect x="42" y="274" width="306" height="28" rx="7" class="band-bg" />\n        {#if chart.newSnowMax > 0.05}\n          <text x="37" y="280" text-anchor="end" class="axis snow-axis">{chart.newSnowMaxLabel}</text>\n          <path d={chart.newSnowArea} class="new-snow-area" />\n          <polyline points={chart.newSnowPoints} class="new-snow-line" />\n        {:else}\n          <text x="195" y="291" text-anchor="middle" class="empty-band">{units === 'imperial' ? '0 in' : '0 cm'}</text>\n        {/if}\n\n'''
if anchor not in t: raise SystemExit('new snow insert anchor not found')
t=t.replace(anchor,block+anchor,1)
t=t.replace('y2="236"','y2="302"')
t=t.replace('y="270"','y="320"')
t=t.replace('            <span>Precip <b>{formatPrecip(tooltip.precip, units)}</b></span>\n','            <span>Precip <b>{formatPrecip(tooltip.precip, units)}</b></span>\n            <span>New snow <b>{formatSnow(tooltip.newSnow, units)}</b></span>\n',1)
old_event='        <span>{event.dominantPhase.icon} {event.dominantPhase.label} · {formatEventRange(event.startTime, event.endTime)}</span>'
new_event='        <span>{event.dominantPhase.icon} {event.dominantPhase.label} · {formatEventRange(event.startTime, event.endTime)}{#if event.newSnowCm > 0.05} · est. {formatSnow(event.newSnowCm, units)}{/if}</span>'
if old_event not in t: raise SystemExit('event summary anchor not found')
t=t.replace(old_event,new_event,1)
p.write_text(t,encoding='utf-8')

p=Path('src/SoundingChart.svelte')
t=p.read_text(encoding='utf-8')
t=t.replace('<b>{sounding.phaseLabel}</b><em>{sounding.phaseDetail}</em>','<b>{sounding.phaseLabel}</b>',1)
t=t.replace('      <span><small>Warm layer</small><b>{sounding.warmEnergy}</b></span>\n      <span><small>Cold layer</small><b>{sounding.coldEnergy}</b></span>\n','',1)
t=t.replace('.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}', '.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}',1)
p.write_text(t,encoding='utf-8')

p=Path('package.json')
t=p.read_text(encoding='utf-8').replace('"version": "21.0.3"','"version": "21.1.0"',1)
t=t.replace('"description": "Simple terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows snowline, terrain, precipitation type and amount, the next wintry period, a forecast graph and a detailed sounding."','"description": "Convenient terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows precipitation type, terrain, snowline, precipitation, estimated new snow, next wintry-period timing, a clear forecast graph and hover/touch sounding."')
p.write_text(t,encoding='utf-8')

p=Path('src/pluginConfig.ts')
t=p.read_text(encoding='utf-8').replace("version: '21.0.3'","version: '21.1.0'",1)
t=t.replace("description: 'Simple terrain-aware winter forecast: snowline, local terrain, precipitation type and amount, next wintry period, forecast graph and detailed hover/touch sounding.'","description: 'Convenient terrain-aware winter forecast: type, terrain, snowline, precipitation, estimated new snow, next wintry-period timing, clear graph and hover/touch sounding.'")
p.write_text(t,encoding='utf-8')
