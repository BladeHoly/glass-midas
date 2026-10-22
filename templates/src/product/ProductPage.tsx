import type { GmDialog } from '@glass-midas/components';
import { GlassQuantity } from '@glass-midas/react/forms';
import { GlassDialog, toast } from '@glass-midas/react/overlays';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { ProductCard, ShopShell } from '../shared/ShopKit';
import { addToCart, extra, image } from '../shared/cart.js';
import { collections, money, products, stock, type Finish } from '../shared/data.js';

// A product: pictures that follow the finish and open large, the finish as a radio group that
// also says how many are left, a quantity, and one button to buy. Load product.css too.

export function ProductPage() {
  const params = new URLSearchParams(location.search);
  const p = products.find((x) => x.id === params.get('id')) ?? products[0]!;
  const [finish, setFinish] = useState<Finish>(
    p.finishes.find((f) => f.name.toLowerCase() === params.get('finish')) ?? p.finishes[0]!,
  );
  const [picture, setPicture] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const large = useRef<GmDialog>(null);
  const swatches = useRef<HTMLDivElement>(null);
  const left = stock[p.id]![finish.name]!;
  const max = Math.max(1, Math.min(9, left));

  useEffect(() => {
    document.title = `${p.name} · Ondine`;
    history.replaceState(null, '', `?id=${p.id}&finish=${finish.name.toLowerCase()}`);
    setQuantity((q) => Math.min(q, max));
  }, [p, finish, max]);

  const pictures = [
    { src: image(p.id, finish.name), alt: `${p.name} in ${finish.name}` },
    { src: image(p.id, finish.name, 'detail'), alt: `${p.name} in ${finish.name}, close up` },
    { src: extra(p.id, 'plate'), alt: `${p.name}'s figure: sand on a plate, drawn by its tuning` },
    { src: extra(p.id, 'box'), alt: `${p.name}'s box` },
  ];
  const shown = pictures[picture]!;

  // The finishes are a radio group: click one, or move with the arrow keys.
  const onKey = (e: KeyboardEvent) => {
    const step = (
      { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>
    )[e.key];
    if (!step) return;
    e.preventDefault();
    const next =
      p.finishes[(p.finishes.indexOf(finish) + step + p.finishes.length) % p.finishes.length]!;
    setFinish(next);
    requestAnimationFrame(() =>
      swatches.current?.querySelector<HTMLElement>(`[data-finish="${next.name}"]`)?.focus(),
    );
  };

  const buy = (e: { preventDefault(): void }) => {
    e.preventDefault();
    addToCart(p.id, finish.name, quantity);
    toast(`${p.name} in ${finish.name} is in your cart`, {
      action: {
        label: 'View cart',
        onClick: () => document.querySelector<HTMLElement>('#mini-cart')?.showPopover(),
      },
    });
  };

  const related = products
    .filter((x) => x.collection === p.collection && x.id !== p.id)
    .slice(0, 4);

  return (
    <ShopShell current={p.collection}>
      <main id="main" className="shop-main shop-wrap">
        <nav className="pd-crumbs" aria-label="Breadcrumb">
          <a href="storefront.html">Ondine</a> /{' '}
          <a href={`collection.html?c=${p.collection}`}>{collections[p.collection]!.name}</a> /{' '}
          <span aria-current="page">{p.name}</span>
        </nav>
        <div className="pd">
          <section className="pd-gallery" aria-label="Pictures">
            <button
              className="pd-main"
              type="button"
              aria-label="See it larger"
              onClick={() => large.current?.show()}
            >
              <img src={shown.src} alt={shown.alt} width={800} height={800} />
            </button>
            <div className="pd-thumbs" role="group" aria-label="Choose a picture">
              {pictures.map((pic, i) => (
                <button
                  key={pic.src}
                  type="button"
                  aria-label={pic.alt}
                  aria-pressed={i === picture}
                  onClick={() => setPicture(i)}
                >
                  <img src={pic.src} alt="" width={200} height={200} />
                </button>
              ))}
            </div>
          </section>

          <section className="pd-info" aria-labelledby="name">
            <p className="pd-kind">{p.kind}</p>
            <h1 className="on-display" id="name">
              {p.name}
            </h1>
            <p className="pd-price">{money(p.price)}</p>
            <p className="pd-blurb">{p.blurb}</p>

            <form className="pd-buy" onSubmit={buy}>
              <fieldset className="pd-finishes">
                <legend id="finish-legend">
                  Finish: <strong>{finish.name}</strong>
                </legend>
                <div
                  className="shop-swatches"
                  role="radiogroup"
                  aria-labelledby="finish-legend"
                  ref={swatches}
                  onKeyDown={onKey}
                >
                  {p.finishes.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      role="radio"
                      className="shop-swatch"
                      style={{ '--swatch': f.color } as CSSProperties}
                      aria-label={f.name}
                      aria-checked={f === finish}
                      tabIndex={f === finish ? 0 : -1}
                      data-finish={f.name}
                      onClick={() => setFinish(f)}
                    />
                  ))}
                </div>
              </fieldset>
              <p className="pd-stock" aria-live="polite">
                {left === 0 ? (
                  <>
                    <span className="gm-badge" data-tone="danger">
                      Sold out
                    </span>{' '}
                    Back in about three weeks.
                  </>
                ) : left < 10 ? (
                  <>
                    <span className="gm-badge" data-tone="warning">
                      {left} left
                    </span>{' '}
                    in {finish.name}.
                  </>
                ) : (
                  <>
                    <span className="gm-badge" data-tone="success">
                      In stock
                    </span>{' '}
                    Ships in 2 working days.
                  </>
                )}
              </p>
              <div className="pd-row">
                <GlassQuantity>
                  <input
                    type="number"
                    min={1}
                    max={max}
                    value={quantity}
                    aria-label="Quantity"
                    onChange={(e) =>
                      setQuantity(Math.min(max, Math.max(1, Number(e.target.value) || 1)))
                    }
                  />
                </GlassQuantity>
                <button className="gm-chip gm-chip-primary" type="submit" disabled={left === 0}>
                  {left === 0 ? `Sold out in ${finish.name}` : 'Add to cart'}
                </button>
              </div>
              <p className="pd-ship">Free shipping over $150 · 60 days to return it</p>
            </form>

            <details className="pd-more" open>
              <summary>Specifications</summary>
              <dl>
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <details className="pd-more">
              <summary>In the box</summary>
              <p>
                {p.name}, its cable or case where it has one, a card with its figure, and a cloth
                bag.
              </p>
            </details>
            <details className="pd-more">
              <summary>Shipping and returns</summary>
              <p>
                Ships in 2 working days from Lisbon. Free over $150, otherwise $12. Send it back
                within 60 days, in any condition that isn't damage, for a full refund.
              </p>
            </details>
          </section>
        </div>

        {related.length > 0 && (
          <section className="shop-section" aria-labelledby="related-title">
            <header>
              <h2 id="related-title">From the same collection</h2>
            </header>
            <ul className="shop-grid">
              {related.map((x) => (
                <ProductCard key={x.id} p={x} />
              ))}
            </ul>
          </section>
        )}

        <GlassDialog ref={large} id="large" aria-label="Picture, large">
          <img id="large-image" src={shown.src} alt={shown.alt} width={800} height={800} />
          <form method="dialog" className="dialog-actions">
            <button className="gm-chip" value="close">
              Close
            </button>
          </form>
        </GlassDialog>
      </main>
    </ShopShell>
  );
}
