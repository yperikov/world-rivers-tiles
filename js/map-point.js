/**
 * map-point.js — the map point under a mouse or tap event.
 *
 * On the globe this uses our own camera maths, which also works beyond 85° latitude
 * (MapLibre's e.lngLat stops there, and gives some point even for a click in space).
 * Returns [lng, lat], or null in the space around the globe.
 */
import { isGlobe } from './view-mode.js';
import { globeCamera, globeUnproject } from './globe-camera.js';

export function pointFromEvent(map, event) {
  if (isGlobe()) return globeUnproject(globeCamera(map), event.point.x, event.point.y);
  return [event.lngLat.wrap().lng, event.lngLat.lat];
}
