# Snowline for Windy

Snowline is a Windy.com external plugin that estimates the **thermal rain–snow boundary** from ECMWF vertical-profile data and displays it as interactive snowline contours and point labels.

The plugin follows Windy's forecast timeline and runs up to **+144 hours**.

## What it shows

Snowline estimates the **wet-bulb-zero height (WBZ)**, which is used here as an approximate snowline / rain–snow transition proxy.

It is a thermal diagnostic only. A displayed snowline does **not** mean precipitation or accumulating snow is forecast at that location.

## Main features

- ECMWF-only snowline calculation
- Wet-bulb-zero snowline proxy to +144 h
- Compact draggable Snowline panel on desktop and mobile
- Explanatory text moved into the in-panel **i** help
- Label only, Contour only, and Label + contour modes
- Adaptive contour spacing by zoom
- Adaptive spatial sampling for a balance between detail and performance
- Stronger 500 m and 1000 m contour styling
- Decluttered contour labels
- Exact selected-point snowline calculation
- Windy map elevation for terrain height
- Above / Near / Below Snowline point classification
- ±100 m Near Snowline transition band
- 3-hour snowline tendency
- Dismissible selected-point labels
- Built-in place search
- Saved Snowline favourites
- Clear-search control
- Hide/show panel control
- Persistent labels for searched places
- Desktop Windy picker following
- Mobile point selection through Windy's `singleclick` mechanism
- Profile caching and queued viewport refreshes

## Panel controls

The main Snowline panel is intentionally compact. The normal view keeps the title and controls visible while explanatory text is kept inside the **i** help panel.

The title bar can be dragged with a mouse or finger. The panel is constrained to remain inside the visible screen.

The **i** button opens the full in-plugin explanation. The **−** button hides the panel without disabling Snowline, and the small **❄ Snowline** button restores it.

## In-plugin help

The **i** panel explains:

- that Snowline is an approximate ECMWF wet-bulb-zero thermal rain–snow boundary
- that the forecast runs up to 144 hours
- that ECMWF temperature, dew point and geopotential height are used
- that wet-bulb temperature is calculated through the vertical profile
- that the lowest upward 0°C wet-bulb crossing is interpolated to estimate the snowline
- that selected-point labels compare the calculated snowline with Windy map elevation
- that the ±100 m zone is displayed as **NEAR SNOWLINE**
- that the arrow on a point label shows the approximate 3-hour snowline tendency
- that contours are reconstructed from sampled profiles across the visible viewport
- that desktop uses Windy's picker while mobile uses Windy's `singleclick` location event
- that the result is a thermal boundary and does not imply precipitation, snowfall or accumulation

## Contour resolution

The plugin does not download a complete ECMWF gridded field. Instead, it requests ECMWF vertical profiles at a set of points across the current Windy viewport and reconstructs the snowline field from those samples.

Sampling density increases with zoom:

| View | Sampling grid |
| --- | --- |
| Zoom ≤ 4 | 13 × 9 |
| Zoom 5–6 | 17 × 11 |
| Zoom 7–8, mobile | 19 × 13 |
| Zoom 7–8, desktop | 23 × 15 |
| Zoom 9+, mobile | 23 × 15 |
| Zoom 9+, desktop | 27 × 19 |

A maximum of eight profile requests are processed concurrently. Profiles are cached so repeated timeline changes and nearby redraws can reuse downloaded data.

Contour interval also changes with zoom:

- Continental scale: 500 m
- Regional scale: 200 m
- Local scale: 100 m

At 100 m contour spacing, labels are placed on selected 500 m contours to keep the map readable.

## How the snowline is calculated

For each sampled point, the plugin requests an ECMWF meteogram profile from Windy.

The calculation uses pressure-level:

- temperature
- dew-point temperature
- geopotential height
- pressure

The currently used levels are:

`1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150 hPa`

For each pressure level, wet-bulb temperature is solved using a pressure-aware psychrometric relation.

The algorithm then searches upward through the atmospheric profile for the **lowest transition from wet-bulb temperature above 0°C to wet-bulb temperature at or below 0°C**.

The height of that crossing is linearly interpolated between the two surrounding pressure levels. That interpolated wet-bulb-zero height is the displayed Snowline value.

If the lowest resolved model level is already at or below 0°C wet-bulb temperature, the height of that lowest level is used as the available estimate.

## Point labels

Selecting a point performs a dedicated ECMWF profile calculation for that exact latitude and longitude.

Terrain height comes from Windy's map-elevation service rather than ECMWF model elevation.

The point is classified relative to the calculated snowline:

- **↑ ABOVE SNOWLINE** — terrain is more than 100 m above the snowline
- **≈ NEAR SNOWLINE** — terrain lies within ±100 m of the snowline
- **↓ BELOW SNOWLINE** — terrain is more than 100 m below the snowline

The ±100 m band is a practical transition/uncertainty display zone. It is not intended as a universal physical threshold.

The label also reports the approximate snowline tendency over the following three hours, for example `↑120 m/3h`, `↓80 m/3h`, or `→ steady`.

Every selected-point label has its own **× close button**. Closing a label removes that point display without turning off contours or the Snowline plugin.

## Desktop and mobile point selection

Windy's `pickerLocation` state is designed for desktop use, so Snowline uses different mechanisms by platform:

- **Desktop:** follows Windy's picker location.
- **Mobile:** listens to Windy's plugin `singleclick` events so a map tap directly supplies the selected coordinates.

This avoids using map-center coordinates as a substitute for the user's selected point.

Search and favourite selections use their own exact stored coordinates on both platforms.

## Search and favourites

Snowline contains a compact place search using OpenStreetMap Nominatim results.

Search results can be saved with the ☆ button. Saved places are stored locally in the browser/app environment and can be reopened from the ★ favourites button.

The × button in the search box clears the current search and searched-point label.

## Forecast timing

The plugin follows Windy's forecast timestamp.

The ECMWF meteogram request is limited to six days and the plugin applies a hard forecast limit of **144 hours**. Data beyond the allowed range are not displayed.

## Important interpretation

Snowline should be interpreted as an **approximate thermal rain–snow boundary**, not as a snowfall forecast.

Actual precipitation type and accumulation can also depend on factors including:

- whether precipitation is occurring
- precipitation intensity
- melting through layers below the wet-bulb-zero level
- evaporative cooling
- terrain and local boundary-layer effects
- unresolved vertical structure
- model error

For this reason the plugin intentionally does not require precipitation data before displaying the thermal snowline.

## Project structure

- `src/plugin.svelte` — Windy UI, map interaction, ECMWF profile loading, labels and contours
- `src/snowLevel.ts` — wet-bulb and wet-bulb-zero calculation
- `src/contours.ts` — marching-squares contour generation and line stitching
- `src/PlaceSearch.svelte` — place search and saved favourites
- `src/pluginConfig.ts` — Windy external-plugin metadata

## Local development

```bash
npm install
npm start
```

Then open the local Windy plugin-development environment served by the Windy plugin devtools. A browser warning for the local self-signed HTTPS certificate can be normal during development.

## Build

On Unix-like systems:

```bash
npm run build
```

On Windows:

```bash
npm run build:win
```

The compiled plugin is written to `dist/`.

## Publishing

This repository includes the Windy plugin publishing workflow.

1. Create a Windy Plugins API key.
2. Store it in the GitHub repository's Actions secrets as `WINDY_API_KEY`.
3. Open **Actions → publish-plugin**.
4. Run the workflow from the `main` branch.

Do not commit API keys or other secrets to the public repository.

Each published release must use a new version number.

## Current version

**0.6.7**

## Author

Ramzi Kandah
