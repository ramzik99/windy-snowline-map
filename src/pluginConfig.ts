import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '4.0.2',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'Detailed snow forecast to +144 h with wet-bulb-zero snowline contours, terrain comparison, precipitation and modelled snow depth. Version 4.0.2 improves graph readability and styling, separates place/model/valid-time information, and can use Windy\'s displayed Snow depth layer as a selected-time fallback when the point forecast feed does not expose a snow-depth series.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
