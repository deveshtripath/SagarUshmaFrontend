// Builds a replayable "scene" for one cyclone: a gridded upper-ocean state
// (TCHP, SST, D26, MLD, surface currents) that evolves as the storm crosses it.
//
// The fields are simulated from the best track with simple, physically-motivated
// rules so the page works without a gridded endpoint:
//   • pre-storm ocean = large-scale gradient + basin gyre + mesoscale eddies
//     (warm-core eddies carry deep warm pools, cold-core eddies shallow ones)
//   • cold wake = SST/TCHP loss and MLD deepening after the core passes,
//     biased to the right of track (N. Hemisphere), stronger for intense and
//     slow storms, weaker where the warm pool is deep
//   • currents = geostrophic eddy flow + storm-forced cyclonic flow +
//     near-inertial oscillations that keep rotating clockwise in the wake
//
// To plug in real model output, keep the scene shape (grid + computeFrame)
// and fill the arrays from your gridded API instead.

import { clipRings, rasterizeLand } from './land.jsx';

export const HOURS_PER_SECOND = 6; // playback rate at 1× (model hours per real second)

export const LAYERS = [
  { id: 'tchp',  label: 'TCHP',          long: 'Tropical cyclone heat potential', unit: 'kJ/cm²', cmap: 'turbo',   range: [0, 180],  arrow: 'light', digits: 0 },
  { id: 'dtchp', label: 'TCHP change',   long: 'TCHP change since pre-storm',     unit: 'kJ/cm²', cmap: 'balance', range: [-50, 50], arrow: 'dark',  digits: 0 },
  { id: 'sst',   label: 'SST',           long: 'Sea surface temperature',         unit: '°C',     cmap: 'turbo',   range: [26, 32],  arrow: 'light', digits: 1 },
  { id: 'd26',   label: 'D26',           long: 'Depth of the 26 °C isotherm',     unit: 'm',      cmap: 'viridis', range: [0, 160],  arrow: 'light', digits: 0 },
  { id: 'mld',   label: 'MLD',           long: 'Mixed layer depth',               unit: 'm',      cmap: 'viridis', range: [0, 80],   arrow: 'light', digits: 0 },
  { id: 'speed', label: 'Current speed', long: 'Surface current speed',           unit: 'm/s',    cmap: 'inferno', range: [0, 1.5],  arrow: 'light', digits: 2 },
];

export const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

const RES = 0.2; // grid spacing, degrees
const G = 9.81;
const OMEGA = 7.2921e-5;
const KM_LAT = 110.57;
const D2R = Math.PI / 180;
const kmLon = (lat) => 111.32 * Math.cos(lat * D2R);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function catmullRom(a, b, c, d, f) {
  const f2 = f * f, f3 = f2 * f;
  return 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f2 + (-a + 3 * b - 3 * c + d) * f3);
}

// Hourly track: smooth positions, linear intensity, heading + translation speed.
function densifyTrack(fixes) {
  const n = fixes.length;
  const tLast = fixes[n - 1].t;
  const out = [];
  let k = 0;
  for (let t = 0; t <= tLast + 1e-6; t += 1) {
    while (k < n - 2 && fixes[k + 1].t < t) k++;
    const p0 = fixes[Math.max(k - 1, 0)], p1 = fixes[k], p2 = fixes[k + 1], p3 = fixes[Math.min(k + 2, n - 1)];
    const f = clamp((t - p1.t) / (p2.t - p1.t), 0, 1);
    out.push({
      t,
      lat: catmullRom(p0.lat, p1.lat, p2.lat, p3.lat, f),
      lon: catmullRom(p0.lon, p1.lon, p2.lon, p3.lon, f),
      vmax: p1.vmax + (p2.vmax - p1.vmax) * f,
    });
  }
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(i - 1, 0)], b = out[Math.min(i + 1, out.length - 1)];
    const dx = (b.lon - a.lon) * kmLon((a.lat + b.lat) / 2);
    const dy = (b.lat - a.lat) * KM_LAT;
    out[i].heading = Math.atan2(dy, dx); // math angle, east = 0
    out[i].trans = Math.hypot(dx, dy) / Math.max(b.t - a.t, 1) / 3.6; // m/s
  }
  return out;
}

