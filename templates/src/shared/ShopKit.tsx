import type { GmPopover } from '@glass-midas/components';
import { GlassMenu, GlassPopover } from '@glass-midas/react/overlays';
import { GlassSurface } from '@glass-midas/react/surfaces';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { image, onCart, onSaved, readCart, readSaved, toggleSaved, totals } from './cart-store.js';
import { money, product, reviews, type Finish, type Product } from './data.js';

// The store shell for React: the frosted bar (brand, collections, search, account, saved, cart),
// the mini cart behind the cart button, the footer, and the product card with its price, stars
// and heart. Load tokens.css, ondine.css and shop.css once in your app.

/** The cart's lines, kept in step with every change, here or in another tab. */
export function useCart() {
  const [lines, setLines] = useState(readCart);
  useEffect(() => onCart(setLines), []);
  return lines;
}

/** The saved pieces, kept in step with every change, here or in another tab. */
export function useSaved() {
  const [list, setList] = useState(readSaved);
  useEffect(() => onSaved(setList), []);
  return list;
}

/** A price, and what it was when it's on sale (with "was" for screen readers). */
export function Price({ p }: { p: Product }) {
  return (
    <span className="gm-price">
      <data value={p.price}>{money(p.price)}</data>
      {p.was && (
        <>
          <s>
            <span className="on-sr-only">was </span>
            {money(p.was)}
          </s>
          <span className="gm-price-off">−{Math.round((1 - p.price / p.was) * 100)}%</span>
        </>
      )}
    </span>
  );
}

/** Stars and how many reviews they come from. */
export function Stars({ value, label = `${value} out of 5` }: { value: number; label?: string }) {
  return (
    <span
      className="gm-rating"
      style={{ '--gm-rating': value } as CSSProperties}
      role="img"
      aria-label={label}
    />
  );
}

export function RatingLine({ id, long = false }: { id: string; long?: boolean }) {
  const { average, count } = reviews[id]!.rating;
  return (
    <>
      <Stars value={average} />{' '}
      <span>{long ? `${average} · ${count} reviews` : `${average} (${count})`}</span>
    </>
  );
}

const heart = <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />;

/** The heart that saves a piece for later, pressed when it's saved. */
export function SaveButton({
  p,
  finish,
  className = 'shop-save',
  onToggle,
}: {
  p: Product;
  finish: Finish;
  className?: string;
  onToggle?: (saved: boolean) => void;
}) {
  const saved = useSaved().some((s) => s.product === p.id);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={saved}
      aria-label={className === 'shop-save' ? `Save ${p.name} for later` : 'Save for later'}
      onClick={() => onToggle?.(toggleSaved(p.id, finish.name))}
    >
      {icon(heart)}
    </button>
  );
}

const LINKS = [
  ['listen', 'Listen'],
  ['room', 'Room'],
  ['ritual', 'Ritual'],
] as const;

