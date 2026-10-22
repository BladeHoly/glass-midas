import type { GmDialog } from '@glass-midas/components';
import { GlassSelect, GlassSlider } from '@glass-midas/react/forms';
import { GlassDialog } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ProductCard, ShopShell } from '../shared/ShopKit';
import { allFinishes, collections, findPieces } from '../shared/data.js';

// A collection, or every piece, or what a search found. The collection chips filter at once; the
// rest (price, finish, stock, sale) wait in a drawer until "Show". All of it lives in the
// address, so a link shares exactly this view and Back goes to the last one; each filter that's
// on shows as a chip to take it off. Load collection.css too.

const TOP = 1300;

type View = {
  c: string;
  q: string;
  sort: string;
  min: number;
  max: number;
  finishes: string[];
  stock: boolean;
  sale: boolean;
};

const read = (): View => {
  const params = new URLSearchParams(location.search);
  return {
    c: params.get('c') ?? 'all',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? 'featured',
    min: Number(params.get('min')) || 0,
    max: Number(params.get('max')) || TOP,
    finishes: params.get('finish')?.split(',').filter(Boolean) ?? [],
    stock: params.get('stock') === '1',
    sale: params.get('sale') === '1',
  };
};

const whole = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
const priceLabel = (min: number, max: number) =>
  min <= 0 && max >= TOP
    ? 'Any price'
    : max >= TOP
      ? `${whole(min)} and up`
      : `${whole(min)} – ${whole(max)}`;

