/**
 * language-switch.js — the "EN | RU" button pair, and swapping the map's tiles to match.
 *
 * The buttons call setLanguage() in language.js. This module listens for language changes and
 * points the "rivers" tile source at the other tile set with source.setTiles(); MapLibre then
 * reloads the visible tiles (for a moment the plain sea background may show). Centre, zoom,
 * view (2D/3D), measured lines etc. stay as they are.
 *
 * The buttons look and behave like the 2D/3D switch: they reuse its `mode-switch` class
 * (css/controls.css), so press-feedback.js also treats the active button the same way.
 */
import { LANGUAGES, tileUrl } from './config.js';
import { getLanguage, setLanguage, onLanguageChange } from './language.js';

class LanguageSwitchControl {
  onAdd() {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group mode-switch language-switch';
    this.buttons = {};

    for (const [code, info] of Object.entries(LANGUAGES)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = code.toUpperCase();
      button.lang = code; // screen readers read the native name in its own language
      button.addEventListener('click', () => setLanguage(code));
      this.buttons[code] = { button, info };
      this.container.appendChild(button);
    }

    this.update();
    return this.container;
  }

  /** Mark the button of the current language as pressed and refresh the tooltips. */
  update() {
    for (const [code, { button, info }] of Object.entries(this.buttons)) {
      const active = code === getLanguage();
      button.setAttribute('aria-pressed', String(active));
      button.title = active
        ? `Map labels: ${info.name} (current)`
        : `Show map labels in ${info.name} (${info.nativeName})`;
    }
  }

  onRemove() {
    this.container.remove();
  }
}

/** Add the language switch to the top-right corner and keep the tiles in step with it. */
export function addLanguageSwitch(map) {
  const control = new LanguageSwitchControl();
  map.addControl(control, 'top-right');

  // main.js builds the style with getLanguage(), so at the start the map shows this language.
  // A switch clicked while the page is still loading is applied once the style has loaded
  // (before that the "rivers" source may not exist yet), like the 2D/3D switch.
  let shown = getLanguage();
  let styleLoaded = false;
  const applyToMap = () => {
    if (shown === getLanguage()) return; // setTiles() reloads every tile; skip if unchanged
    map.getSource('rivers').setTiles([tileUrl(getLanguage())]);
    shown = getLanguage();
  };

  map.on('load', () => {
    styleLoaded = true;
    applyToMap();
  });

  onLanguageChange(() => {
    if (styleLoaded) applyToMap();
    control.update();
  });
}
