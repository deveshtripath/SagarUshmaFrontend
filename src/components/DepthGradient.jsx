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
        <span className="dg__title">Depth Profile</span>
        <div className="dg__legend">
          <span style={{ color: 'hsl(240,90%,60%)' }}>Cold</span>
          <div className="dg__legend-bar" style={{ background: 'linear-gradient(90deg, hsl(240,90%,50%), hsl(60,90%,50%), hsl(0,90%,50%))' }} />
          <span style={{ color: 'hsl(0,90%,60%)' }}>Warm</span>
        </div>
      </div>

      <div className="dg__body">
        {/* Gradient bar */}
        <div className="dg__bar-wrap">
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
                <th>Temp (°C)</th>
                <th>Salinity (psu)</th>
                <th>Heat bar</th>
              </tr>
            </thead>
            <tbody>
              {byDepth.map(row => {
                const color = tempToColor(row.temperature, min, max);
                const pct = max > min ? ((row.temperature - min) / (max - min)) * 100 : 50;
                return (
                  <tr key={row.depth}>
                    <td className="dg__td-depth">{row.depth} m</td>
                    <td style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {row.temperature.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>
                      {row.salinity.toFixed(2)}
                    </td>
                    <td>
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
