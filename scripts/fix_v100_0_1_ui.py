from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)

# 1) Point card: return Forecast to a compact square icon action.
p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(
    t,
    '<button class="snowline-label-chart" type="button" aria-label="Open forecast" title="Open forecast">Forecast</button>',
    '<button class="snowline-label-chart" type="button" aria-label="Open forecast" title="Open forecast">📈</button>',
    'forecast action button',
)
t = replace_once(
    t,
    '.snowline-label-chart{width:auto!important;min-width:46px!important;padding:0 5px!important;font-size:7px!important;letter-spacing:.1px!important}',
    '.snowline-label-chart{width:30px!important;min-width:30px!important;padding:0!important;font-size:13px!important;line-height:1!important}',
    'forecast action style',
)
p.write_text(t, encoding='utf-8')

# 2) Sounding: keep hover values inside the sounding card so they can never leave the screen.
p = Path('src/SoundingChart.svelte')
t = p.read_text(encoding='utf-8')
t = replace_once(
    t,
    '{#if hoverNode}<div class="sounding-hover" style={`left:${hoverNode.tooltipX}px;top:${hoverNode.tooltipY}px`}><b>{Math.round(hoverNode.pressure)} hPa · {formatElevation(hoverNode.height,units)}</b><span>T {formatTemperature(hoverNode.temp,units)}</span><span>Td {formatTemperature(hoverNode.dew,units)}</span><span>Tw {formatTemperature(hoverNode.wet,units)}</span></div>{/if}',
    '{#if hoverNode}<div class="sounding-hover"><b>{Math.round(hoverNode.pressure)} hPa · {formatElevation(hoverNode.height,units)}</b><span>T {formatTemperature(hoverNode.temp,units)}</span><span>Td {formatTemperature(hoverNode.dew,units)}</span><span>Tw {formatTemperature(hoverNode.wet,units)}</span></div>{/if}',
    'hover markup',
)
t = replace_once(
    t,
    'let hoverNode: {tx:number;dx:number;wx:number;y:number;pressure:number;height:number;temp:number;dew:number;wet:number;tooltipX:number;tooltipY:number}|null=null;',
    'let hoverNode: {tx:number;dx:number;wx:number;y:number;pressure:number;height:number;temp:number;dew:number;wet:number}|null=null;',
    'hover type',
)
old_calc = '''    const vr = viewport.getBoundingClientRect();\n    const tooltipWidth = 160, tooltipHeight = 62, gap = 8;\n    const preferRight = vr.right + gap + tooltipWidth <= window.innerWidth - 6;\n    const tooltipX = preferRight ? vr.right + gap : Math.max(6, vr.left - tooltipWidth - gap);\n    const nodeClientY = rect.top + nearest.y / 390 * rect.height;\n    const tooltipY = Math.max(6, Math.min(window.innerHeight - tooltipHeight - 6, nodeClientY - tooltipHeight / 2));\n    hoverNode = { ...nearest, tooltipX, tooltipY };'''
t = replace_once(
    t,
    old_calc,
    '    hoverNode = { ...nearest };',
    'hover position calculation',
)
# Replace the old fixed browser-level tooltip with an in-card overlay.
old_css = '.sounding-hover{position:fixed;z-index:10060;display:grid;grid-template-columns:repeat(3,auto);gap:4px 8px;width:160px;box-sizing:border-box;padding:7px 8px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(5,10,14,.96);box-shadow:0 8px 22px rgba(0,0,0,.48);pointer-events:none}'
new_css = '.sounding-hover{position:absolute;z-index:6;top:78px;right:14px;display:grid;grid-template-columns:repeat(3,auto);gap:4px 8px;width:160px;max-width:calc(100% - 28px);box-sizing:border-box;padding:7px 8px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(5,10,14,.96);box-shadow:0 8px 22px rgba(0,0,0,.48);pointer-events:none}'
t = replace_once(t, old_css, new_css, 'hover css')
# Embedded sounding has no normal header, so place the pinned tooltip a little higher.
style_anchor = '  .sounding-shell.sounding-embedded{position:relative;left:auto!important;top:auto!important;z-index:auto;width:100%;box-sizing:border-box;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}'
t = replace_once(
    t,
    style_anchor,
    style_anchor + '\n  .sounding-shell.sounding-embedded .sounding-hover{top:54px;right:10px}',
    'embedded hover style',
)
p.write_text(t, encoding='utf-8')

# 3) Publishable patch version.
p = Path('package.json')
t = p.read_text(encoding='utf-8')
t = replace_once(t, '"version": "100.0.0"', '"version": "100.0.1"', 'package version')
p.write_text(t, encoding='utf-8')

p = Path('src/pluginConfig.ts')
t = p.read_text(encoding='utf-8')
t = replace_once(t, "version: '100.0.0'", "version: '100.0.1'", 'plugin config version')
p.write_text(t, encoding='utf-8')
