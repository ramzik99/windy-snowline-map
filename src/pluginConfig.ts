import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '4.0.3',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'Detailed snow forecast to +144 h with wet-bulb-zero snowline contours, terrain comparison, precipitation and modelled snow depth. Version 4.0.3 polishes the graph metadata and consistently labels modelled snow depth across the graph and PNG export.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
