<script lang="ts">
  import Plugin from './plugin.svelte';
  import { singleclick } from '@windy/singleclick';
  import config from './pluginConfig';

  function normaliseLatLon(value: any): { lat: number; lon: number } | null {
    if (!value) return null;
    const lat = Number(value.lat ?? value.latitude ?? value.latlng?.lat);
    const lon = Number(value.lon ?? value.lng ?? value.longitude ?? value.latlng?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  }

  // Windy calls onopen after the plugin has mounted. When opened from the
  // right-click context menu, params is the LatLon that was right-clicked.
  // Re-emit that position through the plugin's existing singleclick selection
  // path so the initial Wintry point label appears at exactly that location.
  export const onopen = (params: unknown) => {
    const position = normaliseLatLon(params);
    if (!position) return;

    queueMicrotask(() => {
      singleclick.emit(config.name, position as any);
    });
  };
</script>

<Plugin />
