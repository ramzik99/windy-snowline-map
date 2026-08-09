import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '5.5.1',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast with wet-bulb-zero snowline contours, Windy terrain comparison, precipitation, and a terrain-aware snow / mix / rain timeline. With precipitation: snow is shown at or above the snowline, mix from 0–100 m below it, and rain more than 100 m below it. Runs up to 144 hours only. Version 5.5.1 removes the unsupported snow-depth panel and keeps detailed PNG export and mobile save/share.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
