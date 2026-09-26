// Approximate best tracks for the replay (IMD 3-minute sustained winds, knots).
// Positions and intensities are close to the IMD / IBTrACS best tracks but
// hand-thinned to 6–24 h fixes. For publication-grade work, replace `track`
// with the exact IBTrACS rows: [ISO time UTC, lat °N, lon °E, vmax kt].

export const STORMS = {
  amphan_2020: {
    id: 'amphan_2020',
    name: 'Amphan',
    year: 2020,
    basin: 'Bay of Bengal',
    peak: 'SuCS',
    landfall: 'Sundarbans, West Bengal',
    bounds: { latMin: 6, latMax: 26, lonMin: 78, lonMax: 98 },
    // Pre-storm upper ocean (May, record-warm Bay of Bengal)
    season: { tchp0: 112, gLat: -1.6, gLon: 0.4, sst0: 31.0, mld0: 18, d26Base: 30,
              gyre: { lat: 14, lon: 87.5, R: 520, A: 0.12 } },
    places: [
      { name: 'Kolkata', lat: 22.57, lon: 88.36 },
      { name: 'Dhaka', lat: 23.81, lon: 90.41 },
      { name: 'Bhubaneswar', lat: 20.3, lon: 85.82 },
      { name: 'Visakhapatnam', lat: 17.69, lon: 83.22 },
      { name: 'Chennai', lat: 13.08, lon: 80.27 },
      { name: 'Port Blair', lat: 11.62, lon: 92.73 },
    ],
    track: [
      ['2020-05-16T00:00:00Z', 10.4, 87.0, 25],
      ['2020-05-16T12:00:00Z', 10.9, 86.4, 35],
      ['2020-05-17T00:00:00Z', 11.4, 86.1, 55],
      ['2020-05-17T12:00:00Z', 12.0, 86.3, 85],
      ['2020-05-18T00:00:00Z', 12.8, 86.4, 120],
      ['2020-05-18T12:00:00Z', 13.8, 86.5, 130],
      ['2020-05-19T00:00:00Z', 15.3, 86.7, 125],
      ['2020-05-19T12:00:00Z', 17.2, 87.1, 110],
      ['2020-05-20T00:00:00Z', 19.2, 87.6, 100],
      ['2020-05-20T10:00:00Z', 21.6, 88.3, 85],
      ['2020-05-21T00:00:00Z', 23.6, 89.1, 40],
      ['2020-05-21T12:00:00Z', 25.0, 89.6, 25],
    ],
  },

  mocha_2023: {
    id: 'mocha_2023',
    name: 'Mocha',
    year: 2023,
    basin: 'Bay of Bengal',
    peak: 'ESCS',
    landfall: 'near Sittwe, Myanmar',
    bounds: { latMin: 6, latMax: 26, lonMin: 80, lonMax: 100 },
    season: { tchp0: 115, gLat: -1.4, gLon: 0.5, sst0: 30.8, mld0: 20, d26Base: 32,
              gyre: { lat: 14, lon: 88, R: 520, A: 0.12 } },
    places: [
      { name: 'Sittwe', lat: 20.15, lon: 92.9 },
      { name: "Cox's Bazar", lat: 21.43, lon: 92.01 },
      { name: 'Kolkata', lat: 22.57, lon: 88.36 },
      { name: 'Yangon', lat: 16.84, lon: 96.17 },
      { name: 'Port Blair', lat: 11.62, lon: 92.73 },
      { name: 'Visakhapatnam', lat: 17.69, lon: 83.22 },
    ],
    track: [
      ['2023-05-11T00:00:00Z', 10.6, 88.1, 25],
      ['2023-05-11T12:00:00Z', 11.6, 88.0, 35],
      ['2023-05-12T00:00:00Z', 12.6, 87.8, 55],
      ['2023-05-12T12:00:00Z', 13.8, 87.8, 75],
      ['2023-05-13T00:00:00Z', 15.0, 88.3, 95],
      ['2023-05-13T12:00:00Z', 16.4, 89.4, 110],
      ['2023-05-14T00:00:00Z', 18.2, 91.0, 115],
      ['2023-05-14T08:00:00Z', 20.1, 92.8, 105],
      ['2023-05-14T18:00:00Z', 21.8, 93.8, 50],
      ['2023-05-15T06:00:00Z', 23.2, 94.4, 25],
    ],
  },

  biparjoy_2023: {
    id: 'biparjoy_2023',
    name: 'Biparjoy',
    year: 2023,
    basin: 'Arabian Sea',
    peak: 'ESCS',
    landfall: 'near Jakhau Port, Gujarat',
    bounds: { latMin: 8, latMax: 28, lonMin: 56, lonMax: 76 },
    // June Arabian Sea: warm east, upwelling-cooled west
    season: { tchp0: 88, gLat: -1.0, gLon: 1.8, sst0: 30.0, mld0: 24, d26Base: 28,
              gyre: { lat: 15, lon: 66, R: 480, A: 0.07 } },
    places: [
      { name: 'Karachi', lat: 24.86, lon: 67.01 },
      { name: 'Jakhau', lat: 23.22, lon: 68.72 },
      { name: 'Porbandar', lat: 21.64, lon: 69.6 },
      { name: 'Mumbai', lat: 19.08, lon: 72.88 },
      { name: 'Goa', lat: 15.5, lon: 73.83 },
      { name: 'Muscat', lat: 23.59, lon: 58.41 },
    ],
    track: [
      ['2023-06-06T00:00:00Z', 11.6, 66.0, 25],
      ['2023-06-06T12:00:00Z', 12.2, 66.1, 40],
      ['2023-06-07T00:00:00Z', 12.9, 66.2, 70],
      ['2023-06-07T12:00:00Z', 13.4, 66.4, 80],
      ['2023-06-08T00:00:00Z', 14.0, 66.6, 85],
      ['2023-06-09T00:00:00Z', 15.0, 67.1, 85],
      ['2023-06-10T00:00:00Z', 16.0, 67.3, 95],
      ['2023-06-11T00:00:00Z', 17.3, 67.4, 105],
      ['2023-06-12T00:00:00Z', 19.2, 67.4, 95],
      ['2023-06-13T00:00:00Z', 20.9, 67.0, 85],
      ['2023-06-14T00:00:00Z', 21.8, 66.9, 75],
      ['2023-06-15T00:00:00Z', 22.5, 67.6, 65],
      ['2023-06-15T15:00:00Z', 23.3, 68.5, 60],
      ['2023-06-16T06:00:00Z', 24.3, 70.2, 30],
    ],
  },

  remal_2024: {
    id: 'remal_2024',
    name: 'Remal',
    year: 2024,
    basin: 'Bay of Bengal',
    peak: 'SCS',
    landfall: 'Sagar Island – Khepupara coast',
    bounds: { latMin: 10, latMax: 26, lonMin: 81, lonMax: 97 },
    season: { tchp0: 106, gLat: -1.5, gLon: 0.4, sst0: 30.9, mld0: 18, d26Base: 30,
              gyre: { lat: 15, lon: 88, R: 500, A: 0.11 } },
    places: [
      { name: 'Kolkata', lat: 22.57, lon: 88.36 },
      { name: 'Khulna', lat: 22.85, lon: 89.54 },
      { name: 'Dhaka', lat: 23.81, lon: 90.41 },
      { name: 'Chittagong', lat: 22.36, lon: 91.78 },
      { name: 'Bhubaneswar', lat: 20.3, lon: 85.82 },
      { name: 'Visakhapatnam', lat: 17.69, lon: 83.22 },
    ],
    track: [
      ['2024-05-24T12:00:00Z', 15.2, 89.0, 25],
      ['2024-05-25T00:00:00Z', 16.4, 89.2, 30],
      ['2024-05-25T12:00:00Z', 17.8, 89.3, 40],
      ['2024-05-26T00:00:00Z', 19.3, 89.3, 55],
      ['2024-05-26T12:00:00Z', 20.8, 89.2, 60],
      ['2024-05-26T18:00:00Z', 21.7, 89.2, 60],
      ['2024-05-27T06:00:00Z', 22.9, 89.6, 40],
      ['2024-05-27T18:00:00Z', 23.9, 90.5, 25],
    ],
  },
};

// IMD intensity scale (knots, 3-minute sustained wind)
export const IMD_CATS = [
  { code: 'D',    name: 'Depression',                    min: 17,  color: '#9cc2ff' },
  { code: 'DD',   name: 'Deep Depression',               min: 28,  color: '#5ed3ff' },
  { code: 'CS',   name: 'Cyclonic Storm',                min: 34,  color: '#4cf0c2' },
  { code: 'SCS',  name: 'Severe Cyclonic Storm',         min: 48,  color: '#ffe35a' },
  { code: 'VSCS', name: 'Very Severe Cyclonic Storm',    min: 64,  color: '#ffa13d' },
  { code: 'ESCS', name: 'Extremely Severe Cyclonic Storm', min: 90, color: '#ff5246' },
  { code: 'SuCS', name: 'Super Cyclonic Storm',          min: 120, color: '#e24cff' },
];

const LOW = { code: 'L', name: 'Low pressure area', min: 0, color: '#9aa9b8' };

export function imdCategory(kt) {
  let cat = LOW;
  for (const c of IMD_CATS) if (kt >= c.min) cat = c;
  return cat;
}