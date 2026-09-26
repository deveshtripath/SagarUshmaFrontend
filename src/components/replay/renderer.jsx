// Draws one replay frame onto a canvas, laid out like a matplotlib figure:
// title, lat/lon axes, field raster, land, current arrows, cyclone track,
// storm symbol, colorbar. Everything is drawn on the canvas so exported
// videos and PNGs are self-contained.

import { COLORMAPS } from './colormaps.js';
import { imdCategory } from './cyclones.jsx';
import { stormAt, formatTime } from './scene.jsx';

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const BG = '#0a1628';
const LAND = '#dfe6ec';
const COAST = 'rgba(38,60,82,0.75)';
const FRAME = 'rgba(150,182,208,0.6)';
const TEXT = '#9fb8cd';
const TITLE = '#e8f4ff';
const KM_LAT = 110.57;

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export function computeLayout(cssW, bounds) {
  const compact = cssW < 640;
  const m = compact ? { l: 40, r: 74, t: 38, b: 40 } : { l: 58, r: 104, t: 46, b: 52 };
  const lonSpan = bounds.lonMax - bounds.lonMin;
  const latSpan = bounds.latMax - bounds.latMin;
  let pw = cssW - m.l - m.r;
  let ph = (pw * latSpan) / lonSpan;
  const maxH = 660;
  if (ph > maxH) {
    ph = maxH;
    pw = (ph * lonSpan) / latSpan;
  }
  const px = m.l + Math.round((cssW - m.l - m.r - pw) / 2);
  const plot = { x: px, y: m.t, w: Math.round(pw), h: Math.round(ph) };
  return {
    W: cssW,
    H: Math.round(ph + m.t + m.b),
    compact,
    plot,
    cbar: { x: plot.x + plot.w + (compact ? 12 : 18), y: plot.y + plot.h * 0.06, w: compact ? 10 : 14, h: plot.h * 0.88 },
  };
}

export function createFigure(scene, cssW, canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const L = computeLayout(cssW, scene.bounds);
  // Even pixel sizes: H.264 (MP4 export) rejects odd frame dimensions.
  canvas.width = 2 * Math.round((L.W * dpr) / 2);
  canvas.height = 2 * Math.round((L.H * dpr) / 2);
  canvas.style.height = `${L.H}px`;
  const sx = canvas.width / L.W;
  const sy = canvas.height / L.H;

  const B = scene.bounds;
  const X = (lon) => L.plot.x + ((lon - B.lonMin) / (B.lonMax - B.lonMin)) * L.plot.w;
  const Y = (lat) => L.plot.y + ((B.latMax - lat) / (B.latMax - B.latMin)) * L.plot.h;

  const landPath = new Path2D();
  for (const ring of scene.rings) {
    ring.forEach(([lon, lat], k) => (k === 0 ? landPath.moveTo(X(lon), Y(lat)) : landPath.lineTo(X(lon), Y(lat))));
    landPath.closePath();
  }

  const field = document.createElement('canvas');
  field.width = scene.nx;
  field.height = scene.ny;
  const fieldCtx = field.getContext('2d');

  return { sx, sy, layout: L, X, Y, landPath, field, fieldCtx, image: fieldCtx.createImageData(scene.nx, scene.ny), cbars: {} };
}

