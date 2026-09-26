/**
 * map-style.js — the MapLibre style: what the map is made of.
 *
 * Layers, bottom to top:
 *   1. "background" — plain sea colour, seen only until the tiles have loaded
 *   2. "rivers"     — the world rivers map: raster tiles made in QGIS
 *   3. "south-cap"  — a soft ice-coloured cap over the South Pole, globe only (see below)
 *
 * The measure tool and the star sky are NOT map layers: they draw on their own canvases
 * (see measure-overlay.js and star-sky.js for why).
 */
import {
  TILE_URL, TILE_MIN_ZOOM, TILE_MAX_ZOOM,
  BACKGROUND_COLOUR, ICE_COLOUR, MERCATOR_EDGE
} from './config.js';
import { GLOBE, FLAT } from './view-mode.js';

/**
 * The South Pole cap, as a set of thin rings.
 *
 * Why: the tiles stop at 85.05°S (the Web Mercator edge). On the globe MapLibre fills the rest
 * of the way to the pole by stretching each pixel of the tiles' last row into a long wedge,
 * which looks like a streaky fan over Antarctica. MapLibre has no option to change this.
 *
 * Fix: cover that area with ice colour. A single disc would show a hard edge, so the cap is
 * made of `steps` rings between `fadeFrom`°S and the tile edge, each a little more opaque
 * (0 -> 1 with a smooth S-curve). MapLibre extends the last ring over the pole itself.
 * The Arctic edge of the tiles is plain sea, so the North Pole needs no cap.
 */
function southCapRings(fadeFrom = 82, steps = 24) {
  // A closed ring between two latitudes, all the way round the Earth
  const ring = (lat1, lat2) => {
    const coords = [];
    for (let lon = -180; lon <= 180; lon += 10) coords.push([lon, -lat1]);
    for (let lon = 180; lon >= -180; lon -= 10) coords.push([lon, -lat2]);
    coords.push(coords[0]);
    return coords;
  };

  const features = [];
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps; // 0..1, from the outer edge of the fade towards the pole
    const lat1 = fadeFrom + (MERCATOR_EDGE - fadeFrom) * i / steps;
    const lat2 = fadeFrom + (MERCATOR_EDGE - fadeFrom) * t;
    features.push({
      type: 'Feature',
      properties: { opacity: t * t * (3 - 2 * t) }, // "smoothstep": starts and ends gently
      geometry: { type: 'Polygon', coordinates: [ring(lat1, lat2)] }
    });
  }
  return { type: 'FeatureCollection', features };
}

/** The full MapLibre style for the given view (GLOBE or FLAT). */
export function buildStyle(mode) {
  return {
    version: 8,
    projection: { type: mode === FLAT ? 'mercator' : 'globe' },

    // No atmosphere halo around the globe. MapLibre draws one by default
    // (atmosphere-blend defaults to 0.8), so it must be switched off explicitly.
    sky: { 'atmosphere-blend': 0 },

    sources: {
      rivers: {
        type: 'raster',
        tiles: [TILE_URL],
        tileSize: 256,
        minzoom: TILE_MIN_ZOOM,
        maxzoom: TILE_MAX_ZOOM
      },
      southCap: { type: 'geojson', data: southCapRings() }
    },

    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': BACKGROUND_COLOUR } },
      { id: 'rivers', type: 'raster', source: 'rivers', paint: { 'raster-fade-duration': 0 } },
      {
        id: 'south-cap',
        type: 'fill',
        source: 'southCap',
        layout: { visibility: mode === GLOBE ? 'visible' : 'none' }, // the flat map has no fan
        paint: { 'fill-color': ICE_COLOUR, 'fill-opacity': ['get', 'opacity'], 'fill-antialias': false }
      }
    ]
  };
}

/** Show the south cap on the globe, hide it on the flat map (called when the view changes). */
export function showSouthCap(map, visible) {
  map.setLayoutProperty('south-cap', 'visibility', visible ? 'visible' : 'none');
}
