import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '6.0.1',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF snow forecast with wet-bulb-zero snowline contours, Windy terrain comparison, precipitation, and a terrain-aware snow / mix / rain timeline. Phase is shown only with precipitation ≥0.1 mm/3h: snow at or above the snowline, mix 0–100 m below, rain more than 100 m below. Includes precipitation-weighted summaries, current-timestep Windy snow depth via the Snow depth layer, and desktop PNG export. Runs up to 144 hours only.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
