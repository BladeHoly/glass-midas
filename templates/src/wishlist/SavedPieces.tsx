import { toast } from '@glass-midas/react/overlays';
import { useRef, type CSSProperties } from 'react';
import { Price, RatingLine, ShopShell, useSaved } from '../shared/ShopKit';
import { addToCart, image, setSavedFinish, toggleSaved } from '../shared/cart-store.js';
import { product, stock } from '../shared/data.js';

// Saved pieces: each in the finish it was saved in (which can change here), whether that finish
// is in stock, and a button to buy it; everything in stock into the cart at once; and a link to
// share the list. A shared link opens that list, to look at or keep. Load wishlist.css too.

type Piece = { product: string; finish: string };

const fromLink = (): Piece[] =>
  (new URLSearchParams(location.search).get('ids') ?? '')
    .split(',')
    .map((pair) => pair.split(':'))
    .flatMap(([id, finish]) => {
      const p = product(id ?? '');
      const f = p?.finishes.find((x) => x.name.toLowerCase() === finish) ?? p?.finishes[0];
      return p && f ? [{ product: p.id, finish: f.name }] : [];
    });

const left = (s: Piece) => stock[s.product]![s.finish]!;
const openCart = () => document.querySelector<HTMLElement>('#mini-cart')?.showPopover();

