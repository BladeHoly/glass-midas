import { toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState } from 'react';
import { ShopShell } from '../shared/ShopKit';
import { image, lastOrder } from '../shared/cart-store.js';
import { money, product } from '../shared/data.js';

// The confirmation: thanks by name, the order's number, what happens next and when it arrives,
// what was ordered and where it goes, and an offer to save the details, never a requirement.
// Load confirmation.css too.

const arrival = (days: number) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(
    new Date(Date.now() + days * 86400000),
  );

export function OrderConfirmation() {
  const [order] = useState(lastOrder);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const thanks = useRef<HTMLHeadingElement>(null);
  const first = order?.name.split(' ')[0];

  useEffect(() => {
    if (!order) return;
    document.title = `Thank you, ${first} · Ondine`;
    thanks.current?.focus();
  }, [order, first]);

  if (!order) {
    return (
      <ShopShell>
        <main id="main" className="shop-main shop-wrap">
          <div className="app-empty">
            <span className="on-sigil" aria-hidden="true" />
            <h1>No order to show</h1>
            <p>This page shows an order right after checkout.</p>
            <a className="gm-chip gm-chip-primary" href="storefront.html">
              Go to the store
            </a>
          </div>
        </main>
      </ShopShell>
    );
  }

  const t = order.totals;
  return (
    <ShopShell>
      <main id="main" className="shop-main shop-wrap">
        <div className="cf">
          <header className="cf-head">
            <span className="on-sigil cf-sigil" aria-hidden="true" />
            <p className="cf-number">Order #{order.number}</p>
            <h1 className="on-display" tabIndex={-1} ref={thanks}>
              Thank you, {first}
            </h1>
            <p>We've sent the receipt to {order.email}. We'll email again when it ships.</p>
          </header>

          <ol className="cf-steps" aria-label="What happens next">
            <li className="is-done">
              <strong>Ordered</strong>
              <span>Just now</span>
            </li>
            <li>
              <strong>Packed</strong>
              <span>Within 2 working days</span>
            </li>
            <li>
              <strong>Shipped</strong>
              <span>We email the tracking link</span>
            </li>
            <li>
              <strong>With you</strong>
              <span>{order.method === 'express' ? arrival(1) : `By ${arrival(5)}`}</span>
            </li>
          </ol>

          <div className="cf-grid">
            <section className="cf-card" aria-labelledby="items-title">
              <h2 id="items-title">Your order</h2>
              <ul className="shop-cart-lines">
                {order.lines.map((l) => {
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
              <dl className="cart-totals">
                <dt>Subtotal</dt>
                <dd>{money(t.subtotal)}</dd>
                {t.discount > 0 && (
                  <>
                    <dt>Discount</dt>
                    <dd>−{money(t.discount)}</dd>
                  </>
                )}
                <dt>Shipping</dt>
                <dd>{t.shipping ? money(t.shipping) : 'Free'}</dd>
                <dt>Tax</dt>
                <dd>{money(t.tax)}</dd>
                <dt className="is-total">Paid</dt>
                <dd className="is-total">{money(t.total)}</dd>
              </dl>
            </section>
            <section className="cf-card" aria-labelledby="where-title">
              <h2 id="where-title">Delivery</h2>
              <p>
                {[order.name, ...order.address].map((line) => (
                  <span key={line} style={{ display: 'block' }}>
                    {line}
                  </span>
                ))}
              </p>
              <h2>Save your details</h2>
              {saved ? (
                <p>Your account is ready. This order is in it.</p>
              ) : (
                <>
                  <p className="cf-small">
                    Set a password to track this order and check out faster next time.
                  </p>
                  <form
                    className="cf-save"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (password.length < 10) return setError('Use at least 10 characters.');
                      // With a server: create the account with the order's email, then sign in.
                      setSaved(true);
                      toast('Account created');
                    }}
                  >
                    <input
                      type="email"
                      name="username"
                      autoComplete="username"
                      hidden
                      readOnly
                      value={order.email}
                    />
                    <div className="gm-field">
                      <label htmlFor="new-password">Password</label>
                      <input
                        id="new-password"
                        className="gm-input"
                        type="password"
                        autoComplete="new-password"
                        minLength={10}
                        value={password}
                        aria-invalid={error ? true : undefined}
                        aria-describedby="save-error"
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                      />
                      <p className="gm-field-error" id="save-error">
                        {error}
                      </p>
                    </div>
                    <button className="gm-chip" type="submit">
                      Create account
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
          <p className="cf-more">
            <a className="gm-chip" href="collection.html">
              Keep browsing
            </a>
          </p>
        </div>
      </main>
    </ShopShell>
  );
}
