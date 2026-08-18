from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# 1) Main plugin panel: cleaner toggle, quieter controls, v200 version.
# -----------------------------------------------------------------------------
p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')

old_switch = ".top-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.top-controls{display:flex;align-items:center;gap:7px}.title{font-size:16px;font-weight:800}.switch{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;white-space:nowrap}.switch input{margin:0;width:15px;height:15px}"
new_switch = ".top-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.top-controls{display:flex;align-items:center;gap:6px}.title{font-size:16px;font-weight:850;letter-spacing:-.2px}.switch{display:flex;align-items:center;gap:5px;height:24px;padding:0 7px 0 5px;border:1px solid rgba(255,255,255,.11);border-radius:7px;background:rgba(255,255,255,.035);font-size:9px;font-weight:850;white-space:nowrap;cursor:pointer}.switch input{appearance:none;-webkit-appearance:none;position:relative;margin:0;width:24px;height:14px;border:0;border-radius:8px;background:rgba(255,255,255,.16);cursor:pointer;transition:background .15s ease}.switch input:after{content:'';position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#aebbc2;transition:transform .15s ease,background .15s ease}.switch input:checked{background:rgba(80,190,255,.35)}.switch input:checked:after{transform:translateX(10px);background:#8ee2ff}"
t = replace_once(t, old_switch, new_switch, 'main toggle style')

old_buttons = ".hide-button,.info-button{width:22px;height:22px;padding:0;border:1px solid rgba(255,255,255,.14);border-radius:6px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.78);font-size:15px;font-weight:800;cursor:pointer}"
new_buttons = ".hide-button,.info-button{width:24px;height:24px;padding:0;border:1px solid rgba(255,255,255,.10);border-radius:7px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.74);font-size:15px;font-weight:800;cursor:pointer}.hide-button:hover,.info-button:hover{background:rgba(255,255,255,.075);color:#fff}"
t = replace_once(t, old_buttons, new_buttons, 'main top buttons')
p.write_text(t, encoding='utf-8')

# -----------------------------------------------------------------------------
# 2) Place search: keep the obvious Go label, but stop it dominating the panel.
# -----------------------------------------------------------------------------
p = Path('src/PlaceSearch.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(t,
    ".search-line { display: grid; grid-template-columns: minmax(0, 1fr) 34px; gap: 5px; }",
    ".search-line { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: 5px; }",
    'search grid')
t = replace_once(t,
    ".search-button { height: 34px; padding: 0; font-size: 18px; line-height: 1; font-weight: 800; }",
    ".search-button { height: 34px; padding: 0; background:rgba(255,255,255,.055); font-size: 10px; line-height: 1; font-weight: 900; letter-spacing:.15px; }.search-button:not(:disabled):hover,.search-button:not(:disabled):focus{border-color:rgba(80,190,255,.52);background:rgba(80,190,255,.12);outline:none}",
    'search button')
t = replace_once(t,
    ".utility-row button {\n    display: flex; align-items: center; justify-content: center; gap: 5px;\n    min-width: 0; height: 30px; padding: 0 7px;\n    color: rgba(255,255,255,0.76); font-size: 9px; line-height: 1; font-weight: 750;\n    background: rgba(255,255,255,0.055);\n  }",
    ".utility-row button {\n    display: flex; align-items: center; justify-content: center; gap: 5px;\n    min-width: 0; height: 30px; padding: 0 7px;\n    color: rgba(255,255,255,0.78); font-size: 9px; line-height: 1; font-weight: 800;\n    background: rgba(255,255,255,0.045);\n  }",
    'utility buttons')
p.write_text(t, encoding='utf-8')

# -----------------------------------------------------------------------------
# 3) Forecast: Now only when it is useful, slightly quieter footer.
# -----------------------------------------------------------------------------
p = Path('src/SnowlineChart.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(t,
    "{#if tab === 'graph'}<button type=\"button\" title=\"Back to now\" aria-label=\"Back to now\" on:click={resetToNow}>Now</button>{/if}",
    "{#if tab === 'graph' && showNow}<button class=\"now-action\" type=\"button\" title=\"Back to now\" aria-label=\"Back to now\" on:click={resetToNow}>Now</button>{/if}",
    'Now action markup')
t = replace_once(t,
    "$: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);",
    "$: chart = buildChart(point, terrainM, timestamp, crossing?.crossingTime ?? null, realNow);\n  $: showNow = Math.abs(timestamp - realNow) > 90 * 60_000;",
    'showNow reactive')
