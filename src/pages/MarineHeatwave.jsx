import { useState } from 'react';
import MapPicker from '../components/MapPicker.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, AreaChart, Area,
} from 'recharts';
import { generateMhwProfiles } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import './MarineHeatwave.css';

// Hobday et al. (2016/2018) MHW category thresholds above the 90th percentile baseline
const HOBDAY_CATS = [
  { label: 'Moderate',  min: 1.0, max: 2.0, color: '#f0a33a', roman: 'I' },
  { label: 'Strong',    min: 2.0, max: 3.0, color: '#ec6a3c', roman: 'II' },
  { label: 'Severe',    min: 3.0, max: 4.0, color: '#d32f2f', roman: 'III' },
  { label: 'Extreme',   min: 4.0, max: 99,  color: '#8e1650', roman: 'IV' },
];

function getHobdayCategory(anomaly) {
  return HOBDAY_CATS.find(c => anomaly >= c.min && anomaly < c.max) || null;
}

// Climatological percentile baselines per depth
const CLIM_P90 = { 0: 29.5, 10: 29.2, 20: 28.5, 30: 27.5, 50: 25.5, 75: 22.5, 100: 19.5, 150: 14.2, 200: 11.2, 300: 7.5 };

const axisTick = { fill: 'var(--chart-axis)', fontSize: 11 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">Day {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="chart-tip__row">
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
          <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong>
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
          <h1 className="page-header__title">Marine Heatwaves Below the Surface</h1>
          <p className="page-header__subtitle">
            Hobday categories applied at every depth, not just the surface. Subsurface heatwaves
            matter for ecosystems and storms but are rarely monitored. Click the map to analyse a location.
          </p>
        </div>
        <div className="page-header__tag">Hobday et al. 2016</div>
      </div>

      {/* Hobday legend */}
      <ul className="mhw-legend" aria-label="Heatwave categories">
        {HOBDAY_CATS.map(c => (
          <li key={c.label} className="mhw-cat-pill" style={{ '--cat-color': c.color }}>
            <span className="mhw-cat-pill__swatch" aria-hidden="true" />
            <span className="mhw-cat-pill__name">{c.roman} · {c.label}</span>
            <span className="mhw-cat-pill__range">
              {c.max < 90 ? `${c.min}–${c.max}× P90` : `> ${c.min}× P90`}
            </span>
          </li>
        ))}
      </ul>

      <div className="mhw-body">
        {/* Map col */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className={`oe-map-hint${position ? ' is-set' : ''}`}>
              <Icon name="pin" />
              {position
                ? `${position.lat.toFixed(3)}° N, ${position.lng.toFixed(3)}° E`
                : 'Click the map to choose a location'}
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
              <div className="card__title">Active heatwaves</div>
              {alertDepths.length === 0 ? (
                <div className="mhw-alert-none">
                  No active marine heatwave at any depth.
                </div>
              ) : (
                alertDepths.map(dep => {
                  const pt = latestProfile.find(p => p.depth === dep);
                  return (
                    <div key={dep} className="mhw-alert-row" style={{ '--cat': pt?.cat?.color ?? 'var(--coral)' }}>
                      <span className="mhw-alert-depth">{dep} m</span>
                      <span className="mhw-alert-cat">{pt?.cat?.label}</span>
                      <span className="mhw-alert-anom">+{pt?.anom?.toFixed(2)} °C above P90</span>
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
              <div className="status-empty__icon"><Icon name="mhw" /></div>
              <p className="status-empty__title">No location selected</p>
              <p className="status-empty__hint">Pick a point on the map to check every depth for heatwave conditions.</p>
            </div>
          )}

          {profiles && (
            <>
              {/* Depth profile latest */}
              <div className="card">
                <div className="card__title">Latest profile · anomaly above P90</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={latestProfile}
                    layout="vertical"
                    margin={{ top: 4, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" dataKey="anom" tick={axisTick} stroke="var(--chart-grid)"
                      label={{ value: 'Temperature anomaly (°C)', position: 'insideBottom', fill: 'var(--chart-axis)', fontSize: 11, offset: -6 }} />
                    <YAxis type="category" dataKey="depth" tick={axisTick} stroke="var(--chart-grid)"
                      label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)', fontSize: 11 }} />
                    <Tooltip
                      cursor={{ stroke: 'var(--chart-ref)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="chart-tip">
                            <div className="chart-tip__title">{d.depth} m</div>
                            <div className="chart-tip__row">
                              <strong>{d.anom > 0 ? '+' : ''}{d.anom} °C</strong>
                              <span>{d.cat ? `${d.cat.label} heatwave` : 'Normal'}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="var(--chart-ref)" />
                    <Area
                      type="monotone"
                      dataKey="anom"
                      stroke="var(--coral)"
                      fill="var(--coral)"
                      fillOpacity={0.16}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Depth selector */}
              <div className="mhw-depth-selector">
                <span className="mhw-depth-selector__label" id="mhw-depth-label">Depth</span>
                <div className="segmented" role="radiogroup" aria-labelledby="mhw-depth-label">
                  {profiles.depths.map(d => (
                    <button
                      key={d}
                      role="radio"
                      aria-checked={selectedDepth === d}
                      className={`mhw-depth-btn ${selectedDepth === d ? 'mhw-depth-btn--active' : ''}`}
                      onClick={() => setSelectedDepth(d)}
                    >
                      {d} m
                      {alertDepths.includes(d) && <span className="mhw-depth-alert" aria-label="heatwave" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time series at selected depth */}
              <div className="card">
                <div className="card__title">Temperature at {selectedDepth} m over time</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={depthTimeSeries} margin={{ top: 4, right: 8, bottom: 8, left: -8 }}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="day" tick={axisTick} stroke="var(--chart-grid)"
                      label={{ value: 'Day', position: 'insideBottom', fill: 'var(--chart-axis)', fontSize: 11, offset: -6 }} />
                    <YAxis tick={axisTick} stroke="var(--chart-grid)" domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--chart-ref)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 8 }} iconType="plainline" />
                    <ReferenceLine y={CLIM_P90[selectedDepth] ?? 20} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: 'P90', fill: 'var(--amber)', fontSize: 11, position: 'right' }} />
                    <Line type="monotone" dataKey="temp" stroke="var(--coral)" strokeWidth={2.25} dot={false} name="Temperature (°C)" />
                    <Line type="monotone" dataKey="clim" stroke="var(--text-muted)" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Climatology" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card note">
        <span className="note__title">Why depth matters</span>
        Marine heatwaves are discrete, prolonged, anomalously warm water events. Hobday et al. (2016) define categories
        by multiples of the 90th-percentile threshold above seasonal climatology. Surface detection is standard;
        <em> subsurface</em> detection from reconstructed profiles also catches heat trapped under a barrier layer and
        thermocline shoaling that surface SST alone misses. This matters most in the Bay of Bengal, where a freshwater
        cap decouples the surface from the heat stored below.
      </div>
    </div>
  );
}
