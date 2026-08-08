import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.5.5',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy that follows Windy’s active pointer/picker location, with Label only and Label + contour modes, Windy map-elevation probes with a ±100 m near-snowline band, adaptive sampling, caching, decluttering, and a hard +144 h forecast limit.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
