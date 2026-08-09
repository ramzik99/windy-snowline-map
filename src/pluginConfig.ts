import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '6.0.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast with wet-bulb-zero snowline contours, Windy terrain comparison, precipitation, and a terrain-aware snow / mix / rain timeline. With precipitation of at least 0.1 mm/3h: snow is shown at or above the snowline, mix from 0–100 m below it, and rain more than 100 m below it. Forecast precipitation-type summaries are weighted by precipitation amount, and precipitation decoding uses deterministic ECMWF field/unit handling rather than value-size guessing. The Snow depth card can switch Windy to ECMWF Snow depth and read snowcover channel 0 in centimetres for the selected timestep; no hidden overlay switching or invented 144-hour snow-depth series is used. Runs up to 144 hours only. Version 6.0 also hardens mobile PNG downloading and clarifies thermal snowline/terrain crossing messages.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
