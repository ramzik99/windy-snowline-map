<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { singleclick } from '@windy/singleclick';
  import Plugin from './plugin.svelte';
  import config from './pluginConfig';

  let plugin: any = null;

  function normaliseLatLon(value: any): { lat: number; lon: number } | null {
    if (!value) return null;
    const lat = Number(value.lat ?? value.latitude ?? value.latlng?.lat);
    const lon = Number(value.lon ?? value.lng ?? value.longitude ?? value.latlng?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  }

  function selectLocation(value: unknown) {
    const position = normaliseLatLon(value);
    if (!position) return;
    plugin?.selectMapPoint?.(position.lat, position.lon);
  }

  // Windy passes the right-click/context-menu LatLon here after the plugin is
  // mounted. Use the exact same selection function as every later left-click.
  export const onopen = (params: unknown) => {
    selectLocation(params);
  };

  onMount(() => {
    // `listenToSingleclick: true` makes Windy route map clicks to this plugin
    // while it is open. Windy also releases that ownership when it closes.
    singleclick.on(config.name, selectLocation as any);
  });

  onDestroy(() => {
    singleclick.off(config.name, selectLocation as any);
  });
</script>

<Plugin bind:this={plugin} />
