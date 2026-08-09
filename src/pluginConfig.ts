import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '12.1.0',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware mountain winter-weather forecast using ECMWF vertical profiles with Windy local terrain. Diagnoses snow, wet snow, rain/snow mix, rain, ice pellets/sleet and freezing rain at ≥0.1 mm/h. Includes adaptive snowline contours, fast point cards, a 144 h meteogram, estimated new snow, and a forecast sounding with zoom and PNG download. Runs up to 144 hours only.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
