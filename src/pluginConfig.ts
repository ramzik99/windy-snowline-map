import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '16.0.3',
  icon: '❄️',
  title: 'Wintry forecast',
  description: 'Terrain-aware wintry forecast using ECMWF vertical profiles and Windy local terrain. Adaptive snowline contours use a clear major/minor hierarchy, while the concise point card prioritises terrain versus snowline, current precipitation type and a compact next-24-hour outlook. The 144-hour graph shows timing and evolution with clickable phase changes, and the sounding explains the selected phase with terrain wet-bulb and a marked snowline. Includes search, favourites, sharing and desktop PNG export.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/wintry-forecast',
  desktopUI: 'embedded',
  mobileUI: 'small',
  addToContextmenu: true,
  listenToSingleclick: true,
};

export default config;
