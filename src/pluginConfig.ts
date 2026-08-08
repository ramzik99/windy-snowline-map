import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.2.6',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF snow forecast to +144 h with wet-bulb-zero snowline contours, terrain-aware point labels, precipitation and modelled snow depth. Includes a compact Snow forecast graph, search, favourites, My location and Windy detail forecast.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
