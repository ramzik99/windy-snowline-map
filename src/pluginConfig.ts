import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '5.0.1',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'ECMWF Snow forecast with wet-bulb-zero snowline contours, terrain comparison, precipitation, modelled snow depth when supplied by Windy point data, and a simple snow / near-snowline / rain phase timeline. Runs up to 144 hours only. Version 5.0.1 uses a ±50 m near-snowline band and improves detailed PNG export and mobile save/share.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
