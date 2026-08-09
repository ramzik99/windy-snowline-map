from pathlib import Path
import re

# plugin.svelte
p = Path('src/plugin.svelte')
s = p.read_text()
s = s.replace("  import SoundingChart from './SoundingChart.svelte';\n", '')
s = s.replace("  let chartOpen = false;\n  let soundingOpen = false;", "  let chartOpen = false;\n  let forecastTab: 'graph' | 'sounding' = 'graph';")
s = re.sub(r"\{#if chartOpen && clickedPoint\}\s*<SnowlineChart[^\n]+\n\{/if\}\s*\{#if soundingOpen && clickedPoint\}\s*<SoundingChart[^\n]+\n\{/if\}", "{#if chartOpen && clickedPoint}\n  <SnowlineChart point={clickedPoint} terrainM={clickedMapElevationM} placeName={clickedPlaceName || 'Selected point'} bind:tab={forecastTab} on:close={() => chartOpen = false} />\n{/if}", s)
s = s.replace("        <div>The point card gives a fast snapshot. Use <b>📊</b> for the 144 h graph or <b>SND</b> for a forecast sounding showing temperature, dew point and wet-bulb profiles at the selected time.</div>", "        <div>The point card is intentionally quick: save the location, open the forecast window, share, or close. The forecast window switches between <b>Graph</b> and <b>Sounding</b> tabs.</div>")
s = s.replace("        <div>While active, map clicks — including named/labeled places — open the Wintry forecast point card instead of Windy’s detail forecast. Open graph and sounding windows follow map clicks and panel searches without closing.</div>", "        <div>While active, map clicks — including named/labeled places — open the Wintry forecast point card instead of Windy’s detail forecast. An open forecast window follows map clicks and panel searches without closing.</div>")
s = s.replace("if (closeWindows) { chartOpen = false; soundingOpen = false; }", "if (closeWindows) chartOpen = false;")
s = s.replace("const keepChartOpen = chartOpen, keepSoundingOpen = soundingOpen, myClick", "const keepChartOpen = chartOpen, myClick")
s = s.replace("if (keepChartOpen) chartOpen = true; if (keepSoundingOpen) soundingOpen = true;", "if (keepChartOpen) chartOpen = true;")
s = s.replace("if (wasSearch && !chartOpen && !soundingOpen) clearPointState(true);", "if (wasSearch && !chartOpen) clearPointState(true);")

if 'FAVOURITES_STORAGE_KEY' not in s:
    anchor = "  async function shareCurrentPoint(button: HTMLButtonElement) {"
    fav = '''  const FAVOURITES_STORAGE_KEY = 'snowline:favourites:v1';
  const FAVOURITES_CHANGED_EVENT = 'wintry:favourites-changed';
  function favouriteKey(lat: number, lon: number): string { return `${lat.toFixed(5)},${lon.toFixed(5)}`; }
  function readFavourites(): any[] { try { const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  function isCurrentFavourite(): boolean { if (!clickedLatLon) return false; const key = favouriteKey(clickedLatLon[0], clickedLatLon[1]); return readFavourites().some(item => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)) && favouriteKey(Number(item.lat), Number(item.lon)) === key); }
  async function toggleCurrentFavourite(button: HTMLButtonElement) {
    if (!clickedLatLon) return;
    const [lat, lon] = clickedLatLon, key = favouriteKey(lat, lon); let items = readFavourites();
    const exists = items.some(item => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)) && favouriteKey(Number(item.lat), Number(item.lon)) === key);
    if (exists) items = items.filter(item => !(Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)) && favouriteKey(Number(item.lat), Number(item.lon)) === key));
    else { const name = await resolvePlaceName(lat, lon), parts = name.split(',').map(v => v.trim()).filter(Boolean); items = [{ lat, lon, primary: parts[0] || 'Saved point', secondary: parts.slice(1).join(', ') }, ...items].slice(0, 30); }
    try { localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(items)); } catch {}
    window.dispatchEvent(new CustomEvent(FAVOURITES_CHANGED_EVENT));
    button.textContent = exists ? '☆' : '★'; button.classList.toggle('saved', !exists); button.title = exists ? 'Save location' : 'Remove saved location';
  }

'''
    s = s.replace(anchor, fav + anchor)

