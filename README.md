# Windy Snowline Map

A Windy.com external plugin that displays labelled wet-bulb-zero (WBZ) / snow-level-proxy isolines and follows the Windy forecast timeline.

## Features

- 100 m contour interval by default
- labels on every 100 m contour
- stronger 500 m and 1000 m contours
- 13 x 9 viewport sampling grid
- ECMWF, GFS and ICON options
- automatic redraw when forecast time changes
- viewport refresh after pan or zoom
- pressure-aware wet-bulb calculation from temperature, dew point and pressure

## Local development

```bash
npm install
npm start
```

Then load `https://localhost:9999/plugin.js` in Windy Developer Mode.

## Official Windy publishing

Windy requires published external plugins to be served from `windy-plugins.com`. This repository includes the official `publish-plugin` GitHub Actions workflow from Windy's plugin template.

1. Create a **Windy Plugins API** key at `https://api.windy.com/keys`.
2. In this repository open **Settings → Secrets and variables → Actions**.
3. Create a repository secret named `WINDY_API_KEY`.
4. Open **Actions → publish-plugin → Run workflow**.
5. The **Publish Plugin** job prints the permanent Windy installation URL.

The plugin currently has `private: true`, so the published URL can be used and shared directly without listing the plugin in Windy's public gallery.

## Method

The plugin retrieves vertical-profile temperature, dew-point and geopotential-height data through Windy's meteogram forecast interface. Wet-bulb temperature is solved with a pressure-aware psychrometric relation at each available pressure level. The lowest upward crossing from positive to non-positive wet-bulb temperature is interpolated in height to estimate the wet-bulb-zero altitude.

WBZ is shown as a **snow-level proxy**, not a snowfall-accumulation forecast.

## Author

Ramzi Kandah
