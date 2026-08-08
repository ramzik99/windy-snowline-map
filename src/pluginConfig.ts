import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.1.0',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, terrain-aware point labels, precipitation cues, and a draggable Snowline time graph. Version 3.1 adds terrain-crossing outlooks to both the point label and graph, including the first forecast time the snowline crosses local terrain or whether it stays above/below through +144 h. Includes Windy native detail forecast, search, favourites, My location, share/copy, help and caching.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