s = re.sub(r"    const actions = clickedPoint && clickedLatLon \? .*? : '';", "    const saved = isCurrentFavourite();\n    const actions = clickedPoint && clickedLatLon ? `<button class=\"snowline-label-chart\" type=\"button\" aria-label=\"Open forecast\" title=\"Open forecast\">📊</button><button class=\"snowline-label-favourite${saved ? ' saved' : ''}\" type=\"button\" aria-label=\"${saved ? 'Remove saved location' : 'Save location'}\" title=\"${saved ? 'Remove saved location' : 'Save location'}\">${saved ? '★' : '☆'}</button><button class=\"snowline-label-share\" type=\"button\" aria-label=\"Copy Wintry forecast details\" title=\"Copy Wintry forecast details\">share</button>` : '';", s, count=1)
s = re.sub(r"      const graph = target\?\.closest\?\.\('\.snowline-label-chart'\).*?      if \(share\) \{ void shareCurrentPoint\(share\); return; \}", "      const graph = target?.closest?.('.snowline-label-chart'), favourite = target?.closest?.('.snowline-label-favourite') as HTMLButtonElement | null, share = target?.closest?.('.snowline-label-share') as HTMLButtonElement | null, close = target?.closest?.('.snowline-label-close');\n      if (!graph && !favourite && !share && !close) return; try { L.DomEvent.stop(original); } catch {}\n      if (graph) { if (clickedPoint) { forecastTab = 'graph'; chartOpen = true; } return; }\n      if (favourite) { void toggleCurrentFavourite(favourite); return; }\n      if (share) { void shareCurrentPoint(share); return; }", s, count=1, flags=re.S)
s = s.replace(".chart-shell,.sounding-shell", ".chart-shell")
s = s.replace(":global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-sounding)", ":global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-favourite)")
s = s.replace(":global(.snowline-label-chart){left:7px;width:28px;font-size:15px}:global(.snowline-label-sounding){left:41px;width:34px;font-size:7px;letter-spacing:.2px}", ":global(.snowline-label-chart){left:7px;width:28px;font-size:15px}:global(.snowline-label-favourite){left:41px;width:28px;font-size:16px;color:#aab6bd}:global(.snowline-label-favourite.saved){color:#ffe45c;border-color:rgba(255,228,92,.42);background:rgba(255,228,92,.08)}")
s = s.replace(":global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-sounding){height:27px;line-height:25px}", ":global(.snowline-label-close),:global(.snowline-label-share),:global(.snowline-label-chart),:global(.snowline-label-favourite){height:27px;line-height:25px}")
p.write_text(s)

# PlaceSearch
p = Path('src/PlaceSearch.svelte'); s = p.read_text()
if 'handleFavouritesChanged' not in s:
    s = s.replace("  onMount(loadFavourites);", "  function handleFavouritesChanged() { loadFavourites(); }\n\n  onMount(() => { loadFavourites(); window.addEventListener('wintry:favourites-changed', handleFavouritesChanged); });")
    s = s.replace("    controller?.abort();\n  });", "    controller?.abort();\n    window.removeEventListener('wintry:favourites-changed', handleFavouritesChanged);\n  });")
p.write_text(s)

# SoundingChart embeddable
p = Path('src/SoundingChart.svelte'); s = p.read_text()
s = s.replace('<div class="sounding-shell" role="dialog" aria-modal="false" aria-label="Forecast sounding" bind:this={shell} style={`left:${position.x}px;top:${position.y}px;`}>', '<div class:sounding-embedded={embedded} class="sounding-shell" role="group" aria-label="Forecast sounding" bind:this={shell} style={embedded ? undefined : `left:${position.x}px;top:${position.y}px;`}>')
s = s.replace('  <div class="head">\n    <div>\n      <b>Forecast sounding</b>\n      <small>{placeName || \'Selected point\'}</small>\n      <em>{validLabel}</em>\n    </div>', '  <div class="head" class:embedded-head={embedded}>\n    {#if !embedded}<div>\n      <b>Forecast sounding</b>\n      <small>{placeName || \'Selected point\'}</small>\n      <em>{validLabel}</em>\n    </div>{/if}')
s = s.replace('      <button class="drag" type="button" title="Drag sounding window" aria-label="Drag sounding window" on:pointerdown={startDrag}>↕</button>\n      <button type="button" title="Close" aria-label="Close sounding" on:click={() => dispatch(\'close\')}>×</button>', "      {#if !embedded}<button class=\"drag\" type=\"button\" title=\"Drag sounding window\" aria-label=\"Drag sounding window\" on:pointerdown={startDrag}>↕</button>\n      <button type=\"button\" title=\"Close\" aria-label=\"Close sounding\" on:click={() => dispatch('close')}>×</button>{/if}")
if 'export let embedded' not in s: s = s.replace("  export let placeName = '';", "  export let placeName = '';\n  export let embedded = false;")
s = s.replace("    const width = Math.min(390, window.innerWidth - 12); position = { x: Math.max(6, window.innerWidth - width - 16), y: window.innerWidth <= 520 ? 38 : 66 };", "    if (!embedded) { const width = Math.min(390, window.innerWidth - 12); position = { x: Math.max(6, window.innerWidth - width - 16), y: window.innerWidth <= 520 ? 38 : 66 }; }")
if '.sounding-shell.sounding-embedded' not in s:
    s = s.replace("  .head{display:flex;justify-content:space-between;gap:8px}", "  .sounding-shell.sounding-embedded{position:relative;left:auto!important;top:auto!important;z-index:auto;width:100%;box-sizing:border-box;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}\n  .sounding-embedded .embedded-head{justify-content:flex-end;margin-bottom:4px}\n  .head{display:flex;justify-content:space-between;gap:8px}")
