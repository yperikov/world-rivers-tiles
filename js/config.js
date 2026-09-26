/**
 * config.js — settings shared by several modules.
 *
 * Settings that only one feature uses live at the top of that feature's file instead
 * (for example the star size in star-sky.js, the ruler width in scale-bar.js).
 */

/**
 * The folder this page is served from, e.g. "https://yperikov.github.io/world-rivers-tiles/"
 * or "http://localhost:8765/". Data files are addressed from here.
 *
 * Tile URLs in particular must be absolute: MapLibre downloads tiles inside a web worker,
 * where a relative URL would not resolve against the page.
 */
export const PAGE_FOLDER = new URL('.', location.href).href;

/** XYZ tiles next to index.html: 256 px JPEGs in Web Mercator, made in QGIS for zoom 0-7. */
export const TILE_URL = PAGE_FOLDER + '{z}/{x}/{y}.jpg';
export const TILE_MIN_ZOOM = 0;
export const TILE_MAX_ZOOM = 7; // beyond this MapLibre scales up the zoom-7 tiles

/** Star catalogue for the 3D sky (made by scripts/make_stars.py in the FirstMap project). */
export const STARS_URL = PAGE_FOLDER + 'stars.json';

/** Where the map opens: [longitude, latitude] of Israel. */
export const START_CENTER = [35, 31.5];

/**
 * Map zoom range. MapLibre counts zoom one step lower than Leaflet (its world is 512 px wide
 * at zoom 0, Leaflet's 256 px), so 0-8 here equals the old Leaflet page's 1-9.
 */
export const MIN_ZOOM = 0;
export const MAX_ZOOM = 8;

/** Start zoom when the page opens as the flat map (#flat). The map then fills the screen. */
export const FLAT_START_ZOOM = 1;

/** When the page opens as the globe, the globe fills this share of the shorter screen side. */
export const GLOBE_START_FILL = 0.9;

/** Colours used in more than one place. */
export const BACKGROUND_COLOUR = '#e3edf2'; // light blue-grey, the map's sea colour
export const ICE_COLOUR = '#e7e4dd';        // Antarctic ice, sampled from the tiles
export const MEASURE_COLOUR = '#e8412c';    // measure line: red-orange, stands out from rivers and stars

/**
 * Latitude where Web Mercator (and so the tiles, and every MapLibre line) ends: the square
 * world map covers -85.051129 .. +85.051129 degrees. The globe shows the poles beyond it.
 */
export const MERCATOR_EDGE = 85.051129;
