import { GlassSelect } from '@glass-midas/react/forms';
import { useEffect, useState } from 'react';
import { ProductCard, ShopShell } from '../shared/ShopKit';
import { collections, products, type Product } from '../shared/data.js';

// A collection, or every piece, or what a search found: the filter and the sort live in the
// address, so a link shares exactly this view and Back goes to the last one.
// Load collection.css too.

const SORTS: Record<string, (a: Product, b: Product) => number> = {
  featured: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name),
};

const read = () => {
  const params = new URLSearchParams(location.search);
  return {
    c: params.get('c') ?? 'all',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? 'featured',
  };
};

export function CollectionGrid() {
  const [view, setView] = useState(read);
  useEffect(() => {
    const back = () => setView(read());
    addEventListener('popstate', back);
    return () => removeEventListener('popstate', back);
  }, []);

  const go = (change: Partial<typeof view>) => {
    const next = { ...view, ...change };
    const params = new URLSearchParams();
    if (next.c !== 'all') params.set('c', next.c);
    if (next.q) params.set('q', next.q);
    if (next.sort !== 'featured') params.set('sort', next.sort);
    history.pushState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
    setView(next);
  };

  const { c, q, sort } = view;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = products
    .filter((p) => c === 'all' || p.collection === c)
    .filter((p) =>
      words.every((w) =>
        `${p.name} ${p.kind} ${p.finishes.map((f) => f.name).join(' ')}`.toLowerCase().includes(w),
      ),
    )
    .sort(SORTS[sort] ?? SORTS.featured);
  const name = c === 'all' ? 'All pieces' : collections[c]!.name;

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
          <p className="col-count" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'piece' : 'pieces'}
          </p>
          <GlassSelect className="col-sort">
            <select
              aria-label="Sort by"
              value={sort}
              onChange={(e) => go({ sort: e.target.value })}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="name">Name</option>
            </select>
          </GlassSelect>
        </div>
        {shown.length ? (
          <ul className="shop-grid">
            {shown.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <div className="app-empty">
            <span className="on-sigil" aria-hidden="true" />
            <h2>Nothing matches</h2>
            <p>
              {q
                ? `Nothing called “${q}”. Try another word, or look at every piece.`
                : 'Nothing in this collection right now.'}
            </p>
            <button
              className="gm-chip"
              type="button"
              onClick={() => go({ c: 'all', q: '', sort: 'featured' })}
            >
              Show every piece
            </button>
          </div>
        )}
      </main>
    </ShopShell>
  );
}
