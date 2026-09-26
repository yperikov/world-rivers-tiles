/**
 * elevation-readout.js — shows the coordinates and terrain height under the pointer.
 *
 * Behaviour to preserve:
 *   - The panel sits in the bottom right corner of the map (never next to the pointer, where
 *     it would cover the map or the finger). It reads like Google Earth's status bar, but
 *     without seconds: latitude and longitude in whole degrees and minutes, then the height in
 *     metres, e.g. `39°40'N 109°37'E  1,457 m`. Where there is no height data (beyond ±85°
 *     latitude) the height shows a dash.
 *   - Mouse: it updates as the pointer moves over the map.
 *   - Touch: there is no hover, so tapping the map shows the height at that spot.
 *   - Two kinds of fading (times in css/elevation-readout.css):
 *       the whole panel fades in slowly and fades out when the pointer goes into the space
 *       around the globe, leaves the map, or the measure tool is on (its clicks and taps belong
 *       to the ruler);
 *       only the numbers fade (the panel stays) while they are not available: while the globe
 *       is being dragged, pinched or rotated, or while the height tile is still loading.
 *     A panel that is not showing yet waits for its first numbers before it fades in.
 *
 * Heights come from elevation.js. Styling: css/elevation-readout.css.
 */
import { pointFromEvent } from './map-point.js';
import { getElevation } from './elevation.js';

/** A height that takes longer than this to arrive fades the old numbers out meanwhile. */
const LOADING_DELAY_MS = 150;

const METRES = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function format(metres) {
  // A real minus sign, so "−3,458 m" is not read as a hyphen
  return (metres < 0 ? '−' : '') + METRES.format(Math.abs(metres)) + ' m';
}

/** 39.675 -> "39°41'", 35.0 -> "35°00'" (whole minutes, rounded; no seconds), then the hemisphere letter. */
function formatAngle(degrees, positive, negative) {
  const minutes = Math.round(Math.abs(degrees) * 60);
  return `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2, '0')}'${degrees < 0 ? negative : positive}`;
}

function formatCoordinates([lng, lat]) {
  return `${formatAngle(lat, 'N', 'S')} ${formatAngle(lng, 'E', 'W')}`;
}

export function addElevationReadout(map) {
  const label = document.createElement('div');
  label.className = 'elevation-label';
  const coordinates = document.createElement('span');
  coordinates.className = 'coordinates';
  const height = document.createElement('span');
  height.className = 'height';
  label.append(coordinates, height);
  map.getContainer().appendChild(label);

  const hasHover = window.matchMedia('(hover: hover)').matches;
  let latest = 0;        // request counter: an answer that is no longer the latest is dropped
  let loadingTimer = 0;
  let lastPoint = null;  // last mouse position on the map ({x, y}), to refresh after a drag

  const panelShown = () => label.classList.contains('visible');

  /** The whole panel fades out. */
  function hidePanel() {
    latest++;
    clearTimeout(loadingTimer);
    label.classList.remove('visible');
  }

  /** Only the numbers fade out; the panel stays. */
  function fadeNumbers() {
    latest++;
    clearTimeout(loadingTimer);
    label.classList.add('faded');
  }

  async function show(event) {
    if (document.documentElement.classList.contains('measuring')) return hidePanel();
    const point = pointFromEvent(map, event);
    if (!point) return hidePanel();
    const request = ++latest;
    // A cached tile answers at once and the numbers just change. Only if the answer takes a
    // moment (tile still downloading) do the old numbers fade out while waiting.
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      if (request === latest && panelShown()) label.classList.add('faded');
    }, LOADING_DELAY_MS);
    const metres = await getElevation(point[0], point[1]);
    if (request !== latest) return; // the pointer has moved on
    clearTimeout(loadingTimer);
    coordinates.textContent = formatCoordinates(point);
    height.textContent = metres === null ? '—' : format(metres);
    label.classList.remove('faded');
    label.classList.add('visible');
  }

  // Mouse: follow the pointer. (MapLibre sends no mousemove for touches.)
  if (hasHover) {
    map.on('mousemove', (event) => {
      lastPoint = event.point;
      if (map.isMoving()) return fadeNumbers(); // dragging: the height under the pointer changes each frame
      show(event);
    });
    map.getCanvas().addEventListener('mouseleave', () => {
      lastPoint = null;
      hidePanel();
    });
    // The drag ended with the pointer standing still: show the numbers for the new spot
    map.on('moveend', () => {
      if (lastPoint) show({ point: lastPoint, get lngLat() { return map.unproject(lastPoint); } });
    });
  }

  // Tap (or click): read the height at that spot
  map.on('click', show);

  // A drag, pinch or rotate starts: the numbers would no longer match the spot
  map.on('movestart', fadeNumbers);
}
