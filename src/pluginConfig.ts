import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.1',
  icon: '❄️',
  title: 'Snowline Map 100m',
  description: 'Fast 100 m wet-bulb-zero isolines with 1-hourly forecast support, up to 15 days where available, using a 17×11 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
