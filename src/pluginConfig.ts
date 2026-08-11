import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '13.2.3',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Stable terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows adaptive snowline contours and a simple point card with weather type, terrain versus snowline, precipitation, estimated new snow when relevant, snowline trend, a 144-hour graph, forecast soundings, search, favourites, and sharing.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
