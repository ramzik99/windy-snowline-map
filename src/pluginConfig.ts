import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '100.0.1',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'v100 convenience-first winter forecast: type, terrain, snowline, precipitation, estimated new snow and timing first; forecast and hover/touch sounding when you want more detail.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
