import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '15.1.0',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Adaptive snowline contours feed a concise point card with current precipitation type, terrain versus snowline and a next-24-hour outlook. The streamlined 144-hour graph shows snowline, precipitation, precipitation type and estimated new snow without repeating the 24-hour outlook, while the sounding explains the selected phase with a marked snowline. Includes search, favourites, sharing and PNG export.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