// Separable box blur of the land mask → 0..1 "near the coast" factor.
function coastFactor(mask, nx, ny, r) {
  let a = Float32Array.from(mask);
  const tmp = new Float32Array(nx * ny);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        let s = 0, c = 0;
        for (let d = -r; d <= r; d++) {
          const ii = i + d;
          if (ii < 0 || ii >= nx) continue;
          s += a[j * nx + ii];
          c++;
        }
        tmp[j * nx + i] = s / c;
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        let s = 0, c = 0;
        for (let d = -r; d <= r; d++) {
          const jj = j + d;
          if (jj < 0 || jj >= ny) continue;
          s += tmp[jj * nx + i];
          c++;
        }
        a[j * nx + i] = s / c;
      }
    }
  }
  return a;
}

// Cold-wake response at one location, `tau` hours after the core passed.
// Shared by the grid and by point samples so both always agree.
function wakeTerms(aS, aT, aM, aD, tau, o) {
  if (tau < -8) {
    o.dS = o.dT = o.dM = o.dD = 0;
    o.ramp = 0;
    return o;
  }
  const ramp = 1 / (1 + Math.exp(-tau / 3));
  const after = tau > 0 ? tau : 0;
  const recS = Math.exp(-after / 288); // SST recovers over ~12 days
  const recT = Math.exp(-after / 600); // subsurface heat over ~25 days
  o.dS = -4.2 * (1 - Math.exp(-aS)) * ramp * recS;
  o.dT = -55 * (1 - Math.exp(-aT)) * ramp * recT;
  o.dM = 35 * (1 - Math.exp(-aM)) * ramp * recT;
  o.dD = -20 * aD * ramp * recT;
  o.ramp = ramp;
  return o;
}

// Closest approach of the track to a point → wake amplitudes for that point.
function passInfo(dense, lat, lon, tchpPre) {
  const kx = kmLon(lat);
  let best = Infinity, bi = 0, bdx = 0, bdy = 0;
  for (let s = 0; s < dense.length; s++) {
    const dx = (lon - dense[s].lon) * kx;
    const dy = (lat - dense[s].lat) * KM_LAT;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; bi = s; bdx = dx; bdy = dy; }
  }
  const s = dense[bi];
  const dist = Math.sqrt(best);
  const cross = Math.cos(s.heading) * bdy - Math.sin(s.heading) * bdx; // > 0 → left of track
  const d = cross > 0 ? -dist : dist; // signed, right of track positive
  const vp = s.vmax;
  const Rw = 70 + 0.9 * vp; // wake half-width, km
  const W = Math.exp(-(((d - 0.3 * Rw) / Rw) ** 2)); // right-biased
  const Wc = Math.exp(-((d / (0.45 * Rw)) ** 2)); // under the core
  const I = clamp((vp - 20) / 100, 0, 1.2); // intensity factor
  const Ts = clamp(4.5 / Math.max(s.trans, 1.2), 0.6, 2.0); // slow storms cool more
  const resist = clamp(tchpPre / 110, 0.6, 1.4); // deep warm pools resist cooling
  return {
    tp: s.t,
    aS: (I * Ts * W) / resist,
    aT: (I * Ts * W) / Math.sqrt(resist),
    aM: I * Ts * W,
    aD: I * Wc,
    aIn: Math.min(1.0, 0.85 * I * Math.sqrt(Ts) * W),
    phi0: s.heading + (d >= 0 ? 0 : Math.PI),
    active: W > 0.01 || Wc > 0.01,
  };
}

