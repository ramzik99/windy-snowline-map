import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-data-inspector',
  version: '0.1.0',
  icon: '🔎',
  title: 'Windy data inspector',
  description: 'Standalone diagnostic plugin for inspecting raw Windy ECMWF point-forecast fields, values, timestamps, overlay metadata and map interpolator output.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
