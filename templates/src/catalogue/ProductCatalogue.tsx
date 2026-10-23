import type { GmTable } from '@glass-midas/components';
import { GlassTable } from '@glass-midas/react/data';
import { toast } from '@glass-midas/react/overlays';
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AppShell, EmptyState } from '../shared/AppKit';
import { collections, money } from '../shared/data.js';
import { listCatalogue, setStock } from '../shared/store.js';

// Products: grouped by collection, each opening into its finishes, where stock can be changed in
// place. Search, a collection and what's in stock (in stock, running low, sold out: one or
// several, from the chips or the Stock column's filter) narrow it down; filtering by stock opens
// each product on the finishes that match. Groups fold away. Load catalogue.css too.

type Item = Awaited<ReturnType<typeof listCatalogue>>[number];

const LOW = 10;
const isLow = (p: Item) => Object.values(p.stock).some((n) => n < LOW);
type State = 'in' | 'low' | 'out';
/** Where one finish stands: in stock, running low, or sold out. */
const state = (n: number): State => (n === 0 ? 'out' : n < LOW ? 'low' : 'in');
const STATES: [State, string][] = [
  ['in', 'In stock'],
  ['low', 'Running low'],
  ['out', 'Sold out'],
];
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

function Badge({ n }: { n: number }) {
  if (n === 0)
    return (
      <span className="gm-badge" data-tone="danger">
        Sold out
      </span>
    );
  if (n < LOW)
    return (
      <span className="gm-badge" data-tone="warning">
        {n} left
      </span>
    );
  return (
    <span className="gm-badge" data-tone="success">
      {n} in stock
    </span>
  );
}

