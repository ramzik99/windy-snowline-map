import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '4.0.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast to +144 h with wet-bulb-zero snowline contours, terrain-aware point forecasts, precipitation and modelled snow depth. Version 4.0.0 reorganises the detailed graph into clearly separated altitude, precipitation and snow-depth panels, uses one authoritative selected forecast timestep throughout the graph, and exports a clean presentation-ready PNG independent of UI state.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
