/**
 * globe-camera.js — MapLibre's 3D globe camera, reproduced, so we can draw on top of the globe.
 *
 * Used by:
 *   - star-sky.js      to place the stars behind the globe
 *   - measure-overlay.js / measure-tool.js  to draw measured paths and turn clicks into points
 *
 * Why not just use MapLibre's map.project() / map.unproject()? They work in Web Mercator,
 * which ends at ±85.05° latitude. On the globe that means nothing beyond 85° can be placed or
 * clicked, and a path over a pole gets squashed onto the 85° circle. These functions work on
 * the sphere directly, right up to the poles.
 *
 * Accuracy: globeProject() matched map.project() to 0.000 px (MapLibre 6.11.2), including with
 * the centre near the poles, the map rotated (bearing) and tilted (pitch). globeUnproject()
 * round-trips a point to within 1e-11°. If MapLibre changes its camera in a later version,
 * re-check with the console test described in js/README.md.
 *
 * Coordinate system: Earth-fixed 3D vectors with the Earth's centre at the origin,
 *   x → 0°N 0°E,   y → 0°N 90°E,   z → North Pole.
 * Screen positions are CSS pixels from the map container's top-left corner.
 *
 * How MapLibre's globe camera works (what globeCamera() rebuilds):
 *   - it looks at the centre point of the view from D = 1.5 × map height away
 *     (default 36.87° vertical field of view; D is then also the focal length in px);
 *   - screen "up" is north, turned clockwise by the bearing;
 *   - pitch tilts the camera back, towards the horizon;
 *   - the globe's radius in px is R = 512 · 2^zoom / (2π · cos(centre latitude)).
 */

// --- Small 3D vector helpers (vectors are [x, y, z] arrays) ---

/** a·s + v·t */
const combine = (a, s, v, t) => [a[0] * s + v[0] * t, a[1] * s + v[1] * t, a[2] * s + v[2] * t];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const DEG = Math.PI / 180;

/** Unit vector from the Earth's centre towards (longitude, latitude) in degrees. */
export function unitVector(lng, lat) {
  const la = lat * DEG, lo = lng * DEG;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

/**
 * The camera for the map's current view.
 * Returns { width, height, focal, radius, right, up, forward, position }:
 * three unit vectors for the screen axes, the camera position, and the sizes in px.
 */
export function globeCamera(map) {
  const centre = map.getCenter();
  const lat = centre.lat * DEG, lon = centre.lng * DEG;
  const bearing = map.getBearing() * DEG, pitch = map.getPitch() * DEG;
  const width = map.getContainer().clientWidth, height = map.getContainer().clientHeight;

  // Directions at the centre point: straight up from the ground, east, north
  const normal = unitVector(centre.lng, centre.lat);
  const east = [-Math.sin(lon), Math.cos(lon), 0];
  const north = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];

  // Screen up and right along the ground, turned by the bearing
  const groundUp = combine(north, Math.cos(bearing), east, Math.sin(bearing));
  const right = combine(east, Math.cos(bearing), north, -Math.sin(bearing));

  // Tilt by the pitch: looking down at pitch 0, towards the horizon as pitch grows
  const forward = combine(normal, -Math.cos(pitch), groundUp, Math.sin(pitch));
  const up = combine(groundUp, Math.cos(pitch), normal, Math.sin(pitch));

  const radius = 512 * 2 ** map.getZoom() / (2 * Math.PI * Math.cos(lat));
  const focal = 1.5 * height; // camera distance from the centre point = focal length

  // Start at the centre point on the surface, step back along the (tilted) viewing direction
  const position = combine(normal, radius + focal * Math.cos(pitch), groundUp, -focal * Math.sin(pitch));

  return { width, height, focal, radius, right, up, forward, position };
}

/**
 * Screen position of a point on the globe.
 * Returns [x, y, visible]; `visible` is false when the point is on the far side of the globe
 * (behind the horizon) or behind the camera.
 */
export function globeProject(camera, lng, lat) {
  const normal = unitVector(lng, lat);
  const point = [normal[0] * camera.radius, normal[1] * camera.radius, normal[2] * camera.radius];
  const fromCamera = combine(point, 1, camera.position, -1);
  const depth = dot(fromCamera, camera.forward);

  const x = camera.width / 2 + dot(fromCamera, camera.right) / depth * camera.focal;
  const y = camera.height / 2 - dot(fromCamera, camera.up) / depth * camera.focal;
  // The surface faces the camera when the view ray and the surface normal point towards each other
  const visible = depth > 0 && dot(fromCamera, normal) < 0;
  return [x, y, visible];
}

/**
 * The point on the globe under a screen position, as [lng, lat] in degrees, or null if the
 * view ray misses the globe (the position is in the black space around it).
 */
export function globeUnproject(camera, x, y) {
  // Direction of the view ray through (x, y)
  let dir = combine(
    combine(camera.forward, 1, camera.right, (x - camera.width / 2) / camera.focal),
    1, camera.up, -(y - camera.height / 2) / camera.focal
  );
  const length = Math.sqrt(dot(dir, dir));
  dir = [dir[0] / length, dir[1] / length, dir[2] / length];

  // Where does position + t·dir meet the sphere |p| = radius?  Solve the quadratic in t.
  const b = dot(camera.position, dir);
  const discriminant = b * b - (dot(camera.position, camera.position) - camera.radius ** 2);
  if (discriminant < 0) return null; // the ray passes the globe: a click in space

  const hit = combine(camera.position, 1, dir, -b - Math.sqrt(discriminant)); // nearer hit
  const lng = Math.atan2(hit[1], hit[0]) / DEG;
  const lat = Math.asin(Math.max(-1, Math.min(1, hit[2] / camera.radius))) / DEG;
  return [lng, lat];
}
