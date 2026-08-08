import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '1.0.1',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, exact point labels, Windy map elevation, ±100 m near-snowline classification, 3-hour tendency, place search and favourites. Desktop selection now uses resilient picker synchronization with a direct-click fallback and graceful picker-close handling; mobile uses single-tap selection. Includes source-aware labels, close/share controls, valid and lead times, help, caching and responsive sampling. Thermal boundary only; precipitation is not implied.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
