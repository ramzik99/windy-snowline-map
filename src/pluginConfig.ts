import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '11.0.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'Terrain-aware mountain snow forecast using ECMWF vertical profiles with Windy local terrain. Diagnoses snow, wet snow, mix, rain, ice pellets and freezing rain at ≥0.1 mm/h. v11 adds a compact square point card, map-click capture for labeled places, faster adaptive contours, a visual precipitation-type timeline, terrain-aware estimated new-snow accumulation, and a richer desktop PNG matching the graph. Runs up to 144 hours only.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
