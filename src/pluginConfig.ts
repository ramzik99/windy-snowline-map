import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.2',
  icon: '❄️',
  title: 'Snowline Map 100m',
  description: 'Fast adaptive wet-bulb-zero contours: 1-hourly for days 0–5 and 3-hourly to day 15, using a 17×11 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
