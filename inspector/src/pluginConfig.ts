import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-data-inspector',
  version: '0.2.0',
  icon: '🔎',
  title: 'Windy data inspector',
  description: 'Standalone ECMWF diagnostic that compares getPointForecastData(), getMeteogramForecastData() and the active renderer, recursively scanning returned payloads for snow-depth fields.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
