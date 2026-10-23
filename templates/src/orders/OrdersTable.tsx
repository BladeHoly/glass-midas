import type { GmDialog, GmTable, TableSortDetail } from '@glass-midas/components';
import { GlassTable } from '@glass-midas/react/data';
import { GlassSelect } from '@glass-midas/react/forms';
import { GlassSegmented } from '@glass-midas/react/navigation';
import { GlassDialog, toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState } from 'react';
import { AppShell, EmptyState, Pagination } from '../shared/AppKit';
import { STATUS, day, initials, money, product } from '../shared/data.js';
import { listOrders, setStatus } from '../shared/store.js';

// Orders: search, statuses (one or several, from the chips or the column's filter), channels,
// amounts, a date range and sorting, all together; a line saying what's filtering, with a way to clear it;
// rows to select and act on; pages of 20; and a state for loading, for nothing found, and for
// failing.

type Result = Awaited<ReturnType<typeof listOrders>>;
type View = {
  query: string;
  status: string[];
  channel: string[];
  total: string[];
  range: string;
  sort: TableSortDetail;
  page: number;
};

const FILTERS = ['all', 'paid', 'pending', 'fulfilled', 'refunded', 'cancelled'] as const;
const START: View = {
  query: '',
  status: [],
  channel: [],
  total: [],
  range: 'all',
  sort: { key: 'date', direction: 'descending' },
  page: 1,
};
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const AMOUNTS: Record<string, string> = {
  'under-100': 'under $100',
  '100-500': '$100 to $500',
  '500-1000': '$500 to $1,000',
  'over-1000': 'over $1,000',
};
const RANGES: Record<string, string> = {
  30: 'last 30 days',
  90: 'last 90 days',
  365: 'last 12 months',
};

/** What's narrowing the list, as a sentence: "Paid or pending, online, last 30 days". */
function describe(view: View) {
  const parts: string[] = [];
  if (view.status.length) {
    const names = view.status.map((s) => STATUS[s as keyof typeof STATUS].label.toLowerCase());
    parts.push(
      names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0]!,
    );
  }
  if (view.channel.length === 1)
    parts.push(view.channel[0] === 'Online' ? 'online' : 'in the studio');
  if (view.total.length) {
    const bands = view.total.map((t) => AMOUNTS[t]!);
    parts.push(
      bands.length > 1 ? `${bands.slice(0, -1).join(', ')} or ${bands.at(-1)}` : bands[0]!,
    );
  }
  if (RANGES[view.range]) parts.push(RANGES[view.range]!);
  if (view.query.trim()) parts.push(`matching “${view.query.trim()}”`);
  const sentence = parts.join(', ');
  return sentence && `${sentence[0]!.toUpperCase()}${sentence.slice(1)}`;
}