export function buildScene(storm, landRings) {
  const B = storm.bounds;
  const nx = Math.round((B.lonMax - B.lonMin) / RES);
  const ny = Math.round((B.latMax - B.latMin) / RES);
  const N = nx * ny;
  const lons = new Float32Array(nx);
  const lats = new Float32Array(ny);
  for (let i = 0; i < nx; i++) lons[i] = B.lonMin + (i + 0.5) * RES;
  for (let j = 0; j < ny; j++) lats[j] = B.latMax - (j + 0.5) * RES; // row 0 = north

  const rings = clipRings(landRings, B);
  const mask = rasterizeLand(rings, B, nx, ny, RES);
  const coast = coastFactor(mask, nx, ny, 4);
  const rand = mulberry32(hashStr(storm.id));

  // ── Time axis: hours since the first fix ────────────────────────────────
  const epoch = Date.parse(storm.track[0][0]);
  const fixes = storm.track.map(([iso, lat, lon, vmax]) => ({ t: (Date.parse(iso) - epoch) / 3.6e6, lat, lon, vmax }));
  const tLast = fixes[fixes.length - 1].t;
  const dense = densifyTrack(fixes);

  // ── Mesoscale eddies (SSH anomalies, metres) ────────────────────────────
  const isOpenOcean = (lat, lon) => {
    const i = Math.floor((lon - B.lonMin) / RES);
    const j = Math.floor((B.latMax - lat) / RES);
    if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
    return !mask[j * nx + i] && coast[j * nx + i] < 0.3;
  };
  const eddies = [];
  const addEddies = (count, rMin, rMax, aMin, aMax) => {
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 40) {
      const lat = B.latMin + 0.5 + rand() * (B.latMax - B.latMin - 1);
      const lon = B.lonMin + 0.5 + rand() * (B.lonMax - B.lonMin - 1);
      if (!isOpenOcean(lat, lon)) continue;
      const R = rMin + rand() * (rMax - rMin);
      const A = (rand() < 0.55 ? 1 : -1) * (aMin + rand() * (aMax - aMin));
      eddies.push({ lat, lon, R, A, kx: kmLon(lat) });
      placed++;
    }
  };
  addEddies(16, 80, 150, 0.08, 0.22); // large eddies
  addEddies(60, 25, 60, 0.02, 0.06); // small eddies → filament texture
  const gy = storm.season.gyre;
  if (gy) eddies.push({ lat: gy.lat, lon: gy.lon, R: gy.R, A: gy.A, kx: kmLon(gy.lat) });

  const h = new Float32Array(N);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let s = 0;
      for (const e of eddies) {
        const dx = (lons[i] - e.lon) * e.kx;
        const dy = (lats[j] - e.lat) * KM_LAT;
        const r2 = dx * dx + dy * dy;
        const R2 = e.R * e.R;
        if (r2 < 9 * R2) s += e.A * Math.exp(-r2 / R2);
      }
      h[j * nx + i] = s;
    }
  }

  // ── Geostrophic currents from SSH (central differences) ─────────────────
  // f-plane at 15°N keeps eddy speeds realistic (0.3–0.6 m/s) near the equator
  const ug = new Float32Array(N), vg = new Float32Array(N);
  const gf = G / (2 * OMEGA * Math.sin(15 * D2R));
  for (let j = 0; j < ny; j++) {
    const lat = lats[j];
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (mask[k]) continue;
      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, nx - 1);
      const jn = Math.max(j - 1, 0), js = Math.min(j + 1, ny - 1);
      const dxm = (ir - il) * RES * kmLon(lat) * 1000;
      const dym = (js - jn) * RES * KM_LAT * 1000;
      const dhdx = (h[j * nx + ir] - h[j * nx + il]) / dxm;
      const dhdy = (h[jn * nx + i] - h[js * nx + i]) / dym; // north minus south
      ug[k] = -gf * dhdy;
      vg[k] = gf * dhdx;
    }
  }

  // ── Pre-storm upper ocean ────────────────────────────────────────────────
  const S = storm.season;
  const latC = (B.latMin + B.latMax) / 2, lonC = (B.lonMin + B.lonMax) / 2;
  const tchpPre = new Float32Array(N), sstPre = new Float32Array(N);
  const d26Pre = new Float32Array(N), mldPre = new Float32Array(N);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (mask[k]) {
        tchpPre[k] = sstPre[k] = d26Pre[k] = mldPre[k] = NaN;
        continue;
      }
      const base = S.tchp0 + S.gLat * (lats[j] - latC) + S.gLon * (lons[i] - lonC);
      const tchp = Math.max(0, (base + 190 * h[k]) * (1 - 0.7 * coast[k])); // shallow shelves hold little heat
      tchpPre[k] = tchp;
      d26Pre[k] = S.d26Base + 0.6 * tchp;
      sstPre[k] = S.sst0 + 0.011 * (tchp - S.tchp0) + 0.8 * h[k];
      mldPre[k] = Math.max(8, S.mld0 + 0.07 * (tchp - S.tchp0) + 25 * h[k]);
    }
  }

  // ── Where and when the storm passed each ocean cell ─────────────────────
  const tp = new Float32Array(N), aS = new Float32Array(N), aT = new Float32Array(N);
  const aM = new Float32Array(N), aD = new Float32Array(N), aIn = new Float32Array(N);
  const phi0 = new Float32Array(N), fcor = new Float32Array(N), active = new Uint8Array(N);
  for (let j = 0; j < ny; j++) {
    const f = 2 * OMEGA * Math.sin(lats[j] * D2R);
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (mask[k]) continue;
      const p = passInfo(dense, lats[j], lons[i], tchpPre[k]);
      if (!p.active) continue;
      active[k] = 1;
      tp[k] = p.tp; aS[k] = p.aS; aT[k] = p.aT; aM[k] = p.aM; aD[k] = p.aD;
      aIn[k] = p.aIn; phi0[k] = p.phi0; fcor[k] = f;
    }
  }

  const scene = {
    storm, bounds: B, res: RES, nx, ny, N, lons, lats, mask, rings,
    epoch, fixes, dense, tLast, tStart: -12, tEnd: tLast + 36,
    tchpPre, sstPre, d26Pre, mldPre, ug, vg,
    wake: { tp, aS, aT, aM, aD, aIn, phi0, fcor, active },
    buf: { vals: new Float32Array(N), u: new Float32Array(N), v: new Float32Array(N) },
  };
  scene.series = buildSeries(scene);
  return scene;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function stormAt(scene, t) {
  const { dense, tLast } = scene;
  if (t < 0 || t > tLast) return null;
  const i0 = Math.min(Math.floor(t), dense.length - 1);
  const i1 = Math.min(i0 + 1, dense.length - 1);
  const f = t - i0;
  const a = dense[i0], b = dense[i1];
  return {
    t,
    lat: a.lat + (b.lat - a.lat) * f,
    lon: a.lon + (b.lon - a.lon) * f,
    vmax: a.vmax + (b.vmax - a.vmax) * f,
    heading: a.heading,
    trans: a.trans + (b.trans - a.trans) * f,
  };
}

