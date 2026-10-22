import { GlassQuantity } from '@glass-midas/react/forms';
import { toast } from '@glass-midas/react/overlays';
import type { CSSProperties } from 'react';
import { ShopShell, useCart, useSaved } from '../shared/ShopKit';
import {
  FREE_SHIPPING,
  addToCart,
  image,
  removeFromCart,
  setQuantity,
  toggleSaved,
  totals,
} from '../shared/cart-store.js';
import { money, product, stock } from '../shared/data.js';

// The cart: every piece with its quantity, removable with an undo or saved for later, and every
// cost before checkout, including how far it is to free shipping. Under it, what was saved, one
// click from coming back. Load cart.css too.

export function CartPage() {
  const lines = useCart();
  const saved = useSaved();
  const t = totals(lines);

  const later = (id: string, finish: string) => {
    removeFromCart(id, finish);
    if (!saved.some((s) => s.product === id)) toggleSaved(id, finish);
    toast(`${product(id)!.name} is saved for later`);
  };
  const back = (id: string, finish: string) => {
    addToCart(id, finish);
    toggleSaved(id, finish);
    toast(`${product(id)!.name} is back in your cart`);
  };

  const remove = (id: string, finish: string, quantity: number) => {
    removeFromCart(id, finish);
    toast(`${product(id)!.name} in ${finish} removed`, {
      action: { label: 'Undo', onClick: () => addToCart(id, finish, quantity) },
    });
  };

  return (
    <ShopShell>
      <main id="main" className="shop-main shop-wrap">
        <h1 className="on-display cart-title">Your cart</h1>
        {lines.length ? (
          <div className="cart">
            <section aria-label="Pieces">
              <ul className="cart-lines">
                {lines.map((l) => {
                  const p = product(l.product)!;
                  return (
                    <li key={`${l.product}-${l.finish}`} className="cart-line">
                      <img src={image(l.product, l.finish)} alt="" width={112} height={112} />
                      <div>
                        <h2>
                          <a href={`product.html?id=${l.product}&finish=${l.finish.toLowerCase()}`}>
                            {p.name}
                          </a>
                        </h2>
                        <p>
                          {p.kind} · {l.finish} · {money(p.price)}
                        </p>
                        <div className="cart-line-controls">
                          <GlassQuantity>
                            <input
                              type="number"
                              min={1}
                              max={9}
                              value={l.quantity}
                              aria-label={`${p.name} in ${l.finish}, quantity`}
                              onChange={(e) =>
                                setQuantity(
                                  l.product,
                                  l.finish,
                                  Math.max(1, Math.min(9, Math.round(Number(e.target.value)) || 1)),
                                )
                              }
                            />
                          </GlassQuantity>
                          <button
                            className="gm-chip gm-chip-plain"
                            type="button"
                            onClick={() => later(l.product, l.finish)}
                          >
                            Save for later
                          </button>
                          <button
                            className="gm-chip gm-chip-plain"
                            type="button"
                            onClick={() => remove(l.product, l.finish, l.quantity)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <span className="cart-line-total">{money(p.price * l.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <aside className="cart-summary" aria-labelledby="summary-title">
              <h2 id="summary-title">Summary</h2>
              <div className="cart-free">
                <p id="free-text">
                  {t.toFreeShipping
                    ? `${money(t.toFreeShipping)} more for free shipping.`
                    : 'Shipping is free.'}
                </p>
                <span
                  className="gm-meter"
                  role="meter"
                  aria-labelledby="free-text"
                  aria-valuemin={0}
                  aria-valuemax={FREE_SHIPPING}
                  aria-valuenow={Math.min(FREE_SHIPPING, t.subtotal)}
                  style={
                    { '--value': String(Math.min(1, t.subtotal / FREE_SHIPPING)) } as CSSProperties
                  }
                />
              </div>
              <dl className="gm-totals">
                <dt>Subtotal</dt>
                <dd>{money(t.subtotal)}</dd>
                <dt>Shipping</dt>
                <dd>{t.shipping ? money(t.shipping) : 'Free'}</dd>
                <dt>Estimated tax</dt>
                <dd>{money(t.tax)}</dd>
                <dt className="gm-totals-total">Total</dt>
                <dd className="gm-totals-total">{money(t.total)}</dd>
              </dl>
              <a className="gm-chip gm-chip-primary" href="checkout.html">
                Check out
              </a>
              <p className="cart-note">
                Taxes are estimated for your area. 60 days to return anything.
              </p>
            </aside>
          </div>
        ) : (
          <div className="gm-empty">
            <span className="on-sigil gm-empty-art" aria-hidden="true" />
            <h2>Your cart is empty</h2>
            <p>Pieces you add stay here until you check out, even if you close the page.</p>
            <a className="gm-chip gm-chip-primary" href="collection.html">
              Browse the pieces
            </a>
          </div>
        )}

        {saved.length > 0 && (
          <section className="shop-section cart-saved" aria-labelledby="saved-title">
            <header>
              <h2 id="saved-title">Saved for later</h2>
              <a className="gm-chip gm-chip-plain" href="wishlist.html">
                See all saved
              </a>
            </header>
            <ul className="cart-saved-list">
              {saved.slice(0, 4).map((s) => {
                const p = product(s.product)!;
                return (
                  <li key={s.product}>
                    <img src={image(s.product, s.finish)} alt="" width={64} height={64} />
                    <span>
                      <a href={`product.html?id=${s.product}&finish=${s.finish.toLowerCase()}`}>
                        {p.name}
                      </a>
                      <small>
                        {s.finish} · {money(p.price)}
                      </small>
                    </span>
                    {stock[s.product]![s.finish] ? (
                      <button
                        className="gm-chip"
                        type="button"
                        onClick={() => back(s.product, s.finish)}
                      >
                        Move to cart
                      </button>
                    ) : (
                      <span className="gm-badge" data-tone="danger">
                        Sold out
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </ShopShell>
  );
}
