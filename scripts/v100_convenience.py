from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)

# Main plugin: clearer point action + much shorter help copy.
p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(
    t,
    '<button class="snowline-label-chart" type="button" aria-label="Open forecast" title="Open forecast">📊</button>',
    '<button class="snowline-label-chart" type="button" aria-label="Open forecast" title="Open forecast">Forecast</button>',
    'point forecast button',
)
old_help = '''      <div class="info-body">\n        <div><b>Snowline:</b> ECMWF temperature, dew point and geopotential height are converted to a wet-bulb profile. The lowest 0°C wet-bulb crossing is used as a thermal snowline proxy, out to +144 h.</div>\n        <div><b>Point card:</b> deliberately stays compact: current type, terrain elevation, snowline, terrain/snowline relationship, precipitation, valid local time and one next-event line.</div>\n        <div><b>Next wintry period:</b> scans through +144 h and shows when it starts, the expected precipitation type and estimated new snow.</div>\n        <div><b>Sounding:</b> explains why the selected precipitation type occurs using the vertical temperature, dew-point and wet-bulb structure, with terrain and snowline marked.</div>\n        <div><b>Times:</b> forecast valid times follow the local timezone of this device. ECMWF model-run cycle labels remain in Z/UTC.</div>\n        <div><b>Map controls:</b> while Wintry forecast is open, a left-click moves the Wintry point. Minimising the panel does not disable point selection.</div>\n        <div class="info-caveat">Snowline, precipitation type and new snow are profile-based diagnostics. New snow is not existing snow depth, and a displayed snowline does not imply precipitation.</div>\n      </div>'''
new_help = '''      <div class="info-body">\n        <div><b>At a glance:</b> precipitation type, terrain, snowline and precipitation for the selected point.</div>\n        <div><b>Next wintry period:</b> timing and estimated new snow through +144 h.</div>\n        <div><b>Forecast:</b> snowline, precipitation, precipitation type and estimated new snow on one timeline.</div>\n        <div><b>Sounding:</b> optional vertical detail with hover/touch temperature, dew point and wet bulb.</div>\n        <div class="info-caveat">Estimated new snow is a forecast estimate, not existing snow depth. Valid times use your device timezone; ECMWF cycle labels remain UTC.</div>\n      </div>'''
t = replace_once(t, old_help, new_help, 'help copy')
# Make the text forecast action comfortable without disturbing the other compact actions.
style_add = '''\n  .snowline-label-chart{width:auto!important;min-width:46px!important;padding:0 5px!important;font-size:7px!important;letter-spacing:.1px!important}\n'''
idx = t.rfind('</style>')
if idx == -1:
    raise SystemExit('plugin style closing tag not found')
t = t[:idx] + style_add + t[idx:]
p.write_text(t, encoding='utf-8')

# Forecast window: keep only decision-useful information visible.
p = Path('src/SnowlineChart.svelte')
t = p.read_text(encoding='utf-8')
t = t.replace('{#if tab === \'graph\'}<button class="png-button" type="button" title="Download PNG" aria-label="Download PNG" disabled={pngBusy} on:click={downloadPng}>{pngBusy ? \'…\' : \'PNG\'}</button>\n      ', '{#if tab === \'graph\'}', 1)
t = replace_once(
    t,
    '<div class="forecast-tabs" role="tablist" aria-label="Forecast view"><button class:active={tab === \'graph\'} type="button" role="tab" aria-selected={tab === \'graph\'} on:click={() => tab = \'graph\'}>Graph</button><button class:active={tab === \'sounding\'} type="button" role="tab" aria-selected={tab === \'sounding\'} on:click={() => tab = \'sounding\'}>Sounding</button></div>',
    '<div class="forecast-tabs" role="tablist" aria-label="Forecast view"><button class:active={tab === \'graph\'} type="button" role="tab" aria-selected={tab === \'graph\'} on:click={() => tab = \'graph\'}>Forecast</button><button class:active={tab === \'sounding\'} type="button" role="tab" aria-selected={tab === \'sounding\'} on:click={() => tab = \'sounding\'}>Sounding</button></div>',
    'forecast tab label',
)
min24 = '''        {#if chart.min24X !== null && chart.min24Y !== null}\n          <line x1={chart.min24X} x2={chart.min24X} y1={chart.min24Y} y2="130" class="min24-line" />\n          <circle cx={chart.min24X} cy={chart.min24Y} r="3.6" class="min24-dot" />\n          <text x={Math.max(66, Math.min(325, chart.min24X))} y={Math.max(28, chart.min24Y - 6)} text-anchor="middle" class="min24-tag">24h min</text>\n        {/if}\n'''
t = replace_once(t, min24, '', '24h min marker')
crossing_marker = '''        {#if chart.crossingX !== null && chart.terrainY !== null && crossing?.crossingTime}\n          <line x1={chart.crossingX} x2={chart.crossingX} y1="34" y2="130" class="crossing-line" />\n          <circle cx={chart.crossingX} cy={chart.terrainY} r="4.8" class="crossing-dot" />\n        {/if}\n'''
t = replace_once(t, crossing_marker, '', 'crossing marker')
t = t.replace('    {#if crossing?.summary}<div class="note">{crossing.summary}</div>{/if}\n', '', 1)
t = t.replace('<div class="hint">Tap graph for values · use Sounding to explain the selected time</div>', '<div class="hint">Tap the forecast for values · Sounding shows optional vertical detail</div>', 1)
p.write_text(t, encoding='utf-8')

