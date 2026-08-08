import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.3.5',
  icon: '❄️',
  title: 'Snowline',
  description: 'Snowline WBZ proxy to +144 h using shaded 500 m elevation bands with labelled 500 m contours on a fast 17×11 viewport grid.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
