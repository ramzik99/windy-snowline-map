from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)

p = Path('src/plugin.svelte')
t = p.read_text(encoding='utf-8')

t = replace_once(
    t,
    "  import { map } from '@windy/map';\n  import store from '@windy/store';",
    "  import { map } from '@windy/map';\n  import { singleclick } from '@windy/singleclick';\n  import store from '@windy/store';\n  import config from './pluginConfig';",
    'singleclick imports',
)

anchor = "  export function selectMapPoint(lat:number,lon:number){if(!enabled||!Number.isFinite(lat)||!Number.isFinite(lon))return;void probeLocation(lat,lon,'map-click')}\n"
replacement = anchor + "  function handleWindySingleclick(event:any){if(!enabled)return;const lat=Number(event?.lat??event?.latlng?.lat),lon=Number(event?.lon??event?.lng??event?.latlng?.lng);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;if(chartOpen)return;void probeLocation(lat,lon,'map-click')}\n"
t = replace_once(t, anchor, replacement, 'singleclick handler')

old_mount = "  onMount(()=>{loadPreferences();map.on('moveend',handleMapNavigation);map.on('zoomend',handleMapNavigation);try{timestampListener=store.on('timestamp',()=>{if(enabled&&cache.length&&!viewportLoading)renderFromCache();if(enabled)updatePersistentClickLabel()})}catch{}refreshViewport()})"
new_mount = "  onMount(()=>{loadPreferences();singleclick.on(config.name,handleWindySingleclick);map.on('moveend',handleMapNavigation);map.on('zoomend',handleMapNavigation);try{timestampListener=store.on('timestamp',()=>{if(enabled&&cache.length&&!viewportLoading)renderFromCache();if(enabled)updatePersistentClickLabel()})}catch{}refreshViewport()})"
t = replace_once(t, old_mount, new_mount, 'mount singleclick listener')

old_destroy = "  onDestroy(()=>{generation++;clickGeneration++;refreshQueued=false;if(moveTimer)clearTimeout(moveTimer);map.off('moveend',handleMapNavigation);map.off('zoomend',handleMapNavigation);if(timestampListener!==null)try{store.off(timestampListener)}catch{}clearContours();clearClickLayer();profileCache.clear()})"
new_destroy = "  onDestroy(()=>{generation++;clickGeneration++;refreshQueued=false;if(moveTimer)clearTimeout(moveTimer);singleclick.off(config.name,handleWindySingleclick);map.off('moveend',handleMapNavigation);map.off('zoomend',handleMapNavigation);if(timestampListener!==null)try{store.off(timestampListener)}catch{}clearContours();clearClickLayer();profileCache.clear()})"
t = replace_once(t, old_destroy, new_destroy, 'destroy singleclick listener')

p.write_text(t, encoding='utf-8')

p = Path('package.json')
t = p.read_text(encoding='utf-8')
t = replace_once(t, '"version": "100.1.1"', '"version": "100.1.2"', 'package version')
p.write_text(t, encoding='utf-8')

p = Path('src/pluginConfig.ts')
t = p.read_text(encoding='utf-8')
t = replace_once(t, "version: '100.1.1'", "version: '100.1.2'", 'plugin config version')
p.write_text(t, encoding='utf-8')
