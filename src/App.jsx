import { useState } from 'react';
import OceanExplorer from './pages/OceanExplorer.jsx';
import CycloneReplay from './pages/CycloneReplay.jsx';
import ArgoAdvisory from './pages/ArgoAdvisory.jsx';
import MarineHeatwave from './pages/MarineHeatwave.jsx';
import AttributionMaps from './pages/AttributionMaps.jsx';
import EventDatabase from './pages/EventDatabase.jsx';
import { Icon } from './components/Icons.jsx';
import './App.css';

// Two groups: live tools first, then the reference/planning page
const NAV = [
  { id: 'explorer',    label: 'Ocean Explorer',   group: 'Analyse' },
  { id: 'cyclone',     label: 'Cyclone Replay',   group: 'Analyse' },
  { id: 'mhw',         label: 'Marine Heatwaves', group: 'Analyse' },
  { id: 'attribution', label: 'Attribution',      group: 'Analyse' },
  { id: 'argo',        label: 'ARGO Advisory',    group: 'Plan' },
  { id: 'events',      label: 'Event Database',   group: 'Plan', badge: 'Soon' },
];
const GROUPS = ['Analyse', 'Plan'];

export default function App() {
  const [page, setPage] = useState('explorer');
  const [sideOpen, setSideOpen] = useState(true);

  const renderPage = () => {
    switch (page) {
      case 'explorer':    return <OceanExplorer />;
      case 'cyclone':     return <CycloneReplay />;
      case 'argo':        return <ArgoAdvisory />;
      case 'mhw':         return <MarineHeatwave />;
      case 'attribution': return <AttributionMaps />;
      case 'events':      return <EventDatabase />;
      default:            return <OceanExplorer />;
    }
  };

  return (
    <div className={`shell ${sideOpen ? 'shell--open' : 'shell--collapsed'}`}>
      <aside className="sidebar" aria-label="Sections">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true" />
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">SagarUshma</span>
            <span className="sidebar__brand-sub">Ocean heat, below the surface</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {GROUPS.map(group => (
            <div key={group} className="nav-group">
              <div className="nav-group__label">{group}</div>
              {NAV.filter(n => n.group === group).map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`}
                  onClick={() => setPage(item.id)}
                  aria-current={page === item.id ? 'page' : undefined}
                  aria-label={!sideOpen ? item.label : undefined}
                  title={!sideOpen ? item.label : undefined}
                >
                  <Icon name={item.id} className="nav-item__icon" />
                  <span className="nav-item__label">{item.label}</span>
                  {item.badge && <span className="nav-item__badge">{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button
          className="sidebar__toggle"
          onClick={() => setSideOpen(!sideOpen)}
          aria-label={sideOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={sideOpen}
          title={sideOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <Icon name="sidebar" className="nav-item__icon" />
          <span className="nav-item__label">Hide sidebar</span>
        </button>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
