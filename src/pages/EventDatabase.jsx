import './EventDatabase.css';

const PLANNED_EVENTS = [
  { type: 'cyclone',  icon: '🌀', name: 'Cyclone Amphan',       date: '2020-05-20', region: 'Bay of Bengal', cat: 'ESCS' },
  { type: 'cyclone',  icon: '🌀', name: 'Cyclone Mocha',        date: '2023-05-14', region: 'Bay of Bengal', cat: 'ESCS' },
  { type: 'cyclone',  icon: '🌀', name: 'Cyclone Biparjoy',     date: '2023-06-15', region: 'Arabian Sea',   cat: 'ESCS' },
  { type: 'cyclone',  icon: '🌀', name: 'Cyclone Remal',        date: '2024-05-27', region: 'Bay of Bengal', cat: 'SCS'  },
  { type: 'tsunami',  icon: '🌊', name: 'Indian Ocean Tsunami', date: '2004-12-26', region: 'Indian Ocean',  cat: 'M9.1' },
  { type: 'mhw',      icon: '🌡️', name: 'BoB Heatwave 2023',   date: '2023-04-10', region: 'Bay of Bengal', cat: 'Cat IV'},
  { type: 'flooding', icon: '💧', name: 'Kerala Flood 2018',    date: '2018-08-16', region: 'Arabian Sea',   cat: 'Extreme'},
];

const TYPE_COLORS = {
  cyclone:  'var(--coral)',
  tsunami:  'var(--cyan)',
  mhw:      'var(--amber)',
  flooding: 'var(--violet)',
};

export default function EventDatabase() {
  return (
    <div className="page edb-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">📅 Extreme Event Database</h1>
          <p className="page-header__subtitle">
            Store and browse historical ocean extreme events — cyclones, tsunamis, marine heatwaves.
            Select an event to view ocean conditions (SST, SSS, SSH, TCHP) at the time of occurrence.
            Coming soon — requires backend DB integration.
          </p>
        </div>
        <div className="page-header__tag">🚧 Coming Soon</div>
      </div>

      {/* Architecture preview */}
      <div className="edb-arch-banner">
        <div className="edb-arch-title">Planned Architecture</div>
        <div className="edb-arch-flow">
          <div className="edb-arch-step">
            <span className="edb-arch-step-icon">🗄️</span>
            <span className="edb-arch-step-label">Events DB</span>
            <span className="edb-arch-step-desc">PostgreSQL table: event_type, date, lat/lng, category</span>
          </div>
          <div className="edb-arch-arrow">→</div>
          <div className="edb-arch-step">
            <span className="edb-arch-step-icon">🔌</span>
            <span className="edb-arch-step-label">API Endpoint</span>
            <span className="edb-arch-step-desc">GET /api/events/ → list · POST to add new</span>
          </div>
          <div className="edb-arch-arrow">→</div>
          <div className="edb-arch-step">
            <span className="edb-arch-step-icon">🌊</span>
            <span className="edb-arch-step-label">Ocean Lookup</span>
            <span className="edb-arch-step-desc">POST /api/predict/ with event date + centroid lat/lng</span>
          </div>
          <div className="edb-arch-arrow">→</div>
          <div className="edb-arch-step">
            <span className="edb-arch-step-icon">📊</span>
            <span className="edb-arch-step-label">Event Profile</span>
            <span className="edb-arch-step-desc">Depth profiles, TCHP, SST anomaly — auto-rendered</span>
          </div>
        </div>
      </div>

      {/* Preview events */}
      <div className="card">
        <div className="card__title">Planned Events — Preview</div>
        <div className="edb-event-list">
          {PLANNED_EVENTS.map((ev, i) => (
            <div key={i} className="edb-event-row" style={{ '--ev-color': TYPE_COLORS[ev.type] }}>
              <span className="edb-event-icon">{ev.icon}</span>
              <div className="edb-event-body">
                <div className="edb-event-name">{ev.name}</div>
                <div className="edb-event-meta">
                  <span style={{ color: 'var(--text-muted)' }}>{ev.date}</span>
                  <span>·</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{ev.region}</span>
                </div>
              </div>
              <span className="edb-event-cat" style={{ color: TYPE_COLORS[ev.type] }}>{ev.cat}</span>
              <button className="edb-event-btn" disabled>View Conditions →</button>
            </div>
          ))}
        </div>
      </div>

      {/* DB schema */}
      <div className="card edb-schema">
        <div className="card__title">Suggested DB Schema (Django model)</div>
        <pre className="edb-code">{`class OceanEvent(models.Model):
    EVENT_TYPES = [
        ('cyclone', 'Cyclone'),
        ('tsunami', 'Tsunami'),
        ('mhw',     'Marine Heatwave'),
        ('flood',   'Coastal Flood'),
        ('other',   'Other'),
    ]
    event_type   = models.CharField(max_length=20, choices=EVENT_TYPES)
    name         = models.CharField(max_length=120)
    date         = models.DateField()
    latitude     = models.FloatField()
    longitude    = models.FloatField()
    category     = models.CharField(max_length=40, blank=True)
    source       = models.CharField(max_length=200, blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        indexes  = [models.Index(fields=['event_type', 'date'])]`}</pre>
      </div>

      <div className="card" style={{ background: 'rgba(255,179,71,0.05)', borderColor: 'rgba(255,179,71,0.25)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--amber)' }}>🚧 Implementation steps</strong>
          <ol style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Add <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>OceanEvent</code> model to Django backend, run migrations</li>
            <li>Create <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>GET /api/events/</code> list endpoint with optional <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>?type=</code> filter</li>
            <li>Seed with IBTrACS cyclone data, historical MHW records, GDACS tsunami events</li>
            <li>On event selection, call <code style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>/api/predict/</code> with event centroid + date → render depth profile, TCHP, attribution</li>
            <li>Add admin UI to submit new events (POST)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
