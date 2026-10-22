import { GlassSegmented } from '@glass-midas/react/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { AppShell, EmptyState } from '../shared/AppKit';
import { LineChart } from '../shared/ChartsKit';
import { status } from '../shared/store.js';

// Status: a sentence that says how things are, a tile per service (its state in words and color,
// and its uptime), one service's response time against its budget, and the incidents.
// Load charts.css, dashboard.css and status.css too.

type Data = Awaited<ReturnType<typeof status>>;

const STATE = {
  operational: { label: 'Operational', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  down: { label: 'Down', tone: 'danger' },
} as const;
const INCIDENT = {
  investigating: { label: 'Investigating', tone: 'danger' },
  monitoring: { label: 'Monitoring', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
} as const;
const when = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso));
const hours = Array.from({ length: 24 }, (_, h) => `${String((h + 1) % 24).padStart(2, '0')}:00`);

export function ServiceStatus() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [service, setService] = useState('checkout');

  useEffect(() => {
    setError('');
    status()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [reload]);

  const trouble = data?.services.filter((s) => s.state !== 'operational') ?? [];
  const shown = data?.services.find((s) => s.id === service);

  return (
    <AppShell
      current="status"
      title="Status"
      lede="Every service the store runs on, now and over the last day."
    >
      <div className="dash" aria-busy={!data && !error ? true : undefined}>
        {error ? (
          <EmptyState
            alert
            title="The numbers didn't load"
            action={
              <button
                className="gm-chip gm-chip-primary"
                type="button"
                onClick={() => setReload((n) => n + 1)}
              >
                Try again
              </button>
            }
          >
            {error}
          </EmptyState>
        ) : (
          <>
            <p
              className="status-summary"
              role="status"
              data-tone={trouble.length ? 'warning' : 'success'}
            >
              {data &&
                (trouble.length
                  ? `${trouble.map((s) => s.name).join(' and ')} ${trouble.length === 1 ? 'is' : 'are'} ${STATE[trouble[0]!.state].label.toLowerCase()}. Everything else is working.`
                  : 'Every service is working.')}
            </p>
            <section className="status-services" aria-label="Services">
              {data?.services.map((s) => {
                const state = STATE[s.state];
                const tone = s.uptime >= 99.9 ? 'success' : s.uptime >= 99.5 ? 'warning' : 'danger';
                return (
                  <article key={s.id} className="status-service">
                    <header>
                      <h2>{s.name}</h2>
                      <span className="gm-badge" data-tone={state.tone}>
                        {state.label}
                      </span>
                    </header>
                    <p>
                      <strong>{s.uptime.toFixed(2)}%</strong> up, the last 30 days
                    </p>
                    <span
                      className="gm-meter"
                      data-tone={tone}
                      role="meter"
                      aria-label={`${s.name} uptime`}
                      aria-valuemin={99}
                      aria-valuemax={100}
                      aria-valuenow={s.uptime}
                      style={{ '--value': (s.uptime - 99).toFixed(3) } as CSSProperties}
                    />
                  </article>
                );
              })}
            </section>
            <section className="app-panel dash-card" aria-labelledby="latency-title">
              <header>
                <h2 id="latency-title">Response time</h2>
                <p>95th percentile, the last 24 hours</p>
              </header>
              <GlassSegmented
                value={service}
                label="Service"
                onChange={(e) => setService(e.detail.value)}
              >
                {/* Written out, not mapped from the data: a segmented control reads its options once. */}
                <button value="storefront">Storefront</button>
                <button value="checkout">Checkout</button>
                <button value="payments">Payments</button>
                <button value="search">Search</button>
                <button value="email">Order email</button>
              </GlassSegmented>
              {shown && (
                <LineChart
                  labels={hours}
                  series={[{ name: shown.name, values: shown.latency, tone: 1 }]}
                  format={(n) => `${n} ms`}
                  axis={(n) => `${n}`}
                  threshold={{ value: shown.budget, label: `Budget, ${shown.budget} ms` }}
                  caption={`${shown.name} response time, the last 24 hours, against its ${shown.budget} ms budget`}
                />
              )}
            </section>
            <section className="app-panel dash-card" aria-labelledby="incidents-title">
              <header>
                <h2 id="incidents-title">Incidents</h2>
                <p>the last 30 days</p>
              </header>
              <ol className="status-incidents">
                {data?.incidents.map((i) => {
                  const st = INCIDENT[i.state];
                  const name = data.services.find((s) => s.id === i.service)?.name;
                  return (
                    <li key={i.id} className="status-incident">
                      <header>
                        <h3>{i.title}</h3>
                        <span className="gm-badge" data-tone={st.tone}>
                          {st.label}
                        </span>
                      </header>
                      <p className="status-meta">
                        {name} · {i.severity === 'major' ? 'Major' : 'Minor'} · since{' '}
                        {when(i.started)}
                      </p>
                      <ol>
                        {i.updates.map((u) => (
                          <li key={u.at}>
                            <time dateTime={u.at}>{when(u.at)}</time> {u.text}
                          </li>
                        ))}
                      </ol>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
