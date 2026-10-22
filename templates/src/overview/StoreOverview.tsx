import { GlassSegmented } from '@glass-midas/react/navigation';
import { useEffect, useState } from 'react';
import { AppShell, EmptyState } from '../shared/AppKit';
import { BarList, LineChart, Sparkline } from '../shared/ChartsKit';
import { compact } from '../shared/charts.js';
import { STATUS, initials, money } from '../shared/data.js';
import { overview } from '../shared/store.js';

// The overview: four numbers against the period before, revenue over time with the period before
// as context, the best sellers, the latest orders and what's running low. One filter, the period,
// scopes all of it. Load charts.css and dashboard.css too.

type Data = Awaited<ReturnType<typeof overview>>;
type Kpi = Data['kpis']['revenue'];

const PERIOD: Record<string, string> = {
  7: '7 days',
  30: '30 days',
  90: '90 days',
  365: '12 months',
};
const usd = (n: number) => `$${compact(n)}`;
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

/** A number, how it moved against the period before, and its shape over this one. */
function Stat({
  label,
  kpi,
  format,
  points,
  range,
}: {
  label: string;
  kpi: Kpi;
  format: (n: number) => string;
  points?: boolean;
  range: string;
}) {
  if (kpi.previous == null) {
    return (
      <article className="gm-stat">
        <p className="gm-stat-label">{label}</p>
        <p className="gm-stat-value">{format(kpi.value)}</p>
        <p className="gm-stat-delta">No earlier {PERIOD[range]} to compare</p>
        <Sparkline values={kpi.trend.map((v) => v ?? 0)} />
      </article>
    );
  }
  const change = points
    ? (kpi.value - kpi.previous) * 100
    : kpi.previous
      ? ((kpi.value - kpi.previous) / kpi.previous) * 100
      : 0;
  const direction = change > 0.05 ? 'up' : change < -0.05 ? 'down' : undefined;
  // Here more is better for every number, so up is good.
  const tone = direction === 'up' ? 'good' : direction === 'down' ? 'bad' : undefined;
  return (
    <article className="gm-stat">
      <p className="gm-stat-label">{label}</p>
      <p className="gm-stat-value">{format(kpi.value)}</p>
      <p className="gm-stat-delta" data-direction={direction} data-tone={tone}>
        {`${change > 0 ? '+' : ''}${change.toFixed(1)}${points ? ' pts' : '%'}`}{' '}
        <span>vs. the {PERIOD[range]} before</span>
      </p>
      <Sparkline values={kpi.trend.map((v) => v ?? 0)} />
    </article>
  );
}

function StatSkeleton() {
  return (
    <article className="gm-stat" aria-hidden="true">
      <span className="gm-skeleton gm-skeleton-text" style={{ width: '45%' }} />
      <span className="gm-skeleton" style={{ width: '60%', height: '2rem' }} />
      <span className="gm-skeleton gm-skeleton-text" style={{ width: '70%' }} />
    </article>
  );
}

export function StoreOverview() {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    setBusy(true);
    setError('');
    overview(range)
      .then((d) => current && setData(d))
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setBusy(false));
    return () => {
      current = false;
    };
  }, [range, reload]);

  return (
    <AppShell
      current="overview"
      title="Overview"
      lede="How the store is doing, against the period before."
    >
      <div className="dash" aria-busy={busy || undefined}>
        <div className="dash-filters">
          <GlassSegmented value={range} label="Period" onChange={(e) => setRange(e.detail.value)}>
            <button value="7">7 days</button>
            <button value="30">30 days</button>
            <button value="90">90 days</button>
            <button value="365">12 months</button>
          </GlassSegmented>
          <p aria-live="polite">
            {data && !data.previous
              ? `The last ${PERIOD[range]}: the store's first, so there's nothing before to compare.`
              : `The last ${PERIOD[range]}, against the ${PERIOD[range]} before.`}
          </p>
        </div>

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
            <section className="dash-kpis" aria-label="Key numbers">
              {data ? (
                <>
                  <Stat label="Revenue" kpi={data.kpis.revenue} format={usd} range={range} />
                  <Stat
                    label="Orders"
                    kpi={data.kpis.orders}
                    format={(n) => n.toLocaleString()}
                    range={range}
                  />
                  <Stat
                    label="Average order"
                    kpi={data.kpis.average}
                    format={money}
                    range={range}
                  />
                  <Stat
                    label="Conversion"
                    kpi={data.kpis.conversion}
                    format={percent}
                    points
                    range={range}
                  />
                </>
              ) : (
                Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)
              )}
            </section>
            <div className="dash-grid">
              <section className="app-panel dash-card" aria-labelledby="revenue-title">
                <header>
                  <h2 id="revenue-title">Revenue</h2>
                </header>
                {data && (
                  <LineChart
                    labels={data.labels}
                    series={[
                      { name: `Last ${PERIOD[range]}`, values: data.revenue, tone: 1 },
                      ...(data.previous
                        ? [{ name: 'Period before', values: data.previous, tone: 'muted' as const }]
                        : []),
                    ]}
                    format={money}
                    axis={usd}
                    caption={`Revenue, the last ${PERIOD[range]} against the period before`}
                  />
                )}
              </section>
              <section className="app-panel dash-card" aria-labelledby="best-title">
                <header>
                  <h2 id="best-title">Best sellers</h2>
                  <p>by revenue</p>
                </header>
                {data && (
                  <BarList
                    rows={data.best.map((b) => ({
                      label: b.product.name,
                      note: `${b.units} sold`,
                      value: b.revenue,
                    }))}
                    format={usd}
                    caption="Best sellers by revenue"
                  />
                )}
              </section>
            </div>
            <div className="dash-grid is-even">
              <section className="app-panel dash-card" aria-labelledby="recent-title">
                <header>
                  <h2 id="recent-title">Latest orders</h2>
                  <a href="orders.html">All orders</a>
                </header>
                <ul className="dash-list">
                  {data?.recent.map((o) => (
                    <li key={o.id}>
                      <span className="gm-avatar" data-size="sm" aria-hidden="true">
                        {initials(o.customer.name)}
                      </span>
                      <span>
                        {o.customer.name}
                        <small>
                          #{o.number} ·{' '}
                          <span className="gm-badge" data-tone={STATUS[o.status].tone || undefined}>
                            {STATUS[o.status].label}
                          </span>
                        </small>
                      </span>
                      <span>{money(o.total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="app-panel dash-card" aria-labelledby="low-title">
                <header>
                  <h2 id="low-title">Running low</h2>
                  <a href="catalogue.html">Products</a>
                </header>
                <ul className="dash-list">
                  {data && !data.low.length && (
                    <li>
                      <span>Every finish is well stocked.</span>
                    </li>
                  )}
                  {data?.low.map((l) => (
                    <li key={`${l.product.id}-${l.finish}`}>
                      <span>
                        {l.product.name}
                        <small>{l.finish}</small>
                      </span>
                      <span className="gm-badge" data-tone={l.count ? 'warning' : 'danger'}>
                        {l.count ? `${l.count} left` : 'Sold out'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
