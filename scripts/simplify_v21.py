from pathlib import Path
import re

# Simplify the main point label.
p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')
old = "function compactEventLine(point:CachedPoint,terrainM:number,target:number){const event=nextWintryEvent(point,terrainM,target);if(!event)return'No wintry event through +144 h';const when=event.activeNow?'Current event':`Next · ${shortValid(event.startTime)}`,snow=formatSnow(event.newSnowCm,unitSystem),low=event.minSnowlineM!==null?` · min SL ${formatElevation(event.minSnowlineM,unitSystem)}`:'',confidence=` · ${event.confidence[0].toUpperCase()}${event.confidence.slice(1)}`;return`${when} · ${event.dominantPhase.label} · ${snow}${low}${confidence}`}"
new = "function compactEventLine(point:CachedPoint,terrainM:number,target:number){const event=nextWintryEvent(point,terrainM,target);if(!event)return'No wintry event through +144 h';const when=event.activeNow?'Current':`Next · ${shortValid(event.startTime)}`;return`${when} · ${event.dominantPhase.label}`}"
if old not in t:
    raise SystemExit('compactEventLine anchor not found')
t = t.replace(old, new, 1)
t = t.replace("if(phase){const mark=phase.confidence==='low'?' ~':'';showClickLabel(lat,lon,`${phase.icon} ${phase.label.toUpperCase()}${mark}`,grid,colorForLevel(snowline),status);return}", "if(phase){showClickLabel(lat,lon,`${phase.icon} ${phase.label.toUpperCase()}`,grid,colorForLevel(snowline),status);return}", 1)
t = t.replace("const detail=detailHtml?`<div class=\"snowline-label-detail\">${detailHtml}</div>`:'',saved=isCurrentFavourite(),actions=clickedPoint&&clickedLatLon?`<button class=\"snowline-label-chart\" type=\"button\" aria-label=\"Open forecast\" title=\"Open forecast\">📊</button><button class=\"snowline-label-favourite${saved?' saved':''}\" type=\"button\" aria-label=\"${saved?'Remove saved location':'Save location'}\" title=\"${saved?'Remove saved location':'Save location'}\">${saved?'★':'☆'}</button><button class=\"snowline-label-share\" type=\"button\" aria-label=\"Copy Wintry forecast details\" title=\"Copy Wintry forecast details\">share</button>`:'',dry=mainText==='DRY';const hazard=/FREEZING RAIN|ICE PELLETS/.test(mainText);", "const detail=detailHtml?`<div class=\"snowline-label-detail\">${detailHtml}</div>`:'',saved=isCurrentFavourite(),actions=clickedPoint&&clickedLatLon?`<button class=\"snowline-label-chart\" type=\"button\" aria-label=\"Open forecast\" title=\"Open forecast\">📊</button><button class=\"snowline-label-favourite${saved?' saved':''}\" type=\"button\" aria-label=\"${saved?'Remove saved location':'Save location'}\" title=\"${saved?'Remove saved location':'Save location'}\">${saved?'★':'☆'}</button><button class=\"snowline-label-share\" type=\"button\" aria-label=\"Copy Wintry forecast details\" title=\"Copy Wintry forecast details\">share</button>`:'',dry=mainText==='DRY';", 1)
t = t.replace("${dry?' snowline-card-dry':''}${hazard?' snowline-card-hazard':''}", "${dry?' snowline-card-dry':''}", 1)
p.write_text(t, encoding='utf-8')

# Simplify the forecast window.
p = Path('src/SnowlineChart.svelte')
t = p.read_text(encoding='utf-8')
t = t.replace('viewBox="0 0 360 334"', 'viewBox="0 0 360 274"', 1)
t = t.replace("{tooltip.phase.label}{tooltip.phase.confidence === 'low' ? ' ~' : ''}", "{tooltip.phase.label}", 1)
t = t.replace("{chart.currentPhase.label}{chart.currentPhase.confidence === 'low' ? ' ~' : ''}", "{chart.currentPhase.label}", 1)
# Remove estimated-new-snow plot band.
start = t.find('        <text x="42" y="278" class="section-label snow-title">NEW SNOW')
end_anchor = '        {#if chart.nowX !== null}'
end = t.find(end_anchor, start)
if start == -1 or end == -1:
    raise SystemExit('new snow plot block not found')
t = t[:start] + t[end:]
t = t.replace('y2="312"', 'y2="236"')
t = t.replace('y="330"', 'y="270"')
t = t.replace('            <span>New snow <b>{formatSnow(tooltip.newSnow, units)}</b></span>\n', '', 1)
# Replace advanced event intelligence + elevation section with a simple next-period card.
start = t.find('    <div class="outlook24 event-intelligence"')
end_anchor = '    {#if crossing?.summary}'
end = t.find(end_anchor, start)
if start == -1 or end == -1:
    raise SystemExit('advanced event block not found')
simple = '''    <div class="outlook24 event-intelligence">\n      <b>{event?.activeNow ? 'Current wintry period' : 'Next wintry period'}</b>\n      {#if event}\n        <span>{event.dominantPhase.icon} {event.dominantPhase.label} · {formatEventRange(event.startTime, event.endTime)}</span>\n        {#if !event.activeNow}<button type="button" title="Jump to event start" on:click={jumpToEvent}>Go to event →</button>{/if}\n      {:else}\n        <span>No wintry precipitation through +144 h.</span>\n      {/if}\n    </div>\n'''
t = t[:start] + simple + t[end:]
# Remove elevation-outlook import and reactive calculations.
t = re.sub(r'^\s*import \{ elevationImpactOutlook[^\n]*\n', '', t, flags=re.M)
t = re.sub(r'^\s*\$: elevationOutlook[^\n]*\n', '', t, flags=re.M)
t = re.sub(r'^\s*\$: elevationRows[^\n]*\n', '', t, flags=re.M)
# Remove confidence helper if it is a one-line function.
t = re.sub(r'^\s*function confidenceText\([^\n]*\n', '', t, flags=re.M)
p.write_text(t, encoding='utf-8')