export function OrdersTable() {
  const [view, setView] = useState<View>(START);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [density, setDensity] = useState<'compact' | 'regular' | 'relaxed'>('regular');
  const [reload, setReload] = useState(0);
  const table = useRef<GmTable>(null);
  const refund = useRef<GmDialog>(null);

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const t = setTimeout(
      () => setView((v) => (v.query === query ? v : { ...v, query, page: 1 })),
      250,
    );
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    listOrders(view)
      .then((r) => current && setResult(r))
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false; // A newer request is on its way.
    };
  }, [view, reload]);

  const set = (change: Partial<View>) => setView((v) => ({ ...v, page: 1, ...change }));

  // The Status and Channel columns' filters show what the view has, whoever changed it.
  useEffect(() => {
    const el = table.current;
    if (!el) return;
    for (const key of ['status', 'channel', 'total'] as const)
      if (!same(el.filters[key] ?? [], view[key])) el.filter(key, view[key]);
  }, [view.status, view.channel, view.total, result]);
  const onFilter = ({ filters }: { filters: Record<string, string[]> }) =>
    setView((v) => {
      const status = filters.status ?? [];
      const channel = filters.channel ?? [];
      const total = filters.total ?? [];
      return same(v.status, status) && same(v.channel, channel) && same(v.total, total)
        ? v
        : { ...v, status, channel, total, page: 1 };
    });
  const clearAll = () => {
    setQuery('');
    setView(START);
  };
  const active = describe(view);
  const refresh = () => setReload((n) => n + 1);
  const clear = () => table.current?.clearSelection();

  const fulfil = async () => {
    const ids = selected;
    await setStatus(ids, 'fulfilled');
    clear();
    refresh();
    toast(`${plural(ids.length, 'order')} marked fulfilled`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          await setStatus(ids, 'paid');
          refresh();
        },
      },
    });
  };

  const firstLoad = loading && !result;
  const rows = result?.rows ?? [];
  const from = result ? (result.page - 1) * result.perPage + 1 : 0;

  return (
    <AppShell current="orders" title="Orders" lede="Every order, newest first.">
      <section
        className="app-panel"
        aria-labelledby="orders-title"
        aria-busy={loading || undefined}
      >
        <h2 id="orders-title" className="on-sr-only">
          Orders
        </h2>

        {selected.length > 0 ? (
          <div className="app-bulk">
            <strong>{selected.length} selected</strong>
            <button className="gm-chip" type="button" onClick={fulfil}>
              Mark fulfilled
            </button>
            <button
              className="gm-chip"
              type="button"
              onClick={() => toast(`Exporting ${plural(selected.length, 'order')} as CSV…`)}
            >
              Export
            </button>
            <button className="gm-chip" type="button" onClick={() => refund.current?.show()}>
              Refund
            </button>
            <button className="gm-chip gm-chip-plain" type="button" onClick={clear}>
              Clear
            </button>
          </div>
        ) : (
          <div className="app-toolbar">
            <div className="gm-input-group">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="gm-input"
                type="search"
                placeholder="Order, customer or product"
                aria-label="Search orders"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="app-filters" role="group" aria-label="Status: choose one or several">
              {FILTERS.map((s) => (
                <button
                  key={s}
                  className="gm-chip"
                  type="button"
                  aria-pressed={s === 'all' ? !view.status.length : view.status.includes(s)}
                  onClick={() =>
                    set({
                      status:
                        s === 'all'
                          ? []
                          : view.status.includes(s)
                            ? view.status.filter((x) => x !== s)
                            : [...view.status, s],
                    })
                  }
                >
                  {s === 'all' ? 'All' : STATUS[s].label}{' '}
                  <span>{result?.counts[s] ? result.counts[s].toLocaleString() : ''}</span>
                </button>
              ))}
            </div>
            <div className="app-toolbar-end">
              <GlassSelect>
                <select
                  aria-label="Date range"
                  value={view.range}
                  onChange={(e) => set({ range: e.target.value })}
                >
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 12 months</option>
                  <option value="all">All time</option>
                </select>
              </GlassSelect>
              <GlassSegmented
                value={density}
                label="Row height"
                onChange={(e) => setDensity(e.detail.value as typeof density)}
              >
                <button value="compact" aria-label="Compact rows">
                  <Lines d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </button>
                <button value="regular" aria-label="Regular rows">
                  <Lines d="M4 7h16M4 12h16M4 17h16" />
                </button>
                <button value="relaxed" aria-label="Relaxed rows">
                  <Lines d="M4 8h16M4 16h16" />
                </button>
              </GlassSegmented>
            </div>
          </div>
        )}

        {error ? (
          <EmptyState
            alert
            title="Orders didn't load"
            action={
              <button className="gm-chip gm-chip-primary" type="button" onClick={refresh}>
                Try again
              </button>
            }
          >
            {error}
          </EmptyState>
        ) : result && !result.total ? (
          <EmptyState
            title="No orders match"
            action={
              <button className="gm-chip" type="button" onClick={clearAll}>
                Clear filters
              </button>
            }
          >
            Try another search, or show every status and date.
          </EmptyState>
        ) : (
          <>
            {active && (
              <p className="app-active">
                <span>
                  {active}
                  {result ? `: ${plural(result.total, 'order')}` : ''}
                </span>
                <button className="gm-chip gm-chip-plain" type="button" onClick={clearAll}>
                  Clear filters
                </button>
              </p>
            )}
            <div className="app-table">
              <GlassTable
                ref={table}
                stack
                density={density}
                onSort={(sort) => set({ sort })}
                onFilter={onFilter}
                onSelectionChange={({ values }) => setSelected(values)}
              >
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className="gm-check"
                          data-select-all
                          aria-label="Select all orders on this page"
                        />
                      </th>
                      <th data-sort="number">Order</th>
                      <th data-sort="date" aria-sort="descending">
                        Date
                      </th>
                      <th data-sort="customer">Customer</th>
                      <th>Items</th>
                      <th data-filter="channel" data-filter-options="Online:Online,Studio:Studio">
                        Channel
                      </th>
                      <th
                        data-filter="status"
                        data-filter-options="paid:Paid,pending:Pending,fulfilled:Fulfilled,refunded:Refunded,cancelled:Cancelled"
                      >
                        Status
                      </th>
                      <th
                        data-sort="total"
                        data-filter="total"
                        data-filter-options="under-100:Under $100,100-500:$100 to $500,500-1000:$500 to $1,000,over-1000:Over $1,000"
                        className="gm-num"
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ opacity: loading && !firstLoad ? 0.5 : undefined }}>
                    {firstLoad
                      ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
                      : rows.map((o) => {
                          const status = STATUS[o.status];
                          const first = product(o.lines[0]!.product)!;
                          return (
                            <tr key={o.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="gm-check"
                                  data-select
                                  value={o.id}
                                  aria-label={`Select order ${o.number}`}
                                />
                              </td>
                              <td>
                                <a href={`manage-order.html?n=${o.number}`}>#{o.number}</a>
                              </td>
                              <td data-value={o.date}>{day(o.date)}</td>
                              <td>
                                <span className="app-person">
                                  <span className="gm-avatar" data-size="sm" aria-hidden="true">
                                    {initials(o.customer.name)}
                                  </span>
                                  <span>
                                    {o.customer.name}
                                    <small>{o.customer.email}</small>
                                  </span>
                                </span>
                              </td>
                              <td>
                                {first.name} · {o.lines[0]!.finish}
                                {o.lines.length > 1 ? ` +${o.lines.length - 1}` : ''}
                              </td>
                              <td>{o.channel}</td>
                              <td>
                                <span className="gm-badge" data-tone={status.tone || undefined}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="gm-num">{money(o.total)}</td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </GlassTable>
            </div>
            {result && (
              <footer className="app-foot">
                <span aria-live="polite">
                  {from}–{from + rows.length - 1} of {result.total.toLocaleString()}
                </span>
                <Pagination
                  page={result.page}
                  count={Math.max(1, Math.ceil(result.total / result.perPage))}
                  onPage={(page) => setView((v) => ({ ...v, page }))}
                />
              </footer>
            )}
          </>
        )}
      </section>

      <GlassDialog
        ref={refund}
        heading="Refund these orders?"
        onClose={async (e) => {
          if (e.detail.value !== 'refund') return;
          const ids = selected;
          await setStatus(ids, 'refunded');
          clear();
          refresh();
          toast(`${plural(ids.length, 'order')} refunded`);
        }}
      >
        <p>
          {selected.length === 1
            ? '1 customer gets their'
            : `${selected.length} customers get their`}{' '}
          money back in 5–10 days. A refund can't be undone.
        </p>
        <form method="dialog" className="dialog-actions">
          <button className="gm-chip" value="cancel">
            Keep them
          </button>
          <button className="gm-chip gm-chip-primary" value="refund">
            Refund
          </button>
        </form>
      </GlassDialog>
    </AppShell>
  );
}

function Lines({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** A row's shape while a page loads. */
function SkeletonRow() {
  const bar = (width: string) => (
    <span className="gm-skeleton gm-skeleton-text" style={{ width }} />
  );
  return (
    <tr aria-hidden="true">
      <td />
      <td>{bar('3.5rem')}</td>
      <td>{bar('5.5rem')}</td>
      <td>
        <span className="app-person">
          <span
            className="gm-skeleton gm-skeleton-round"
            style={{ width: '1.5rem', height: '1.5rem' }}
          />
          {bar('8rem')}
        </span>
      </td>
      <td>{bar('7rem')}</td>
      <td>{bar('3rem')}</td>
      <td>
        <span
          className="gm-skeleton gm-skeleton-round"
          style={{ width: '4.5rem', height: '1.4rem' }}
        />
      </td>
      <td className="gm-num">
        <span
          className="gm-skeleton gm-skeleton-text"
          style={{ width: '4rem', marginLeft: 'auto' }}
        />
      </td>
    </tr>
  );
}
