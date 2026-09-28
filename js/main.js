/**
 * main.js — entry point of the World Rivers web map.
 *
 * Creates the MapLibre map and switches on each feature. Every feature lives in its own
 * module; js/README.md has the full file map and the rules to keep in mind when editing.
 *
 * Loaded from index.html as <script type="module" src="js/main.js">. Module scripts run
 * after the page has been parsed, so the #map element already exists here.
 */
import maplibregl from './maplibre.js';
import {
  START_CENTER, MIN_ZOOM, MAX_ZOOM, FLAT_START_ZOOM, GLOBE_START_FILL
} from './config.js';
import { getMode, isGlobe } from './view-mode.js';
import { getLanguage } from './language.js';
import { buildStyle } from './map-style.js';
import { globeFitZoom } from './start-view.js';
import { addModeSwitch } from './mode-switch.js';
import { addLanguageSwitch } from './language-switch.js';
import { addScaleBar } from './scale-bar.js';
import { addFullscreenButton } from './fullscreen-button.js';
import { addStarSky } from './star-sky.js';
import { addMeasureTool } from './measure-tool.js';
import { addPressFeedback } from './press-feedback.js';
import { addElevationReadout } from './elevation-readout.js';
import { globeCamera, globeProject, globeUnproject } from './globe-camera.js';

const container = document.getElementById('map');

const map = new maplibregl.Map({
  container,
  center: START_CENTER,
  // The globe opens sized to fill most of the screen; the flat map at a fixed zoom
  zoom: isGlobe() ? globeFitZoom(container, START_CENTER[1], GLOBE_START_FILL) : FLAT_START_ZOOM,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,

  // One copy of the world only. On the flat map this also stops panning past the edges of the
  // Mercator square and zooming out further than the screen, like the old Leaflet page.
  // (Do NOT use maxBounds for this: in MapLibre 6.11.2, bounds reaching ±180° longitude crash
  // the map with "Cannot read properties of null (reading '0')".)
  renderWorldCopies: false,

  // No attribution box (user's request). Natural Earth is public domain; it is credited in
  // the README of the published repository, together with the star catalogue.
  attributionControl: false,

  style: buildStyle(getMode(), getLanguage())
});

// Buttons in the top-right corner, stacked in this order from the top:
// 2D/3D, EN/RU (label language), zoom +/- and compass, full screen, ruler (measure tool).
addModeSwitch(map);
addLanguageSwitch(map);
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
addScaleBar(map); // bottom centre, not a MapLibre control
addFullscreenButton(map);
addStarSky(map);
addMeasureTool(map);
addElevationReadout(map);
addPressFeedback(map);

// For poking at the map from the browser console (debugging and tests), e.g.
//   map.getZoom()   or   globeMath.globeProject(globeMath.globeCamera(), 35, 31.5)
window.map = map;
window.globeMath = { globeCamera: () => globeCamera(map), globeProject, globeUnproject };