export function CollectionGrid() {
  const [view, setView] = useState(read);
  const [draft, setDraft] = useState(view);
  const drawer = useRef<GmDialog>(null);
  useEffect(() => {
    const back = () => setView(read());
    addEventListener('popstate', back);
    return () => removeEventListener('popstate', back);
  }, []);

  const go = (change: Partial<View>) => {
    const next = { ...view, ...change };
    const params = new URLSearchParams();
    if (next.c !== 'all') params.set('c', next.c);
    if (next.q) params.set('q', next.q);
    if (next.sort !== 'featured') params.set('sort', next.sort);
    if (next.min > 0) params.set('min', String(next.min));
    if (next.max < TOP) params.set('max', String(next.max));
    if (next.finishes.length) params.set('finish', next.finishes.join(','));
    if (next.stock) params.set('stock', '1');
    if (next.sale) params.set('sale', '1');
    history.pushState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
    setView(next);
  };

  const { c, q } = view;
  const shown = findPieces(view);
  const drafted = findPieces(draft).length;
  const name = c === 'all' ? 'All pieces' : collections[c]!.name;
  const none = { min: 0, max: TOP, finishes: [], stock: false, sale: false };

  // The filters that are on, each a chip that takes it off.
  const on: [string, string, Partial<View>][] = [];
  if (view.min > 0 || view.max < TOP)
    on.push(['price', priceLabel(view.min, view.max), { min: 0, max: TOP }]);
  for (const f of view.finishes)
    on.push([`finish:${f}`, f, { finishes: view.finishes.filter((x) => x !== f) }]);
  if (view.stock) on.push(['stock', 'In stock now', { stock: false }]);
  if (view.sale) on.push(['sale', 'On sale', { sale: false }]);

  useEffect(() => {
    document.title = `${q ? `${q} · ` : ''}${name} · Ondine`;
  }, [q, name]);

  return (
    <ShopShell current={c} query={q}>
      <main id="main" className="shop-main shop-wrap">
        <header className="col-head">
          <h1 className="on-display">{q ? `“${q}”` : name}</h1>
          <p>
            {q
              ? 'What the search found.'
              : c === 'all'
                ? 'Everything Ondine makes.'
                : collections[c]!.blurb}
          </p>
        </header>
        <div className="col-tools">
          <div className="app-filters" role="group" aria-label="Collection">
            {['all', ...Object.keys(collections)].map((id) => (
              <button
                key={id}
                className="gm-chip"
                type="button"
                aria-pressed={c === id}
                onClick={() => go({ c: id })}
              >
                {id === 'all' ? 'All' : collections[id]!.name}
              </button>
            ))}
          </div>
          <button
            className="gm-chip col-filter-button"
            type="button"
            id="open-filters"
            aria-label={on.length ? `Filters, ${on.length} on` : 'Filters'}
            onClick={() => {
              setDraft(view);
              drawer.current?.show();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </svg>
            Filters
            {on.length > 0 && <span className="col-filter-count"> · {on.length}</span>}
          </button>
          <p className="col-count" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'piece' : 'pieces'}
          </p>
          <GlassSelect className="col-sort">
            <select
              aria-label="Sort by"
              value={view.sort}
              onChange={(e) => go({ sort: e.target.value })}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="rating">Best rated</option>
              <option value="name">Name</option>
            </select>
          </GlassSelect>
        </div>
        {on.length > 0 && (
          <div className="col-active" role="group" aria-label="Filters on">
            {on.map(([key, label, off]) => (
              <button
                key={key}
                type="button"
                className="gm-chip col-active-chip"
                aria-label={`Remove ${label}`}
                onClick={() => {
                  go(off);
                  document.querySelector<HTMLElement>('#open-filters')?.focus();
                }}
              >
                {label}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 7l10 10M17 7L7 17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ))}
            <button className="gm-chip gm-chip-plain" type="button" onClick={() => go(none)}>
              Clear all
            </button>
          </div>
        )}
        {shown.length ? (
          <ul className="shop-grid">
            {shown.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <div className="gm-empty">
            <span className="on-sigil gm-empty-art" aria-hidden="true" />
            <h2>Nothing matches</h2>
            <p>
              {q
                ? `Nothing called “${q}”${on.length ? ' with these filters' : ''}. Try another word, or look at every piece.`
                : on.length
                  ? 'Nothing matches these filters. Take one off, or look at every piece.'
                  : 'Nothing in this collection right now.'}
            </p>
            <button
              className="gm-chip"
              type="button"
              onClick={() => go({ c: 'all', q: '', sort: 'featured', ...none })}
            >
              Show every piece
            </button>
          </div>
        )}

        <GlassDialog ref={drawer} heading="Filters" placement="end">
          <form
            className="col-filters"
            onSubmit={(e) => {
              e.preventDefault();
              go({
                min: draft.min,
                max: draft.max,
                finishes: draft.finishes,
                stock: draft.stock,
                sale: draft.sale,
              });
              drawer.current?.close('apply');
            }}
          >
            <fieldset>
              <legend>Price</legend>
              <p className="col-price-out">{priceLabel(draft.min, draft.max)}</p>
              <GlassSlider>
                <input
                  type="range"
                  min={0}
                  max={TOP}
                  step={50}
                  value={draft.min}
                  aria-label="Lowest price"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, min: Math.min(Number(e.target.value), d.max) }))
                  }
                />
                <input
                  type="range"
                  min={0}
                  max={TOP}
                  step={50}
                  value={draft.max}
                  aria-label="Highest price"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, max: Math.max(Number(e.target.value), d.min) }))
                  }
                />
              </GlassSlider>
            </fieldset>
            <fieldset>
              <legend>Finish</legend>
              <div className="gm-choices">
                {allFinishes.map((f) => (
                  <label key={f.name} className="gm-choice">
                    <input
                      type="checkbox"
                      checked={draft.finishes.includes(f.name)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          finishes: e.target.checked
                            ? [...d.finishes, f.name]
                            : d.finishes.filter((x) => x !== f.name),
                        }))
                      }
                    />
                    <span
                      className="col-dot"
                      style={{ '--dot': f.color } as CSSProperties}
                      aria-hidden="true"
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="col-switches">
              <legend>Availability</legend>
              <label className="gm-check-label">
                <span>In stock now</span>
                <input
                  type="checkbox"
                  className="gm-toggle"
                  role="switch"
                  checked={draft.stock}
                  onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.checked }))}
                />
              </label>
              <label className="gm-check-label">
                <span>On sale</span>
                <input
                  type="checkbox"
                  className="gm-toggle"
                  role="switch"
                  checked={draft.sale}
                  onChange={(e) => setDraft((d) => ({ ...d, sale: e.target.checked }))}
                />
              </label>
            </fieldset>
            <div className="col-filter-actions">
              <button
                className="gm-chip gm-chip-plain"
                type="button"
                onClick={() => setDraft((d) => ({ ...d, ...none }))}
              >
                Clear all
              </button>
              <button className="gm-chip gm-chip-primary" type="submit" disabled={!drafted}>
                {drafted
                  ? `Show ${drafted} ${drafted === 1 ? 'piece' : 'pieces'}`
                  : 'Nothing matches'}
              </button>
            </div>
          </form>
        </GlassDialog>
      </main>
    </ShopShell>
  );
}
