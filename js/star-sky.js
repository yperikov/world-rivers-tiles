/**
 * star-sky.js — black space with real stars around the 3D globe.
 *
 * Stars: 9,096 stars from the Yale Bright Star Catalogue in stars.json, made by
 * scripts/make_stars.py in the FirstMap project. The file is one flat list:
 *   [ra, dec, magnitude, B−V, ra, dec, magnitude, B−V, ...]
 * with right ascension and declination in degrees (J2000), sorted faint to bright so the
 * bright stars are drawn last, on top.
 *
 * How they are drawn:
 *   - on a 2D canvas placed *under* MapLibre's canvas; MapLibre's canvas is transparent around
 *     the globe, and the globe itself hides the stars behind it;
 *   - each star at its true direction for the current sidereal time (the real sky right now),
 *     using the globe camera (globe-camera.js). Stars are infinitely far away, so only the
 *     camera's direction matters: the sky turns with the globe and stays put when zooming;
 *   - "super bright" on purpose (the user's wish): glow sprites added on top of each other,
 *     sizes growing gently with brightness, even faint stars at least 75% opaque, and light
 *     spikes on the brightest few;
 *   - colour from the B−V index: blue-white hot stars to orange cool ones.
 *
 * Only shown in the 3D view. In 3D this module also puts the class "space" on <html>, which
 * turns the page background black (css/star-sky.css).
 */
import { STARS_URL } from './config.js';
import { isGlobe, onModeChange } from './view-mode.js';
import { globeCamera } from './globe-camera.js';

// --- Look of the stars (tune here) ---
const STAR_SIZE = 1.5;         // overall star size; raise for an even brighter sky
const MIN_OPACITY = 0.75;      // faintest stars are still this opaque
const SPIKES_BELOW_MAG = 1.5;  // stars brighter than this magnitude get light spikes

/** Colour by B−V index: [B−V, "r,g,b"]. Each star uses the nearest entry. */
const STAR_COLOURS = [
  [-0.3, '155,178,255'], // hot, blue-white
  [0.0, '202,216,255'],
  [0.3, '244,243,255'],
  [0.6, '255,242,224'],  // sun-like
  [0.9, '255,224,188'],
  [1.2, '255,204,153'],
  [1.6, '255,176,112']   // cool, orange
];

/** One pre-drawn glow image per colour: white core, coloured halo fading out. */
function makeGlowSprites() {
  return STAR_COLOURS.map(([, rgb]) => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const ctx = sprite.getContext('2d');
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.18, `rgba(${rgb},1)`);
    glow.addColorStop(0.45, `rgba(${rgb},0.3)`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    return sprite;
  });
}

function nearestColourIndex(bv) {
  let best = 0;
  STAR_COLOURS.forEach(([value], i) => {
    if (Math.abs(bv - value) < Math.abs(bv - STAR_COLOURS[best][0])) best = i;
  });
  return best;
}

/**
 * Turn the flat catalogue list into typed arrays, ready for fast drawing:
 * unit direction (x, y, z) in the celestial frame, glow size in px, opacity, colour index.
 */
function prepareStars(flat) {
  const count = flat.length / 4, DEG = Math.PI / 180;
  const stars = {
    x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count),
    size: new Float32Array(count), alpha: new Float32Array(count),
    sprite: new Uint8Array(count), mag: new Float32Array(count)
  };
  for (let i = 0; i < count; i++) {
    const ra = flat[4 * i] * DEG, dec = flat[4 * i + 1] * DEG;
    const mag = flat[4 * i + 2], bv = flat[4 * i + 3];
    stars.x[i] = Math.cos(dec) * Math.cos(ra);
    stars.y[i] = Math.cos(dec) * Math.sin(ra);
    stars.z[i] = Math.sin(dec);
    // Glow diameter in px, growing gently with brightness (Sirius ≈ 8× a faint star)
    stars.size[i] = STAR_SIZE * (3 + 3.2 * Math.pow(10, -0.2 * (mag - 6.5)) ** 0.75);
    stars.alpha[i] = Math.min(1, Math.max(MIN_OPACITY, 1.25 - 0.08 * mag));
    stars.sprite[i] = nearestColourIndex(bv);
    stars.mag[i] = mag;
  }
  return stars;
}

