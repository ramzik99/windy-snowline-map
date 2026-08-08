import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '3.2.7',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF snow forecast to +144 h with wet-bulb-zero snowline contours, terrain-aware point labels, precipitation and modelled snow depth. Version 3.2.7 adds PNG graph export, a simplified graph header/footer, shorter help text, and clears the search bar after selecting search results, My location or saved places.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