export function SavedPieces() {
  const saved = useSaved();
  const shared = useRef(fromLink()).current;
  const title = useRef<HTMLHeadingElement>(null);
  const mine = !shared.length;
  const shown: Piece[] = mine ? saved : shared;
  const ready = shown.filter((s) => left(s) > 0);

  const addAll = () => {
    for (const s of ready) addToCart(s.product, s.finish);
    toast(`${ready.length} ${ready.length === 1 ? 'piece' : 'pieces'} added to your cart`, {
      action: { label: 'View cart', onClick: openCart },
    });
  };
  const share = async () => {
    const ids = saved.map((s) => `${s.product}:${s.finish.toLowerCase()}`).join(',');
    const url = `${location.origin}${location.pathname}?ids=${ids}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied. Anyone with it sees this list.');
    } catch {
      toast(`Copy this link: ${url}`);
    }
  };
  const keep = () => {
    const fresh = shared.filter((s) => !saved.some((h) => h.product === s.product));
    for (const s of fresh) toggleSaved(s.product, s.finish);
    toast(
      fresh.length
        ? `${fresh.length} added to your saved pieces`
        : 'You had all of these saved already',
    );
  };
  const remove = (s: Piece, li: HTMLElement | null) => {
    const next = li?.nextElementSibling ?? li?.previousElementSibling;
    toggleSaved(s.product, s.finish);
    requestAnimationFrame(() =>
      (next?.querySelector<HTMLElement>('h2 a') ?? title.current)?.focus(),
    );
    toast(`${product(s.product)!.name} removed from saved`, {
      action: { label: 'Undo', onClick: () => toggleSaved(s.product, s.finish) },
    });
  };

  return (
    <ShopShell here="saved">
      <main id="main" className="shop-main shop-wrap">
        <header className="col-head wl-head">
          <div>
            <h1 className="on-display" ref={title} tabIndex={-1}>
              {mine ? 'Saved' : 'A saved list'}
            </h1>
            <p>
              {mine
                ? "Pieces you're keeping for another day, in the finish you liked."
                : 'Someone shared these pieces with you.'}
            </p>
          </div>
          <div className="wl-actions">
            {mine && shown.length > 0 && (
              <button className="gm-chip" type="button" onClick={share}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                  <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </svg>
                Copy a link to this list
              </button>
            )}
            {ready.length > 0 && (
              <button className="gm-chip gm-chip-primary" type="button" onClick={addAll}>
                {ready.length === shown.length
                  ? 'Add all to cart'
                  : `Add the ${ready.length} in stock to cart`}
              </button>
            )}
          </div>
        </header>

        {!mine && (
          <div className="wl-shared">
            <p>
              {shown.length} {shown.length === 1 ? 'piece' : 'pieces'}, as they were saved.
            </p>
            <button className="gm-chip" type="button" onClick={keep}>
              Save these to my list
            </button>
          </div>
        )}

        {shown.length > 0 ? (
          <>
            <p className="wl-count" aria-live="polite">
              {shown.length} {shown.length === 1 ? 'piece' : 'pieces'}
              {ready.length < shown.length &&
                `, ${shown.length - ready.length} sold out in the finish saved`}
            </p>
            <ul className="wl-grid">
              {shown.map((s) => {
                const p = product(s.product)!;
                const n = left(s);
                const href = `product.html?id=${p.id}&finish=${s.finish.toLowerCase()}`;
                return (
                  <li key={p.id} className="wl-card">
                    <a className="wl-media" href={href} tabIndex={-1} aria-hidden="true">
                      <img
                        src={image(p.id, s.finish)}
                        alt=""
                        width={400}
                        height={400}
                        loading="lazy"
                      />
                    </a>
                    <div className="wl-body">
                      <h2>
                        <a href={href}>{p.name}</a>
                      </h2>
                      <p className="wl-kind">{p.kind}</p>
                      <p className="shop-rating">
                        <RatingLine id={p.id} />
                      </p>
                      <p>
                        <Price p={p} />
                      </p>
                      {mine && p.finishes.length > 1 ? (
                        <fieldset className="gm-swatches wl-finishes">
                          <legend>
                            Finish: <strong>{s.finish}</strong>
                          </legend>
                          {p.finishes.map((f) => {
                            const out = !stock[p.id]![f.name];
                            return (
                              <input
                                key={f.name}
                                type="radio"
                                className="gm-swatch"
                                data-size="sm"
                                name={`finish-${p.id}`}
                                value={f.name}
                                style={{ '--gm-swatch': f.color } as CSSProperties}
                                aria-label={out ? `${f.name}, sold out` : f.name}
                                data-unavailable={out ? '' : undefined}
                                checked={f.name === s.finish}
                                onChange={() => setSavedFinish(p.id, f.name)}
                              />
                            );
                          })}
                        </fieldset>
                      ) : (
                        <p className="wl-kind">{s.finish}</p>
                      )}
                      <p className="wl-stock">
                        {n === 0 ? (
                          <>
                            <span className="gm-badge" data-tone="danger">
                              Sold out
                            </span>{' '}
                            in {s.finish}
                          </>
                        ) : n < 10 ? (
                          <span className="gm-badge" data-tone="warning">
                            {n} left
                          </span>
                        ) : (
                          <span className="gm-badge" data-tone="success">
                            In stock
                          </span>
                        )}
                      </p>
                      <div className="wl-buttons">
                        {n === 0 ? (
                          <a className="gm-chip" href={href}>
                            Tell me when it's back
                          </a>
                        ) : (
                          <button
                            className="gm-chip gm-chip-primary"
                            type="button"
                            onClick={() => {
                              addToCart(p.id, s.finish);
                              toast(`${p.name} in ${s.finish} is in your cart`, {
                                action: { label: 'View cart', onClick: openCart },
                              });
                            }}
                          >
                            Add to cart
                          </button>
                        )}
                        {mine && (
                          <button
                            className="gm-chip gm-chip-plain"
                            type="button"
                            aria-label={`Remove ${p.name} from saved`}
                            onClick={(e) => remove(s, e.currentTarget.closest('li'))}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="gm-empty">
            <svg
              className="gm-empty-art"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
            <h2>Nothing saved yet</h2>
            <p>Tap the heart on any piece to keep it here. Saved pieces stay in this browser.</p>
            <a className="gm-chip gm-chip-primary" href="collection.html">
              Browse the pieces
            </a>
          </div>
        )}
      </main>
    </ShopShell>
  );
}
