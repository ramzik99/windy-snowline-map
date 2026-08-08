import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '5.0.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast to +144 h with wet-bulb-zero snowline contours, terrain comparison, precipitation, modelled snow depth and a terrain-aware rain/mix/snow phase timeline. Version 5 loads snow depth independently of the active Windy overlay, uses precipitation and snow-depth bars, and adds an intuitive precipitation-type band.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
