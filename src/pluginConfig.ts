import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.0.2',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, terrain-aware point labels, ±100 m classification and 3-hour tendency. Version 3 adds precipitation cues and bars, a draggable Snowline time graph, and a partly-cloudy button that opens Windy native detail forecast directly at the selected point without changing map zoom. Includes search, favourites, My location, stable desktop/mobile selection, share/copy, help and caching.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
