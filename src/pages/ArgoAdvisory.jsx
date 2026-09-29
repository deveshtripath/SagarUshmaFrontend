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
  return `hsl(${hue}, 85%, 45%)`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">Grid point</div>
      <div className="chart-tip__row"><span>Lat</span><strong>{d?.lat}°</strong></div>
      <div className="chart-tip__row"><span>Lng</span><strong>{d?.lng}°</strong></div>
      <div className="chart-tip__row"><span>σ</span><strong>{d?.sigma}</strong></div>
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
          <h1 className="page-header__title">ARGO Float Advisory</h1>
          <p className="page-header__subtitle">
            Where the next float teaches the model the most: the point of highest prediction
            uncertainty (argmax σ), kept a minimum distance from the other recommendation.
            MoES and INCOIS can use it directly to prioritise deployments.
          </p>
        </div>
        <div className="page-header__tag">MoES operational</div>
      </div>

      {/* Controls */}
      <div className="aa-controls">
        <div>
          <label className="oe-label" htmlFor="aa-region">Region</label>
          <select
            id="aa-region"
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
          <label className="oe-label" htmlFor="aa-spacing">Minimum float spacing</label>
          <div className="aa-range-row">
            <input
              id="aa-spacing"
              type="range"
              min={0.5} max={5} step={0.5}
              value={spacing}
              onChange={e => setSpacing(+e.target.value)}
              className="slider"
              style={{ width: 160, '--p': `${((spacing - 0.5) / 4.5) * 100}%` }}
            />
            <output htmlFor="aa-spacing" className="aa-range-val">{spacing.toFixed(1)}°</output>
          </div>
        </div>
      </div>

      {/* Main grid */}
      {advisory && (
        <>
          {/* Advisory boxes */}
          <div className="aa-advisory-row">
            <div className="aa-advisory-card aa-advisory-card--primary">
              <div className="aa-advisory-tag">
                <span className="aa-ring aa-ring--solid" aria-hidden="true" /> Deploy first
              </div>
              <div className="aa-advisory-coords">
                <span className="aa-coord-val">{advisory.primary.lat}° N</span>
                <span className="aa-coord-val">{advisory.primary.lng}° E</span>
              </div>
              <div className="aa-advisory-sigma">
                σ <strong>{advisory.primary.sigma}</strong>
                <span className="aa-advisory-sigma__note">prediction uncertainty</span>
              </div>
              <div className="aa-advisory-action">Highest σ in the region, so the largest information gain.</div>
            </div>

            <div className="aa-advisory-card aa-advisory-card--secondary">
              <div className="aa-advisory-tag">
                <span className="aa-ring" aria-hidden="true" /> Deploy second
              </div>
              <div className="aa-advisory-coords">
                <span className="aa-coord-val">{advisory.secondary?.lat}° N</span>
                <span className="aa-coord-val">{advisory.secondary?.lng}° E</span>
              </div>
              <div className="aa-advisory-sigma">
                σ <strong>{advisory.secondary?.sigma}</strong>
                <span className="aa-advisory-sigma__note">at least {spacing}° from the first</span>
              </div>
              <div className="aa-advisory-action">Next-highest σ outside the exclusion zone.</div>
            </div>

            <div className="aa-stats-card">
              <div className="card__title">Field statistics</div>
              <dl className="aa-stats-grid">
                <div className="aa-stat">
                  <dt className="aa-stat-label">Max σ</dt>
                  <dd className="aa-stat-val">{Math.max(...field.map(p => p.sigma)).toFixed(3)}</dd>
                </div>
                <div className="aa-stat">
                  <dt className="aa-stat-label">Mean σ</dt>
                  <dd className="aa-stat-val">{(field.reduce((a, p) => a + p.sigma, 0) / field.length).toFixed(3)}</dd>
                </div>
                <div className="aa-stat">
                  <dt className="aa-stat-label">Min σ</dt>
                  <dd className="aa-stat-val">{Math.min(...field.map(p => p.sigma)).toFixed(3)}</dd>
                </div>
                <div className="aa-stat">
                  <dt className="aa-stat-label">Grid points</dt>
                  <dd className="aa-stat-val">{field.length}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Map + scatter */}
          <div className="aa-main-grid">
            {/* Uncertainty map */}
            <div className="card">
              <div className="card__title">Uncertainty field · {r.label}</div>
              <div className="aa-map">
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
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                          {pt.lat}° N {pt.lng}° E · σ {pt.sigma}
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                  {/* Primary advisory */}
                  <CircleMarker
                    center={[advisory.primary.lat, advisory.primary.lng]}
                    radius={14}
                    pathOptions={{ fillColor: 'transparent', color: '#0b1a2a', weight: 3, fillOpacity: 0 }}
                  />
                  {/* Secondary advisory */}
                  {advisory.secondary && (
                    <CircleMarker
                      center={[advisory.secondary.lat, advisory.secondary.lng]}
                      radius={10}
                      pathOptions={{ fillColor: 'transparent', color: '#0b1a2a', weight: 2, dashArray: '4 4', fillOpacity: 0 }}
                    />
                  )}
                </MapContainer>
              </div>
              <div className="aa-map-legend">
                <span>Low σ</span>
                <div className="aa-map-legend__ramp" aria-hidden="true" />
                <span>High σ</span>
                <span className="aa-map-legend__sep" aria-hidden="true" />
                <span className="aa-ring aa-ring--solid" aria-hidden="true" /> <span>First</span>
                <span className="aa-ring" aria-hidden="true" /> <span>Second</span>
              </div>
            </div>

            {/* Scatter of lat/lng vs sigma */}
            <div className="card">
              <div className="card__title">σ across the grid</div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 4, right: 8, bottom: 8, left: -8 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="lng" name="Longitude" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} stroke="var(--chart-grid)" label={{ value: 'Longitude', position: 'insideBottom', fill: 'var(--chart-axis)', fontSize: 11, offset: -4 }} />
                  <YAxis dataKey="lat" name="Latitude" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} stroke="var(--chart-grid)" />
                  <ZAxis dataKey="sigma" range={[20, 160]} name="σ" />
                  <RTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--chart-ref)' }} />
                  <Scatter
                    data={field}
                    fill="var(--cyan)"
                    fillOpacity={0.55}
                  />
                </ScatterChart>
              </ResponsiveContainer>

              <div className="aa-method-note note">
                <strong className="note__title">Method</strong>
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
