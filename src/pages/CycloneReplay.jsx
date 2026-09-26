import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { CYCLONE_TRACKS, synthesizeTrackConditions } from '../api.js';
import './CycloneReplay.css';

const METRIC_DEFS = {
  tchp:      { label: 'TCHP',      unit: 'kJ/cm²', color: '#ff4444', desc: 'Tropical Cyclone Heat Potential' },
  d26:       { label: 'D26',       unit: 'm',       color: '#ff9500', desc: 'Depth of 26°C isotherm' },
  mld:       { label: 'MLD',       unit: 'm',       color: '#00e5c0', desc: 'Mixed Layer Depth' },
  sst:       { label: 'SST',       unit: '°C',      color: '#ff6b6b', desc: 'Sea Surface Temperature' },
  intensity: { label: 'Intensity', unit: 'kt',      color: '#a78bfa', desc: 'Wind Speed' },
};

function intensityToRadius(kt) {
  return Math.max(6, Math.min(22, kt / 9));
}

function intensityToColor(kt) {
  if (kt < 35) return '#00c8ff';
  if (kt < 65) return '#00e5c0';
  if (kt < 95) return '#ffb347';
  if (kt < 135) return '#ff6b6b';
  return '#ff2222';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="cr-tooltip">
      <div className="cr-tooltip__label">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="cr-tooltip__row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function CycloneReplay() {
  const [selectedId, setSelectedId] = useState('mocha_2023');
  const [activeMetric, setActiveMetric] = useState('tchp');
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [conditions, setConditions] = useState(null);

  const track = CYCLONE_TRACKS[selectedId];

  useEffect(() => {
    setConditions(synthesizeTrackConditions(track));
    setStepIdx(0);
    setPlaying(false);
  }, [selectedId]);

  // Playback
  useEffect(() => {
    if (!playing || !conditions) return;
    if (stepIdx >= conditions.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setStepIdx(i => i + 1), 900);
    return () => clearTimeout(t);
  }, [playing, stepIdx, conditions]);

  if (!conditions) return null;

  const current = conditions[stepIdx];
  const mapCenter = [
    conditions.reduce((s, p) => s + p.lat, 0) / conditions.length,
    conditions.reduce((s, p) => s + p.lng, 0) / conditions.length,
  ];

  const chartData = conditions.map((c, i) => ({
    date: c.date.slice(5),
    TCHP: c.tchp,
    D26: c.d26,
    MLD: c.mld,
    SST: c.sst,
    Intensity: c.intensity,
    active: i <= stepIdx,
  }));

  const polylinePoints = conditions.map(c => [c.lat, c.lng]);

  return (
    <div className="page cr-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">🌀 Cyclone Heat Potential Replay</h1>
          <p className="page-header__subtitle">
            Replay real cyclone tracks with reconstructed TCHP, D26, and MLD profiles.
            Visualize the warm subsurface pool each storm crossed — directly relevant to intensity forecasting.
          </p>
        </div>
        <div className="page-header__tag">🎯 INCOIS Mandate</div>
      </div>

      {/* Storm selector */}
      <div className="cr-selector-row">
        {Object.entries(CYCLONE_TRACKS).map(([id, tc]) => (
          <button
            key={id}
            className={`cr-storm-btn ${selectedId === id ? 'cr-storm-btn--active' : ''}`}
            style={{ '--storm-color': tc.color }}
            onClick={() => setSelectedId(id)}
          >
            <span className="cr-storm-dot" style={{ background: tc.color }} />
            <span className="cr-storm-name">{tc.name}</span>
            <span className="cr-storm-cat">{tc.peak_cat}</span>
          </button>
        ))}
      </div>

      {/* Map + metrics side by side */}
      <div className="cr-main">
        {/* Map */}
        <div className="card cr-map-card">
          <div className="card__title">Track & Warm Pool</div>
          <div style={{ borderRadius: 12, overflow: 'hidden' }}>
            <MapContainer
              center={mapCenter}
              zoom={5}
              style={{ height: '380px', width: '100%' }}
              key={selectedId}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Full track as grey */}
              <Polyline positions={polylinePoints} color="rgba(255,255,255,0.2)" weight={2} dashArray="4 4" />
              {/* Active track */}
              <Polyline
                positions={conditions.slice(0, stepIdx + 1).map(c => [c.lat, c.lng])}
                color={track.color}
                weight={3}
              />
              {/* All points */}
              {conditions.map((c, i) => (
                <CircleMarker
                  key={i}
                  center={[c.lat, c.lng]}
                  radius={intensityToRadius(c.intensity)}
                  pathOptions={{
                    fillColor: i <= stepIdx ? intensityToColor(c.intensity) : 'rgba(100,150,180,0.3)',
                    fillOpacity: i <= stepIdx ? 0.85 : 0.4,
                    color: i === stepIdx ? '#ffffff' : 'transparent',
                    weight: i === stepIdx ? 2 : 0,
                  }}
                >
                  <Tooltip sticky>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, color: '#e8f4ff', background: 'transparent' }}>
                      <b>{c.date}</b><br />
                      💨 {c.intensity} kt<br />
                      🌡️ SST: {c.sst}°C<br />
                      🔥 TCHP: {c.tchp} kJ/cm²<br />
                      📏 D26: {c.d26} m
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Playback controls */}
          <div className="cr-playback">
            <button className="btn btn--primary" onClick={() => { setStepIdx(0); setPlaying(false); }}>⏮</button>
            <button
              className="btn btn--primary"
              onClick={() => setPlaying(p => !p)}
            >
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="btn btn--primary" onClick={() => setStepIdx(i => Math.min(i + 1, conditions.length - 1))}>⏭</button>

            <div className="cr-step-info">
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Step</span>
              <input
                type="range"
                min={0} max={conditions.length - 1}
                value={stepIdx}
                onChange={e => { setPlaying(false); setStepIdx(+e.target.value); }}
                className="cr-slider"
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)' }}>
                {current.date}
              </span>
            </div>
          </div>
        </div>

        {/* Live metrics panel */}
        <div className="cr-metrics-col">
          <div className="card">
            <div className="card__title">Current Position Metrics</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'tchp',      val: current.tchp,      color: '#ff4444', icon: '🔥' },
                { key: 'd26',       val: current.d26,       color: '#ff9500', icon: '📏' },
                { key: 'mld',       val: current.mld,       color: '#00e5c0', icon: '🌊' },
                { key: 'sst',       val: current.sst,       color: '#ff6b6b', icon: '🌡️' },
                { key: 'intensity', val: current.intensity, color: '#a78bfa', icon: '💨' },
              ].map(({ key, val, color, icon }) => {
                const def = METRIC_DEFS[key];
                return (
                  <div key={key} className="cr-metric-row">
                    <span className="cr-metric-icon">{icon}</span>
                    <div className="cr-metric-body">
                      <div className="cr-metric-label">{def.label}</div>
                      <div className="cr-metric-desc">{def.desc}</div>
                    </div>
                    <div className="cr-metric-val" style={{ color }}>
                      {val}
                      <span className="cr-metric-unit">{def.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card__title">Track Info</div>
            <div className="cr-track-info">
              <div><span className="cr-info-label">Storm</span><span className="cr-info-val">{track.name}</span></div>
              <div><span className="cr-info-label">Category</span><span className="cr-info-val" style={{ color: track.color }}>{track.peak_cat}</span></div>
              <div><span className="cr-info-label">Region</span><span className="cr-info-val">{track.description.split('—')[1]?.trim()}</span></div>
              <div><span className="cr-info-label">Year</span><span className="cr-info-val">{track.year}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        {/* TCHP over track */}
        <div className="card">
          <div className="card__title">TCHP along Track</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tchpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <RTooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="TCHP" stroke="#ff4444" fill="url(#tchpGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* D26 + MLD */}
        <div className="card">
          <div className="card__title">D26 & MLD along Track</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <RTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="D26" stroke="#ff9500" strokeWidth={2} dot={false} name="D26 (m)" />
              <Line type="monotone" dataKey="MLD" stroke="#00e5c0" strokeWidth={2} dot={false} name="MLD (m)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intensity vs TCHP scatter-like line */}
      <div className="card">
        <div className="card__title">Intensity vs TCHP correlation along track</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <YAxis yAxisId="l" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <YAxis yAxisId="r" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <RTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            <Line yAxisId="l" type="monotone" dataKey="Intensity" stroke="#a78bfa" strokeWidth={2.5} dot={false} name="Intensity (kt)" />
            <Line yAxisId="r" type="monotone" dataKey="TCHP" stroke="#ff4444" strokeWidth={2} dot={false} strokeDasharray="5 3" name="TCHP (kJ/cm²)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ background: 'rgba(255,68,68,0.05)', borderColor: 'rgba(255,68,68,0.2)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong style={{ color: '#ff6b6b' }}>ℹ Science note</strong> — TCHP is the heat content above the 26°C isotherm (D26).
          A deep warm pool (high TCHP + deep D26) prevents cold upwelling from weakening the storm.
          MLD acts as a buffer: shallow MLD means mixing quickly brings cold water up, limiting intensification.
          ARGO floats deployed pre-storm in the warm pool provide the observational backbone for these products.
        </div>
      </div>
    </div>
  );
}
