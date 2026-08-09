import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'windy-plugin-snowline-map-100m',
  version: '12.0.0',
  icon: '❄️',
  title: 'Snow forecast',
  description: 'Terrain-aware mountain snow forecast using ECMWF vertical profiles with Windy local terrain. Diagnoses snow, wet snow, mix, rain, ice pellets and freezing rain at ≥0.1 mm/h. v12 uses a cleaner color-only precipitation-type timeline with an integrated key, adds a forecast sounding from the point card, preserves fast adaptive contours and estimated new-snow accumulation, and keeps the desktop PNG aligned with the graph. Runs up to 144 hours only.',
  author: 'Ramzi Kandah',
  repository: 'https://github.com/ramzik99/windy-snowline-map',
  desktopUI: 'embedded',
  mobileUI: 'small',
  listenToSingleclick: true,
};

export default config;
