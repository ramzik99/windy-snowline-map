import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.0.0',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, terrain-aware point labels, ±100 m classification and 3-hour tendency. Version 3 adds ECMWF 3-hour precipitation cues to point labels and aligned precipitation bars to the Snowline time graph. The partly-cloudy point button opens Windy weather detail in-place without changing zoom, while Snowline remains open. Includes search, favourites, My location, stable desktop/mobile selection, share/copy, help and caching.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
