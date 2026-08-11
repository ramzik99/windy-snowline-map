import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '14.0.0',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Shows adaptive snowline contours and a convenient adaptive point card: dry timesteps show terrain, snowline, trend and valid time, while precipitating timesteps show precipitation type, amount and estimated new snow when relevant. Includes convective-snow potential, a 144-hour graph, forecast soundings, search, favourites, and sharing.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
