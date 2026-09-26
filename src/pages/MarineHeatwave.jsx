import { useState, useEffect } from 'react';
import MapPicker from '../components/MapPicker.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, AreaChart, Area,
} from 'recharts';
import { generateMhwProfiles } from '../api.js';
import './MarineHeatwave.css';

// Hobday et al. (2016/2018) MHW category thresholds above the 90th percentile baseline
const HOBDAY_CATS = [
  { label: 'Moderate',  min: 1.0, max: 2.0, color: '#ffb347', emoji: '🟡' },
  { label: 'Strong',    min: 2.0, max: 3.0, color: '#ff7043', emoji: '🟠' },
  { label: 'Severe',    min: 3.0, max: 4.0, color: '#e53935', emoji: '🔴' },
  { label: 'Extreme',   min: 4.0, max: 99,  color: '#880e4f', emoji: '🟣' },
];

function getHobdayCategory(anomaly) {
  return HOBDAY_CATS.find(c => anomaly >= c.min && anomaly < c.max) || null;
}

// Climatological percentile baselines per depth
const CLIM_P90 = { 0: 29.5, 10: 29.2, 20: 28.5, 30: 27.5, 50: 25.5, 75: 22.5, 100: 19.5, 150: 14.2, 200: 11.2, 300: 7.5 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Day {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color || 'var(--text-primary)' }}>
          <span>{p.name}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MarineHeatwave() {
  const [position, setPosition]   = useState(null);
  const [profiles, setProfiles]   = useState(null);
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [alertDepths, setAlertDepths] = useState([]);

  function runAnalysis(lat, lng) {
    const data = generateMhwProfiles(lat, lng);
    setProfiles(data);
    setSelectedDepth(data.depths[0]);

    // Detect which depths have MHW in the latest day
    const last = data.series[data.series.length - 1];
    const alerts = last.profile.filter(p => {
      const p90 = CLIM_P90[p.depth] ?? 20;
      const anom = p.temp - p90;
      return getHobdayCategory(anom) !== null;
    }).map(p => p.depth);
    setAlertDepths(alerts);
  }

  function handleMapClick(lat, lng) {
    setPosition({ lat, lng });
    runAnalysis(lat, lng);
  }

  // Time series at selected depth
  const depthTimeSeries = profiles
    ? profiles.series.map(day => {
        const pt = day.profile.find(p => p.depth === selectedDepth);
        const p90 = CLIM_P90[selectedDepth] ?? 20;
        const anom = pt ? +(pt.temp - p90).toFixed(2) : 0;
        const cat = anom > 0 ? getHobdayCategory(anom) : null;
        return {
          day: day.day,
          temp: pt?.temp ?? 0,
          clim: p90,
          anom,
          category: cat?.label ?? 'Normal',
          catColor: cat?.color ?? 'transparent',
        };
      })
    : [];

  // Latest depth profile with anomalies
  const latestProfile = profiles
    ? profiles.series[profiles.series.length - 1].profile.map(p => {
        const p90 = CLIM_P90[p.depth] ?? 20;
        const anom = +(p.temp - p90).toFixed(2);
        const cat = anom > 0 ? getHobdayCategory(anom) : null;
        return { ...p, anom, cat };
      })
    : [];

  return (
    <div className="page mhw-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">🌡️ Subsurface Marine Heatwave Detection</h1>
          <p className="page-header__subtitle">
            Hobday category MHW detection applied at depth, not just the surface.
            Subsurface MHWs are ecologically and oceanographically significant but rarely monitored.
            Click the map to analyze a location.
          </p>
        </div>
        <div className="page-header__tag">📊 Hobday et al. 2016</div>
      </div>

      {/* Hobday legend */}
      <div className="mhw-legend">
        {HOBDAY_CATS.map(c => (
          <div key={c.label} className="mhw-cat-pill" style={{ '--cat-color': c.color }}>
            <span>{c.emoji}</span>
            <span style={{ color: c.color, fontWeight: 600 }}>{c.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
              {c.max < 90 ? `${c.min}–${c.max}×P90` : `>${c.min}×P90`}
            </span>
          </div>
        ))}
      </div>

      <div className="mhw-body">
        {/* Map col */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="oe-map-hint">
              {position
                ? `📍 ${position.lat.toFixed(3)}°N, ${position.lng.toFixed(3)}°E — analyzing…`
                : '👆 Click to select analysis location'}
            </div>
            <MapPicker
              position={position ? [position.lat, position.lng] : null}
              onPick={handleMapClick}
              height="360px"
            />
          </div>

          {/* Alerts */}
          {profiles && (
            <div className="mhw-alerts">
              <div className="card__title" style={{ marginBottom: 10 }}>Active MHW Alerts</div>
              {alertDepths.length === 0 ? (
                <div style={{ color: 'var(--teal)', fontSize: 13, padding: '8px 0' }}>
                  ✅ No active marine heatwave at any depth
                </div>
              ) : (
                alertDepths.map(dep => {
                  const pt = latestProfile.find(p => p.depth === dep);
                  return (
                    <div key={dep} className="mhw-alert-row" style={{ '--cat': pt?.cat?.color ?? 'var(--coral)' }}>
                      <span className="mhw-alert-depth">{dep} m</span>
                      <span className="mhw-alert-cat" style={{ color: pt?.cat?.color }}>{pt?.cat?.label}</span>
                      <span className="mhw-alert-anom">+{pt?.anom?.toFixed(2)}°C above P90</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Charts col */}
        <div className="mhw-charts-col">
          {!profiles && (
            <div className="status-empty">
              <div className="status-empty__icon">🌊</div>
              <p>Select a location on the map</p>
            </div>
          )}

          {profiles && (
            <>
              {/* Depth profile latest */}
              <div className="card">
                <div className="card__title">Latest Depth Profile — Anomaly</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={latestProfile}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
                    <XAxis type="number" dataKey="anom" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      label={{ value: 'Temp anomaly (°C)', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 10, offset: -4 }} />
                    <YAxis type="category" dataKey="depth" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            <div style={{ color: 'var(--text-secondary)' }}>{d.depth} m depth</div>
                            <div style={{ color: d.cat?.color ?? 'var(--teal)' }}>
                              Δ{d.anom > 0 ? '+' : ''}{d.anom}°C
                              {d.cat ? ` · ${d.cat.label} MHW` : ' · Normal'}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.3)" />
                    <Area
                      type="monotone"
                      dataKey="anom"
                      stroke="var(--coral)"
                      fill="rgba(255,107,107,0.25)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Depth selector */}
              <div className="mhw-depth-selector">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Depth</span>
                {profiles.depths.map(d => (
                  <button
                    key={d}
                    className={`mhw-depth-btn ${selectedDepth === d ? 'mhw-depth-btn--active' : ''}`}
                    onClick={() => setSelectedDepth(d)}
                  >
                    {d} m
                    {alertDepths.includes(d) && <span className="mhw-depth-alert" />}
                  </button>
                ))}
              </div>

              {/* Time series at selected depth */}
              <div className="card">
                <div className="card__title">Temperature Time Series at {selectedDepth} m</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={depthTimeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      label={{ value: 'Day', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 10, offset: -4 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                    <ReferenceLine y={CLIM_P90[selectedDepth] ?? 20} stroke="#ff9500" strokeDasharray="4 4" label={{ value: 'P90', fill: '#ff9500', fontSize: 10 }} />
                    <Line type="monotone" dataKey="temp" stroke="var(--coral)" strokeWidth={2.5} dot={false} name="Temp (°C)" />
                    <Line type="monotone" dataKey="clim" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Climatology" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ background: 'rgba(255,107,107,0.05)', borderColor: 'rgba(255,107,107,0.2)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--coral)' }}>ℹ Science note</strong> — Marine Heatwaves (MHWs) are discrete, prolonged
          anomalously warm water events. Hobday et al. (2016) define categories based on multiples of the 90th percentile threshold
          above seasonal climatology. Surface MHW detection is standard; <em>subsurface</em> detection using reconstructed profiles
          enables detection of barrier-layer trapped heat and thermocline shoaling events that surface SST alone misses —
          particularly important in the Bay of Bengal where freshwater caps decouple the surface from the subsurface heat reservoir.
        </div>
      </div>
    </div>
  );
}
