import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '1.0.4',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, exact point labels, Windy map elevation, ±100 m near-snowline classification, 3-hour tendency, place search, favourites and current-location selection. Search, favourites and My location now recenter without changing the current zoom. Includes stable desktop/mobile point selection, close/share controls, valid and lead times, help, caching and responsive sampling. Thermal boundary only; precipitation is not implied.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