p.write_text(s)

# SnowlineChart tabs
p = Path('src/SnowlineChart.svelte'); s = p.read_text()
if "import SoundingChart" not in s: s = s.replace("  import { estimateNewSnowStep, formatNewSnowCm } from './snowAccum';", "  import { estimateNewSnowStep, formatNewSnowCm } from './snowAccum';\n  import SoundingChart from './SoundingChart.svelte';")
if "export let tab:" not in s: s = s.replace("  export let placeName = '';", "  export let placeName = '';\n  export let tab: 'graph' | 'sounding' = 'graph';")
s = s.replace("      <button class=\"png-button\" type=\"button\" title=\"Download PNG\" aria-label=\"Download PNG\" disabled={pngBusy} on:click={downloadPng}>{pngBusy ? '…' : 'PNG'}</button>\n      <button type=\"button\" title=\"Back to now\" aria-label=\"Back to now\" on:click={resetToNow}>Now</button>", "      {#if tab === 'graph'}<button class=\"png-button\" type=\"button\" title=\"Download PNG\" aria-label=\"Download PNG\" disabled={pngBusy} on:click={downloadPng}>{pngBusy ? '…' : 'PNG'}</button>\n      <button type=\"button\" title=\"Back to now\" aria-label=\"Back to now\" on:click={resetToNow}>Now</button>{/if}")
if 'class="forecast-tabs"' not in s:
    s = s.replace("  </div>\n\n  {#if chart}", "  </div>\n  <div class=\"forecast-tabs\" role=\"tablist\" aria-label=\"Forecast view\"><button class:active={tab === 'graph'} type=\"button\" role=\"tab\" aria-selected={tab === 'graph'} on:click={() => tab = 'graph'}>Graph</button><button class:active={tab === 'sounding'} type=\"button\" role=\"tab\" aria-selected={tab === 'sounding'} on:click={() => tab = 'sounding'}>Sounding</button></div>\n\n  {#if tab === 'graph'}\n  {#if chart}", 1)
    s = s.replace("  {:else}\n    <div class=\"empty\">Wintry forecast unavailable.</div>\n  {/if}\n</div>\n\n<script lang=\"ts\">", "  {:else}\n    <div class=\"empty\">Wintry forecast unavailable.</div>\n  {/if}\n  {:else}\n    <SoundingChart {point} {terrainM} {placeName} embedded={true} />\n  {/if}\n</div>\n\n<script lang=\"ts\">", 1)
if '.forecast-tabs{' not in s:
    s = s.replace("  .plot-wrap{position:relative;margin-top:5px}", "  .forecast-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px;padding:3px;border-radius:8px;background:rgba(255,255,255,.035)}.forecast-tabs button{height:27px;border:0;border-radius:6px;background:transparent;color:#82939d;font-size:9px;font-weight:800;cursor:pointer}.forecast-tabs button.active{background:rgba(98,213,255,.13);color:#eaf7fc;box-shadow:inset 0 0 0 1px rgba(98,213,255,.22)}\n  .plot-wrap{position:relative;margin-top:5px}")
p.write_text(s)

# Version
for file in ['src/pluginConfig.ts', 'package.json']:
    p = Path(file); t = p.read_text().replace('12.1.1', '12.2.0')
    t = t.replace('a forecast sounding with zoom and PNG download.', 'a unified Graph/Sounding forecast window, point favourites, sounding zoom and PNG download.')
    p.write_text(t)
