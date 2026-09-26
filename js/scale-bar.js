/**
 * scale-bar.js — the scale ruler at the bottom centre of the screen.
 *
 * A bar of fixed length with ten divisions; its label is the distance across the whole bar
 * at the centre of the view, rounded to 2 significant figures (e.g. "1,600 km").
 *
 * Why not MapLibre's own ScaleControl: it only shows round distances (100, 200, 500 km ...)
 * and changes its bar length to fit, so the bar halved or doubled in length at every step.
 * On the flat map the scale changes with latitude, so that happened while dragging, and the
 * user saw a "jumping" scale. Here the bar length stays fixed and only the number changes.
 *
 * Notes:
 *  - The scale is measured over just 10 px at the centre of the view, then multiplied up to the
 *    bar length. Measuring across the whole bar would fail when the globe is zoomed out and is
 *    smaller than the bar (the ends would be out in space).
 *  - Scale varies across any world map (with latitude on the flat map, towards the edge of the
 *    globe), so the ruler is exact only near the centre.
 *  - Styling: css/scale-bar.css. It is a plain element, not a MapLibre control, because
 *    MapLibre offers no bottom-centre control position.
 */

const BAR_MAX_PX = 200;     // bar length; halved from 400 px at the user's request
const BAR_MIN_PX = 100;
const SCREEN_MARGIN_PX = 16; // on narrow screens the bar keeps this gap on each side

export function addScaleBar(map) {
  const bar = document.createElement('div');
  bar.className = 'maplibregl-ctrl-scale scale-center';

  const label = document.createElement('span');
  bar.appendChild(label);

  // Nine ticks at the tenths; the middle one (0.5) is longer (class "mid").
  // `left` is measured from inside the 2 px left border, so each tick is shifted by
  // (0.4·i − 2) px to sit at exactly i tenths of the full outer width.
  for (let i = 1; i < 10; i++) {
    const tick = document.createElement('div');
    tick.className = i === 5 ? 'tick mid' : 'tick';
    tick.style.left = `calc(${i * 10}% + ${0.4 * i - 2}px)`;
    bar.appendChild(tick);
  }
  map.getContainer().appendChild(bar);

  function update() {
    const container = map.getContainer();
    const x = container.clientWidth / 2;
    const y = container.clientHeight / 2;

    const barPx = Math.max(BAR_MIN_PX, Math.min(BAR_MAX_PX, container.clientWidth - 2 * SCREEN_MARGIN_PX));
    bar.style.width = barPx + 'px';

    // Metres per pixel at the centre of the view (over 10 px), times the bar length
    const metresPerPx = map.unproject([x - 5, y]).distanceTo(map.unproject([x + 5, y])) / 10;
    const metres = metresPerPx * barPx;

    const [value, unit] = metres >= 1000 ? [metres / 1000, 'km'] : [metres, 'm'];
    label.textContent = `${Number(value.toPrecision(2)).toLocaleString('en')} ${unit}`;
  }

  map.on('move', update);
  map.on('resize', update);
  update();
}
