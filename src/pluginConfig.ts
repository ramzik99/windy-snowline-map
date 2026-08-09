import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '5.7.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast with wet-bulb-zero snowline contours, Windy terrain comparison, precipitation, and a terrain-aware snow / mix / rain timeline. With precipitation: snow is shown at or above the snowline, mix from 0–100 m below it, and rain more than 100 m below it. Snow depth is sampled automatically from Windy ECMWF snowcover at the selected timestep using verified channel 0 in centimetres. If snowcover tiles are not already loaded, the plugin silently pre-warms that renderer and restores the user’s original map state without requiring the Snow depth layer to be selected manually. It does not invent a 144-hour snow-depth series. Runs up to 144 hours only. Version 5.7 keeps detailed PNG export and mobile save/share.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
