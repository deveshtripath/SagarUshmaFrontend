import { useState } from 'react';
import MapPicker from '../components/MapPicker.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { generateAttribution } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import './AttributionMaps.css';

// Mid-tone series colours that hold up on both light and dark surfaces.
// Same hue family as elsewhere: heat = orange, salinity = teal, height = blue.
const MODALITY_META = {
  SST:    { label: 'Sea surface temperature', color: '#e8663d', note: 'Surface heat flux driver' },
  SSS:    { label: 'Sea surface salinity',    color: '#14a38b', note: 'Freshwater cap and barrier layer' },
  SSH:    { label: 'Sea surface height',      color: '#2f86d6', note: 'Geostrophic dynamics, eddy cores' },
  U_curr: { label: 'Current, east–west',      color: '#d9a21b', note: 'Zonal advection of heat' },
  V_curr: { label: 'Current, north–south',    color: '#8a6ee0', note: 'Meridional advection of heat' },
};

const DEPTH_LABELS = { 0: 'Surface', 10: '10 m', 25: '25 m', 50: '50 m', 75: '75 m', 100: '100 m', 150: '150 m', 200: '200 m' };

const axisTick = { fill: 'var(--chart-axis)', fontSize: 11 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="chart-tip__row">
          <span className="am-tip-key"><span className="am-swatch" style={{ background: p.fill }} />{p.dataKey}</span>
          <strong>{(p.value * 100).toFixed(1)}%</strong>
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
        depth: DEPTH_LABELS[a.depth] || `${a.depth} m`,
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
          <h1 className="page-header__title">What Drives the Reconstruction</h1>
          <p className="page-header__subtitle">
            Integrated gradients show which of the five inputs the model leans on at each depth.
            In the Bay of Bengal, salinity dominates the shallow layers because of the freshwater
            cap, which is why the model fuses all five instead of relying on temperature alone.
          </p>
        </div>
        <div className="page-header__tag">Explainability</div>
      </div>

      {/* Modality legend */}
      <ul className="am-modality-row" aria-label="Model inputs">
        {Object.entries(MODALITY_META).map(([key, meta]) => (
          <li key={key} className="am-modality-pill" style={{ '--mod-color': meta.color }}>
            <span className="am-modality-pill__key">
              <span className="am-swatch" aria-hidden="true" />
              {key}
            </span>
            <span className="am-modality-pill__label">{meta.label}</span>
            <span className="am-modality-pill__note">{meta.note}</span>
          </li>
        ))}
      </ul>

      <div className="am-body">
        {/* Map */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className={`oe-map-hint${position ? ' is-set' : ''}`}>
              <Icon name="pin" />
              {position
                ? `${position.lat.toFixed(3)}° N, ${position.lng.toFixed(3)}° E`
                : 'Click the map to compute attribution'}
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
              <div className="card__title">Strongest input at each depth</div>
              <table className="am-dom-table">
                <thead>
                  <tr>
                    <th>Depth</th>
                    <th>Input</th>
                    <th className="num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {dominanceMap.map(row => {
                    const meta = MODALITY_META[row.dominant];
                    return (
                      <tr key={row.depth}>
                        <td className="am-dom-depth">
                          {DEPTH_LABELS[row.depth] || `${row.depth} m`}
                        </td>
                        <td>
                          <span className="am-dom-badge" style={{ '--mod-color': meta?.color }}>
                            <span className="am-swatch" aria-hidden="true" />
                            {row.dominant}
                          </span>
                        </td>
                        <td className="num am-dom-val">
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
              <div className="status-empty__icon"><Icon name="attribution" /></div>
              <p className="status-empty__title">No location selected</p>
              <p className="status-empty__hint">Pick a point on the map to see how much each input contributes at every depth.</p>
            </div>
          )}

          {attribution && (
            <>
              {/* Stacked bar over depths */}
              <div className="card">
                <div className="card__title">Share of each input by depth</div>
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={stackedData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap={4}>
                    <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={axisTick} stroke="var(--chart-grid)" />
                    <YAxis dataKey="depth" type="category" tick={axisTick} width={58} stroke="var(--chart-grid)" />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-grid)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 6 }} iconType="square" iconSize={10} />
                    {Object.keys(MODALITY_META).map(key => (
                      <Bar key={key} dataKey={key} stackId="a" fill={MODALITY_META[key].color} stroke="var(--bg-card)" strokeWidth={1} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Depth selector + radar */}
              <div className="card">
                <div className="card__title" id="am-depth-label">Breakdown at one depth</div>
                <div className="segmented am-depth-selector" role="radiogroup" aria-labelledby="am-depth-label">
                  {depths.map(d => (
                    <button
                      key={d}
                      role="radio"
                      aria-checked={selectedDepth === d}
                      className={`mhw-depth-btn ${selectedDepth === d ? 'mhw-depth-btn--active' : ''}`}
                      onClick={() => setSelectedDepth(d)}
                    >
                      {DEPTH_LABELS[d] || `${d} m`}
                    </button>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--chart-grid)" />
                    <PolarAngleAxis dataKey="modality" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 60]} tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} />
                    <Radar
                      name="Attribution %"
                      dataKey="value"
                      stroke="var(--cyan)"
                      fill="var(--cyan)"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="chart-tip">
                          <div className="chart-tip__row"><span>{d.modality}</span><strong>{d.value}%</strong></div>
                        </div>
                      );
                    }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* SSS insight */}
              {position && position.lat > 5 && position.lat < 25 && position.lng > 80 && position.lng < 100 && (
                <div className="card note am-insight">
                  <span className="note__title">Bay of Bengal</span>
                  <p>
                    At this location, SSS attribution is elevated in shallow layers (0–30 m),
                    consistent with the <strong>freshwater cap</strong>. River discharge from the Ganges, Brahmaputra
                    and Irrawaddy creates a low-salinity lens that decouples the surface from subsurface heat,
                    forming a <strong>barrier layer</strong> that stops the mixed layer from deepening.
                    SST alone would miss this; the five-input fusion correctly up-weights SSS here.
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
