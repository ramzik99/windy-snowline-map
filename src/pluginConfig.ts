import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.5.4',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy with Windy favourites + place search, automatic labels at Windy’s active pointer/picker location, Label only and Label + contour modes, Windy map-elevation probes with a ±100 m near-snowline band, adaptive sampling, caching, decluttering, and a hard +144 h forecast limit.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
