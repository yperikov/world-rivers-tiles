/**
 * elevation.js — terrain height at a point, from the free AWS "Terrarium" elevation tiles.
 *
 * Each tile is a 256 px PNG in Web Mercator whose colour encodes the height in metres:
 *   height = R * 256 + G + B / 256 - 32768   (sea floor is negative).
 * We download the tile under the point, decode it once on a canvas and keep the numbers.
 * The S3 bucket sends "Access-Control-Allow-Origin: *", so the browser lets us read the pixels.
 *
 * Data: Mapzen Terrain Tiles on AWS (https://registry.opendata.aws/terrain-tiles/), built from
 * SRTM, GMTED, ETOPO1 and others; credits: github.com/tilezen/joerd/blob/master/docs/attribution.md
 */
import { MERCATOR_EDGE } from './config.js';

const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/** Tile zoom used for lookups: one pixel is about 1.2 km at the equator. */
const ZOOM = 7;
const TILE_SIZE = 256;
const CACHE_LIMIT = 48; // decoded tiles kept (each is 256 KB)

/** key "x/y" -> Promise of a Float32Array of TILE_SIZE² heights (null if the download failed) */
const cache = new Map();

let scratch = null; // canvas for decoding, created on first use

function decode(bitmap) {
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = scratch.height = TILE_SIZE;
  }
  const context = scratch.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.drawImage(bitmap, 0, 0);
  const rgba = context.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
  const heights = new Float32Array(TILE_SIZE * TILE_SIZE);
  for (let i = 0; i < heights.length; i++) {
    heights[i] = rgba[4 * i] * 256 + rgba[4 * i + 1] + rgba[4 * i + 2] / 256 - 32768;
  }
  return heights;
}

function loadTile(x, y) {
  const key = x + '/' + y;
  let promise = cache.get(key);
  if (promise) {
    cache.delete(key); // re-insert: keeps the most recently used last
    cache.set(key, promise);
    return promise;
  }
  const url = TERRARIUM_URL.replace('{z}', ZOOM).replace('{x}', x).replace('{y}', y);
  promise = fetch(url)
    .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(response.status))))
    // No colour conversion: it would change the encoded numbers
    .then((blob) => createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }))
    .then(decode)
    .catch(() => {
      cache.delete(key); // try again next time
      return null;
    });
  cache.set(key, promise);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value); // oldest
  return promise;
}

/**
 * Terrain height in metres at a point, rounded; null when unknown
 * (beyond ±85.05° latitude, where the tiles end, or when the download failed).
 */
export async function getElevation(lng, lat) {
  if (Math.abs(lat) >= MERCATOR_EDGE) return null;
  const tiles = 2 ** ZOOM;
  const sin = Math.sin((lat * Math.PI) / 180);
  const worldX = ((lng + 180) / 360) * tiles;
  const worldY = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * tiles;
  const tileX = Math.min(tiles - 1, Math.max(0, Math.floor(worldX)));
  const tileY = Math.min(tiles - 1, Math.max(0, Math.floor(worldY)));
  const heights = await loadTile(tileX, tileY);
  if (!heights) return null;
  const px = Math.min(TILE_SIZE - 1, Math.floor((worldX - tileX) * TILE_SIZE));
  const py = Math.min(TILE_SIZE - 1, Math.floor((worldY - tileY) * TILE_SIZE));
  return Math.round(heights[py * TILE_SIZE + px]);
}
