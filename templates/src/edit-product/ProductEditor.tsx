import type { GmUpload } from '@glass-midas/components';
import { GlassTable } from '@glass-midas/react/data';
import { GlassQuantity, GlassSelect, GlassUpload } from '@glass-midas/react/forms';
import { toast } from '@glass-midas/react/overlays';
import { GlassSurface } from '@glass-midas/react/surfaces';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AppShell } from '../shared/AppKit';
import { adminProduct, problems, saveProduct, type EditProduct } from '../shared/admin-store.js';
import { money } from '../shared/data.js';

// Editing a product: the basics, the pictures, its finishes with their SKUs and stock, the price
// (with what's left after the cost), where it lives and how it shows in search. Nothing saves on
// its own: a bar floats up with the first change, and leaving asks first. Saving checks every
// field, lists what needs a look at the top (each a link to its field) and marks the fields.
// Load edit-product.css too.

type Draft = EditProduct & { pictures: string[] };

const LABELS: Record<string, string> = {
  name: 'Name',
  price: 'Price',
  was: 'Price before',
  cost: 'Cost',
  finishes: 'Finishes',
  seoTitle: 'Search title',
  seoDescription: 'Search description',
};
const stamp = (at: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${at}Z`));
const art = () => document.documentElement.dataset.art || 'art/';
const X = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 6l12 12M18 6L6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/[^\d.-]/g, '')));

export function ProductEditor() {
  const [saved, setSaved] = useState<Draft | null | undefined>(undefined);
  const [p, setP] = useState<Draft | null>(null);
  const [raw, setRaw] = useState({ price: '', was: '', cost: '', weight: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [tag, setTag] = useState('');
  const [pictureError, setPictureError] = useState('');
  const summary = useRef<HTMLDivElement>(null);
  const upload = useRef<GmUpload>(null);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id') || 'tide';
    adminProduct(id).then((loaded) => {
      if (!loaded) return setSaved(null);
      const draft: Draft = {
        ...loaded,
        pictures: (loaded as Draft).pictures ?? [
          ...loaded.finishes.map(
            (f) => `${art()}products/${loaded.id}-${f.name.toLowerCase()}.svg`,
          ),
          `${art()}products/${loaded.id}-plate.webp`,
          `${art()}products/${loaded.id}-box.svg`,
        ],
      };
      setSaved(draft);
      setP(draft);
      setRaw({
        price: String(draft.price),
        was: draft.was == null ? '' : String(draft.was),
        cost: String(draft.cost),
        weight: String(draft.weight),
      });
    });
  }, []);

  const dirty = !!p && !!saved && JSON.stringify(p) !== JSON.stringify(saved);
  useEffect(() => {
    if (p) document.title = `${p.name || 'Untitled'} · Products · Ondine`;
  }, [p?.name]);
  // Leaving with changes asks first.
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    addEventListener('beforeunload', leave);
    return () => removeEventListener('beforeunload', leave);
  }, [dirty]);

  const crumbs = (
    <nav className="gm-breadcrumbs ep-crumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="catalogue.html">Products</a>
        </li>
        <li>
          <span aria-current="page">{p?.name || 'Product'}</span>
        </li>
      </ol>
    </nav>
  );

  if (!p || !saved)
    return (
      <AppShell
        current="products"
        title="Product"
        lede="Everything the store shows about it, and what only the team sees."
      >
        {crumbs}
        {saved === null ? (
          <div className="gm-empty">
            <span className="on-sigil gm-empty-art" aria-hidden="true" />
            <h2>No product here</h2>
            <p>It may have been removed. The catalogue has every piece.</p>
            <a className="gm-chip gm-chip-primary" href="catalogue.html">
              All products
            </a>
          </div>
        ) : (
          <div className="ep-loading" aria-busy="true">
            <span className="gm-skeleton gm-skeleton-text" />
            <span className="gm-skeleton ep-skeleton" />
          </div>
        )}
      </AppShell>
    );

  const set = (change: Partial<Draft>) => setP((x) => ({ ...x!, ...change }));
  const setMoney = (key: 'price' | 'was' | 'cost' | 'weight', value: string) => {
    setRaw((r) => ({ ...r, [key]: value }));
    const n = num(value);
    set({ [key]: key === 'was' ? n : (n ?? 0) } as Partial<Draft>);
  };
  const setFinish = (i: number, change: Partial<Draft['finishes'][number]>) =>
    set({ finishes: p.finishes.map((f, k) => (k === i ? { ...f, ...change } : f)) });
  const invalid = (key: string) => (errors[key] ? { 'aria-invalid': true as const } : {});
  const errorOf = (key: string) => (
    <p className="gm-field-error" id={`${key}-error`}>
      {errors[key]}
    </p>
  );
  const profit = p.price - p.cost;
  const stock = p.finishes.reduce((n, f) => n + (Number(f.stock) || 0), 0);
  const label = (key: string) => {
    const m = key.match(/^finish-(\d+)-(\w+)$/);
    return m
      ? `${p.finishes[Number(m[1])]?.name || `Finish ${Number(m[1]) + 1}`}, ${m[2] === 'sku' ? 'SKU' : m[2]}`
      : (LABELS[key] ?? key);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = problems(p);
    setErrors(found);
    if (Object.keys(found).length) return requestAnimationFrame(() => summary.current?.focus());
    setBusy(true);
    try {
      const next = (await saveProduct(p)) as Draft;
      setSaved(next);
      setP(next);
      toast(`${next.name} is saved`, {
        action: {
          label: 'View in the store',
          onClick: () => (location.href = `product.html?id=${next.id}`),
        },
      });
    } catch (err) {
      setErrors((err as { fields?: Record<string, string> }).fields ?? {});
    } finally {
      setBusy(false);
    }
  };
  const discard = () => {
    setP(saved);
    setRaw({
      price: String(saved.price),
      was: saved.was == null ? '' : String(saved.was),
      cost: String(saved.cost),
      weight: String(saved.weight),
    });
    setErrors({});
    toast('Changes discarded');
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tag.trim()) {
      e.preventDefault();
      const t = tag.trim().toLowerCase().replace(/,$/, '');
      if (!p.tags.includes(t)) set({ tags: [...p.tags, t] });
      setTag('');
    } else if (e.key === 'Enter') e.preventDefault();
    else if (e.key === 'Backspace' && !tag && p.tags.length) set({ tags: p.tags.slice(0, -1) });
  };
  const removeFinish = (i: number) => {
    const gone = p.finishes[i]!;
    const before = p.finishes;
    set({ finishes: p.finishes.filter((_, k) => k !== i) });
    toast(`${gone.name || 'The finish'} removed`, {
      action: { label: 'Undo', onClick: () => set({ finishes: before }) },
    });
  };

  return (
    <AppShell
      current="products"
      title={p.name || 'Untitled'}
      lede={`${p.kind} · Saved ${stamp(saved.updated)}`}
    >
      {crumbs}
      <form className="ep" onSubmit={submit} noValidate>
        {Object.keys(errors).filter((k) => errors[k]).length > 0 && (
          <div className="ep-summary" role="alert" tabIndex={-1} ref={summary}>
            <h2>
              {Object.keys(errors).length}{' '}
              {Object.keys(errors).length === 1 ? 'field needs' : 'fields need'} a look
            </h2>
            <ul>
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>
                  <a
                    href={`#${key === 'finishes' ? 'add-finish' : key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const target = document.getElementById(
                        key === 'finishes' ? 'add-finish' : key,
                      );
                      target?.scrollIntoView({ block: 'center' });
                      target?.focus();
                    }}
                  >
                    {label(key)}
                  </a>
                  : {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ep-grid">
          <div className="ep-main">
            <section className="ep-card" aria-labelledby="basics-title">
              <h2 id="basics-title">Basics</h2>
              <div className="gm-field">
                <label htmlFor="name">Name</label>
                <input
                  className="gm-input"
                  id="name"
                  required
                  aria-describedby="name-error"
                  {...invalid('name')}
                  value={p.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
                {errorOf('name')}
              </div>
              <div className="gm-field">
                <label htmlFor="kind">What it is</label>
                <input
                  className="gm-input"
                  id="kind"
                  aria-describedby="kind-hint"
                  value={p.kind}
                  onChange={(e) => set({ kind: e.target.value })}
                />
                <p className="gm-field-hint" id="kind-hint">
                  Shown above the name: "Over-ear headphones".
                </p>
              </div>
              <div className="gm-field">
                <label htmlFor="blurb">Description</label>
                <textarea
                  className="gm-input"
                  id="blurb"
                  rows={3}
                  maxLength={300}
                  aria-describedby="blurb-count"
                  value={p.blurb}
                  onChange={(e) => set({ blurb: e.target.value })}
                />
                <p className="gm-field-hint ep-count" id="blurb-count" aria-live="polite">
                  {p.blurb.length} of 300
                </p>
              </div>
            </section>

            <section className="ep-card" aria-labelledby="pictures-title">
              <h2 id="pictures-title">Pictures</h2>
              <ul className="ep-pictures">
                {p.pictures.map((src, i) => (
                  <li key={src}>
                    <img src={src} alt="" width={120} height={120} />
                    {i === 0 && (
                      <span className="gm-badge" data-tone="info">
                        Main
                      </span>
                    )}
                    <button
                      className="gm-chip gm-chip-round"
                      type="button"
                      aria-label={`Remove picture ${i + 1}`}
                      onClick={() => set({ pictures: p.pictures.filter((_, k) => k !== i) })}
                    >
                      {X}
                    </button>
                  </li>
                ))}
              </ul>
              <GlassUpload
                ref={upload}
                maxSize="10 MB"
                maxFiles={8}
                onFilesChange={(e) => {
                  const files = e.detail.files;
                  if (!files.length) return;
                  setPictureError('');
                  // In a real store, upload them here and add their URLs; the demo shows them from memory.
                  set({ pictures: [...p.pictures, ...files.map((f) => URL.createObjectURL(f))] });
                  if (upload.current) upload.current.files = [];
                }}
                onReject={(e) => {
                  const { file, reason } = e.detail;
                  const why = {
                    type: "isn't a picture",
                    size: 'is over 10 MB',
                    count: 'is one too many',
                  }[reason];
                  setPictureError(`${file.name} ${why}, so it's not added.`);
                }}
              >
                <input type="file" accept="image/*" multiple aria-label="Add pictures" />
              </GlassUpload>
              <p className="gm-field-error" aria-live="polite">
                {pictureError}
              </p>
            </section>

            <section className="ep-card" aria-labelledby="finishes-title">
              <header className="ep-card-head">
                <h2 id="finishes-title">Finishes</h2>
                <p className="ep-small">
                  {stock} in stock across {p.finishes.length}{' '}
                  {p.finishes.length === 1 ? 'finish' : 'finishes'}
                </p>
              </header>
              <GlassTable className="ep-finishes" density="compact">
                <table>
                  <caption className="on-sr-only">Finishes, with their SKU and stock</caption>
                  <thead>
                    <tr>
                      <th scope="col">Color</th>
                      <th scope="col">Name</th>
                      <th scope="col">SKU</th>
                      <th scope="col" className="gm-num">
                        In stock
                      </th>
                      <th scope="col">
                        <span className="on-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.finishes.map((f, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            type="color"
                            className="ep-color"
                            value={f.color}
                            aria-label={`Color of ${f.name || 'the new finish'}`}
                            onChange={(e) => setFinish(i, { color: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="gm-input"
                            id={`finish-${i}-name`}
                            aria-label="Finish name"
                            aria-describedby={`finish-${i}-name-error`}
                            {...invalid(`finish-${i}-name`)}
                            value={f.name}
                            onChange={(e) => setFinish(i, { name: e.target.value })}
                          />
                          {errorOf(`finish-${i}-name`)}
                        </td>
                        <td>
                          <input
                            className="gm-input ep-sku"
                            id={`finish-${i}-sku`}
                            spellCheck={false}
                            aria-label={`SKU of ${f.name}`}
                            aria-describedby={`finish-${i}-sku-error`}
                            {...invalid(`finish-${i}-sku`)}
                            value={f.sku}
                            onChange={(e) => setFinish(i, { sku: e.target.value })}
                          />
                          {errorOf(`finish-${i}-sku`)}
                        </td>
                        <td className="gm-num">
                          <GlassQuantity>
                            <input
                              type="number"
                              min={0}
                              max={9999}
                              id={`finish-${i}-stock`}
                              aria-label={`${f.name} in stock`}
                              value={f.stock}
                              onChange={(e) => setFinish(i, { stock: Number(e.target.value) })}
                            />
                          </GlassQuantity>
                        </td>
                        <td>
                          <button
                            className="gm-chip gm-chip-plain gm-chip-round"
                            type="button"
                            disabled={p.finishes.length === 1}
                            aria-label={`Remove ${f.name || 'this finish'}`}
                            onClick={() => removeFinish(i)}
                          >
                            {X}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassTable>
              {errorOf('finishes')}
              <button
                className="gm-chip"
                type="button"
                id="add-finish"
                onClick={() => {
                  set({
                    finishes: [
                      ...p.finishes,
                      { name: '', color: '#888888', sku: `ON-${p.id.toUpperCase()}-`, stock: 0 },
                    ],
                  });
                  requestAnimationFrame(() =>
                    document.getElementById(`finish-${p.finishes.length}-name`)?.focus(),
                  );
                }}
              >
                Add a finish
              </button>
            </section>

            <section className="ep-card" aria-labelledby="pricing-title">
              <h2 id="pricing-title">Pricing</h2>
              <div className="ep-row">
                {(
                  [
                    ['price', 'Price', ''],
                    ['was', 'Price before', 'for a sale'],
                    ['cost', 'Cost to make', ''],
                  ] as const
                ).map(([key, text, note]) => (
                  <div key={key} className="gm-field">
                    <label htmlFor={key}>
                      {text} {note && <span className="ep-optional">({note})</span>}
                    </label>
                    <div className="gm-input-group">
                      <span aria-hidden="true">$</span>
                      <input
                        className="gm-input"
                        id={key}
                        inputMode="decimal"
                        aria-describedby={`${key === 'cost' ? 'cost-hint ' : ''}${key}-error`}
                        {...invalid(key)}
                        value={raw[key]}
                        onChange={(e) => setMoney(key, e.target.value)}
                      />
                    </div>
                    {key === 'cost' && (
                      <p className="gm-field-hint" id="cost-hint">
                        Only the team sees it.
                      </p>
                    )}
                    {errorOf(key)}
                  </div>
                ))}
              </div>
              {p.price > 0 && (
                <dl className="gm-totals ep-margin">
                  <dt>Profit on each</dt>
                  <dd>{money(profit)}</dd>
                  <dt className="gm-totals-total">Margin</dt>
                  <dd className="gm-totals-total">{Math.round((profit / p.price) * 100)}%</dd>
                </dl>
              )}
              <label className="gm-check-label ep-switch">
                <span>Charge tax on it</span>
                <input
                  type="checkbox"
                  className="gm-toggle"
                  role="switch"
                  checked={p.taxable}
                  onChange={(e) => set({ taxable: e.target.checked })}
                />
              </label>
            </section>

            <section className="ep-card" aria-labelledby="shipping-title">
              <h2 id="shipping-title">Shipping</h2>
              <div className="gm-field ep-narrow">
                <label htmlFor="weight">Weight, packed</label>
                <div className="gm-input-group">
                  <input
                    className="gm-input"
                    id="weight"
                    inputMode="numeric"
                    value={raw.weight}
                    onChange={(e) => setMoney('weight', e.target.value)}
                  />
                  <span aria-hidden="true">g</span>
                </div>
              </div>
            </section>
          </div>

          <aside className="ep-side">
            <section className="ep-card" aria-labelledby="status-title">
              <h2 id="status-title">Status</h2>
              <fieldset className="gm-options" aria-labelledby="status-title">
                {(
                  [
                    ['active', 'Active', 'In the store, for sale'],
                    ['draft', 'Draft', 'Only the team sees it'],
                    ['archived', 'Archived', 'Out of the store; orders keep it'],
                  ] as const
                ).map(([value, text, note]) => (
                  <label key={value} className="gm-option">
                    <input
                      type="radio"
                      className="gm-check"
                      name="status"
                      checked={p.status === value}
                      onChange={() => set({ status: value })}
                    />
                    <span>
                      {text}
                      <small>{note}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>

            <section className="ep-card" aria-labelledby="org-title">
              <h2 id="org-title">Where it lives</h2>
              <div className="gm-field">
                <label htmlFor="ep-collection">Collection</label>
                <GlassSelect>
                  <select
                    id="ep-collection"
                    value={p.collection}
                    onChange={(e) => set({ collection: e.target.value })}
                  >
                    <option value="listen">Listen</option>
                    <option value="room">Room</option>
                    <option value="ritual">Ritual</option>
                  </select>
                </GlassSelect>
              </div>
              <div className="gm-field">
                <label htmlFor="tag-input">Tags</label>
                {p.tags.length > 0 && (
                  <ul className="ep-tags" aria-label="Tags">
                    {p.tags.map((t, i) => (
                      <li key={t}>
                        <span className="gm-chip ep-tag">
                          {t}
                          <button
                            type="button"
                            aria-label={`Remove the tag ${t}`}
                            onClick={() => {
                              set({ tags: p.tags.filter((_, k) => k !== i) });
                              document.getElementById('tag-input')?.focus();
                            }}
                          >
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
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  className="gm-input"
                  id="tag-input"
                  autoComplete="off"
                  placeholder="Type a tag, then Enter"
                  aria-describedby="tag-hint"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={onTagKey}
                />
                <p className="gm-field-hint" id="tag-hint">
                  For search and filters. Backspace takes off the last.
                </p>
              </div>
            </section>

            <section className="ep-card" aria-labelledby="seo-title">
              <h2 id="seo-title">In search results</h2>
              <div className="ep-snippet" aria-hidden="true">
                <span className="ep-snippet-url">
                  ondine.example › {p.collection} › {p.id}
                </span>
                <span className="ep-snippet-title">{p.seoTitle || p.name}</span>
                <span className="ep-snippet-text">{p.seoDescription || p.blurb}</span>
              </div>
              <div className="gm-field">
                <label htmlFor="seoTitle">Title</label>
                <input
                  className="gm-input"
                  id="seoTitle"
                  aria-describedby="seoTitle-count seoTitle-error"
                  {...invalid('seoTitle')}
                  value={p.seoTitle}
                  onChange={(e) => set({ seoTitle: e.target.value })}
                />
                <p
                  className={`gm-field-hint ep-count${p.seoTitle.length > 60 ? ' is-over' : ''}`}
                  id="seoTitle-count"
                >
                  {p.seoTitle.length} of 60
                </p>
                {errorOf('seoTitle')}
              </div>
              <div className="gm-field">
                <label htmlFor="seoDescription">Description</label>
                <textarea
                  className="gm-input"
                  id="seoDescription"
                  rows={3}
                  aria-describedby="seoDescription-count seoDescription-error"
                  {...invalid('seoDescription')}
                  value={p.seoDescription}
                  onChange={(e) => set({ seoDescription: e.target.value })}
                />
                <p
                  className={`gm-field-hint ep-count${p.seoDescription.length > 160 ? ' is-over' : ''}`}
                  id="seoDescription-count"
                >
                  {p.seoDescription.length} of 160
                </p>
                {errorOf('seoDescription')}
              </div>
            </section>
          </aside>
        </div>

        {/* Unsaved changes: the one glass on the page, floating where the hand is. */}
        {dirty && (
          <GlassSurface className="ep-bar" material="frost" radius={999}>
            <p>Unsaved changes</p>
            <button className="gm-chip gm-chip-plain" type="button" onClick={discard}>
              Discard
            </button>
            <button className="gm-chip gm-chip-primary" type="submit" aria-busy={busy || undefined}>
              Save
            </button>
          </GlassSurface>
        )}
      </form>
    </AppShell>
  );
}
