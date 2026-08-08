import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '0.5.9',
  icon: '❄️',
  title: 'Snowline',
  description: 'ECMWF wet-bulb-zero snowline proxy with Label only, Contour only, and Label + contour modes, Follow Windy picker control, automatic label hiding, concise point labels, ±100 m near-snowline wording, 3-hour snowline tendency, adaptive contour spacing by zoom, Windy map elevation, caching, and a hard +144 h forecast limit. Thermal snowline only; precipitation is not implied.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
};

export default config;