# Sounding: keep useful inspection, remove export clutter and make reset obvious.
p = Path('src/SoundingChart.svelte')
t = p.read_text(encoding='utf-8')
t = t.replace('      <button class="png" type="button" title="Download sounding PNG" aria-label="Download sounding PNG" disabled={pngBusy} on:click={downloadPng}>{pngBusy ? \'…\' : \'PNG\'}</button>\n', '', 1)
t = replace_once(
    t,
    '<button class="zoom-readout" type="button" title="Fit sounding" aria-label="Fit sounding" on:click={resetZoom}>{Math.round(zoom * 100)}%</button>',
    '<button class="zoom-readout" type="button" title="Fit sounding" aria-label="Fit sounding" on:click={resetZoom}>Fit</button>',
    'sounding fit button',
)
t = t.replace('<div class="hint">Hover/touch for level details · wheel / pinch / +/- to zoom · drag to pan</div>', '<div class="hint">Hover/touch for T, Td and Tw · +/- to zoom · Fit to reset</div>', 1)
p.write_text(t, encoding='utf-8')

# Search: replace the obscure glyph with a plain action.
p = Path('src/PlaceSearch.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(t, "{searching ? '…' : '⌕'}", "{searching ? '…' : 'Go'}", 'search button')
p.write_text(t, encoding='utf-8')

# v100 metadata.
p = Path('package.json')
t = p.read_text(encoding='utf-8')
t = replace_once(t, '"version": "21.1.0"', '"version": "100.0.0"', 'package version')
t = t.replace(
    '"description": "Convenient terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows precipitation type, terrain, snowline, precipitation, estimated new snow, next wintry-period timing, a clear forecast graph and hover/touch sounding."',
    '"description": "v100 convenience-first terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Five-second answers for precipitation type, terrain, snowline, precipitation, estimated new snow and timing, with optional forecast and sounding detail."',
    1,
)
p.write_text(t, encoding='utf-8')

p = Path('src/pluginConfig.ts')
t = p.read_text(encoding='utf-8')
t = replace_once(t, "version: '21.1.0'", "version: '100.0.0'", 'plugin config version')
t = t.replace(
    "description: 'Convenient terrain-aware winter forecast: type, terrain, snowline, precipitation, estimated new snow, next wintry-period timing, clear graph and hover/touch sounding.'",
    "description: 'v100 convenience-first winter forecast: type, terrain, snowline, precipitation, estimated new snow and timing first; forecast and hover/touch sounding when you want more detail.'",
    1,
)
p.write_text(t, encoding='utf-8')

# README: match the product that is actually shipped.
p = Path('README.md')
t = p.read_text(encoding='utf-8')
intro = '# Wintry forecast for Windy\n\n'
if intro in t and '## v100: convenience first' not in t:
    t = t.replace(intro, intro + '## v100: convenience first\n\nThe default interface is designed to answer five questions quickly: **what will fall, where is the snowline, how does terrain compare, how much precipitation/new snow is expected, and when?** Technical detail stays in the Forecast and Sounding tabs.\n\n', 1)
t = t.replace('- **v20 event intelligence**: next/current wintry-event timing, dominant type, minimum snowline, peak precipitation and estimated new snow\n', '- A compact next/current wintry-period summary with timing, type and estimated new snow\n', 1)
t = t.replace('- Sounding zoom and pan controls\n- PNG export\n', '- Sounding hover/touch inspection plus simple zoom and fit controls\n', 1)
p.write_text(t, encoding='utf-8')
