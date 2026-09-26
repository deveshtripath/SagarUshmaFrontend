const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://sagarushma.onrender.com';

export async function fetchPrediction({ latitude, longitude, date }) {
  const res = await fetch(`${API_BASE}/api/predict/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude, date }),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const d = await res.json(); if (d?.error) message = d.error; } catch {}
    throw new Error(message);
  }
  return res.json();
}

// ── Cyclone tracks ────────────────────────────────────────────────────────────
// Real IBTrACS-derived simplified tracks (Bay of Bengal)
export const CYCLONE_TRACKS = {
  amphan_2020: {
    name: 'Amphan 2020',
    color: '#ff4444',
    peak_cat: 'ESCS',
    year: 2020,
    description: 'Extremely Severe Cyclonic Storm — Bay of Bengal',
    points: [
      { date: '2020-05-16', lat: 8.0,  lng: 86.5, intensity: 35 },
      { date: '2020-05-17', lat: 9.5,  lng: 86.0, intensity: 55 },
      { date: '2020-05-18', lat: 11.5, lng: 85.5, intensity: 95 },
      { date: '2020-05-19', lat: 13.5, lng: 87.0, intensity: 140 },
      { date: '2020-05-20', lat: 16.5, lng: 87.5, intensity: 160 },
      { date: '2020-05-20', lat: 19.0, lng: 88.5, intensity: 130 },
      { date: '2020-05-20', lat: 21.6, lng: 88.2, intensity: 90 },
    ],
  },
  mocha_2023: {
    name: 'Mocha 2023',
    color: '#ff9500',
    peak_cat: 'ESCS',
    year: 2023,
    description: 'Extremely Severe Cyclonic Storm — BoB → Myanmar',
    points: [
      { date: '2023-05-09', lat: 10.0, lng: 86.0, intensity: 40 },
      { date: '2023-05-10', lat: 11.5, lng: 87.0, intensity: 65 },
      { date: '2023-05-11', lat: 13.0, lng: 88.0, intensity: 110 },
      { date: '2023-05-12', lat: 14.5, lng: 90.0, intensity: 155 },
      { date: '2023-05-13', lat: 16.0, lng: 92.0, intensity: 175 },
      { date: '2023-05-14', lat: 18.5, lng: 93.5, intensity: 130 },
      { date: '2023-05-14', lat: 20.2, lng: 92.9, intensity: 60 },
    ],
  },
  biparjoy_2023: {
    name: 'Biparjoy 2023',
    color: '#00c8ff',
    peak_cat: 'ESCS',
    year: 2023,
    description: 'Extremely Severe Cyclonic Storm — Arabian Sea',
    points: [
      { date: '2023-06-06', lat: 14.5, lng: 65.0, intensity: 45 },
      { date: '2023-06-08', lat: 14.0, lng: 62.0, intensity: 85 },
      { date: '2023-06-10', lat: 15.0, lng: 60.0, intensity: 125 },
      { date: '2023-06-12', lat: 17.5, lng: 61.5, intensity: 140 },
      { date: '2023-06-14', lat: 19.0, lng: 63.0, intensity: 115 },
      { date: '2023-06-15', lat: 21.0, lng: 65.0, intensity: 90 },
      { date: '2023-06-15', lat: 23.5, lng: 67.5, intensity: 55 },
    ],
  },
  remal_2024: {
    name: 'Remal 2024',
    color: '#a78bfa',
    peak_cat: 'SCS',
    year: 2024,
    description: 'Severe Cyclonic Storm — BoB → Bangladesh/Myanmar',
    points: [
      { date: '2024-05-24', lat: 14.0, lng: 88.5, intensity: 40 },
      { date: '2024-05-25', lat: 16.0, lng: 88.0, intensity: 75 },
      { date: '2024-05-26', lat: 18.5, lng: 88.5, intensity: 95 },
      { date: '2024-05-27', lat: 21.0, lng: 89.0, intensity: 75 },
      { date: '2024-05-27', lat: 22.8, lng: 89.6, intensity: 45 },
    ],
  },
};

// Mock ocean condition synthesis along track for demo
export function synthesizeTrackConditions(track) {
  return track.points.map((pt, i) => {
    // TCHP: Tropical Cyclone Heat Potential (kJ/cm²) — warm pool simulation
    const sst = 28.5 + Math.sin(i * 0.7) * 1.5 + Math.random() * 0.4;
    const tchp = Math.max(0, (sst - 26) * 8.5 + Math.random() * 5);
    const d26 = 60 + tchp * 0.8 + Math.random() * 10; // Depth of 26°C isotherm (m)
    const mld = 20 + Math.random() * 15;               // Mixed Layer Depth (m)
    return {
      ...pt,
      sst: +sst.toFixed(2),
      sss: +(34.5 + Math.random() * 0.8).toFixed(2),
      tchp: +tchp.toFixed(1),
      d26: +d26.toFixed(1),
      mld: +mld.toFixed(1),
    };
  });
}

// Mock ARGO uncertainty field for advisory
export function generateArgoField(centerLat, centerLng, nPoints = 180) {
  const pts = [];
  for (let i = 0; i < nPoints; i++) {
    const lat = centerLat - 8 + Math.random() * 16;
    const lng = centerLng - 8 + Math.random() * 16;
    // uncertainty is higher far from existing floats
    const sigma = 0.3 + Math.abs(Math.sin(lat * 0.4) * Math.cos(lng * 0.3)) * 0.65;
    pts.push({ lat: +lat.toFixed(3), lng: +lng.toFixed(3), sigma: +sigma.toFixed(3) });
  }
  // Advisory = argmax sigma
  pts.sort((a, b) => b.sigma - a.sigma);
  return pts;
}

// Mock subsurface MHW profiles
export function generateMhwProfiles(lat, lng) {
  const depths = [0, 10, 20, 30, 50, 75, 100, 150, 200, 300];
  const clim = [28.0, 27.8, 27.0, 26.0, 24.0, 21.0, 18.0, 13.0, 10.5, 7.0];
  const days = 14;
  const series = [];
  for (let d = 0; d < days; d++) {
    const profile = depths.map((dep, i) => {
      const anomaly = 1.8 * Math.exp(-dep / 80) * Math.max(0, Math.sin(d * 0.45));
      return { depth: dep, temp: +(clim[i] + anomaly + (Math.random() - 0.5) * 0.3).toFixed(2) };
    });
    series.push({ day: d + 1, profile });
  }
  return { depths, clim, series };
}

// Mock attribution data for modality maps
export function generateAttribution(lat, lng, date) {
  const modalities = ['SST', 'SSS', 'SSH', 'U_curr', 'V_curr'];
  const depths = [0, 10, 25, 50, 75, 100, 150, 200];
  return depths.map(dep => {
    const base = [0.3, 0.1, 0.2, 0.2, 0.2];
    // SSS dominates in shallow BoB freshwater cap
    if (dep < 30) base[1] += 0.25 * (1 - dep / 30);
    // SSH becomes important mid-depth
    if (dep > 50 && dep < 150) base[2] += 0.2;
    const sum = base.reduce((a, b) => a + b, 0);
    const norm = base.map(v => +(v / sum).toFixed(3));
    return { depth: dep, attributions: Object.fromEntries(modalities.map((m, i) => [m, norm[i]])) };
  });
}
