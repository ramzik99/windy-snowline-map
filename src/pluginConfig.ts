import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.0',
  icon: '❄️',
  title: 'Snowline Map 100m',
  description: '100 m wet-bulb-zero isolines with labels, 1-hourly forecast support, and a denser 21×15 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
