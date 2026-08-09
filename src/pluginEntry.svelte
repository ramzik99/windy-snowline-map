<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { map } from '@windy/map';
  import Plugin from './plugin.svelte';

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
        .replace(/0\.1 mm\/h/g, '0.1 mm/3h')
        .replace(/mm\/h/g, 'mm/3h');
    }
  }

  /**
   * Feed a LatLon into the same permanent captured map-click handler that is
   * used for ordinary left-clicks. There is intentionally only one point-
   * activation path, so minimising the panel cannot disable point selection.
   */
  function activateWintryPoint(lat: number, lon: number) {
    try {
      const container = map.getContainer?.() as HTMLElement | undefined;
      if (!container) return;
      const pixel = map.latLngToContainerPoint([lat, lon]);
      const rect = container.getBoundingClientRect();
      container.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: rect.left + pixel.x,
        clientY: rect.top + pixel.y,
      }));
    } catch (error) {
      console.warn('Wintry forecast could not activate the selected point', error);
    }
  }

  // Windy supplies the right-click/context-menu LatLon to onopen. Route it
  // through exactly the same click path as every later left-click.
  export const onopen = (params: unknown) => {
    const position = normaliseLatLon(params);
    if (!position) return;
    requestAnimationFrame(() => activateWintryPoint(position.lat, position.lon));
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
