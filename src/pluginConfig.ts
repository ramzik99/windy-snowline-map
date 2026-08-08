import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '1.0.2',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, exact point labels, Windy map elevation, ±100 m near-snowline classification, 3-hour tendency, place search and favourites. Desktop clicks now create persistent labels directly; valid Windy picker updates may refine them, while empty or stale picker state never removes them. Includes mobile single-tap selection, close/share controls, valid and lead times, help, caching and responsive sampling. Thermal boundary only; precipitation is not implied.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
