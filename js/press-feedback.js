/**
 * press-feedback.js — makes every map button visibly "press in" when clicked or tapped.
 *
 * CSS `:active` alone is not enough: a quick tap can be over within a single frame, so the
 * pressed look would never be seen. Instead this adds the class "pressed" on pointer-down and
 * removes it on release, but no sooner than 150 ms after the press. The look itself is in
 * css/controls.css (and css/measure-tool.css for the ruler button).
 *
 * Buttons that do nothing when clicked get no feedback: disabled ones (e.g. "+" at maximum
 * zoom) and the active button of the 2D/3D or EN/RU switch (both use the `mode-switch` class).
 * The ruler button does react while switched on (aria-pressed="true"), because clicking it
 * switches it off.
 */

const MIN_PRESSED_MS = 150;

export function addPressFeedback(map) {
  map.getContainer().addEventListener('pointerdown', (event) => {
    const button = event.target.closest('.maplibregl-ctrl-group button');
    if (!button || button.disabled) return;
    if (button.getAttribute('aria-pressed') === 'true' && button.closest('.mode-switch')) return;

    button.classList.add('pressed');
    const pressedAt = performance.now();

    // Released anywhere (the pointer may have left the button by then)
    const release = () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      const remaining = Math.max(0, MIN_PRESSED_MS - (performance.now() - pressedAt));
      setTimeout(() => button.classList.remove('pressed'), remaining);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  });
}
