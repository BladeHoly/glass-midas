import { GlassNav, GlassSearch } from '@glass-midas/react/navigation';
import type { ReactNode } from 'react';
import { findInApp } from './app.js';
import { initials } from './data.js';

// The app shell for React: the glass navigation (a side bar, a tab bar on a phone), the page's
// title and search, and the content. Load tokens.css, ondine.css and app.css once in your app.

const icon = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const NAV = [
  {
    id: 'overview',
    label: 'Overview',
    href: 'overview.html',
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </>,
    ),
  },
  {
    id: 'orders',
    label: 'Orders',
    href: 'orders.html',
    icon: icon(
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <path d="M9 8h6M9 12h6" />
      </>,
    ),
  },
  {
    id: 'products',
    label: 'Products',
    href: 'catalogue.html',
    icon: icon(
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>,
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: 'analytics.html',
    icon: icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  },
  {
    id: 'status',
    label: 'Status',
    href: 'status.html',
    icon: icon(<path d="M3 12h4l3-8 4 16 3-8h4" />),
  },
];

export function Brand({ className = '' }: { className?: string }) {
  return (
    <a className={`on-brand ${className}`.trim()} href="/">
      <span className="on-sigil" aria-hidden="true" />
      Ondine
    </a>
  );
}

export function AppShell({
  current,
  title,
  lede,
  children,
}: {
  current: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const me = 'Noor Haddad';
  return (
    <>
      <div className="on-art on-art-tide" aria-hidden="true" />
      <div className="app">
        <a className="app-skip" href="#main">
          Skip to content
        </a>
        <aside className="app-side" aria-label="Admin">
          <Brand />
          <GlassNav className="app-nav" orientation="vertical" material="frost" aria-label="Main">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={item.href}
                aria-current={item.id === current ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </a>
            ))}
          </GlassNav>
          <div className="app-me">
            <span className="gm-avatar" aria-hidden="true">
              {initials(me)}
            </span>
            <span>
              {me}
              <small>Studio manager</small>
            </span>
          </div>
        </aside>
        <div className="app-body">
          <header className="app-top">
            <Brand className="app-top-brand" />
            <div>
              <h1>{title}</h1>
              {lede && <p>{lede}</p>}
            </div>
            <div className="app-actions">
              <GlassSearch
                material="frost"
                placeholder="Search Ondine"
                hotkey="k"
                label="Search Ondine"
                source={findInApp}
              />
            </div>
          </header>
          <main id="main" className="app-main">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/** Nothing to show, or it failed: a sentence and a way out, where the rows would be. */
export function EmptyState({
  title,
  children,
  action,
  alert,
}: {
  title: string;
  children: ReactNode;
  action: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="app-empty" role={alert ? 'alert' : undefined}>
      <span className="on-sigil" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

/** Page chips: the first, the last, and the two either side of the current one. */
export function Pagination({
  page,
  count,
  onPage,
}: {
  page: number;
  count: number;
  onPage: (page: number) => void;
}) {
  const shown = [...new Set([1, page - 1, page, page + 1, count])]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  return (
    <nav className="gm-pagination" aria-label="Pages">
      <button
        className="gm-chip gm-chip-plain"
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹
      </button>
      {shown.map((p, i) => (
        <span key={p} style={{ display: 'contents' }}>
          {i > 0 && p - shown[i - 1]! > 1 && (
            <span className="gm-pagination-gap" aria-hidden="true">
              …
            </span>
          )}
          <button
            className={`gm-chip${p === page ? '' : ' gm-chip-plain'}`}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        className="gm-chip gm-chip-plain"
        type="button"
        aria-label="Next page"
        disabled={page >= count}
        onClick={() => onPage(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
