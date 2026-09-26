/**
 * mode-switch.js — the "2D | 3D" button pair, and applying the view to the map.
 *
 * The buttons call setMode() in view-mode.js. This module listens for view changes and
 * applies them to MapLibre:
 *   - 2D → "mercator" projection, south cap hidden
 *   - 3D → "globe" projection, south cap shown
 * Centre and zoom are kept when switching (MapLibre does that by itself).
 *
 * MapLibre throws "Style is not done loading" if setProjection() is called too early, so a
 * switch requested during page load is remembered and applied on the map's "load" event.
 */
import { getMode, setMode, onModeChange, GLOBE, FLAT } from './view-mode.js';
import { showSouthCap } from './map-style.js';

/**
 * A MapLibre control (an object with onAdd/onRemove) holding the two buttons.
 * The button for the view on screen is marked aria-pressed="true" and drawn filled
 * (see css/controls.css); its tooltip says "(current view)".
 */
class ModeSwitchControl {
  onAdd() {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mode-switch';
    this.buttons = {};

    const choices = [
      { mode: FLAT, text: '2D', name: 'Flat map' },
      { mode: GLOBE, text: '3D', name: 'Globe' }
    ];
    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.text;
      button.dataset.name = choice.name;
      button.addEventListener('click', () => setMode(choice.mode));
      this.buttons[choice.mode] = button;
      this.container.appendChild(button);
    }

    this.update();
    return this.container;
  }

  /** Mark the button of the current view as pressed and refresh the tooltips. */
  update() {
    for (const [mode, button] of Object.entries(this.buttons)) {
      const active = mode === getMode();
      button.setAttribute('aria-pressed', String(active));
      button.title = active
        ? `${button.dataset.name} (current view)`
        : `Switch to ${button.dataset.name.toLowerCase()}`;
    }
  }

  onRemove() {
    this.container.remove();
  }
}

/** Add the 2D/3D switch to the top-right corner and keep the map in step with the view. */
export function addModeSwitch(map) {
  const control = new ModeSwitchControl();
  map.addControl(control, 'top-right');

  let styleLoaded = false;
  const applyToMap = () => {
    map.setProjection({ type: getMode() === FLAT ? 'mercator' : 'globe' });
    showSouthCap(map, getMode() === GLOBE);
  };

  map.on('load', () => {
    styleLoaded = true;
    applyToMap(); // also catches a switch made while the page was still loading
  });

  onModeChange(() => {
    if (styleLoaded) applyToMap();
    control.update();
  });
}
