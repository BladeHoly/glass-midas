import { GlassSegmented } from '@glass-midas/react/navigation';
import { useEffect, useState } from 'react';
import { AppShell, EmptyState } from '../shared/AppKit';
import { BarList, StackedColumns } from '../shared/ChartsKit';
import { compact } from '../shared/charts.js';
import { analytics } from '../shared/store.js';

// Analytics: revenue by collection over time (stacked, the three collections in the brand's three
// chart colors), the path from a visit to an order, and where the revenue comes from.
// Load charts.css and dashboard.css too.

type Data = Awaited<ReturnType<typeof analytics>>;

const PERIOD: Record<string, string> = {
  7: '7 days',
  30: '30 days',
  90: '90 days',
  365: '12 months',
};
const usd = (n: number) => `$${compact(n)}`;
const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
const share = (part: number, whole: number) =>
  `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%`;

export function StoreAnalytics() {
  const [range, setRange] = useState('90');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    setBusy(true);
    setError('');
    analytics(range)
      .then((d) => current && setData(d))
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setBusy(false));
    return () => {
      current = false;
    };
  }, [range, reload]);

  const f = data?.funnel ?? [];
  const total = data?.channels.reduce((n, c) => n + c.revenue, 0) ?? 0;

  return (
    <AppShell
      current="analytics"
      title="Analytics"
      lede="Where the revenue comes from, and how visits become orders."
    >
      <div className="dash" aria-busy={busy || undefined}>
        <div className="dash-filters">
          <GlassSegmented value={range} label="Period" onChange={(e) => setRange(e.detail.value)}>
            <button value="7">7 days</button>
            <button value="30">30 days</button>
            <button value="90">90 days</button>
            <button value="365">12 months</button>
          </GlassSegmented>
          <p aria-live="polite">The last {PERIOD[range]}.</p>
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
            <section className="app-panel dash-card" aria-labelledby="collections-title">
              <header>
                <h2 id="collections-title">Revenue by collection</h2>
              </header>
              {data ? (
                <StackedColumns
                  labels={data.labels}
                  series={data.collections.map((c, i) => ({
                    name: c.name,
                    values: c.values,
                    tone: i + 1,
                  }))}
                  format={money}
                  axis={usd}
                  caption={`Revenue by collection, the last ${PERIOD[range]}`}
                />
              ) : (
                <div style={{ minHeight: '17rem' }} />
              )}
            </section>
            <div className="dash-grid is-even">
              <section className="app-panel dash-card" aria-labelledby="funnel-title">
                <header>
                  <h2 id="funnel-title">From visit to order</h2>
                  {f.length > 0 && <p>{share(f.at(-1)!.count, f[0]!.count)} of visits order</p>}
                </header>
                {data && (
                  // Each step as a share of the one before: where people leave is the story.
                  <BarList
                    rows={f.map((step, i) => ({
                      label: step.step,
                      note: i
                        ? `${share(step.count, f[i - 1]!.count)} of previous`
                        : 'all sessions',
                      value: step.count,
                    }))}
                    format={(n) => n.toLocaleString()}
                    caption="From visit to order"
                  />
                )}
              </section>
              <section className="app-panel dash-card" aria-labelledby="channels-title">
                <header>
                  <h2 id="channels-title">Channels</h2>
                  <p>revenue</p>
                </header>
                {data && (
                  <BarList
                    rows={data.channels.map((c) => ({
                      label: c.channel,
                      note: `${share(c.revenue, total)} · ${c.orders} orders`,
                      value: c.revenue,
                    }))}
                    format={usd}
                    caption="Revenue by channel"
                  />
                )}
                <header>
                  <h2 id="cities-title">Cities</h2>
                  <p>revenue</p>
                </header>
                {data && (
                  <BarList
                    rows={data.cities.slice(0, 5).map((c) => ({
                      label: c.city,
                      note: `${c.orders} orders`,
                      value: c.revenue,
                    }))}
                    format={usd}
                    caption="Revenue by city, top five"
                  />
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
