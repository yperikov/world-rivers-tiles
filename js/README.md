# World Rivers web map: how the code is organised

A static web page (no bundler, no npm) showing world rivers tiles made in QGIS, as a 3D globe
with real stars or as a flat 2D map, with a scale ruler and a distance measuring tool.

Source: `web/` in the FirstMap project. `scripts/build.py` there assembles the site
(`exports/tiles/`) from this folder plus `stars.json` and the tiles; `world-rivers-tiles` is a
published copy of that site.

Live: https://yperikov.github.io/world-rivers-tiles/

## Files

```
index.html              markup only: stylesheet links, library scripts, <div id="map">
css/
  base.css              page layout, light background, arrow pointer over the map, closed hand while dragging
  star-sky.css          black space + star canvas (3D)
  controls.css          2D/3D switch, pressed look of all buttons, compass cursor
  scale-bar.css         the scale ruler
  measure-tool.css      ruler button, crosshair, measure canvas and labels
  elevation-readout.css the coordinates + height panel
js/
  main.js               ENTRY POINT: creates the map, switches every feature on
  config.js             shared settings: URLs, start view, zoom range, colours
  maplibre.js           loads MapLibre GL JS (the only place with its version)
  view-mode.js          which view is shown (globe / flat); #globe / #flat in the address
  map-style.js          MapLibre style: tiles, background, South and North Pole caps
  start-view.js         start zoom so the globe fills 90% of the screen
  mode-switch.js        2D/3D buttons; applies the view to the map
  language.js           which label language is shown (en / ru); ?lang= in the address, remembered choice
  language-switch.js    EN/RU buttons; swaps the map's tile set (setTiles)
  fullscreen-button.js  full-screen button (left out where unsupported, e.g. iPhone)
  press-feedback.js     buttons visibly "press in" when clicked/tapped
  scale-bar.js          fixed-length scale ruler at the bottom centre (line on top, ticks down, label below)
  globe-camera.js       MapLibre's globe camera reproduced: project/unproject on the sphere
  star-sky.js           real stars behind the globe (reads stars.json)
  geodesy.js            WGS84 distances and shortest paths (GeographicLib)
  measure-overlay.js    draws measured lines, points and labels on an own canvas
  measure-tool.js       measure tool behaviour: button, clicks, keys
  map-point.js          the [lng, lat] under a mouse/tap event (globe-aware); shared by the tools
  elevation.js          terrain height at a point from AWS Terrarium tiles (fetch, decode, cache)
  elevation-readout.js  coordinates + height panel in the bottom right corner (below the ruler on screens under 680 px): follows the mouse; on touch, tap to read
(added by the build, not in web/:)
stars.json              9,096 stars (Yale Bright Star Catalogue), made by
                        scripts/make_stars.py in the FirstMap project
etopo-en/{z}/{x}/{y}.jpg  the map tiles (ETOPO 2022 elevation + hillshade), zoom 0-7,
etopo-ru/{z}/{x}/{y}.jpg  with English / Russian labels (folders named in config.js LANGUAGES)
```

How they depend on each other (arrows = imports):

```
main.js ─┬─ config.js, maplibre.js, view-mode.js, language.js, map-style.js, start-view.js
         ├─ mode-switch.js ──── view-mode.js, map-style.js
         ├─ language-switch.js ─ config.js, language.js ── config.js
         ├─ scale-bar.js
         ├─ fullscreen-button.js ── maplibre.js
         ├─ star-sky.js ─────── config.js, view-mode.js, globe-camera.js
         ├─ measure-tool.js ─┬─ view-mode.js, map-point.js, geodesy.js
         │                   └─ measure-overlay.js ── config.js, view-mode.js, globe-camera.js, geodesy.js
         ├─ elevation-readout.js ─┬─ map-point.js ── view-mode.js, globe-camera.js
         │                        └─ elevation.js ── config.js
         ├─ press-feedback.js
         └─ globe-camera.js (exposed on window.globeMath for testing)
```

Each module exports one `addSomething(map)` function (or a class) that main.js calls once.
Modules talk to each other only through imports and `view-mode.js` (`getMode()`,
`onModeChange()`), never through global variables.

## External libraries (from the jsdelivr CDN, versions pinned)

Every CDN file is pinned by version **and** by an SRI integrity hash in `index.html`, so the
browser refuses changed content. Upgrading = new version + new hashes (from
`https://data.jsdelivr.com/v1/packages/npm/<package>@<version>?structure=flat`, field `hash`,
used as `sha256-<hash>`), then re-test.

