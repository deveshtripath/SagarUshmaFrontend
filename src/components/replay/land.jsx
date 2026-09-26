import { feature } from 'topojson-client';

// Natural Earth 1:50m land, bundled locally through the `world-atlas` package
// (no network request at runtime). Loaded lazily so it lands in its own chunk.
let landPromise = null;

export function loadLand() {
  if (!landPromise) {
    landPromise = import('world-atlas/land-50m.json').then((mod) => {
      const topo = mod.default ?? mod;
      const geo = feature(topo, topo.objects.land);
      const features = geo.type === 'FeatureCollection' ? geo.features : [geo];
      const rings = [];
      for (const f of features) {
        const g = f.geometry;
        if (!g) continue;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
        for (const poly of polys) for (const ring of poly) rings.push(ring);
      }
      return rings;
    });
  }
  return landPromise;
}

// Sutherland–Hodgman clip of one ring against one edge of a rectangle.
function clipEdge(ring, inside, cross) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ina = inside(a), inb = inside(b);
    if (ina) out.push(a);
    if (ina !== inb) out.push(cross(a, b));
  }
  return out;
}

function clipRingToRect(ring, x0, x1, y0, y1) {
  const lerpX = (a, b, x) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const lerpY = (a, b, y) => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  let r = ring;
  r = clipEdge(r, (p) => p[0] >= x0, (a, b) => lerpX(a, b, x0));
  if (r.length < 3) return r;
  r = clipEdge(r, (p) => p[0] <= x1, (a, b) => lerpX(a, b, x1));
  if (r.length < 3) return r;
  r = clipEdge(r, (p) => p[1] >= y0, (a, b) => lerpY(a, b, y0));
  if (r.length < 3) return r;
  r = clipEdge(r, (p) => p[1] <= y1, (a, b) => lerpY(a, b, y1));
  return r;
}

// Keep only the land inside the region (plus a margin), clipped so the huge
// continental rings don't cost thousands of off-screen vertices per frame.
export function clipRings(rings, b, margin = 1) {
  const X0 = b.lonMin - margin, X1 = b.lonMax + margin;
  const Y0 = b.latMin - margin, Y1 = b.latMax + margin;
  const out = [];
  for (const ring of rings) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of ring) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < X0 || x0 > X1 || y1 < Y0 || y0 > Y1) continue;
    const clipped = clipRingToRect(ring, X0, X1, Y0, Y1);
    if (clipped.length >= 3) out.push(clipped);
  }
  return out;
}

// Rasterise land onto the model grid: 1 = land, 0 = ocean.
export function rasterizeLand(rings, b, nx, ny, res) {
  const c = document.createElement('canvas');
  c.width = nx;
  c.height = ny;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.beginPath();
  for (const ring of rings) {
    ring.forEach(([lon, lat], k) => {
      const x = (lon - b.lonMin) / res;
      const y = (b.latMax - lat) / res;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
  ctx.fill('evenodd');
  const data = ctx.getImageData(0, 0, nx, ny).data;
  const mask = new Uint8Array(nx * ny);
  for (let k = 0; k < nx * ny; k++) mask[k] = data[k * 4 + 3] > 110 ? 1 : 0;
  return mask;
}