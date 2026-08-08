import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '4.0.1',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast to +144 h with wet-bulb-zero snowline contours, terrain-aware point forecasts, precipitation and modelled snow depth. Version 4.0.1 fixes graph label overlap, keeps unavailable snow depth visible as an explicit state, and expands PNG export to include the lower forecast panels, selected values and terrain-crossing summary.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
