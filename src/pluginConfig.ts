import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.2.1',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy to +144 h with adaptive contours, terrain-aware point labels, precipitation cues, and a draggable Snowline time graph. Version 3.2 adds interactive graph readouts, a clickable Crossing terrain marker, a real-time Now line, and live selected-time terrain difference as Windy timeline moves. Includes Windy native detail forecast, search, favourites, My location, share/copy, help and caching.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