function Chevron() {
  return (
    <svg
      className="cat-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const swatch = (color: string) => ({ '--swatch': color }) as CSSProperties;

export function ProductCatalogue() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('all');
  const [stockFilter, setStockFilter] = useState<string[]>([]);
  const table = useRef<GmTable>(null);
  const shows = (n: number) => !stockFilter.length || stockFilter.includes(state(n));
  // The Stock column's filter shows what the chips chose, and the other way round.
  useEffect(() => {
    const el = table.current;
    if (el && !same(el.filters.stock ?? [], stockFilter)) el.filter('stock', stockFilter);
  }, [stockFilter, items]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [folded, setFolded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setError('');
    listCatalogue()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [reload]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter(
    (p) =>
      (collection === 'all' || p.collection === collection) &&
      Object.values(p.stock).some(shows) &&
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.kind.toLowerCase().includes(q) ||
        p.finishes.some((f) => f.name.toLowerCase().includes(q))),
  );
  const allOpen = !!items && items.every((p) => open.has(p.id));
  const inCollection = (items ?? [])
    .filter((p) => collection === 'all' || p.collection === collection)
    .flatMap((p) => Object.values(p.stock));
  const clearAll = () => {
    setQuery('');
    setCollection('all');
    setStockFilter([]);
  };
  // What's narrowing the list, as a sentence: "Listen, running low or sold out: 4 pieces".
  const parts: string[] = [];
  if (collection !== 'all') parts.push(collections[collection]!.name);
  if (stockFilter.length) {
    const names = stockFilter.map((s) => STATES.find(([k]) => k === s)![1].toLowerCase());
    parts.push(
      names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0]!,
    );
  }
  if (q) parts.push(`matching “${query.trim()}”`);
  const sentence = parts.join(', ');

  const saveStock = async (p: Item, finish: string, value: string) => {
    const count = Math.max(0, Math.round(Number(value) || 0));
    await setStock(p.id, finish, count);
    setItems((all) =>
      all!.map((x) => (x.id === p.id ? { ...x, stock: { ...x.stock, [finish]: count } } : x)),
    );
    toast(`${p.name} in ${finish}: ${count} in stock`);
  };

  return (
    <AppShell
      current="products"
      title="Products"
      lede="The catalogue, by collection, with stock for every finish."
    >
      <section
        className="app-panel"
        aria-labelledby="catalogue-title"
        aria-busy={!items && !error ? true : undefined}
      >
        <h2 id="catalogue-title" className="on-sr-only">
          Products
        </h2>
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
              placeholder="Product, kind or finish"
              aria-label="Search products"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="app-filters" role="group" aria-label="Collection">
            {['all', ...Object.keys(collections)].map((c) => (
              <button
                key={c}
                className="gm-chip"
                type="button"
                aria-pressed={collection === c}
                onClick={() => setCollection(c)}
              >
                {c === 'all' ? 'All' : collections[c]!.name}
              </button>
            ))}
          </div>
          <div className="app-toolbar-end">
            <div className="app-filters" role="group" aria-label="Stock: choose one or several">
              {STATES.map(([s, label]) => {
                const n = inCollection.filter((x) => state(x) === s).length;
                return (
                  <button
                    key={s}
                    className="gm-chip"
                    type="button"
                    aria-pressed={stockFilter.includes(s)}
                    onClick={() =>
                      setStockFilter((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]))
                    }
                  >
                    {label} <span>{n || ''}</span>
                  </button>
                );
              })}
            </div>
            <button
              className="gm-chip gm-chip-plain"
              type="button"
              onClick={() => {
                setOpen(allOpen ? new Set() : new Set(items?.map((p) => p.id)));
                setFolded(new Set());
              }}
            >
              {allOpen ? 'Close all' : 'Open all'}
            </button>
          </div>
        </div>

        {error ? (
          <EmptyState
            alert
            title="Products didn't load"
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
        ) : items && !shown.length ? (
          <EmptyState
            title="No products match"
            action={
              <button className="gm-chip" type="button" onClick={clearAll}>
                Clear filters
              </button>
            }
          >
            Try another search, or show every collection.
          </EmptyState>
        ) : (
          <div className="app-table">
            {sentence && (
              <p className="app-active">
                <span>
                  {sentence[0]!.toUpperCase()}
                  {sentence.slice(1)}: {shown.length} {shown.length === 1 ? 'piece' : 'pieces'}
                </span>
                <button className="gm-chip gm-chip-plain" type="button" onClick={clearAll}>
                  Clear filters
                </button>
              </p>
            )}
            <GlassTable
              ref={table}
              stack
              // The rows are grouped and built here, so the filter is ours, not the table's.
              onFilter={({ filters }) => {
                const next = filters.stock ?? [];
                setStockFilter((f) => (same(f, next) ? f : next));
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="gm-num">Price</th>
                    <th>Finishes</th>
                    <th
                      data-filter="stock"
                      data-filter-options="in:In stock,low:Running low,out:Sold out"
                    >
                      Stock
                    </th>
                    <th className="gm-num">Sold</th>
                  </tr>
                </thead>
                {!items ? (
                  <tbody aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => (
                      <tr key={i}>
                        <td>
                          <span className="cat-product">
                            <span
                              className="gm-skeleton"
                              style={{ width: '2.5rem', height: '2.5rem', borderRadius: 12 }}
                            />
                            <span
                              className="gm-skeleton gm-skeleton-text"
                              style={{ width: '7rem' }}
                            />
                          </span>
                        </td>
                        <td className="gm-num">
                          <span
                            className="gm-skeleton gm-skeleton-text"
                            style={{ width: '4rem', marginLeft: 'auto' }}
                          />
                        </td>
                        <td>
                          <span
                            className="gm-skeleton gm-skeleton-text"
                            style={{ width: '3rem' }}
                          />
                        </td>
                        <td>
                          <span
                            className="gm-skeleton gm-skeleton-round"
                            style={{ width: '5rem', height: '1.4rem' }}
                          />
                        </td>
                        <td className="gm-num">
                          <span
                            className="gm-skeleton gm-skeleton-text"
                            style={{ width: '2rem', marginLeft: 'auto' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  Object.entries(collections).map(([id, group]) => {
                    const members = shown.filter((p) => p.collection === id);
                    if (!members.length) return null;
                    const lowCount = members.filter(isLow).length;
                    const closed = folded.has(id);
                    return (
                      <tbody key={id}>
                        <tr className="cat-group">
                          <th colSpan={5} data-label="" scope="rowgroup">
                            <button
                              type="button"
                              aria-expanded={!closed}
                              onClick={() => setFolded((f) => toggle(f, id))}
                            >
                              <Chevron />
                              {group.name}
                              <small>
                                {members.length} {members.length === 1 ? 'piece' : 'pieces'}
                                {lowCount ? ` · ${lowCount} low` : ''}
                              </small>
                            </button>
                          </th>
                        </tr>
                        {!closed &&
                          members.map((p) => {
                            // Filtering by stock opens a product on the finishes that match.
                            const expanded = open.has(p.id) || stockFilter.length > 0;
                            const sum = Object.values(p.stock).reduce((a, b) => a + b, 0);
                            const lowFinishes = Object.values(p.stock).filter(
                              (n) => n < LOW,
                            ).length;
                            return (
                              <Fragment key={p.id}>
                                <tr>
                                  <td>
                                    <span className="cat-product">
                                      <button
                                        className="cat-expand"
                                        type="button"
                                        aria-expanded={expanded}
                                        aria-controls={p.finishes
                                          .map((f) => `v-${p.id}-${f.name}`)
                                          .join(' ')}
                                        aria-label={`${p.name}'s finishes`}
                                        onClick={() => setOpen((o) => toggle(o, p.id))}
                                      >
                                        <Chevron />
                                      </button>
                                      <span className="cat-figure" aria-hidden="true">
                                        <span
                                          className="on-sigil"
                                          style={
                                            {
                                              '--sigil': `url('art/sigil-${p.id}.svg')`,
                                            } as CSSProperties
                                          }
                                        />
                                      </span>
                                      <span>
                                        <a href={`edit-product.html?id=${p.id}`}>{p.name}</a>
                                        <small>{p.kind}</small>
                                      </span>
                                    </span>
                                  </td>
                                  <td className="gm-num">{money(p.price)}</td>
                                  <td>
                                    <span
                                      className="cat-swatches"
                                      role="img"
                                      aria-label={p.finishes.map((f) => f.name).join(', ')}
                                    >
                                      {p.finishes.map((f) => (
                                        <span
                                          key={f.name}
                                          className="cat-swatch"
                                          style={swatch(f.color)}
                                          title={f.name}
                                        />
                                      ))}
                                    </span>
                                  </td>
                                  <td>
                                    {lowFinishes && sum ? (
                                      <span className="gm-badge" data-tone="warning">
                                        {sum} · {lowFinishes}{' '}
                                        {lowFinishes === 1 ? 'finish' : 'finishes'} low
                                      </span>
                                    ) : (
                                      <Badge n={sum} />
                                    )}
                                  </td>
                                  <td className="gm-num">{p.sold}</td>
                                </tr>
                                {p.finishes.map((f) => (
                                  <tr
                                    key={f.name}
                                    className="cat-variant"
                                    id={`v-${p.id}-${f.name}`}
                                    hidden={!expanded || !shows(p.stock[f.name]!)}
                                  >
                                    <td data-label="Finish">
                                      <span className="cat-swatch" style={swatch(f.color)} />
                                      {f.name}
                                    </td>
                                    <td data-label="" />
                                    <td data-label="" />
                                    <td data-label="Stock">
                                      <label className="cat-stock">
                                        <span className="on-sr-only">
                                          {p.name}, {f.name}, in stock
                                        </span>
                                        <input
                                          className="gm-input"
                                          type="number"
                                          min={0}
                                          inputMode="numeric"
                                          defaultValue={p.stock[f.name]}
                                          // Saves when the field is left, or on Enter.
                                          onBlur={(e) =>
                                            e.target.value !== String(p.stock[f.name]) &&
                                            saveStock(p, f.name, e.target.value)
                                          }
                                          onKeyDown={(e) =>
                                            e.key === 'Enter' && e.currentTarget.blur()
                                          }
                                        />
                                        <Badge n={p.stock[f.name]!} />
                                      </label>
                                    </td>
                                    <td data-label="" />
                                  </tr>
                                ))}
                              </Fragment>
                            );
                          })}
                      </tbody>
                    );
                  })
                )}
              </table>
            </GlassTable>
          </div>
        )}
      </section>
    </AppShell>
  );
}
