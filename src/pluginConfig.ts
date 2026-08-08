import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.6.5',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy with built-in place search, saved favourites, clear-search control, hide/show panel control, persistent search-result labels, Windy singleclick point selection for reliable mobile tapping, Label only, Contour only, and Label + contour modes, desktop Windy picker following, concise point labels, ±100 m near-snowline wording, 3-hour snowline tendency, higher adaptive contour sampling by zoom, queued viewport refreshes, Windy map elevation, caching, and a hard +144 h forecast limit. Thermal snowline only; precipitation is not implied.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
