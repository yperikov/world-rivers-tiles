/**
 * maplibre.js — the one place that loads MapLibre GL JS.
 *
 * Other modules import it from here:   import maplibregl from './maplibre.js';
 *
 * MapLibre 6.x is published only as an ES module (there is no maplibre-gl.js UMD build).
 * It comes from the jsdelivr CDN with a pinned version. To upgrade, change the version here
 * AND in the MapLibre stylesheet <link> in index.html, then re-test (see js/README.md).
 */
import * as maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';

export default maplibregl;
