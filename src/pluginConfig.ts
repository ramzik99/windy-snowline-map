import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.4',
  icon: '❄️',
  title: 'Snowline',
  description: 'Refined WBZ snowline contours to +144 h: 1-hourly to about 90 h and 3-hourly thereafter, with 100 m contours, 500 m labels, and a fast 17×11 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
