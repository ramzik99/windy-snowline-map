import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.6',
  icon: '❄️',
  title: 'Snowline',
  description: 'Neat 100 m WBZ snowline contours to +144 h, with subtle 100 m lines, labelled 500 m contours, emphasized 1000 m contours, and a fast 17×11 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
