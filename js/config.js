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

/**
 * XYZ tiles next to index.html: 256 px JPEGs in Web Mercator, made in QGIS for zoom 0-7 from the
 * ETOPO 2022 elevation (green-brown land, blue sea floor, hillshade). The labels are baked in,
 * so there is one tile set per label language (the language switch, js/language-switch.js).
 *
 * The folder names must match SITE_TILE_FOLDERS in the FirstMap project's scripts/build.py,
 * which puts the tiles there (the build checks that every folder is named in this file).
 * DEFAULT_LANGUAGE is used when neither the address, the viewer's last choice nor the browser
 * language decides (see js/language.js).
 */
export const LANGUAGES = {
  en: { folder: 'etopo-en', name: 'English', nativeName: 'English' },
  ru: { folder: 'etopo-ru', name: 'Russian', nativeName: 'Русский' }
};
export const DEFAULT_LANGUAGE = 'en';

/** Tile URL template of a language's tile set. */
export const tileUrl = (code) => `${PAGE_FOLDER}${LANGUAGES[code].folder}/{z}/{x}/{y}.jpg`;
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
// Both caps are averaged from the outermost 6 pixel rows of the tiles at zoom 3 (all 8 columns);
// the build measures them (scripts/qgis/cap_colours.py) and warns if a tile set no longer matches.
// English and Russian tiles give the same colours (checked 2026-09-28).
// The old Natural Earth tiles gave ICE #e7e4dd and ARCTIC_SEA #9fc3dc.
export const ICE_COLOUR = '#917640';        // Antarctic ice sheet at 85°S: ETOPO heights (~2,500 m) fall in the brown part of the ramp
export const ARCTIC_SEA_COLOUR = '#2c6190'; // Arctic Ocean at 85°N: deep-sea blue of the ETOPO depth ramp
export const MEASURE_COLOUR = '#e8412c';    // measure line: red-orange, stands out from rivers and stars

/**
 * Latitude where Web Mercator (and so the tiles, and every MapLibre line) ends: the square
 * world map covers -85.051129 .. +85.051129 degrees. The globe shows the poles beyond it.
 */
export const MERCATOR_EDGE = 85.051129;
