/**
 * fullscreen-button.js — the full-screen on/off button (MapLibre's built-in control).
 *
 * Browsers allow full screen only in response to a click or tap, never on page load, and
 * Esc always leaves it.
 *
 * The button is added only where the browser supports full screen for a page. iPhones do not
 * (they report document.fullscreenEnabled = false), so they get no button; iPads, Android
 * and desktop browsers do. This is a feature check, deliberately not browser-name sniffing.
 */
import maplibregl from './maplibre.js';

export function addFullscreenButton(map) {
  if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
  }
}
