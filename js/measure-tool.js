/**
 * measure-tool.js — measure distances by clicking points on the map.
 *
 * How to use (this is also the behaviour to preserve when changing the code):
 *   - Ruler button (below full screen): switches the tool on (blue, crosshair pointer) and off.
 *     Switching off clears everything.
 *   - Left click: add a point. A dashed line with "+segment = total" follows the mouse from the
 *     last point.
 *   - Right click: pause. The dashed line and its label disappear; the measured line and the
 *     distances stay; no browser menu. The FIRST left click after that only brings the dashed
 *     line back (no point is added); later clicks add points as usual.
 *   - Double-click: finish the line. The next click starts a new measurement.
 *   - Esc: clear.   Backspace / Delete: remove the last point.
 *   - Clicks in the black space around the globe are ignored.
 *   - While the tool is on, MapLibre's double-click zoom is switched off.
 *   - The line stays when switching between 2D and 3D.
 *   - Phones: tapping adds points; there is no hover, so no dashed line; double-tap still zooms.
 *
 * Distances and paths: true shortest paths on the WGS84 ellipsoid (geodesy.js).
 * Drawing: measure-overlay.js (own canvas, so paths can cross the poles).
 * Styling: css/measure-tool.css.
 *
 * If the GeographicLib script did not load, the tool is simply not added.
 */
import { isGlobe, onModeChange } from './view-mode.js';
import { globeCamera, globeUnproject } from './globe-camera.js';
import { geodesicsAvailable, geodesicPath, formatDistance } from './geodesy.js';
import { MeasureOverlay } from './measure-overlay.js';

/** Two points closer than this on screen count as the same point (double-click clean-up). */
const SAME_POINT_PX = 6;

const RULER_ICON =
  '<span class="maplibregl-ctrl-icon" aria-hidden="true">' +
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linejoin="round">' +
  '<rect x="2" y="8" width="20" height="8" rx="1.2"/><path d="M6 8v3M10 8v4.5M14 8v3M18 8v4.5"/>' +
  '</svg></span>';

export function addMeasureTool(map) {
  if (!geodesicsAvailable) return;

  const overlay = new MeasureOverlay(map);

  // --- State ---
  const state = {
    active: false,   // tool switched on
    points: [],      // clicked points, [lng, lat]
    segments: [],    // geodesic paths between consecutive points: { points, length }
    finished: false, // ended with a double-click; the next click starts a new measurement
    paused: false,   // after a right click: no dashed line until the next left click
    hover: null,     // map point under the mouse, [lng, lat], or null
    live: null       // geodesic path from the last point to `hover`, or null
  };

  // --- Drawing: at most once per animation frame ---
  let drawQueued = false;
  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
      drawQueued = false;
      overlay.draw(state);
    });
  }

  /** Recompute the dashed line to the mouse (or remove it), then redraw. */
  function updateLive() {
    state.live = null;
    const showLive = state.active && !state.finished && !state.paused && state.hover && state.points.length;
    if (showLive) {
      state.live = geodesicPath(state.points[state.points.length - 1], state.hover);
      const total = state.segments.reduce((sum, segment) => sum + segment.length, 0);
      overlay.setLiveText(state.segments.length
        ? `+${formatDistance(state.live.length)} = ${formatDistance(total + state.live.length)}`
        : formatDistance(state.live.length));
    }
    scheduleDraw();
  }

  // --- Editing the measurement ---
  function addPoint(point) {
    if (state.points.length) state.segments.push(geodesicPath(state.points[state.points.length - 1], point));
    state.points.push(point);
    overlay.setTotals(state.segments);
    updateLive();
  }

  function removeLastPoint() {
    state.points.pop();
    state.segments.length = Math.max(0, state.points.length - 1);
    state.finished = false;
    overlay.setTotals(state.segments);
    updateLive();
  }

  function clear() {
    state.points = [];
    state.segments = [];
    state.finished = false;
    state.paused = false;
    state.hover = null;
    overlay.setTotals(state.segments);
    updateLive();
  }

  /**
   * The map point under a mouse event, or null in the space around the globe.
   * On the globe this uses our own camera maths, which also works beyond 85° latitude
   * (MapLibre's e.lngLat stops there, and gives some point even for a click in space).
   */
  function pointFromEvent(event) {
    if (isGlobe()) return globeUnproject(globeCamera(map), event.point.x, event.point.y);
    return [event.lngLat.wrap().lng, event.lngLat.lat];
  }

  // --- The ruler button ---
  let button = null;

  function setActive(on) {
    state.active = on;
    document.documentElement.classList.toggle('measuring', on); // crosshair pointer
    if (on) {
      map.doubleClickZoom.disable(); // double-click finishes a line instead
    } else {
      map.doubleClickZoom.enable();
      clear();
    }
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? 'Stop measuring (clears the line)' : 'Measure distance';
  }

  class MeasureControl {
    onAdd() {
      this.container = document.createElement('div');
      this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'measure-btn';
      button.innerHTML = RULER_ICON;
      button.addEventListener('click', () => setActive(!state.active));
      this.container.appendChild(button);
      setActive(false);
      return this.container;
    }

    onRemove() {
      this.container.remove();
    }
  }

  map.addControl(new MeasureControl(), 'top-right');

  // --- Mouse and keyboard ---

  // Left click: add a point (or, right after a right click, only resume the dashed line)
  map.on('click', (event) => {
    if (!state.active) return;
    const point = pointFromEvent(event);
    if (!point) return; // a click in space

    if (state.finished) clear(); // a click after finishing starts a new measurement

    if (state.paused && state.points.length) {
      state.paused = false;
      state.hover = point;
      updateLive();
      return;
    }
    state.paused = false;
    addPoint(point);
  });

  // Right click: pause (hide the dashed line); keep the line and distances; no browser menu.
  // (A right-button *drag* rotates the map and does not fire "contextmenu".)
  map.on('contextmenu', (event) => {
    if (!state.active) return;
    event.originalEvent.preventDefault();
    if (!state.points.length || state.finished) return; // nothing to pause
    state.paused = true;
    state.hover = null;
    updateLive();
  });

  // Double-click: finish the line
  map.on('dblclick', (event) => {
    if (!state.active) return;
    event.preventDefault();
    // Each of the two clicks of a double-click already added a point at the same spot:
    // drop the second one
    const count = state.points.length;
    if (count >= 2) {
      const camera = overlay.currentCamera();
      const a = overlay.screenPoint(state.points[count - 2], camera);
      const b = overlay.screenPoint(state.points[count - 1], camera);
      if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) < SAME_POINT_PX) removeLastPoint();
    }
    state.finished = true;
    state.hover = null;
    updateLive();
  });

  // Mouse move: the dashed line follows
  map.on('mousemove', (event) => {
    if (!state.active || state.finished || state.paused || !state.points.length) return;
    state.hover = pointFromEvent(event);
    updateLive();
  });

  map.getCanvas().addEventListener('mouseleave', () => {
    state.hover = null;
    updateLive();
  });

  window.addEventListener('keydown', (event) => {
    if (!state.active) return;
    if (event.key === 'Escape') {
      clear();
    } else if ((event.key === 'Backspace' || event.key === 'Delete') && state.points.length) {
      event.preventDefault(); // Backspace must not navigate back
      removeLastPoint();
    }
  });

  // Redraw when the view moves or changes between 2D and 3D (the line is drawn differently)
  map.on('move', scheduleDraw);
  map.on('resize', scheduleDraw);
  onModeChange(scheduleDraw);
}
