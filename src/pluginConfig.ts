import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '10.0.1',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'Terrain-aware ECMWF snow forecast for mountainous areas. Builds a wet-bulb vertical profile, combines it with Windy local terrain, and diagnoses snow, wet snow, rain/snow mix, rain, ice pellets or freezing rain when precipitation is ≥0.1 mm/h. Includes adaptive snowline contours, a live point label, a graph that follows map clicks and panel searches, hourly precipitation, selected-timestep Windy snow depth, and desktop PNG export. Runs up to 144 hours only.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
