// 256-entry RGB lookup tables for the scientific colormaps used in the replay.

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lutFromStops(stops) {
  const rgb = stops.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  const last = rgb.length - 1;
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * last;
    const k = Math.min(Math.floor(x), last - 1);
    const f = x - k;
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = rgb[k][c] + (rgb[k + 1][c] - rgb[k][c]) * f;
    }
  }
  return lut;
}

// Google "Turbo" — polynomial approximation (A. Mikhailov, 2019)
function turboLut() {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const r = 0.13572138 + x * (4.6153926 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943))));
    const g = 0.09140261 + x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604))));
    const b = 0.1066733 + x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973))));
    lut[i * 3] = r * 255;
    lut[i * 3 + 1] = g * 255;
    lut[i * 3 + 2] = b * 255;
  }
  return lut;
}

export const COLORMAPS = {
  turbo: turboLut(),
  inferno: lutFromStops(['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4']),
  viridis: lutFromStops(['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725']),
  balance: lutFromStops(['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f']),
};

export function cmapColor(name, x) {
  const lut = COLORMAPS[name];
  const i = Math.max(0, Math.min(255, Math.round(x * 255))) * 3;
  return `rgb(${lut[i]},${lut[i + 1]},${lut[i + 2]})`;
}

export function cmapGradientCss(name, steps = 12) {
  const parts = [];
  for (let s = 0; s <= steps; s++) parts.push(cmapColor(name, s / steps));
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}