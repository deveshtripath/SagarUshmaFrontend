import './EventDatabase.css';

const PLANNED_EVENTS = [
  { type: 'cyclone',  name: 'Cyclone Amphan',       date: '2020-05-20', region: 'Bay of Bengal', cat: 'ESCS' },
  { type: 'cyclone',  name: 'Cyclone Mocha',        date: '2023-05-14', region: 'Bay of Bengal', cat: 'ESCS' },
  { type: 'cyclone',  name: 'Cyclone Biparjoy',     date: '2023-06-15', region: 'Arabian Sea',   cat: 'ESCS' },
  { type: 'cyclone',  name: 'Cyclone Remal',        date: '2024-05-27', region: 'Bay of Bengal', cat: 'SCS'  },
  { type: 'tsunami',  name: 'Indian Ocean Tsunami', date: '2004-12-26', region: 'Indian Ocean',  cat: 'M9.1' },
  { type: 'mhw',      name: 'BoB Heatwave 2023',    date: '2023-04-10', region: 'Bay of Bengal', cat: 'Cat IV'},
  { type: 'flooding', name: 'Kerala Flood 2018',    date: '2018-08-16', region: 'Arabian Sea',   cat: 'Extreme'},
];

const TYPE_META = {
  cyclone:  { label: 'Cyclone',         color: 'var(--coral)' },
  tsunami:  { label: 'Tsunami',         color: 'var(--cyan)' },
  mhw:      { label: 'Marine heatwave', color: 'var(--amber)' },
  flooding: { label: 'Flood',           color: 'var(--violet)' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const ARCH_STEPS = [
  { label: 'Events DB',     desc: 'PostgreSQL table: event_type, date, lat/lng, category' },
  { label: 'API endpoint',  desc: 'GET /api/events/ to list · POST to add new' },
  { label: 'Ocean lookup',  desc: 'POST /api/predict/ with event date + centroid lat/lng' },
  { label: 'Event profile', desc: 'Depth profiles, TCHP, SST anomaly, rendered automatically' },
];

export default function EventDatabase() {
  return (
    <div className="page edb-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Extreme Event Database</h1>
          <p className="page-header__subtitle">
            A browsable record of past cyclones, tsunamis and marine heatwaves. Choose an event to
            see the ocean as it was that day: SST, SSS, SSH and TCHP. This page needs the backend
            database before it goes live.
          </p>
        </div>
        <div className="page-header__tag edb-soon">Coming soon</div>
      </div>

      {/* Architecture preview */}
      <section className="card">
        <h2 className="card__title">How it will work</h2>
        <ol className="edb-arch-flow">
          {ARCH_STEPS.map((step, i) => (
            <li key={step.label} className="edb-arch-step">
              <span className="edb-arch-step-num" aria-hidden="true">{i + 1}</span>
              <span className="edb-arch-step-label">{step.label}</span>
              <span className="edb-arch-step-desc">{step.desc}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Preview events */}
      <section className="card">
        <h2 className="card__title">Events planned for launch</h2>
        <ul className="edb-event-list">
          {PLANNED_EVENTS.map((ev, i) => {
            const meta = TYPE_META[ev.type];
            return (
              <li key={i} className="edb-event-row" style={{ '--ev-color': meta.color }}>
                <span className="edb-event-type">
                  <span className="edb-event-dot" aria-hidden="true" />
                  {meta.label}
                </span>
                <div className="edb-event-body">
                  <div className="edb-event-name">{ev.name}</div>
                  <div className="edb-event-meta">
                    <time dateTime={ev.date}>{fmtDate(ev.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{ev.region}</span>
                  </div>
                </div>
                <span className="edb-event-cat">{ev.cat}</span>
                <button className="edb-event-btn" disabled title="Available once the database is connected">
                  View conditions
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* DB schema */}
      <section className="card edb-schema">
        <h2 className="card__title">Suggested schema (Django model)</h2>
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
      </section>

      <section className="card note">
        <span className="note__title">Implementation steps</span>
        <ol className="edb-steps">
          <li>Add the <code>OceanEvent</code> model to the Django backend and run migrations.</li>
          <li>Create a <code>GET /api/events/</code> list endpoint with an optional <code>?type=</code> filter.</li>
          <li>Seed it with IBTrACS cyclone data, historical MHW records and GDACS tsunami events.</li>
          <li>On event selection, call <code>/api/predict/</code> with the event centroid and date, then render the depth profile, TCHP and attribution.</li>
          <li>Add an admin screen for submitting new events (POST).</li>
        </ol>
      </section>
    </div>
  );
}
