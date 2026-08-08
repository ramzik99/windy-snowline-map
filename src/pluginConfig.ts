import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.4.5',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy with stitched colour-coded 100 m contours, terrain-aware point probes, persistent timeline-updating labels, adaptive viewport sampling, profile caching, decluttering, and a hard +144 h forecast limit.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
