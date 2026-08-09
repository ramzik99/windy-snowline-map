<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Plugin from './plugin.svelte';
  import { singleclick } from '@windy/singleclick';
  import config from './pluginConfig';

  let unitObserver: MutationObserver | null = null;

  function normaliseLatLon(value: any): { lat: number; lon: number } | null {
    if (!value) return null;
    const lat = Number(value.lat ?? value.latitude ?? value.latlng?.lat);
    const lon = Number(value.lon ?? value.lng ?? value.longitude ?? value.latlng?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  }

  function isWintryUi(node: Node): boolean {
    const element = node.nodeType === Node.ELEMENT_NODE
      ? node as Element
      : node.parentElement;
    return !!element?.closest?.('.snowline-panel,.show-panel,.snowline-click-label,.chart-shell,.sounding-shell,.info-window');
  }

  function updatePrecipUnits(root: Node) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);

    for (const node of nodes) {
      if (!isWintryUi(node) || !node.data.includes('mm/h')) continue;
      node.data = node.data
        .replace(/0\.1 mm\/h/g, '0.3 mm/3h')
        .replace(/mm\/h/g, 'mm/3h');
    }
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

  onMount(() => {
    updatePrecipUnits(document.body);
    unitObserver = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') updatePrecipUnits(record.target);
        for (const node of record.addedNodes) updatePrecipUnits(node);
      }
    });
    unitObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  });

  onDestroy(() => {
    unitObserver?.disconnect();
    unitObserver = null;
  });
</script>

<Plugin />