// Bilinear sample of the pre-storm fields (null over land).
export function samplePre(scene, lat, lon) {
  const { bounds: B, res, nx, ny } = scene;
  const gx = (lon - B.lonMin) / res - 0.5;
  const gy = (B.latMax - lat) / res - 0.5;
  const i0 = Math.floor(gx), j0 = Math.floor(gy);
  const fx = gx - i0, fy = gy - j0;
  const acc = { tchp: 0, sst: 0, d26: 0, mld: 0 };
  let wsum = 0;
  for (let dj = 0; dj <= 1; dj++) {
    for (let di = 0; di <= 1; di++) {
      const i = clamp(i0 + di, 0, nx - 1), j = clamp(j0 + dj, 0, ny - 1);
      const k = j * nx + i;
      if (scene.mask[k]) continue;
      const w = (di ? fx : 1 - fx) * (dj ? fy : 1 - fy);
      acc.tchp += w * scene.tchpPre[k];
      acc.sst += w * scene.sstPre[k];
      acc.d26 += w * scene.d26Pre[k];
      acc.mld += w * scene.mldPre[k];
      wsum += w;
    }
  }
  if (wsum < 0.25) return null;
  return { tchp: acc.tchp / wsum, sst: acc.sst / wsum, d26: acc.d26 / wsum, mld: acc.mld / wsum };
}

// Full ocean state at a point and time (pre-storm + wake). Null over land.
export function sampleAt(scene, lat, lon, t) {
  const pre = samplePre(scene, lat, lon);
  if (!pre) return null;
  const p = passInfo(scene.dense, lat, lon, pre.tchp);
  const o = wakeTerms(p.aS, p.aT, p.aM, p.aD, t - p.tp, {});
  return {
    pre,
    tchp: Math.max(0, pre.tchp + o.dT),
    sst: pre.sst + o.dS,
    d26: pre.d26 + o.dD,
    mld: pre.mld + o.dM,
  };
}

function buildSeries(scene) {
  const out = [];
  for (let t = 0; t <= scene.tLast + 1e-6; t += 3) {
    const s = stormAt(scene, t);
    const st = sampleAt(scene, s.lat, s.lon, scene.tEnd);
    const r1 = (x) => Math.round(x * 10) / 10;
    out.push({
      t,
      vmax: Math.round(s.vmax),
      tchpPre: st ? r1(st.pre.tchp) : null,
      tchpPost: st ? r1(st.tchp) : null,
      d26: st ? r1(st.pre.d26) : null,
      mld: st ? r1(st.pre.mld) : null,
      mldPost: st ? r1(st.mld) : null,
      sstPre: st ? r1(st.pre.sst) : null,
      sstPost: st ? r1(st.sst) : null,
    });
  }
  return out;
}

// ── Per-frame field ─────────────────────────────────────────────────────────

const scratch = {};

