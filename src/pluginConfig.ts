import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '5.7.2',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast with wet-bulb-zero snowline contours, Windy terrain comparison, precipitation, and a terrain-aware snow / mix / rain timeline. With precipitation: snow is shown at or above the snowline, mix from 0–100 m below it, and rain more than 100 m below it. The Snow depth card has an Open layer button that switches Windy to ECMWF Snow depth and then reads snowcover channel 0 in centimetres for the selected timestep. No hidden overlay switching is used. It does not invent a 144-hour snow-depth series. Runs up to 144 hours only. Version 5.7.2 keeps detailed PNG export and mobile save/share.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
