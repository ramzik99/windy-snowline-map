# Windy Snowline Map

A Windy.com external plugin that displays labelled wet-bulb-zero (WBZ) / snow-level-proxy isolines on the map and updates them with the Windy forecast timeline.

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

Then load:

`https://localhost:9999/plugin.js`

in Windy Developer Mode.

## Build

```bash
npm run build
```

The compiled plugin is written to `dist/plugin.js` and `dist/plugin.min.js`.

## Method

The plugin retrieves Windy meteogram vertical-profile temperature, dew-point and geopotential-height fields. Wet-bulb temperature is solved with a pressure-aware psychrometric relation at each available pressure level. The lowest upward crossing from positive to non-positive wet-bulb temperature is linearly interpolated in height to estimate the wet-bulb-zero altitude.

WBZ is presented as a snow-level proxy; it is not an accumulation forecast.

## Author

Ramzi Kandah