export function computeFrame(scene, t, layerId, wantUV) {
  const { N, mask, buf, wake, tchpPre, sstPre, d26Pre, mldPre, ug, vg } = scene;
  const { vals, u, v } = buf;
  const needUV = wantUV || layerId === 'speed';
  let minSST = 0, minTCHP = 0, maxMLD = 0;

  for (let k = 0; k < N; k++) {
    if (mask[k]) {
      vals[k] = NaN;
      u[k] = 0;
      v[k] = 0;
      continue;
    }
    let dS = 0, dT = 0, dM = 0, dD = 0, ui = 0, vi = 0;
    if (wake.active[k]) {
      const tau = t - wake.tp[k];
      const o = wakeTerms(wake.aS[k], wake.aT[k], wake.aM[k], wake.aD[k], tau, scratch);
      dS = o.dS; dT = o.dT; dM = o.dM; dD = o.dD;
      if (needUV && tau > 0 && wake.aIn[k] > 0.02) {
        // near-inertial currents: rotate clockwise at the local inertial frequency
        const A = wake.aIn[k] * o.ramp * Math.exp(-tau / 60);
        const th = wake.phi0[k] - wake.fcor[k] * tau * 3600;
        ui = A * Math.cos(th);
        vi = A * Math.sin(th);
      }
      if (dS < minSST) minSST = dS;
      if (dT < minTCHP) minTCHP = dT;
      if (dM > maxMLD) maxMLD = dM;
    }
    if (needUV) {
      u[k] = ug[k] + ui;
      v[k] = vg[k] + vi;
    }
    switch (layerId) {
      case 'tchp': vals[k] = Math.max(0, tchpPre[k] + dT); break;
      case 'dtchp': vals[k] = dT; break;
      case 'sst': vals[k] = sstPre[k] + dS; break;
      case 'd26': vals[k] = d26Pre[k] + dD; break;
      case 'mld': vals[k] = mldPre[k] + dM; break;
      default: break;
    }
  }

  const storm = stormAt(scene, t);
  if (needUV && storm) addStormCurrents(scene, storm, u, v);

  if (layerId === 'speed') {
    for (let k = 0; k < N; k++) vals[k] = mask[k] ? NaN : Math.hypot(u[k], v[k]);
  }

  return { vals, u, v, storm, stats: { minSST, minTCHP, maxMLD } };
}

// Wind-forced surface currents around the storm: cyclonic, turned ~25° to the
// right of the wind (Ekman), stronger on the right-hand side of the track.
function addStormCurrents(scene, storm, u, v) {
  const { nx, ny, lons, lats, mask, bounds: B, res } = scene;
  const Vpk = 0.011 * storm.vmax;
  const Rm = 40, Rout = 700;
  const kx = kmLon(storm.lat);
  const hx = Math.cos(storm.heading), hy = Math.sin(storm.heading);
  const c = Math.cos(25 * D2R), s = Math.sin(25 * D2R);
  const reach = Rout * 1.3;
  const i0 = clamp(Math.floor((storm.lon - reach / kx - B.lonMin) / res), 0, nx - 1);
  const i1 = clamp(Math.ceil((storm.lon + reach / kx - B.lonMin) / res), 0, nx - 1);
  const j0 = clamp(Math.floor((B.latMax - storm.lat - reach / KM_LAT) / res), 0, ny - 1);
  const j1 = clamp(Math.ceil((B.latMax - storm.lat + reach / KM_LAT) / res), 0, ny - 1);
  for (let j = j0; j <= j1; j++) {
    const dy = (lats[j] - storm.lat) * KM_LAT;
    for (let i = i0; i <= i1; i++) {
      const k = j * nx + i;
      if (mask[k]) continue;
      const dx = (lons[i] - storm.lon) * kx;
      const r = Math.hypot(dx, dy);
      if (r < 1 || r > reach) continue;
      const prof = r < Rm ? r / Rm : Math.pow(Rm / r, 0.55) * Math.exp(-((r / Rout) ** 2));
      const asym = 1 + 0.3 * ((dx * hy - dy * hx) / r);
      const sp = Vpk * prof * asym;
      const tx = -dy / r, ty = dx / r; // counter-clockwise tangent
      u[k] += sp * (tx * c + ty * s);
      v[k] += sp * (-tx * s + ty * c);
    }
  }
}

export function formatTime(scene, t, withMinutes = false) {
  const d = new Date(scene.epoch + t * 3.6e6);
  const p = (n) => String(n).padStart(2, '0');
  const hh = withMinutes ? `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : `${p(d.getUTCHours())}:00`;
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${hh} UTC`;
}