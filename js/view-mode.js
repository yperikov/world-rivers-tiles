/**
 * view-mode.js — which view the page shows: the 3D globe or the flat 2D map.
 *
 * This is the single source of truth for the view. Other modules:
 *   - read it with     getMode()  (returns GLOBE or FLAT) or isGlobe()
 *   - change it with   setMode(GLOBE | FLAT)
 *   - react to it with onModeChange(listener)
 *
 * The view is also kept in the page address: "#globe" or "#flat". A link with "#flat" opens
 * the flat map; Back/Forward or editing the address switches the view too.
 *
 * This module only records the view and tells the listeners. Applying it to the map
 * (map.setProjection) happens in mode-switch.js, because MapLibre accepts a projection
 * change only after its style has loaded.
 */

export const GLOBE = 'globe'; // 3D: MapLibre "globe" projection
export const FLAT = 'flat';   // 2D: MapLibre "mercator" projection

/** Anything other than "#flat" (including no hash) means the globe. */
const modeFromAddress = () => (location.hash === '#flat' ? FLAT : GLOBE);

let mode = modeFromAddress();
const listeners = [];

export function getMode() {
  return mode;
}

export function isGlobe() {
  return mode === GLOBE;
}

/** Call `listener(newMode)` after every change of view. Listeners run in the order added. */
export function onModeChange(listener) {
  listeners.push(listener);
}

/**
 * Switch the view. Does nothing if it is already shown.
 * `updateAddress: false` is used when the change came from the address itself.
 */
export function setMode(newMode, { updateAddress = true } = {}) {
  if (newMode === mode) return;
  mode = newMode;
  // replaceState, not pushState: switching views should not fill the Back history
  if (updateAddress) history.replaceState(null, '', '#' + mode);
  for (const listener of listeners) listener(mode);
}

// The address changed by hand, or with Back/Forward
window.addEventListener('hashchange', () => setMode(modeFromAddress(), { updateAddress: false }));
