/**
 * geodesy.js — distances and shortest paths on the real Earth, for the measure tool.
 *
 * Uses GeographicLib (Charles Karney's algorithms, the same maths as PROJ), loaded in
 * index.html as a plain script from jsdelivr: `geographiclib-geodesic` 2.2.0, MIT licence.
 * It puts its API on `window.geodesic`.
 *
 * Why the real Earth (WGS84 ellipsoid) and not a sphere: on a sphere distances are off by up
 * to about 0.5%, and the shortest paths differ by a few km (e.g. 6.8 km on Tel Aviv–New York).
 * The user chose real-Earth geodesics for both the drawn line and the distance, so what is
 * drawn always matches the number shown. (Between nearly opposite points the true shortest
 * path can swing far from the sphere's great circle, even over a pole. That is real geometry.)
 *
 * Points are [longitude, latitude] in degrees, as in GeoJSON and MapLibre.
 */

const Geodesic = window.geodesic && window.geodesic.Geodesic;

/** False if the GeographicLib script failed to load; the measure tool is then left out. */
export const geodesicsAvailable = Boolean(Geodesic);

/** Spacing of the points drawn along a path. Close enough that the straight pieces between
 *  them are invisible; far enough that a path round half the Earth is only ~1,000 points. */
const POINT_SPACING_M = 20000;

/** "850 m", "34.5 km", "9,135 km" */
export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  const km = metres / 1000;
  return `${km.toLocaleString('en', { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}

/**
 * The shortest path on the WGS84 ellipsoid from a to b.
 * Returns { points, length }:
 *   - points: [lng, lat] about every 20 km, with longitudes "unrolled" — continuous along the
 *     path, so they can run past ±180° (cut them with splitAtDateLine() for the flat map);
 *   - length: in metres.
 */
export function geodesicPath(a, b) {
  const caps = Geodesic.STANDARD | Geodesic.DISTANCE_IN | Geodesic.LONG_UNROLL;
  const line = Geodesic.WGS84.InverseLine(a[1], a[0], b[1], b[0], caps);
  const steps = Math.max(1, Math.ceil(line.s13 / POINT_SPACING_M));
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const position = line.Position(line.s13 * i / steps, caps);
    points.push([position.lon2, position.lat2]);
  }
  return { points, length: line.s13 };
}

/**
 * Cut a path with unrolled longitudes where it crosses the 180° meridian, and bring every
 * piece back into -180..180. Without this, the flat map would draw a line from one side of
 * the world to the other. Returns a list of pieces (each a list of [lng, lat]).
 */
export function splitAtDateLine(points) {
  // Which 360° "copy of the world" a longitude is in: ..., -1 for -540..-180, 0 for -180..180, 1 ...
  const worldCopy = (lon) => Math.floor((lon + 180) / 360);
  const pieces = [[]];

  for (let i = 0; i < points.length; i++) {
    const [lon, lat] = points[i];
    if (i > 0) {
      const [prevLon, prevLat] = points[i - 1];
      const from = worldCopy(prevLon), to = worldCopy(lon);
      if (to !== from) {
        // Crossing: interpolate the latitude at the meridian, end this piece there, start the next
        const edge = (to > from ? from + 1 : from) * 360 - 180;
        const crossLat = prevLat + (lat - prevLat) * (edge - prevLon) / (lon - prevLon);
        pieces[pieces.length - 1].push([edge - from * 360, crossLat]);
        pieces.push([[edge - to * 360, crossLat]]);
      }
    }
    pieces[pieces.length - 1].push([lon - worldCopy(lon) * 360, lat]);
  }
  return pieces.filter((piece) => piece.length > 1);
}
