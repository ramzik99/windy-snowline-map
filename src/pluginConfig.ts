import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '20.0.0',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. v20 adds next-event intelligence through +144 h, summarising timing, dominant precipitation type, minimum snowline, peak precipitation and estimated new snow. The simplified point label focuses on current terrain impact and one clear next-event line, with full graph and sounding detail one tap away.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
