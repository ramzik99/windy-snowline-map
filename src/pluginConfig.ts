import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '21.0.1',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Simple terrain-aware winter forecast: snowline, local terrain, precipitation type and amount, next wintry period, forecast graph and detailed hover/touch sounding.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
