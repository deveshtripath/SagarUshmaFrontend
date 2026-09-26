import { useState } from 'react';
import OceanExplorer from './pages/OceanExplorer.jsx';
import CycloneReplay from './pages/CycloneReplay.jsx';
import ArgoAdvisory from './pages/ArgoAdvisory.jsx';
import MarineHeatwave from './pages/MarineHeatwave.jsx';
import AttributionMaps from './pages/AttributionMaps.jsx';
import EventDatabase from './pages/EventDatabase.jsx';
import './App.css';

const NAV = [
  { id: 'explorer',    icon: '🌊', label: 'Ocean Explorer',      badge: null },
  { id: 'cyclone',     icon: '🌀', label: 'Cyclone Heat Replay',  badge: 'NEW' },
  { id: 'argo',        icon: '🔵', label: 'ARGO Advisory',        badge: 'NEW' },
  { id: 'mhw',         icon: '🌡️', label: 'Marine Heatwave',      badge: 'NEW' },
  { id: 'attribution', icon: '🧠', label: 'Attribution Maps',     badge: 'NEW' },
  { id: 'events',      icon: '📅', label: 'Event Database',       badge: 'SOON' },
];

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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">⛵</span>
          {sideOpen && (
            <div className="sidebar__brand-text">
              <span className="sidebar__brand-name">SagarUshma</span>
              <span className="sidebar__brand-sub">Ocean Intelligence</span>
            </div>
          )}
        </div>

        <nav className="sidebar__nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`}
              onClick={() => setPage(item.id)}
              title={!sideOpen ? item.label : undefined}
            >
              <span className="nav-item__icon">{item.icon}</span>
              {sideOpen && <span className="nav-item__label">{item.label}</span>}
              {sideOpen && item.badge && (
                <span className={`nav-item__badge nav-item__badge--${item.badge.toLowerCase()}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button className="sidebar__toggle" onClick={() => setSideOpen(!sideOpen)}>
          {sideOpen ? '←' : '→'}
        </button>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
