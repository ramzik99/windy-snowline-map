import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '5.6.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast with wet-bulb-zero snowline contours, Windy terrain comparison, precipitation, and a terrain-aware snow / mix / rain timeline. With precipitation: snow is shown at or above the snowline, mix from 0–100 m below it, and rain more than 100 m below it. When Windy Snow depth is the active map layer, the plugin reads the current ECMWF snowcover renderer value directly from verified channel 0 in centimetres. It does not invent a 144-hour snow-depth series. Runs up to 144 hours only. Version 5.6 keeps detailed PNG export and mobile save/share.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
