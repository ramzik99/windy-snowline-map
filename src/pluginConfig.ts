import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.9',
  icon: '❄️',
  title: 'Snowline',
  description: 'Compact ECMWF-only Snowline overlay with colour-coded 100 m WBZ contours to +144 h.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
