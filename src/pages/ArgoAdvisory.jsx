import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { generateArgoField } from '../api.js';
import './ArgoAdvisory.css';

const REGIONS = {
  bob:  { label: 'Bay of Bengal',  center: [15, 88], zoom: 5 },
  as:   { label: 'Arabian Sea',    center: [15, 65], zoom: 5 },
  io:   { label: 'Indian Ocean',   center: [0,  75], zoom: 4 },
};

function sigmaToColor(sigma) {
  const t = Math.max(0, Math.min(1, (sigma - 0.3) / 0.65));
  const hue = (1 - t) * 120;
  return `hsl(${hue}, 90%, 50%)`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Grid point</div>
      <div style={{ color: 'var(--cyan)' }}>Lat: {d?.lat}°</div>
      <div style={{ color: 'var(--cyan)' }}>Lng: {d?.lng}°</div>
      <div style={{ color: sigmaToColor(d?.sigma), fontWeight: 700 }}>σ = {d?.sigma}</div>
    </div>
  );
};

export default function ArgoAdvisory() {
  const [region, setRegion]     = useState('bob');
  const [field, setField]       = useState(null);
  const [spacing, setSpacing]   = useState(2.5);
  const [advisory, setAdvisory] = useState(null);

  useEffect(() => {
    const r = REGIONS[region];
    const pts = generateArgoField(r.center[0], r.center[1], 200);
    // Apply spacing constraint: filter out points within spacing° of the top advisory
    const top = pts[0];
    const filtered = pts.filter(
      p => Math.abs(p.lat - top.lat) > spacing || Math.abs(p.lng - top.lng) > spacing
    );
    const second = filtered[0];
    setField(pts);
    setAdvisory({ primary: top, secondary: second });
  }, [region, spacing]);

  const r = REGIONS[region];

  return (
    <div className="page aa-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">🔵 ARGO Float Deployment Advisory</h1>
          <p className="page-header__subtitle">
            Uncertainty-driven deployment recommendations: identify the location with highest model
            prediction uncertainty (argmax σ) subject to a minimum spacing constraint between floats.
            MoES/INCOIS can use this directly to prioritize float deployments.
          </p>
        </div>
        <div className="page-header__tag">🛳️ MoES Operational</div>
      </div>

      {/* Controls */}
      <div className="aa-controls">
        <div>
          <label className="oe-label">Region</label>
          <select
            className="ocean-select"
            value={region}
            onChange={e => setRegion(e.target.value)}
          >
            {Object.entries(REGIONS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="oe-label">Min float spacing (°)</label>
          <input
            type="range"
            min={0.5} max={5} step={0.5}
            value={spacing}
            onChange={e => setSpacing(+e.target.value)}
            className="cr-slider"
            style={{ width: 120 }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)', marginLeft: 8 }}>
            {spacing}°
          </span>
        </div>
      </div>

      {/* Main grid */}
      {advisory && (
        <>
          {/* Advisory boxes */}
          <div className="aa-advisory-row">
            <div className="aa-advisory-card aa-advisory-card--primary">
              <div className="aa-advisory-tag">🎯 Primary Deployment</div>
              <div className="aa-advisory-coords">
                <span className="aa-coord-label">Lat</span>
                <span className="aa-coord-val">{advisory.primary.lat}°N</span>
                <span className="aa-coord-label">Lng</span>
                <span className="aa-coord-val">{advisory.primary.lng}°E</span>
              </div>
              <div className="aa-advisory-sigma">
                σ = <strong>{advisory.primary.sigma}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  prediction uncertainty
                </span>
              </div>
              <div className="aa-advisory-action">argmax σ — highest information gain</div>
            </div>

            <div className="aa-advisory-card aa-advisory-card--secondary">
              <div className="aa-advisory-tag">📍 Secondary Deployment</div>
              <div className="aa-advisory-coords">
                <span className="aa-coord-label">Lat</span>
                <span className="aa-coord-val">{advisory.secondary?.lat}°N</span>
                <span className="aa-coord-label">Lng</span>
                <span className="aa-coord-val">{advisory.secondary?.lng}°E</span>
              </div>
              <div className="aa-advisory-sigma">
                σ = <strong>{advisory.secondary?.sigma}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  subject to {spacing}° spacing
                </span>
              </div>
              <div className="aa-advisory-action">second-highest σ outside exclusion zone</div>
            </div>

            <div className="aa-stats-card">
              <div className="card__title">Field Statistics</div>
              <div className="aa-stats-grid">
                <div className="aa-stat">
                  <span className="aa-stat-label">Max σ</span>
                  <span className="aa-stat-val">{Math.max(...field.map(p => p.sigma)).toFixed(3)}</span>
                </div>
                <div className="aa-stat">
                  <span className="aa-stat-label">Mean σ</span>
                  <span className="aa-stat-val">{(field.reduce((a, p) => a + p.sigma, 0) / field.length).toFixed(3)}</span>
                </div>
                <div className="aa-stat">
                  <span className="aa-stat-label">Min σ</span>
                  <span className="aa-stat-val">{Math.min(...field.map(p => p.sigma)).toFixed(3)}</span>
                </div>
                <div className="aa-stat">
                  <span className="aa-stat-label">Grid pts</span>
                  <span className="aa-stat-val">{field.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map + scatter */}
          <div className="aa-main-grid">
            {/* Uncertainty map */}
            <div className="card">
              <div className="card__title">Uncertainty Field — {r.label}</div>
              <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                <MapContainer
                  center={r.center}
                  zoom={r.zoom}
                  style={{ height: 380, width: '100%' }}
                  key={region}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {field.map((pt, i) => (
                    <CircleMarker
                      key={i}
                      center={[pt.lat, pt.lng]}
                      radius={5}
                      pathOptions={{
                        fillColor: sigmaToColor(pt.sigma),
                        fillOpacity: 0.75,
                        color: 'transparent',
                        weight: 0,
                      }}
                    >
                      <Tooltip sticky>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {pt.lat}°N {pt.lng}°E · σ={pt.sigma}
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                  {/* Primary advisory */}
                  <CircleMarker
                    center={[advisory.primary.lat, advisory.primary.lng]}
                    radius={14}
                    pathOptions={{ fillColor: 'transparent', color: '#ffffff', weight: 3, fillOpacity: 0 }}
                  />
                  {/* Secondary advisory */}
                  {advisory.secondary && (
                    <CircleMarker
                      center={[advisory.secondary.lat, advisory.secondary.lng]}
                      radius={10}
                      pathOptions={{ fillColor: 'transparent', color: '#aaaaaa', weight: 2, fillOpacity: 0 }}
                    />
                  )}
                </MapContainer>
              </div>
              <div className="aa-map-legend">
                <span style={{ color: 'hsl(0,90%,50%)' }}>● High σ</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'linear-gradient(90deg, hsl(120,90%,50%), hsl(60,90%,50%), hsl(0,90%,50%))' }} />
                <span style={{ color: 'hsl(120,90%,50%)' }}>● Low σ</span>
                <span style={{ color: 'white', fontSize: 11 }}>○ Advisory</span>
              </div>
            </div>

            {/* Scatter of lat/lng vs sigma */}
            <div className="card">
              <div className="card__title">σ Distribution (lat × lng)</div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.08)" />
                  <XAxis dataKey="lng" name="Longitude" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} label={{ value: 'Longitude', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 10, offset: -2 }} />
                  <YAxis dataKey="lat" name="Latitude" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <ZAxis dataKey="sigma" range={[20, 160]} name="σ" />
                  <RTooltip content={<CustomTooltip />} />
                  <Scatter
                    data={field}
                    fill="var(--cyan)"
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>

              <div className="aa-method-note">
                <strong style={{ color: 'var(--cyan)' }}>Method</strong>
                <p>
                  The uncertainty field σ(lat, lng) is the posterior standard deviation of the
                  reconstructed subsurface temperature profile at each grid point.
                  The advisory is argmax σ subject to a minimum inter-float spacing constraint,
                  ensuring the recommended deployment maximizes information gain per float.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
