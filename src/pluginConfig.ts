import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.3',
  icon: '❄️',
  title: 'Snowline',
  description: 'Fast 100 m wet-bulb-zero snowline contours using Windy native forecast timing: 1-hourly to 90 h, 3-hourly to 144 h, then 6-hourly, on a 17×11 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
