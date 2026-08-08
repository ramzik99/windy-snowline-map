import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.2.5',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, terrain-aware point labels, precipitation cues, and a draggable Snowline time graph. Version 3.2.5 adds modelled ECMWF snow depth to the graph when Windy exposes a snow-depth point field, including selected-time depth and tooltip values. Also includes interactive graph readouts, terrain crossing, a real-time Now line, reset-to-Now, Windy native detail forecast, search, favourites, My location, share/copy, help and caching.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
