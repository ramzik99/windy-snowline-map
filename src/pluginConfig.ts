import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '21.0.1',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'v21 terrain-aware winter forecast: event confidence and timing, elevation impacts and snow by elevation, saved-place outlooks, Metric/Imperial units, ECMWF freshness, persistent preferences, hazard emphasis, graph and detailed hover/touch sounding inspection.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
