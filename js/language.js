/**
 * language.js — the language of the map labels: English or Russian.
 *
 * The labels are baked into the tiles, so each language is its own tile set
 * (LANGUAGES in config.js). This is the single source of truth for which one is shown:
 *   - read it with     getLanguage()  ('en' or 'ru')
 *   - change it with   setLanguage(code)
 *   - react to it with onLanguageChange(listener)
 * Applying it to the map (swapping the tile URLs) happens in language-switch.js.
 *
 * Where the language comes from when the page opens, first match wins:
 *   1. "?lang=ru" / "?lang=en" in the address (links keep the language),
 *   2. the viewer's last choice, remembered in this browser (localStorage),
 *   3. the browser's own language list (a Russian browser gets Russian labels),
 *   4. English.
 * Switching updates the address (replaceState, like the 2D/3D switch) and the remembered choice.
 * Only the map labels change; the page's own texts (tooltips, units) stay English.
 */
import { LANGUAGES, DEFAULT_LANGUAGE } from './config.js';

const STORAGE_KEY = 'world-rivers-language';

const isKnown = (code) => Object.hasOwn(LANGUAGES, code);

function fromAddress() {
  const code = new URLSearchParams(location.search).get('lang');
  return code && isKnown(code.toLowerCase()) ? code.toLowerCase() : null;
}

// localStorage can be missing or throw (private windows, blocked site data): then it is simply not used.
function remembered() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return code && isKnown(code) ? code : null;
  } catch {
    return null;
  }
}

function remember(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // not saved; the address still carries the choice
  }
}

function fromBrowser() {
  for (const tag of navigator.languages || [navigator.language || '']) {
    const code = tag.slice(0, 2).toLowerCase();
    if (isKnown(code)) return code;
  }
  return null;
}

let language = fromAddress() || remembered() || fromBrowser() || DEFAULT_LANGUAGE;
const listeners = [];

export function getLanguage() {
  return language;
}

/** Call `listener(newLanguage)` after every change. Listeners run in the order added. */
export function onLanguageChange(listener) {
  listeners.push(listener);
}

/** Switch the label language. Does nothing if it is already shown or the code is unknown. */
export function setLanguage(code) {
  if (code === language || !isKnown(code)) return;
  language = code;
  remember(code);
  // Keep the #globe / #flat part of the address as it is
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  history.replaceState(null, '', url);
  for (const listener of listeners) listener(language);
}
