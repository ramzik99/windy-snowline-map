<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { singleclick } from '@windy/singleclick';
  import Plugin from './plugin.svelte';
  import PointLabelDiagnostics from './PointLabelDiagnostics.svelte';
  import config from './pluginConfig';

  let plugin: any = null;
  let selected: { lat: number; lon: number } | null = null;

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
    selected = position;
    plugin?.selectMapPoint?.(position.lat, position.lon);
  }

  export const onopen = (params: unknown) => {
    selectLocation(params);
  };

  onMount(() => {
    singleclick.on(config.name, selectLocation as any);
  });

  onDestroy(() => {
    singleclick.off(config.name, selectLocation as any);
  });
</script>

<Plugin bind:this={plugin} />
<PointLabelDiagnostics {selected} />