- **MapLibre GL JS 6.11.2**: ES module only (no UMD build). Loaded in `js/maplibre.js`;
  its CSS is linked in `index.html`. Change both together, and the import map's `integrity`
  entries in `index.html` (`maplibre-gl.mjs` and the `maplibre-gl-shared.mjs` chunk it imports).
  Its web worker (`maplibre-gl-worker.mjs`) is started by MapLibre and cannot carry a hash.
- **GeographicLib `geographiclib-geodesic` 2.2.0** (MIT, Karney): a plain `<script>` in
  `index.html` (with `integrity`) that sets `window.geodesic`. If it fails to load, the
  measure tool is left out.
- **AWS Terrarium elevation tiles** (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`):
  fetched at run time by `elevation.js` for the height label (zoom 7, about 1.2 km per pixel;
  peaks read lower than their true height, e.g. Everest 8,316 m). Free, no key; the bucket sends
  `Access-Control-Allow-Origin: *`, which canvas decoding needs. Height = R*256 + G + B/256 - 32768.
  No data beyond ±85.05° latitude, so no label there. Credit (the page has no attribution box):
  Mapzen Terrain Tiles, github.com/tilezen/joerd/blob/master/docs/attribution.md; mention it in
  the published repository's README.

## Things that are easy to break (read before editing)

1. **Tile URLs must be absolute.** MapLibre fetches tiles in a web worker, where relative URLs
   do not resolve. `config.js` builds them from the page's folder.
2. **No `maxBounds`.** In MapLibre 6.11.2, bounds reaching ±180° longitude crash the map.
   `renderWorldCopies: false` alone keeps the flat map inside the world.
3. **`setProjection()` only after the style has loaded**, or MapLibre throws
   "Style is not done loading". `mode-switch.js` waits for the `load` event.
4. **MapLibre cannot draw beyond ±85.05° latitude** (it keeps lines in Web Mercator), and its
   `project()`/`unproject()` stop there too. That is why the measure tool draws on its own
   canvas and uses `globe-camera.js` on the globe; do not move it back to MapLibre layers.
5. **`globe-camera.js` copies MapLibre's camera maths.** After upgrading MapLibre, check it
   still matches, in the browser console on the globe view:
   ```js
   const k = globeMath.globeCamera(), p = globeMath.globeProject(k, 20, 45), m = map.project([20, 45]);
   Math.hypot(p[0] - m.x, p[1] - m.y)   // should be ~0 px
   ```
6. **The start zoom can be NaN** when the page opens in a hidden tab (0×0 map);
   `start-view.js` falls back to zoom 1. A NaN zoom crashes MapLibre.
7. **The atmosphere halo is on by default** in MapLibre; `map-style.js` sets
   `atmosphere-blend: 0` to remove it.
8. **The flat map shows no stars and no polar caps**; both are globe-only on purpose.

## Testing locally

From the FirstMap project folder, build the site from `web/` (quick when the tiles are
current), then serve it (stop the server before the next build: the build replaces the folder):

```
uv run python scripts/build.py
uv run python scripts/serve_tiles.py
```

then open http://localhost:8765/index.html. (Opening index.html as a `file://` page does not
work: ES modules and tiles need a web server.)

Any static web server works **if it sends `.js` files as JavaScript**. Plain
`python -m http.server` on Windows may send them as `text/plain` (it reads file types from the
registry); browsers then refuse to run the modules and the page stays blank, with no error in
the console. `serve_tiles.py` forces the right type. GitHub Pages is fine.

Check: both views and switching between them, `#flat` in the address, zoom limits, the
scale ruler while dragging, the height label (follows the mouse; tap on a phone; hidden in
space, over the poles and while measuring), the measure tool (including a path over a pole, e.g. from
80°N 0° to 80°N 180°, which should be 2,234 km and cross the pole), stars in 3D, phone width,
and no errors in the browser console.

## Publishing

The published copy is the repository `yperikov/world-rivers-tiles` (GitHub Pages). Never push
it unless the user explicitly says to push. When they do: copy the built site from FirstMap's
`exports/tiles/` (`index.html`, `stars.json`, `css/`, `js/`, `AGENTS.md`) into it, commit and
push. `AGENTS.md` (one level up, in `web/`) gives Cursor/Codex agents the same pointers as this
file when they open that repo directly. The tiles only need copying when they have been
re-rendered (FirstMap's `pipeline/manifest/tiles-*.sha256` then changes): the page needs the
`etopo-en/` and `etopo-ru/` folders. The Natural Earth
folders `0`–`7` were deleted on 2026-09-28. `ICE_COLOUR` and `ARCTIC_SEA_COLOUR` in
`js/config.js` must match the tiles' edge rows: the build measures them
(`scripts/qgis/cap_colours.py`) and warns when `config.js` needs the new values.

More background (why things are the way they are) is in the FirstMap project's
`notes/lessons-learned.md` and `notes/web-globe-requirements.md`.
