import type { ExternalPluginConfig } from '@windy/interfaces';
import { map } from '@windy/map';
import { singleclick } from '@windy/singleclick';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '12.2.4',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows adaptive snowline contours and point forecasts for precipitation type, estimated new snow, a 144-hour graph, and forecast soundings.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

/*
 * Keep point selection deliberately simple:
 * - Windy routes an ordinary left-click/tap to this plugin through singleclick.
 * - Right-click/context-menu picker actions do not use singleclick, so they stay
 *   completely independent from the Wintry point label.
 *
 * The main component already owns the point-label logic through its captured
 * map-click handler. Forward the Windy singleclick to that one existing path so
 * there is still only one label implementation to maintain.
 */
singleclick.on(config.name, (value: any) => {
  const lat = Number(value?.lat ?? value?.latitude ?? value?.latlng?.lat);
  const lon = Number(value?.lon ?? value?.lng ?? value?.longitude ?? value?.latlng?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

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
    console.warn('Wintry forecast singleclick routing failed', error);
  }
});

export default config;
