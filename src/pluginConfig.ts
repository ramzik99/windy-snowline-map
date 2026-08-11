import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '13.0.4',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows adaptive snowline contours, terrain temperature and RH in the point label, precipitation type including convective-snow potential, estimated new snow, a 144-hour graph, and forecast soundings.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
