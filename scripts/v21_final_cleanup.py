from pathlib import Path
p=Path('src/SoundingChart.svelte')
t=p.read_text(encoding='utf-8')
old='    <div class="sounding-viewport" bind:this={viewport} tabindex="0" role="application" aria-label="Zoomable forecast sounding"'
new='    <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->\n    <div class="sounding-viewport" bind:this={viewport} tabindex="0" role="application" aria-label="Zoomable forecast sounding"'
if old not in t: raise SystemExit('Sounding viewport anchor not found')
p.write_text(t.replace(old,new,1),encoding='utf-8')
