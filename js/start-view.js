/**
 * start-view.js — the zoom at which the globe fills most of the screen when the page opens.
 *
 * A fixed zoom does not work: how big the globe looks depends on the window size, because
 * MapLibre's camera distance grows with the window height. So the zoom is worked out from
 * the size of the map container.
 *
 * The geometry (verified against MapLibre 6.11 screenshots):
 *   - the globe's radius in px is  R = 512 * 2^zoom / (2π · cos(centre latitude))
 *   - the camera is D = 1.5 × map height away from the centre point
 *     (MapLibre's default 36.87° vertical field of view)
 *   - so the globe's outline on screen has radius  r = D · tan(asin(R / (D + R)))
 * Solving that for zoom gives the function below.
 */

/**
 * @param {HTMLElement} container  the map's container element
 * @param {number} centreLat       latitude of the start centre, degrees
 * @param {number} fill            share of the shorter screen side the globe should fill (0..1)
 * @returns {number} MapLibre zoom level
 */
export function globeFitZoom(container, centreLat, fill) {
  const D = 1.5 * container.clientHeight;
  const r = fill * Math.min(container.clientWidth, container.clientHeight) / 2;
  const s = Math.sin(Math.atan(r / D));
  const R = D * s / (1 - s);
  const worldSize = 2 * Math.PI * Math.cos(centreLat * Math.PI / 180) * R;
  const zoom = Math.log2(worldSize / 512);

  // A page opened in a hidden or background tab can have a 0×0 container at this moment.
  // Then the sums give 0/0 = NaN, and a NaN zoom crashes MapLibre. Fall back to zoom 1.
  return Number.isFinite(zoom) ? Math.max(0, zoom) : 1;
}