t = replace_once(t,
    '<div class="hint">Tap to select a time · Sounding opens that selected time</div>',
    '<div class="hint">Tap chart to select time · Sounding follows selection</div>',
    'forecast hint')
# Add a subtle style if the common chart action CSS exists.
style_anchor = ".chart-actions button:hover{background:rgba(105,212,255,.14)}"
if style_anchor in t:
    t = t.replace(style_anchor, style_anchor + ".chart-actions .now-action{padding:0 9px;border-color:rgba(105,212,255,.22);background:rgba(105,212,255,.08)}", 1)
p.write_text(t, encoding='utf-8')

# -----------------------------------------------------------------------------
# 4) Sounding: Fit means fit. No embedded scrollbar until the user zooms.
# -----------------------------------------------------------------------------
p = Path('src/SoundingChart.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(t,
    '<div class="sounding-viewport" bind:this={viewport}',
    '<div class="sounding-viewport" class:zoomed={zoom > 1.001} bind:this={viewport}',
    'sounding viewport class')
anchor = ".sounding-embedded .embedded-head{justify-content:flex-end;margin-bottom:4px}"
t = replace_once(t, anchor, anchor + "\n  .sounding-embedded .sounding-viewport{max-height:none;overflow:hidden;cursor:default}.sounding-embedded .sounding-viewport.zoomed{max-height:56vh;overflow:auto;cursor:grab}", 'embedded fit viewport')
t = replace_once(t,
    ".stats{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}.stats span{padding:5px 2px;border-radius:7px;background:rgba(255,255,255,.04);text-align:center}.stats small{display:block;color:#71838e;font-size:5.6px}.stats b{display:block;margin-top:2px;font-size:6.7px;white-space:nowrap}.hint{margin-top:6px;color:#60717b;font-size:6.4px;text-align:center}",
    ".stats{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}.stats span{padding:5px 2px;border-radius:7px;background:rgba(255,255,255,.035);text-align:center}.stats small{display:block;color:#71838e;font-size:5.6px}.stats b{display:block;margin-top:2px;font-size:6.7px;white-space:nowrap}.hint{margin-top:5px;color:#60717b;font-size:6.2px;text-align:center}",
    'sounding bottom polish')
p.write_text(t, encoding='utf-8')

# -----------------------------------------------------------------------------
# 5) Compact model freshness language.
# -----------------------------------------------------------------------------
p = Path('src/V21Panel.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(t,
    "return `ECMWF ${cycle} · ${age < 1 ? '<1' : Math.round(age)} h old`;",
    "return `ECMWF ${cycle} · ${age < 1 ? '<1 h' : `${Math.round(age)} h`}`;",
    'freshness wording')
p.write_text(t, encoding='utf-8')

# -----------------------------------------------------------------------------
# 6) v200 metadata.
# -----------------------------------------------------------------------------
p = Path('package.json')
t = p.read_text(encoding='utf-8')
t = replace_once(t, '"version": "100.1.2"', '"version": "200.0.0"', 'package version')
t = t.replace('"description": "v100 convenience-first terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Five-second answers for precipitation type, terrain, snowline, precipitation, estimated new snow and timing, with optional forecast and sounding detail."', '"description": "v200 convenience-first terrain-aware wintry forecast. Five-second answers for precipitation type, terrain, snowline, precipitation, estimated new snow and timing, with a clean forecast timeline and optional sounding."')
p.write_text(t, encoding='utf-8')

p = Path('src/pluginConfig.ts')
t = p.read_text(encoding='utf-8')
t = replace_once(t, "version: '100.1.2'", "version: '200.0.0'", 'pluginConfig version')
t = t.replace("description: 'v100 convenience-first winter forecast: type, terrain, snowline, precipitation, estimated new snow and timing first; forecast and hover/touch sounding when you want more detail.'", "description: 'v200 convenience-first winter forecast: type, terrain, snowline, precipitation, estimated new snow and timing first; a clean forecast timeline and optional hover/touch sounding.'")
p.write_text(t, encoding='utf-8')

# README freeze note.
p = Path('README.md')
t = p.read_text(encoding='utf-8')
if '## v200' not in t:
    t += "\n\n## v200: convenience freeze\n\nv200 is the final convenience-first interface: fast point answers, a clean +144 h forecast, and optional sounding depth. Future changes should be bug fixes, compatibility updates, or small UI polish rather than new forecast metrics.\n"
p.write_text(t, encoding='utf-8')
