import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '2.0.0',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, exact terrain-aware point labels, ±100 m classification and 3-hour tendency. Version 2 adds a point-label button that opens Windy weather detail for the exact selected coordinates and a compact Snowline-versus-time graph with terrain reference, selected-time marker and min/current/max values. Includes search, favourites, My location, stable desktop/mobile selection, share/copy, help and caching. Thermal boundary only; precipitation is not implied.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
