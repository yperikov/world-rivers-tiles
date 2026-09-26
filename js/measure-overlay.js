/**
 * measure-overlay.js — draws the measure tool's lines, points and distance labels.
 *
 * It only draws; what to draw (points, paths, the mouse position) comes from measure-tool.js.
 *
 * Why its own canvas instead of MapLibre line layers: MapLibre keeps every line in Web Mercator
 * coordinates, which end at ±85.05° latitude. A measured path over a pole was therefore drawn
 * up to 85°, round the 85° circle and back down, instead of across the pole. MapLibre has no
 * setting for this. So everything here is drawn on a transparent canvas above the map:
 *   - 3D globe: every point is placed with globe-camera.js, which works right up to the poles;
 *     parts of a path on the far side of the globe are hidden;
 *   - 2D flat map: points are placed with map.project(); paths are cut exactly at the map's
 *     top/bottom edge (the poles cannot be shown on a Mercator map) and at the 180° meridian.
 *
 * Labels are HTML elements in a layer above the canvas (the map style has no fonts for map
 * text). Styling: css/measure-tool.css.
 */
import { MEASURE_COLOUR, MERCATOR_EDGE } from './config.js';
import { isGlobe } from './view-mode.js';
import { globeCamera, globeProject } from './globe-camera.js';
import { splitAtDateLine, formatDistance } from './geodesy.js';

// Look of the drawing
const CASING = { width: 6, colour: 'rgba(255,255,255,0.85)' }; // white outline under the line
const LINE_WIDTH = 3;
const LIVE_LINE = { width: 2.5, dash: [6, 4] };                 // dashed line to the mouse
const POINT_RADIUS = 4.5;
// Label offsets from their point, in px
const TOTAL_LABEL_OFFSET = [10, -12];
const LIVE_LABEL_OFFSET = [14, 14];

export class MeasureOverlay {
  constructor(map) {
    this.map = map;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'measure-canvas';
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'measure-labels';
    // Right after MapLibre's canvas container: above the map, below the buttons
    map.getCanvasContainer().after(this.canvas, this.labelLayer);
    this.ctx = this.canvas.getContext('2d');

    this.totalLabels = [];                              // one per point after the first
    this.liveLabel = this.makeLabel('live');            // follows the mouse
  }

  makeLabel(kind) {
    const label = document.createElement('div');
    label.className = 'measure-label ' + kind;
    this.labelLayer.appendChild(label);
    return label;
  }

  /** The globe camera in 3D, or null on the flat map (then map.project() is used). */
  currentCamera() {
    return isGlobe() ? globeCamera(this.map) : null;
  }

  /** Screen position [x, y] of one point, or null if it cannot be seen. */
  screenPoint(point, camera) {
    if (camera) {
      const [x, y, visible] = globeProject(camera, point[0], point[1]);
      return visible ? [x, y] : null;
    }
    if (Math.abs(point[1]) > MERCATOR_EDGE) return null; // beyond the flat map's edge
    const p = this.map.project(point);
    return [p.x, p.y];
  }

  /**
   * A path (list of [lng, lat], longitudes may be unrolled) as screen polylines:
   * on the globe, the stretches facing the camera; on the flat map, the stretches inside the
   * Mercator square, each ending exactly on its top/bottom edge.
   */
  screenLines(points, camera) {
    const lines = [];
    let current = [];
    const endLine = () => {
      if (current.length > 1) lines.push(current);
      current = [];
    };

    if (camera) {
      for (const [lng, lat] of points) {
        const [x, y, visible] = globeProject(camera, lng, lat);
        if (visible) current.push([x, y]);
        else endLine();
      }
      endLine();
      return lines;
    }

    const project = (lng, lat) => {
      const p = this.map.project([lng, lat]);
      return [p.x, p.y];
    };
    for (const piece of splitAtDateLine(points)) {
      let prev = null;
      for (const [lng, lat] of piece) {
        const inside = Math.abs(lat) <= MERCATOR_EDGE;
        if (prev && inside !== prev.inside) {
          // Crossing the top/bottom edge: add the exact edge point (the points are 20 km apart,
          // which near the edge of a Mercator map would leave a visible gap)
          const edgeLat = Math.sign(inside ? prev.lat : lat) * MERCATOR_EDGE;
          const t = (edgeLat - prev.lat) / (lat - prev.lat);
          current.push(project(prev.lng + (lng - prev.lng) * t, edgeLat));
          if (!inside) endLine();
        }
        if (inside) current.push(project(lng, lat));
        prev = { lng, lat, inside };
      }
      endLine();
    }
    return lines;
  }

  /** Recreate the running-total labels: one per segment, the last one marked as the total. */
  setTotals(segments) {
    this.totalLabels.forEach((label) => label.remove());
    let sum = 0;
    this.totalLabels = segments.map((segment, i) => {
      sum += segment.length;
      const label = this.makeLabel(i === segments.length - 1 ? 'total' : 'running');
      label.textContent = formatDistance(sum);
      return label;
    });
  }

  setLiveText(text) {
    this.liveLabel.textContent = text;
  }

  /** Put a label next to its point, or hide it if the point is not visible. */
  placeLabel(label, point, camera, [dx, dy]) {
    const p = point && this.screenPoint(point, camera);
    label.style.display = p ? 'block' : 'none';
    if (p) {
      label.style.left = `${p[0] + dx}px`;
      label.style.top = `${p[1] + dy}px`;
    }
  }

  /**
   * Draw everything for the current view.
   * @param state  { points, segments, live, hover } from measure-tool.js:
   *               points [lng, lat][], segments {points, length}[] between them,
   *               live: the path to the mouse ({points, length}) or null, hover: mouse [lng, lat]
   */
  draw({ points, segments, live, hover }) {
    const { canvas, ctx } = this;
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const camera = this.currentCamera();
    const stroke = (lines, lineWidth, colour, dash = []) => {
      ctx.setLineDash(dash);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = colour;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const line of lines) {
        ctx.beginPath();
        line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    };

    // The measured path: white casing, then the coloured line on top
    const path = segments.flatMap((segment) => this.screenLines(segment.points, camera));
    stroke(path, CASING.width, CASING.colour);
    stroke(path, LINE_WIDTH, MEASURE_COLOUR);

    // The dashed line from the last point to the mouse
    if (live) stroke(this.screenLines(live.points, camera), LIVE_LINE.width, MEASURE_COLOUR, LIVE_LINE.dash);
    ctx.setLineDash([]);

    // The clicked points: white dots with a coloured ring
    for (const point of points) {
      const p = this.screenPoint(point, camera);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], POINT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = MEASURE_COLOUR;
      ctx.stroke();
    }

    // Labels: running totals at points 2, 3, ...; the live label at the mouse
    this.totalLabels.forEach((label, i) => this.placeLabel(label, points[i + 1], camera, TOTAL_LABEL_OFFSET));
    this.placeLabel(this.liveLabel, live && this.liveLabel.textContent ? hover : null, camera, LIVE_LABEL_OFFSET);
  }
}
