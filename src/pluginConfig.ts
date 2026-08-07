import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.2.0',
  icon: '❄️',
  title: 'Snowline Map 100m',
  description: '100 m wet-bulb-zero isolines with labels that update with the Windy forecast timeline.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  private: true,
};

export default config;
