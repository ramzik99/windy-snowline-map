from pathlib import Path

p = Path('src/plugin.svelte')
s = p.read_text()
old = '''  function labelGrid(valid: string, terrain: number, snowline: number, difference: number, precip: number | null, tendency: string, confidence: string): string {
    const delta = `${difference >= 0 ? '+' : ''}${Math.round(difference / 10) * 10} m`;
    return `<div class="snowline-label-grid"><span><small>Valid</small><strong>${valid}</strong></span><span><small>Terrain</small><strong>${terrain} m</strong></span><span><small>Snowline</small><strong>${snowline} m</strong></span><span><small>Terrain Δ</small><strong>${delta}</strong></span><span><small>Precip</small><strong>${precip !== null ? `${formatPrecipMm(precip)} mm/h` : '0'}</strong></span><span><small>Trend</small><strong>${tendency || '—'}</strong></span><span class="wide"><small>Confidence</small><strong>${confidence}</strong></span></div>`;
  }'''
new = '''  function labelGrid(valid: string, terrain: number, snowline: number, difference: number, precip: number | null, tendency: string, confidence: string): string {
    return `<div class="snowline-label-grid"><span><small>Valid</small><strong>${valid}</strong></span><span><small>Precip</small><strong>${precip !== null ? `${formatPrecipMm(precip)} mm/h` : '0'}</strong></span><span><small>Terrain</small><strong>${terrain} m</strong></span><span><small>Snowline</small><strong>${snowline} m</strong></span></div>`;
  }'''
s = s.replace(old, new)
s = s.replace("colorForLevel(snowline), statusForPhase(phase), phase.detail);", "colorForLevel(snowline), statusForPhase(phase), '');")
s = s.replace("colorForLevel(snowline), status, terrainCrossingState(clickedPoint, clickedMapElevationM, target)?.summary ?? 'No measurable precipitation');", "colorForLevel(snowline), status, '');")
s = s.replace('width:248px;min-height:190px;', 'width:232px;min-height:148px;')
s = s.replace('iconSize: [248, 196], iconAnchor: [124, 204]', 'iconSize: [232, 154], iconAnchor: [116, 162]')
s = s.replace('width:226px;min-height:184px;', 'width:218px;min-height:144px;')
p.write_text(s)

for file in ['src/pluginConfig.ts', 'package.json']:
    p = Path(file)
    p.write_text(p.read_text().replace('12.2.0', '12.2.1'))