function colorbarImage(fig, cmap) {
  if (fig.cbars[cmap]) return fig.cbars[cmap];
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(1, 256);
  const lut = COLORMAPS[cmap];
  for (let y = 0; y < 256; y++) {
    const li = (255 - y) * 3; // top = maximum
    img.data[y * 4] = lut[li];
    img.data[y * 4 + 1] = lut[li + 1];
    img.data[y * 4 + 2] = lut[li + 2];
    img.data[y * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  fig.cbars[cmap] = c;
  return c;
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}

function ticksFor(lo, hi, target) {
  const step = niceStep((hi - lo) / target);
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return { ticks: out, step };
}

const fmtNum = (v, step) => {
  const d = step >= 1 ? 0 : Math.ceil(-Math.log10(step));
  return v.toFixed(d).replace('-', '−');
};

// ── Frame ───────────────────────────────────────────────────────────────────

export function drawFrame(ctx, fig, scene, frame, opts) {
  const { layer, showVectors, t } = opts;
  const L = fig.layout;
  const P = L.plot;
  ctx.setTransform(fig.sx, 0, 0, fig.sy, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, L.W, L.H);

  paintField(fig, scene, frame.vals, layer);

  ctx.save();
  ctx.beginPath();
  ctx.rect(P.x, P.y, P.w, P.h);
  ctx.clip();

  // Land colour underneath so the smoothed raster blends into the coast.
  ctx.fillStyle = LAND;
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fig.field, P.x, P.y, P.w, P.h);

  ctx.fillStyle = LAND;
  ctx.fill(fig.landPath, 'evenodd');
  ctx.strokeStyle = COAST;
  ctx.lineWidth = 0.8;
  ctx.stroke(fig.landPath);

  drawGrid(ctx, fig, scene);
  drawPlaces(ctx, fig, scene);
  if (showVectors) drawVectors(ctx, fig, scene, frame, layer);
  drawTrack(ctx, fig, scene, t);
  if (frame.storm) drawStorm(ctx, fig, frame.storm, t);
  drawHud(ctx, fig, scene, t, frame);
  ctx.restore();

  drawAxes(ctx, fig, scene);
  drawTitle(ctx, fig, scene, t, layer);
  drawColorbar(ctx, fig, layer);

  ctx.font = `400 ${L.compact ? 9 : 10}px ${FONT}`;
  ctx.fillStyle = 'rgba(159,184,205,0.5)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('SagarUshma · simulated fields', L.W - 8, L.H - 6);
}

function paintField(fig, scene, vals, layer) {
  const lut = COLORMAPS[layer.cmap];
  const [lo, hi] = layer.range;
  const span = hi - lo;
  const d = fig.image.data;
  for (let k = 0; k < scene.N; k++) {
    const p = k * 4;
    const v = vals[k];
    if (v !== v) {
      d[p + 3] = 0;
      continue;
    }
    const li = ((clamp((v - lo) / span, 0, 1) * 255) | 0) * 3;
    d[p] = lut[li];
    d[p + 1] = lut[li + 1];
    d[p + 2] = lut[li + 2];
    d[p + 3] = 255;
  }
  fig.fieldCtx.putImageData(fig.image, 0, 0);
}

function gridTicks(scene) {
  const B = scene.bounds;
  const lonStep = B.lonMax - B.lonMin >= 14 ? 5 : 2;
  const latStep = B.latMax - B.latMin >= 14 ? 5 : 2;
  const lon = [], lat = [];
  for (let v = Math.ceil(B.lonMin / lonStep) * lonStep; v <= B.lonMax; v += lonStep) lon.push(v);
  for (let v = Math.ceil(B.latMin / latStep) * latStep; v <= B.latMax; v += latStep) lat.push(v);
  return { lon, lat };
}

function drawGrid(ctx, fig, scene) {
  const P = fig.layout.plot;
  const { lon, lat } = gridTicks(scene);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (const v of lon) {
    const x = Math.round(fig.X(v)) + 0.5;
    ctx.moveTo(x, P.y);
    ctx.lineTo(x, P.y + P.h);
  }
  for (const v of lat) {
    const y = Math.round(fig.Y(v)) + 0.5;
    ctx.moveTo(P.x, y);
    ctx.lineTo(P.x + P.w, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPlaces(ctx, fig, scene) {
  const P = fig.layout.plot;
  ctx.save();
  ctx.font = `500 ${fig.layout.compact ? 9.5 : 11}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const pl of scene.storm.places) {
    const x = fig.X(pl.lon), y = fig.Y(pl.lat);
    if (x < P.x + 4 || x > P.x + P.w - 4 || y < P.y + 4 || y > P.y + P.h - 4) continue;
    const w = ctx.measureText(pl.name).width;
    const left = x + 6 + w > P.x + P.w - 4;
    ctx.fillStyle = '#23374b';
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = left ? 'right' : 'left';
    const tx = left ? x - 6 : x + 6;
    ctx.strokeStyle = 'rgba(236,241,245,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText(pl.name, tx, y);
    ctx.fillStyle = '#23374b';
    ctx.fillText(pl.name, tx, y);
  }
  ctx.restore();
}

function drawVectors(ctx, fig, scene, frame, layer) {
  const P = fig.layout.plot;
  const { nx, ny, mask } = scene;
  const { u, v } = frame;
  const cellPx = P.w / nx;
  const step = Math.max(2, Math.round((fig.layout.compact ? 20 : 26) / cellPx));
  const spacing = step * cellPx;
  const scale = spacing / 1.0; // px per (m/s): a 1 m/s current spans one arrow cell
  const cap = spacing * 1.9;
  const light = layer.arrow === 'light';

  const shafts = new Path2D();
  const dots = new Path2D();
  const off = Math.floor(step / 2);
  for (let j = off; j < ny; j += step) {
    for (let i = off; i < nx; i += step) {
      const k = j * nx + i;
      if (mask[k]) continue;
      const x = P.x + (i + 0.5) * cellPx;
      const y = P.y + (j + 0.5) * (P.h / ny);
      const uu = u[k], vv = v[k];
      const s = Math.hypot(uu, vv);
      if (s < 0.04) {
        dots.moveTo(x + 1.1, y);
        dots.arc(x, y, 1.1, 0, Math.PI * 2);
        continue;
      }
      const len = Math.min(s * scale, cap);
      const dx = (uu / s) * len, dy = (-vv / s) * len; // screen y points down
      const x0 = x - dx / 2, y0 = y - dy / 2, x1 = x + dx / 2, y1 = y + dy / 2;
      shafts.moveTo(x0, y0);
      shafts.lineTo(x1, y1);
      const hs = clamp(len * 0.34, 2.6, 6.5);
      const a = Math.atan2(dy, dx);
      shafts.moveTo(x1, y1);
      shafts.lineTo(x1 - hs * Math.cos(a - 0.5), y1 - hs * Math.sin(a - 0.5));
      shafts.moveTo(x1, y1);
      shafts.lineTo(x1 - hs * Math.cos(a + 0.5), y1 - hs * Math.sin(a + 0.5));
    }
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.9)' : 'rgba(14,26,42,0.85)';
  ctx.lineWidth = 1.25;
  ctx.stroke(shafts);
  ctx.fillStyle = light ? 'rgba(255,255,255,0.75)' : 'rgba(14,26,42,0.7)';
  ctx.fill(dots);
  ctx.restore();
}

function drawTrack(ctx, fig, scene, t) {
  const { dense, fixes, tLast } = scene;
  const tNow = clamp(t, 0, tLast);
  const now = stormAt(scene, tNow);
  const X = fig.X, Y = fig.Y;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Path still to come
  if (t < tLast) {
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const start = t <= 0 ? dense[0] : now;
    ctx.moveTo(X(start.lon), Y(start.lat));
    for (let i = Math.ceil(tNow); i < dense.length; i++) ctx.lineTo(X(dense[i].lon), Y(dense[i].lat));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Path already travelled, coloured by IMD category
  if (t > 0) {
    const pts = dense.slice(0, Math.floor(tNow) + 1);
    pts.push(now);
    ctx.strokeStyle = 'rgba(4,10,20,0.85)';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(X(p.lon), Y(p.lat)) : ctx.moveTo(X(p.lon), Y(p.lat))));
    ctx.stroke();

    ctx.lineWidth = 2.8;
    let i = 0;
    while (i < pts.length - 1) {
      const color = imdCategory(pts[i].vmax).color;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(X(pts[i].lon), Y(pts[i].lat));
      let j = i;
      while (j < pts.length - 1 && imdCategory(pts[j].vmax).color === color) {
        j++;
        ctx.lineTo(X(pts[j].lon), Y(pts[j].lat));
      }
      ctx.stroke();
      i = j;
    }
  }

  // Best-track fixes
  for (const f of fixes) {
    const x = X(f.lon), y = Y(f.lat);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    if (f.t <= t) {
      ctx.fillStyle = imdCategory(f.vmax).color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(4,10,20,0.9)';
      ctx.lineWidth = 1.2;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawStorm(ctx, fig, storm, t) {
  const P = fig.layout.plot;
  const x = fig.X(storm.lon), y = fig.Y(storm.lat);
  const cat = imdCategory(storm.vmax);
  const kmToPx = (km) => (km / KM_LAT) * (fig.Y(0) - fig.Y(1)); // Y(0)-Y(1) = px per degree

  ctx.save();
  // Gale-force wind radius (approximate, grows with intensity)
  if (storm.vmax >= 34) {
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, kmToPx(100 + 1.1 * storm.vmax), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Tropical-cyclone symbol, spinning counter-clockwise (N. Hemisphere)
  const r = 4 + storm.vmax / 28;
  ctx.translate(x, y);
  ctx.rotate(-t * 0.9);
  const glyph = new Path2D();
  glyph.moveTo(0, -r);
  glyph.bezierCurveTo(r * 1.3, -r * 1.05, r * 2.1, -r * 0.55, r * 2.3, r * 0.35);
  glyph.moveTo(0, r);
  glyph.bezierCurveTo(-r * 1.3, r * 1.05, -r * 2.1, r * 0.55, -r * 2.3, -r * 0.35);
  const ring = new Path2D();
  ring.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(4,10,20,0.9)';
  ctx.lineWidth = 5;
  ctx.stroke(glyph);
  ctx.stroke(ring);
  ctx.fillStyle = cat.color;
  ctx.fill(ring);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.3;
  ctx.stroke(glyph);
  ctx.stroke(ring);
  ctx.setTransform(fig.sx, 0, 0, fig.sy, 0, 0);

  // Label
  const label = `${cat.code}  ${Math.round(storm.vmax)} kt`;
  ctx.font = `600 ${fig.layout.compact ? 10 : 11.5}px ${FONT}`;
  const w = ctx.measureText(label).width + 14;
  const h = fig.layout.compact ? 18 : 21;
  let lx = x + r * 2.4 + 8;
  let ly = y - r * 2.4 - h;
  if (lx + w > P.x + P.w - 4) lx = x - r * 2.4 - 8 - w;
  if (ly < P.y + 4) ly = y + r * 2.4 + 4;
  ctx.fillStyle = 'rgba(6,14,28,0.86)';
  ctx.strokeStyle = cat.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(lx, ly, w, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, lx + 7, ly + h / 2 + 0.5);
  ctx.restore();
}

function drawHud(ctx, fig, scene, t, frame) {
  const L = fig.layout;
  if (L.compact) return;
  const P = L.plot;
  const { minSST, minTCHP } = frame.stats;
  const phase = t < 0 ? `Genesis in ${Math.ceil(-t)} h` : t <= scene.tLast ? `T+${Math.floor(t)} h since genesis` : 'Storm dissipated';
  const lines = [
    { text: `Cyclone ${scene.storm.name} ${scene.storm.year}`, font: `600 12.5px ${FONT}`, color: TITLE },
    { text: phase, font: `400 11px ${FONT}`, color: TEXT },
    { text: `Max SST cooling  ${minSST.toFixed(1).replace('-', '−')} °C`, font: `500 11px ${FONT}`, color: '#8fd8ff' },
    { text: `Max TCHP loss  ${minTCHP.toFixed(0).replace('-', '−')} kJ/cm²`, font: `500 11px ${FONT}`, color: '#8fd8ff' },
  ];
  ctx.save();
  let w = 0;
  for (const l of lines) {
    ctx.font = l.font;
    w = Math.max(w, ctx.measureText(l.text).width);
  }
  const bx = P.x + 10, by = P.y + 10, bw = w + 22, bh = 16 + lines.length * 17;
  ctx.fillStyle = 'rgba(6,14,28,0.82)';
  ctx.strokeStyle = 'rgba(0,200,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => {
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, bx + 11, by + 9 + i * 17);
  });
  ctx.restore();
}

function drawAxes(ctx, fig, scene) {
  const L = fig.layout, P = L.plot;
  const { lon, lat } = gridTicks(scene);
  ctx.save();
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 1;
  ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
  ctx.fillStyle = TEXT;
  ctx.font = `400 ${L.compact ? 10 : 11.5}px ${FONT}`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.beginPath();
  for (const v of lon) {
    const x = Math.round(fig.X(v)) + 0.5;
    ctx.moveTo(x, P.y + P.h);
    ctx.lineTo(x, P.y + P.h + 4);
    ctx.fillText(String(v), x, P.y + P.h + 7);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of lat) {
    const y = Math.round(fig.Y(v)) + 0.5;
    ctx.moveTo(P.x - 4, y);
    ctx.lineTo(P.x, y);
    ctx.fillText(String(v), P.x - 7, y);
  }
  ctx.stroke();

  ctx.font = `500 ${L.compact ? 10.5 : 12}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Longitude (°E)', P.x + P.w / 2, L.H - (L.compact ? 6 : 10));
  ctx.translate(Math.max(P.x - (L.compact ? 29 : 42), 10), P.y + P.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText('Latitude (°N)', 0, 0);
  ctx.restore();
}

function drawTitle(ctx, fig, scene, t, layer) {
  const L = fig.layout;
  const s = scene.storm;
  const title = L.compact
    ? `${layer.label} — ${s.name} — ${formatTime(scene, t)}`
    : `${layer.long} — Cyclone ${s.name} — ${formatTime(scene, t)}`;
  ctx.save();
  ctx.fillStyle = TITLE;
  ctx.font = `600 ${L.compact ? 12 : 15}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, L.plot.x + L.plot.w / 2, L.plot.y / 2 + 1);
  ctx.restore();
}

function drawColorbar(ctx, fig, layer) {
  const L = fig.layout, C = L.cbar;
  const [lo, hi] = layer.range;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(colorbarImage(fig, layer.cmap), C.x, C.y, C.w, C.h);
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 1;
  ctx.strokeRect(C.x + 0.5, C.y + 0.5, C.w - 1, C.h - 1);

  const { ticks, step } = ticksFor(lo, hi, 6);
  ctx.fillStyle = TEXT;
  ctx.font = `400 ${L.compact ? 9.5 : 11}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let maxW = 0;
  ctx.beginPath();
  for (const v of ticks) {
    const y = C.y + C.h - ((v - lo) / (hi - lo)) * C.h;
    ctx.moveTo(C.x + C.w, Math.round(y) + 0.5);
    ctx.lineTo(C.x + C.w + 4, Math.round(y) + 0.5);
    const label = fmtNum(v, step);
    maxW = Math.max(maxW, ctx.measureText(label).width);
    ctx.fillText(label, C.x + C.w + 7, y);
  }
  ctx.stroke();

  ctx.font = `500 ${L.compact ? 10 : 12}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.translate(C.x + C.w + 7 + maxW + (L.compact ? 10 : 14), C.y + C.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${layer.label} (${layer.unit})`, 0, 0);
  ctx.restore();
}