const icon = (d: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

function Brand() {
  return (
    <a className="on-brand" href="storefront.html">
      <span className="on-sigil" aria-hidden="true" />
      Ondine
    </a>
  );
}

export function ShopShell({
  current,
  here,
  query = '',
  children,
}: {
  current?: string;
  /** The account or saved page, to mark its link in the bar. */
  here?: 'account' | 'saved';
  query?: string;
  children: ReactNode;
}) {
  const lines = useCart();
  const saved = useSaved();
  const t = totals(lines);
  const cartRef = useRef<GmPopover>(null);
  return (
    <>
      <div className="on-art on-art-tide" aria-hidden="true" />
      <div className="shop">
        <a className="app-skip" href="#main">
          Skip to content
        </a>
        <header className="shop-top shop-wrap">
          <GlassSurface className="shop-bar" material="frost" radius={999}>
            <Brand />
            <nav className="shop-links" aria-label="Collections">
              {LINKS.map(([id, label]) => (
                <a
                  key={id}
                  className="gm-chip gm-chip-plain"
                  href={`collection.html?c=${id}`}
                  aria-current={current === id ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
            </nav>
            <form className="shop-search" action="collection.html" role="search">
              <input
                className="gm-input"
                type="search"
                name="q"
                placeholder="Search pieces"
                aria-label="Search pieces"
                defaultValue={query}
              />
            </form>
            <div className="shop-actions">
              <button
                className="gm-chip gm-chip-plain gm-chip-round shop-menu-button"
                type="button"
                popoverTarget="shop-menu"
                aria-label="Menu"
              >
                {icon(<path d="M4 7h16M4 12h16M4 17h16" />)}
              </button>
              <a
                className="gm-chip gm-chip-plain gm-chip-round"
                href="account.html"
                aria-label="Account"
                aria-current={here === 'account' ? 'page' : undefined}
              >
                {icon(
                  <>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
                  </>,
                )}
              </a>
              <a
                className="gm-chip gm-chip-plain gm-chip-round"
                href="wishlist.html"
                aria-label={saved.length ? `Saved, ${saved.length}` : 'Saved, none yet'}
                aria-current={here === 'saved' ? 'page' : undefined}
              >
                {icon(heart)}
                <span className="shop-count" aria-hidden="true">
                  {saved.length || ''}
                </span>
              </a>
              <button
                className="gm-chip gm-chip-plain gm-chip-round"
                type="button"
                popoverTarget="mini-cart"
                aria-label={
                  t.count ? `Cart, ${t.count} ${t.count === 1 ? 'item' : 'items'}` : 'Cart, empty'
                }
              >
                {icon(
                  <>
                    <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
                    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
                  </>,
                )}
                <span className="shop-count" aria-hidden="true">
                  {t.count || ''}
                </span>
              </button>
            </div>
          </GlassSurface>
        </header>

        <GlassMenu id="shop-menu" aria-label="Collections">
          {LINKS.map(([id, label]) => (
            <a key={id} href={`collection.html?c=${id}`}>
              {label}
            </a>
          ))}
          <hr />
          <a href="collection.html">All pieces</a>
        </GlassMenu>

        <GlassPopover id="mini-cart" ref={cartRef} className="shop-cart" aria-label="Cart">
          <h2>Your cart</h2>
          {lines.length ? (
            <>
              <ul className="shop-cart-lines">
                {lines.map((l) => {
                  const p = product(l.product)!;
                  return (
                    <li key={`${l.product}-${l.finish}`}>
                      <img src={image(l.product, l.finish)} alt="" width={56} height={56} />
                      <span>
                        {p.name}
                        <small>
                          {l.finish} · {l.quantity} × {money(p.price)}
                        </small>
                      </span>
                      <span>{money(p.price * l.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="shop-cart-total">
                <span>Subtotal</span>
                <span>{money(t.subtotal)}</span>
              </p>
              <p className="shop-cart-note">
                {t.toFreeShipping
                  ? `${money(t.toFreeShipping)} more for free shipping.`
                  : 'Shipping is free.'}
              </p>
              <div className="shop-cart-actions">
                <a className="gm-chip gm-chip-primary" href="checkout.html">
                  Check out
                </a>
                <a className="gm-chip" href="cart.html">
                  View cart
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="shop-cart-empty">Nothing here yet.</p>
              <a className="gm-chip" href="collection.html">
                Browse the pieces
              </a>
            </>
          )}
        </GlassPopover>

        {children}

        <footer className="shop-foot">
          <div className="shop-wrap">
            <div className="shop-foot-grid">
              <div>
                <Brand />
                <p>Audio pieces, each tuned to its own figure.</p>
              </div>
              <div>
                <h2>Shop</h2>
                <ul>
                  {LINKS.map(([id, label]) => (
                    <li key={id}>
                      <a href={`collection.html?c=${id}`}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Help</h2>
                <ul>
                  <li>
                    <a href="#">Shipping</a>
                  </li>
                  <li>
                    <a href="returns.html">Returns</a>
                  </li>
                  <li>
                    <a href="#">Warranty</a>
                  </li>
                </ul>
              </div>
              <div>
                <h2>Ondine</h2>
                <ul>
                  <li>
                    <a href="#">The studio</a>
                  </li>
                  <li>
                    <a href="#">Journal</a>
                  </li>
                  <li>
                    <a href="#">Contact</a>
                  </li>
                </ul>
              </div>
            </div>
            <p className="shop-small">Free shipping over $150. 60 days to return anything.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

/** A product as a card: two pictures (the second on hover), its heart, name, kind, stars, price and finishes. */
export function ProductCard({ p }: { p: Product }) {
  const [finish, setFinish] = useState<Finish>(p.finishes[0]!);
  return (
    <li className="shop-card">
      <div className="shop-card-media">
        <img src={image(p.id, finish.name)} alt="" loading="lazy" width={400} height={400} />
        <img
          src={image(p.id, finish.name, 'detail')}
          alt=""
          loading="lazy"
          width={400}
          height={400}
        />
        {p.was && <span className="gm-badge shop-card-flag">On sale</span>}
      </div>
      <SaveButton p={p} finish={finish} />
      <h3>
        <a href={`product.html?id=${p.id}&finish=${finish.name.toLowerCase()}`}>{p.name}</a>
      </h3>
      <p>{p.kind}</p>
      <p className="shop-rating">
        <RatingLine id={p.id} />
      </p>
      <p className="shop-price">
        <Price p={p} />
      </p>
      {p.finishes.length > 1 && (
        <div className="shop-swatches" role="group" aria-label={`${p.name} finishes`}>
          {p.finishes.map((f) => (
            <button
              key={f.name}
              type="button"
              className="shop-swatch"
              style={{ '--swatch': f.color } as CSSProperties}
              aria-label={f.name}
              aria-pressed={f === finish}
              onClick={() => setFinish(f)}
            />
          ))}
        </div>
      )}
    </li>
  );
}
