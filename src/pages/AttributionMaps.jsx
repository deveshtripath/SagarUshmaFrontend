import { useState } from 'react';
import MapPicker from '../components/MapPicker.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { generateAttribution } from '../api.js';
import './AttributionMaps.css';

const MODALITY_META = {
  SST:    { label: 'Sea Surface Temp',    color: '#ff6b6b', icon: '🌡️', note: 'Surface heat flux driver' },
  SSS:    { label: 'Sea Surface Salinity',color: '#00e5c0', icon: '🧂', note: 'BoB freshwater cap / barrier layer' },
  SSH:    { label: 'Sea Surface Height',  color: '#00c8ff', icon: '📡', note: 'Geostrophic dynamics, eddy cores' },
  U_curr: { label: 'U-component Current', color: '#ffb347', icon: '→',  note: 'Zonal advection of heat' },
  V_curr: { label: 'V-component Current', color: '#a78bfa', icon: '↑',  note: 'Meridional advection of heat' },
};

const DEPTH_LABELS = { 0: 'Surface', 10: '10m', 25: '25m', 50: '50m', 75: '75m', 100: '100m', 150: '150m', 200: '200m' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 14, justifyContent: 'space-between', color: p.fill || 'var(--text-primary)', marginBottom: 2 }}>
          <span>{p.dataKey}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function AttributionMaps() {
  const [position, setPosition]     = useState(null);
  const [attribution, setAttribution] = useState(null);
  const [selectedDepth, setSelectedDepth] = useState(0);

  function handleMapClick(lat, lng) {
    setPosition({ lat, lng });
    setAttribution(generateAttribution(lat, lng, new Date().toISOString().slice(0, 10)));
    setSelectedDepth(0);
  }

  const depths = attribution ? attribution.map(a => a.depth) : [];

  // Chart data for stacked bar over all depths
  const stackedData = attribution
    ? attribution.map(a => ({
        depth: DEPTH_LABELS[a.depth] || `${a.depth}m`,
        ...a.attributions,
      }))
    : [];

  // Radar data for selected depth
  const radarData = attribution
    ? (() => {
        const row = attribution.find(a => a.depth === selectedDepth);
        if (!row) return [];
        return Object.entries(row.attributions).map(([mod, val]) => ({
          modality: mod,
          value: +(val * 100).toFixed(1),
          fullMark: 100,
        }));
      })()
    : [];

  // Dominant modality per depth
  const dominanceMap = attribution
    ? attribution.map(a => {
        const entries = Object.entries(a.attributions);
        const [dom] = entries.reduce((best, cur) => cur[1] > best[1] ? cur : best);
        return { depth: a.depth, dominant: dom, value: a.attributions[dom] };
      })
    : [];

  return (
    <div className="page am-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">🧠 Modality Attribution Maps</h1>
          <p className="page-header__subtitle">
            Integrated gradients over the 5 input modalities reveal which sensor drives the
            subsurface reconstruction at each depth. In the Bay of Bengal, SSS dominates
            shallow layers due to the freshwater cap — this justifies the five-modality fusion architecture.
          </p>
        </div>
        <div className="page-header__tag">🔍 Explainability</div>
      </div>

      {/* Modality legend */}
      <div className="am-modality-row">
        {Object.entries(MODALITY_META).map(([key, meta]) => (
          <div key={key} className="am-modality-pill" style={{ '--mod-color': meta.color }}>
            <span style={{ fontSize: 16 }}>{meta.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{key}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{meta.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="am-body">
        {/* Map */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="oe-map-hint">
              {position
                ? `📍 ${position.lat.toFixed(3)}°N, ${position.lng.toFixed(3)}°E`
                : '👆 Click to compute attribution'}
            </div>
            <MapPicker
              position={position ? [position.lat, position.lng] : null}
              onPick={handleMapClick}
              height="300px"
            />
          </div>

          {/* Dominance table */}
          {dominanceMap.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card__title">Dominant Modality by Depth</div>
              <table className="am-dom-table">
                <thead>
                  <tr>
                    <th>Depth</th>
                    <th>Driver</th>
                    <th>Attribution</th>
                  </tr>
                </thead>
                <tbody>
                  {dominanceMap.map(row => {
                    const meta = MODALITY_META[row.dominant];
                    return (
                      <tr key={row.depth}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
                          {DEPTH_LABELS[row.depth] || `${row.depth}m`}
                        </td>
                        <td>
                          <span className="am-dom-badge" style={{ color: meta?.color, borderColor: meta?.color }}>
                            {meta?.icon} {row.dominant}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: meta?.color, fontWeight: 700 }}>
                          {(row.value * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="am-charts-col">
          {!attribution && (
            <div className="status-empty">
              <div className="status-empty__icon">🧠</div>
              <p>Select a location to view attribution</p>
            </div>
          )}

          {attribution && (
            <>
              {/* Stacked bar over depths */}
              <div className="card">
                <div className="card__title">Attribution by Depth (stacked)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stackedData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis dataKey="depth" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                    {Object.keys(MODALITY_META).map(key => (
                      <Bar key={key} dataKey={key} stackId="a" fill={MODALITY_META[key].color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Depth selector + radar */}
              <div className="card">
                <div className="card__title">Per-Depth Radar — Attribution Breakdown</div>
                <div className="am-depth-selector">
                  {depths.map(d => (
                    <button
                      key={d}
                      className={`mhw-depth-btn ${selectedDepth === d ? 'mhw-depth-btn--active' : ''}`}
                      onClick={() => setSelectedDepth(d)}
                    >
                      {DEPTH_LABELS[d] || `${d}m`}
                    </button>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(0,170,255,0.12)" />
                    <PolarAngleAxis dataKey="modality" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 60]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                    <Radar
                      name="Attribution %"
                      dataKey="value"
                      stroke="var(--cyan)"
                      fill="rgba(0,200,255,0.2)"
                      strokeWidth={2}
                    />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          <div style={{ color: 'var(--text-secondary)' }}>{d.modality}</div>
                          <div style={{ color: 'var(--cyan)', fontWeight: 700 }}>{d.value}%</div>
                        </div>
                      );
                    }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* SSS insight */}
              {position && position.lat > 5 && position.lat < 25 && position.lng > 80 && position.lng < 100 && (
                <div className="card am-insight">
                  <div className="am-insight-title">🌊 Bay of Bengal Insight</div>
                  <p>
                    At this location, SSS attribution is elevated in shallow layers (0–30m) —
                    consistent with the <strong>freshwater cap</strong> mechanism. River discharge (Ganges, Brahmaputra, Irrawaddy)
                    creates a low-salinity lens that decouples the surface from subsurface heat,
                    forming a <strong>barrier layer</strong> that prevents mixed-layer deepening.
                    SST alone would miss this — the five-modality fusion correctly up-weights SSS here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