/**
 * Greenwich mean sidereal time, in radians: how far the starry sky has turned relative to
 * the Earth right now. Standard formula from the Julian date.
 */
function siderealAngle() {
  const julianDate = Date.now() / 86400000 + 2440587.5;
  const degrees = (280.46061837 + 360.98564736629 * (julianDate - 2451545.0)) % 360;
  return degrees * Math.PI / 180;
}

export function addStarSky(map) {
  const canvas = document.createElement('canvas');
  canvas.className = 'star-sky';
  // First child of the map container, so it lies underneath MapLibre's canvas
  map.getContainer().insertBefore(canvas, map.getContainer().firstChild);
  const ctx = canvas.getContext('2d');
  const sprites = makeGlowSprites();
  let stars = null; // filled in once stars.json has loaded

  function draw() {
    // Match the canvas to its on-screen size, in device pixels for sharp stars
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!isGlobe() || !stars || !width || !height) return;

    // Camera axes, turned from the Earth-fixed frame into the celestial frame (by the sidereal
    // angle about the pole), so they can be compared directly with the star directions
    const { right, up, forward, focal } = globeCamera(map);
    const t = siderealAngle(), cosT = Math.cos(t), sinT = Math.sin(t);
    const toSky = (v) => [v[0] * cosT - v[1] * sinT, v[0] * sinT + v[1] * cosT, v[2]];
    const [rx, ry, rz] = toSky(right), [ux, uy, uz] = toSky(up), [fx, fy, fz] = toSky(forward);

    ctx.globalCompositeOperation = 'lighter'; // overlapping glows add up
    const { x, y, z, size, alpha, sprite, mag } = stars;
    for (let i = 0; i < x.length; i++) {
      const depth = x[i] * fx + y[i] * fy + z[i] * fz;
      if (depth <= 0.05) continue; // behind the camera

      const sx = width / 2 + (x[i] * rx + y[i] * ry + z[i] * rz) / depth * focal;
      const sy = height / 2 - (x[i] * ux + y[i] * uy + z[i] * uz) / depth * focal;
      const s = size[i];
      if (sx < -s || sy < -s || sx > width + s || sy > height + s) continue; // off screen

      ctx.globalAlpha = alpha[i];
      ctx.drawImage(sprites[sprite[i]], sx - s / 2, sy - s / 2, s, s);

      if (mag[i] < SPIKES_BELOW_MAG) drawSpikes(sx, sy, s * 1.6);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** A thin horizontal and vertical light spike, fading towards the ends. */
  function drawSpikes(sx, sy, halfLength) {
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    for (const [dx, dy] of [[halfLength, 0], [0, halfLength]]) {
      const fade = ctx.createLinearGradient(sx - dx, sy - dy, sx + dx, sy + dy);
      fade.addColorStop(0, 'rgba(255,255,255,0)');
      fade.addColorStop(0.5, 'rgba(255,255,255,1)');
      fade.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = fade;
      ctx.beginPath();
      ctx.moveTo(sx - dx, sy - dy);
      ctx.lineTo(sx + dx, sy + dy);
      ctx.stroke();
    }
  }

  // Redraw at most once per animation frame, however many events arrive
  let queued = false;
  function scheduleDraw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      draw();
    });
  }

  // Black space in 3D, the normal light background in 2D
  function updateSpace() {
    document.documentElement.classList.toggle('space', isGlobe());
    scheduleDraw();
  }

  fetch(STARS_URL)
    .then((response) => response.json())
    .then((flat) => {
      stars = prepareStars(flat);
      scheduleDraw();
    });

  map.on('move', scheduleDraw);
  map.on('resize', scheduleDraw);
  onModeChange(updateSpace);
  updateSpace();
}
