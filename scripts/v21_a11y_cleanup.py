from pathlib import Path

def r(path,old,new,label):
 p=Path(path);t=p.read_text(encoding='utf-8')
 if old not in t: raise SystemExit(f'Missing {label}')
 p.write_text(t.replace(old,new,1),encoding='utf-8')

r('src/plugin.svelte','<div class="info-overlay" role="presentation" on:click={() => infoOpen = false}>\n    <div class="info-window" role="dialog" aria-modal="true" aria-label="How Wintry forecast works" on:click|stopPropagation>','<div class="info-overlay" role="presentation" on:click|self={() => infoOpen = false}>\n    <div class="info-window" role="dialog" aria-modal="true" aria-label="How Wintry forecast works">','info modal')
r('src/PlaceSearch.svelte','<form on:submit|preventDefault={submitSearch} on:keydown={handleKeydown} on:keyup|stopPropagation>','<form on:submit|preventDefault={submitSearch}>','form keys')
r('src/PlaceSearch.svelte','        on:input={scheduleSearch}\n        on:focus={() => { if (visibleResults.length || favourites.length) open = true; }}','        on:input={scheduleSearch}\n        on:keydown={handleKeydown}\n        on:keyup|stopPropagation\n        on:focus={() => { if (visibleResults.length || favourites.length) open = true; }}','input keys')
r('src/SnowlineChart.svelte','          <line x1={chart.crossingX} x2={chart.crossingX} y1="34" y2="130" class="crossing-line" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />\n          <circle cx={chart.crossingX} cy={chart.terrainY} r="4.8" class="crossing-dot" on:click|stopPropagation={() => jumpToCrossing(crossing.crossingTime)} />','          <line x1={chart.crossingX} x2={chart.crossingX} y1="34" y2="130" class="crossing-line" />\n          <circle cx={chart.crossingX} cy={chart.terrainY} r="4.8" class="crossing-dot" />','crossing click')
r('src/SoundingChart.svelte','tabindex="0" role="group" aria-label="Zoomable forecast sounding"','tabindex="0" role="application" aria-label="Zoomable forecast sounding"','sounding role')
