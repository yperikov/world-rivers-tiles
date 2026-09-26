/**
 * map-style.js — the MapLibre style: what the map is made of.
 *
 * Layers, bottom to top:
 *   1. "background" — plain sea colour, seen only until the tiles have loaded
 *   2. "rivers"     — the world rivers map: raster tiles made in QGIS
 *   3. "south-cap", "north-cap" — soft caps over the poles, globe only (see below)
 *
 * The measure tool and the star sky are NOT map layers: they draw on their own canvases
 * (see measure-overlay.js and star-sky.js for why).
 */
import {
  TILE_URL, TILE_MIN_ZOOM, TILE_MAX_ZOOM,
  BACKGROUND_COLOUR, ICE_COLOUR, ARCTIC_SEA_COLOUR, MERCATOR_EDGE
} from './config.js';
import { GLOBE, FLAT } from './view-mode.js';

/**
 * A polar cap, as a set of thin rings (sign -1 = South Pole, +1 = North Pole).
 *
 * Why: the tiles stop at 85.05°S (the Web Mercator edge). On the globe MapLibre fills the rest
 * of the way to the pole by stretching each pixel of the tiles' last row into a long wedge,
 * which looks like a streaky fan over Antarctica and the Arctic Ocean. MapLibre has no option to change this.
 *
 * Fix: cover that area with ice colour. A single disc would show a hard edge, so the cap is
 * made of `steps` rings between `fadeFrom`°S and the tile edge, each a little more opaque
 * (0 -> 1 with a smooth S-curve). MapLibre extends the last ring over the pole itself.
 * Both poles get the same treatment: ice colour in the south, sea colour in the north.
 */
function capRings(sign, fadeFrom = 82, steps = 24) {
  // A closed ring between two latitudes, all the way round the Earth. The north ring is
  // walked the other way round, so that "the pole side" is the inside in both hemispheres.
  const ring = (lat1, lat2) => {
    const coords = [];
    const [a, b] = sign < 0 ? [lat1, lat2] : [lat2, lat1];
    for (let lon = -180; lon <= 180; lon += 10) coords.push([lon, sign * a]);
    for (let lon = 180; lon >= -180; lon -= 10) coords.push([lon, sign * b]);
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

/** A fill layer drawing one polar cap; visible on the globe only (the flat map has no fan). */
function capLayer(id, source, colour, mode) {
  return {
    id, type: 'fill', source,
    layout: { visibility: mode === GLOBE ? 'visible' : 'none' },
    paint: { 'fill-color': colour, 'fill-opacity': ['get', 'opacity'], 'fill-antialias': false }
  };
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
      southCap: { type: 'geojson', data: capRings(-1) },
      northCap: { type: 'geojson', data: capRings(1) }
    },

    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': BACKGROUND_COLOUR } },
      { id: 'rivers', type: 'raster', source: 'rivers', paint: { 'raster-fade-duration': 0 } },
      capLayer('south-cap', 'southCap', ICE_COLOUR, mode),
      capLayer('north-cap', 'northCap', ARCTIC_SEA_COLOUR, mode)
    ]
  };
}

/** Show the polar caps on the globe, hide them on the flat map (called when the view changes). */
export function showPolarCaps(map, visible) {
  for (const id of ['south-cap', 'north-cap']) {
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
}
