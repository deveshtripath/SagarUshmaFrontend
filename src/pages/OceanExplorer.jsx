import { useState } from 'react';
import MapPicker from '../components/MapPicker.jsx';
import DepthGradient from '../components/DepthGradient.jsx';
import { fetchPrediction } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import './OceanExplorer.css';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const VAR_META = {
  sst:       { label: 'Surface temperature', abbr: 'SST', unit: '°C',  color: 'var(--coral)' },
  sss:       { label: 'Surface salinity',    abbr: 'SSS', unit: 'psu', color: 'var(--teal)' },
  ssh:       { label: 'Surface height',      abbr: 'SSH', unit: 'm',   color: 'var(--cyan)' },
  u_current: { label: 'Current, east–west',   abbr: 'U',   unit: 'm/s', color: 'var(--amber)' },
  v_current: { label: 'Current, north–south', abbr: 'V',   unit: 'm/s', color: 'var(--amber)' },
  u_wind:    { label: 'Wind, east–west',      abbr: 'U',   unit: 'm/s', color: 'var(--violet)' },
  v_wind:    { label: 'Wind, north–south',    abbr: 'V',   unit: 'm/s', color: 'var(--violet)' },
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
          <h1 className="page-header__title">Ocean Explorer</h1>
          <p className="page-header__subtitle">
            Pick a point on the map to see the ocean beneath it: temperature, salinity, currents
            and wind, reconstructed from five satellite and model inputs.
          </p>
        </div>
        <div className="page-header__tag">INCOIS · SagarUshma</div>
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
              <span>Lat</span>
              <span className="coord-pill__val">{position.lat.toFixed(4)}</span>
              <span style={{ marginLeft: 6 }}>Lng</span>
              <span className="coord-pill__val">{position.lng.toFixed(4)}</span>
            </div>
            <button className="btn btn--secondary" onClick={handleRefetch} disabled={loading}>
              <Icon name="refresh" />
              {loading ? 'Updating…' : 'Update for this date'}
            </button>
          </>
        )}

        {loading && <span className="oe-status-text status-loading" role="status"><span className="spinner" /> Running the model…</span>}
        {error && <span className="oe-status-text status-error" role="alert">Couldn’t get a prediction: {error}</span>}
      </div>

      {/* Map + results side-by-side */}
      <div className="oe-body">
        {/* Map */}
        <div className="oe-map-col">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className={`oe-map-hint${position ? ' is-set' : ''}`}>
              <Icon name="pin" />
              {position
                ? `${position.lat.toFixed(4)}° N, ${position.lng.toFixed(4)}° E`
                : 'Click the map to choose a point'}
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
              <div className="status-empty__icon"><Icon name="explorer" /></div>
              <p className="status-empty__title">No point selected</p>
              <p className="status-empty__hint">
                Click anywhere in the ocean and the surface readings and depth profile appear here.
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
                    <div className="oe-var-card__body">
                      <div className="oe-var-card__label">
                        {meta.label}
                        <span className="oe-var-card__abbr">{meta.abbr}</span>
                      </div>
                      <div className="oe-var-card__value">
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
