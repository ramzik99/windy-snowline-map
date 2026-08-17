import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '21.1.0',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Convenient terrain-aware winter forecast: type, terrain, snowline, precipitation, estimated new snow, next wintry-period timing, clear graph and hover/touch sounding.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
