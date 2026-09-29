// Line icons drawn on a 24 px grid with a 1.7 px stroke so they sit at the
// same weight as 13–14 px text. All are decorative; labels carry the meaning.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export const Icons = {
  // Ocean Explorer — a probe dropping through layered water
  explorer: (
    <svg {...base}>
      <path d="M3 7c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
      <path d="M3 12h4M17 12h4M3 17h4M17 17h4" opacity=".55" />
      <path d="M12 9v8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </svg>
  ),
  // Cyclone — spiral
  cyclone: (
    <svg {...base}>
      <path d="M12 12.2a1.6 1.6 0 1 0 0-.2" />
      <path d="M14.8 9.3A4 4 0 1 0 15.9 13" />
      <path d="M18.5 7.5A7.5 7.5 0 1 0 19.4 13" />
    </svg>
  ),
  // ARGO — profiling float with antenna
  argo: (
    <svg {...base}>
      <path d="M12 2.5v3.5" />
      <rect x="9" y="6" width="6" height="11" rx="3" />
      <path d="M9 11h6" />
      <path d="M4 20c1.4 0 1.4-.9 2.7-.9s1.4.9 2.7.9 1.4-.9 2.6-.9 1.4.9 2.7.9 1.4-.9 2.7-.9 1.3.9 2.6.9" />
    </svg>
  ),
  // Marine heatwave — thermometer
  mhw: (
    <svg {...base}>
      <path d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4 4 0 1 1-4 0Z" />
      <path d="M12 9v7" />
      <path d="M17.5 6h2M17.5 9.5h2" opacity=".55" />
    </svg>
  ),
  // Attribution — stacked contributions
  attribution: (
    <svg {...base}>
      <path d="M4 6h9M4 12h13M4 18h6" />
      <path d="M15 6h5M19 12h1M12 18h8" opacity=".55" />
    </svg>
  ),
  // Event database — calendar
  events: (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  ),
  // Sidebar show/hide
  sidebar: (
    <svg {...base}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M9 4.5v15" />
    </svg>
  ),
  pin: (
    <svg {...base}>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  ),
  refresh: (
    <svg {...base}>
      <path d="M20 12a8 8 0 1 1-2.35-5.65" />
      <path d="M20 4v4.5h-4.5" />
    </svg>
  ),
};

export function Icon({ name, className = 'icon' }) {
  return <span className={className}>{Icons[name]}</span>;
}
