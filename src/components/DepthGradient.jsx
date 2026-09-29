import './DepthGradient.css';

function tempToColor(temp, min, max) {
  const t = max > min ? (temp - min) / (max - min) : 0.5;
  const clamped = Math.max(0, Math.min(1, t));
  const hue = (1 - clamped) * 240;
  return `hsl(${hue}, 90%, 50%)`;
}

function tempToGradient(byDepth) {
  const temps = byDepth.map(d => d.temperature);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const stops = byDepth.map((row, i) => {
    const pct = (i / (byDepth.length - 1)) * 100;
    return `${tempToColor(row.temperature, min, max)} ${pct.toFixed(1)}%`;
  });
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

export default function DepthGradient({ byDepth }) {
  if (!byDepth || byDepth.length === 0) return null;

  const temps = byDepth.map(d => d.temperature);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const gradient = tempToGradient(byDepth);

  return (
    <div className="dg">
      <div className="dg__header">
        <div>
          <h2 className="dg__title">Depth profile</h2>
          <p className="dg__sub">
            {byDepth[0].depth}–{byDepth[byDepth.length - 1].depth} m · {min.toFixed(1)}–{max.toFixed(1)} °C
          </p>
        </div>
        <div className="dg__legend" aria-hidden="true">
          <span>Cold</span>
          <div className="dg__legend-bar" style={{ background: 'linear-gradient(90deg, hsl(240,90%,50%), hsl(60,90%,50%), hsl(0,90%,50%))' }} />
          <span>Warm</span>
        </div>
      </div>

      <div className="dg__body">
        {/* Gradient bar */}
        <div className="dg__bar-wrap" aria-hidden="true">
          <div className="dg__bar" style={{ background: gradient }} />
          <div className="dg__depth-labels">
            {byDepth.map(row => (
              <div key={row.depth} className="dg__depth-tick">
                <span className="dg__depth-val">{row.depth}m</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="dg__table-wrap">
          <table className="dg__table">
            <thead>
              <tr>
                <th>Depth</th>
                <th className="num">Temperature (°C)</th>
                <th className="num">Salinity (psu)</th>
                <th><span className="dg__sr">Relative warmth</span></th>
              </tr>
            </thead>
            <tbody>
              {byDepth.map(row => {
                const color = tempToColor(row.temperature, min, max);
                const pct = max > min ? ((row.temperature - min) / (max - min)) * 100 : 50;
                return (
                  <tr key={row.depth}>
                    <td className="dg__td-depth">{row.depth} m</td>
                    <td className="num dg__td-temp">
                      {row.temperature.toFixed(2)}
                    </td>
                    <td className="num">
                      {row.salinity.toFixed(2)}
                    </td>
                    <td aria-hidden="true">
                      <div className="dg__heatbar-wrap">
                        <div className="dg__heatbar" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
