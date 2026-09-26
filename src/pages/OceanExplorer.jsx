import { useState } from 'react';
import MapPicker from '../components/MapPicker.jsx';
import DepthGradient from '../components/DepthGradient.jsx';
import { fetchPrediction } from '../api.js';
import './OceanExplorer.css';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const VAR_META = {
  sst:       { label: 'SST',       unit: '°C',  icon: '🌡️', color: 'var(--coral)' },
  sss:       { label: 'SSS',       unit: 'psu', icon: '🧂', color: 'var(--teal)' },
  ssh:       { label: 'SSH',       unit: 'm',   icon: '📡', color: 'var(--cyan)' },
  u_current: { label: 'U Current', unit: 'm/s', icon: '→',  color: 'var(--amber)' },
  v_current: { label: 'V Current', unit: 'm/s', icon: '↑',  color: 'var(--amber)' },
  u_wind:    { label: 'U Wind',    unit: 'm/s', icon: '💨', color: 'var(--violet)' },
  v_wind:    { label: 'V Wind',    unit: 'm/s', icon: '💨', color: 'var(--violet)' },
};

export default function OceanExplorer() {
  const [position, setPosition] = useState(null);
  const [date, setDate]         = useState(todayISO());
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  async function runPrediction(lat, lng, forDate) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrediction({ latitude: lat, longitude: lng, date: forDate });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleMapClick(lat, lng) {
    setPosition({ lat, lng });
    runPrediction(lat, lng, date);
  }

  function handleRefetch() {
    if (position) runPrediction(position.lat, position.lng, date);
  }

  const pred = result?.prediction;

  return (
    <div className="page oe-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">🌊 Ocean Explorer</h1>
          <p className="page-header__subtitle">
            Click anywhere on the map to retrieve real-time ocean subsurface predictions
            — temperature, salinity, currents and wind — reconstructed from five-modality fusion.
          </p>
        </div>
        <div className="page-header__tag">⛵ INCOIS · SagarUshma</div>
      </div>

      {/* Controls bar */}
      <div className="oe-controls">
        <div className="oe-date-group">
          <label className="oe-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="ocean-input"
          />
        </div>

        {position && (
          <>
            <div className="coord-pill">
              <span style={{ color: 'var(--text-muted)' }}>Lat</span>
              <span className="coord-pill__val">{position.lat.toFixed(4)}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>Lng</span>
              <span className="coord-pill__val">{position.lng.toFixed(4)}</span>
            </div>
            <button className="btn btn--primary" onClick={handleRefetch} disabled={loading}>
              {loading ? '⟳ Fetching…' : '↺ Refetch'}
            </button>
          </>
        )}

        {loading && <span className="oe-status-text status-loading">Querying model…</span>}
        {error && <span className="oe-status-text status-error">⚠ {error}</span>}
      </div>

      {/* Map + results side-by-side */}
      <div className="oe-body">
        {/* Map */}
        <div className="oe-map-col">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="oe-map-hint">
              {position
                ? `📍 Selected — ${position.lat.toFixed(4)}°N, ${position.lng.toFixed(4)}°E`
                : '👆 Click on the map to select a point'}
            </div>
            <MapPicker
              position={position ? [position.lat, position.lng] : null}
              onPick={handleMapClick}
              height="400px"
            />
          </div>
        </div>

        {/* Results */}
        <div className="oe-results-col">
          {!position && !loading && (
            <div className="status-empty">
              <div className="status-empty__icon">🌐</div>
              <p>Select a point on the map</p>
              <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
                Click anywhere in the ocean to fetch predictions
              </p>
            </div>
          )}

          {pred && (
            <div className="oe-result-grid">
              {/* Surface vars */}
              {Object.entries(VAR_META).map(([key, meta]) => {
                const val = pred[key];
                if (val === undefined) return null;
                return (
                  <div key={key} className="oe-var-card" style={{ '--accent': meta.color }}>
                    <div className="oe-var-card__icon">{meta.icon}</div>
                    <div className="oe-var-card__body">
                      <div className="oe-var-card__label">{meta.label}</div>
                      <div className="oe-var-card__value" style={{ color: meta.color }}>
                        {typeof val === 'number' ? val.toFixed(2) : val}
                        <span className="oe-var-card__unit">{meta.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Depth gradient full-width */}
      {pred?.by_depth && pred.by_depth.length > 0 && (
        <DepthGradient byDepth={pred.by_depth} />
      )}
    </div>
  );
}
