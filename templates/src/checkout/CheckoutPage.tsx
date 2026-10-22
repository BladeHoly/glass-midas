import { GlassSelect } from '@glass-midas/react/forms';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ShopShell, useCart } from '../shared/ShopKit';
import { applyCode, image, placeOrder, totals } from '../shared/cart-store.js';
import { money, product } from '../shared/data.js';

// Checkout: one page, as a guest by default. Express first; then contact, delivery and payment,
// checked as they're left and all together on Pay, with a list of what's wrong that links to each
// field. The total on the button is the total you pay. Load checkout.css too.

type Field = 'email' | 'name' | 'address' | 'city' | 'postal' | 'card' | 'expiry' | 'cvc';

const CHECKS: Record<Field, (v: string) => string> = {
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an email address, like ada@example.com.',
  name: (v) => (v ? '' : 'Enter the name to deliver to.'),
  address: (v) => (v ? '' : 'Enter the street and number.'),
  city: (v) => (v ? '' : 'Enter the city.'),
  postal: (v) => (v ? '' : 'Enter the postal code.'),
  card: (v) => (v.replace(/\D/g, '').length >= 15 ? '' : 'Enter the card number, 15 or 16 digits.'),
  expiry: (v) =>
    /^(0[1-9]|1[0-2]) ?\/ ?\d{2}$/.test(v) ? '' : 'Enter the month and year, like 08 / 28.',
  cvc: (v) => (/^\d{3,4}$/.test(v) ? '' : 'Enter the 3 or 4 digits on the card.'),
};
const LABELS: Record<Field, string> = {
  email: 'Email',
  name: 'Full name',
  address: 'Address',
  city: 'City',
  postal: 'Postal code',
  card: 'Card number',
  expiry: 'Expiry',
  cvc: 'Security code',
};
const COUNTRIES = {
  PT: 'Portugal',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  AR: 'Argentina',
  JP: 'Japan',
};

// The card number in groups of four, the expiry as MM / YY, as they're typed.
const FORMAT: Partial<Record<Field, (v: string) => string>> = {
  card: (v) =>
    v
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 '),
  expiry: (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  },
  cvc: (v) => v.replace(/\D/g, '').slice(0, 4),
};

export function CheckoutPage() {
  const lines = useCart();
  const [values, setValues] = useState<Record<string, string>>({ country: 'US', address2: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [method, setMethod] = useState('standard');
  const [code, setCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [alert, setAlert] = useState<{ title: string; fields?: Field[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const t = totals(lines, { method, code });

  useEffect(() => {
    if (!lines.length && !busy) location.replace('cart.html');
  }, [lines.length, busy]);
  useEffect(() => {
    if (alert) alertRef.current?.focus();
  }, [alert]);

  const field = (name: Field, props: Record<string, unknown> = {}) => ({
    id: name,
    name,
    className: 'gm-input',
    value: values[name] ?? '',
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `${name}-error`,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const v = FORMAT[name]?.(e.target.value) ?? e.target.value;
      setValues((all) => ({ ...all, [name]: v }));
      if (errors[name]) setErrors((all) => ({ ...all, [name]: CHECKS[name](v.trim()) }));
    },
    onBlur: () =>
      values[name] &&
      setErrors((all) => ({ ...all, [name]: CHECKS[name]((values[name] ?? '').trim()) })),
    ...props,
  });
  const error = (name: Field) => (
    <p className="gm-field-error" id={`${name}-error`}>
      {errors[name]}
    </p>
  );

  const pay = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const found = Object.fromEntries(
      (Object.keys(CHECKS) as Field[]).map((k) => [k, CHECKS[k]((values[k] ?? '').trim())]),
    ) as Record<Field, string>;
    setErrors(found);
    const wrong = (Object.keys(found) as Field[]).filter((k) => found[k]);
    if (wrong.length) {
      setAlert({
        title: `${wrong.length === 1 ? 'One thing to fix' : `${wrong.length} things to fix`} before paying:`,
        fields: wrong,
      });
      return;
    }
    setBusy(true);
    try {
      await placeOrder({
        ...values,
        country: COUNTRIES[values.country as keyof typeof COUNTRIES] ?? values.country,
        method,
        code,
      } as Parameters<typeof placeOrder>[0]);
      location.assign('confirmation.html');
    } catch (failure) {
      setBusy(false);
      const message = (failure as Error).message;
      setErrors((all) => ({ ...all, card: message }));
      setAlert({ title: message });
    }
  };

  const summary = (
    <aside className="co-summary" aria-labelledby="co-summary-title">
      <h2 id="co-summary-title">Your order</h2>
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
      <form
        className="co-code"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const name = await applyCode(codeInput);
            setCode(name);
            setCodeMessage(`${name}: 10% off.`);
          } catch (failure) {
            setCodeMessage((failure as Error).message);
          }
        }}
      >
        <label htmlFor="code" className="on-sr-only">
          Discount code
        </label>
        <input
          id="code"
          className="gm-input"
          placeholder="Discount code"
          autoComplete="off"
          aria-describedby="code-message"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
        />
        <button className="gm-chip" type="submit">
          Apply
        </button>
      </form>
      <p className="co-code-message" id="code-message" aria-live="polite">
        {codeMessage}
      </p>
      <dl className="cart-totals">
        <dt>Subtotal</dt>
        <dd>{money(t.subtotal)}</dd>
        {t.discount > 0 && (
          <>
            <dt>Discount ({code})</dt>
            <dd>−{money(t.discount)}</dd>
          </>
        )}
        <dt>Shipping</dt>
        <dd>{t.shipping ? money(t.shipping) : 'Free'}</dd>
        <dt>Tax</dt>
        <dd>{money(t.tax)}</dd>
        <dt className="is-total">Total</dt>
        <dd className="is-total">{money(t.total)}</dd>
      </dl>
    </aside>
  );

  return (
    <ShopShell>
      <main id="main" className="shop-main shop-wrap">
        <div className="co">
          <details className="co-summary-toggle">
            <summary>
              <span>Order summary</span>
              <strong>{money(t.total)}</strong>
            </summary>
          </details>
          <form className="co-form" noValidate onSubmit={pay}>
            <h1 className="on-display">Checkout</h1>
            {alert && (
              <div className="co-alert" role="alert" tabIndex={-1} ref={alertRef}>
                <strong>{alert.title}</strong>
                {alert.fields && (
                  <ul>
                    {alert.fields.map((f) => (
                      <li key={f}>
                        <a
                          href={`#${f}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(f)?.focus();
                          }}
                        >
                          {LABELS[f]}: {errors[f]}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <section className="co-express" aria-label="Express checkout">
              <button
                className="gm-chip co-wallet"
                type="button"
                // With a provider: open the device wallet here (the Payment Request API), then place the order.
                onClick={() =>
                  setAlert({
                    title: 'The wallet isn’t connected in this template. Pay by card below.',
                  })
                }
              >
                Pay with your device's wallet
              </button>
              <p className="co-or">or pay by card</p>
            </section>

            <fieldset className="co-section">
              <legend>Contact</legend>
              <div className="gm-field">
                <label htmlFor="email">Email</label>
                <input
                  {...field('email', {
                    type: 'email',
                    autoComplete: 'email',
                    inputMode: 'email',
                    'aria-describedby': 'email-error email-hint',
                  })}
                />
                {error('email')}
                <p className="gm-field-hint" id="email-hint">
                  For the receipt and the tracking link. <a href="sign-in.html">Sign in</a> instead.
                </p>
              </div>
              <label className="gm-check-label">
                <input type="checkbox" className="gm-check" name="news" />
                <span>Tell me about new pieces</span>
              </label>
            </fieldset>

            <fieldset className="co-section">
              <legend>Delivery</legend>
              <div className="co-grid">
                <div className="gm-field co-wide">
                  <label htmlFor="name">Full name</label>
                  <input {...field('name', { autoComplete: 'shipping name' })} />
                  {error('name')}
                </div>
                <div className="gm-field co-wide">
                  <label htmlFor="address">Address</label>
                  <input {...field('address', { autoComplete: 'shipping address-line1' })} />
                  {error('address')}
                </div>
                <div className="gm-field co-wide">
                  <label htmlFor="address2">
                    Apartment, floor <span className="co-optional">(optional)</span>
                  </label>
                  <input
                    id="address2"
                    className="gm-input"
                    autoComplete="shipping address-line2"
                    value={values.address2}
                    onChange={(e) => setValues((all) => ({ ...all, address2: e.target.value }))}
                  />
                </div>
                <div className="gm-field">
                  <label htmlFor="city">City</label>
                  <input {...field('city', { autoComplete: 'shipping address-level2' })} />
                  {error('city')}
                </div>
                <div className="gm-field">
                  <label htmlFor="postal">Postal code</label>
                  <input {...field('postal', { autoComplete: 'shipping postal-code' })} />
                  {error('postal')}
                </div>
                <div className="gm-field co-wide">
                  <label htmlFor="country">Country</label>
                  <GlassSelect>
                    <select
                      id="country"
                      autoComplete="shipping country"
                      value={values.country}
                      onChange={(e) => setValues((all) => ({ ...all, country: e.target.value }))}
                    >
                      {Object.entries(COUNTRIES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </GlassSelect>
                </div>
              </div>
              <div className="co-methods" role="radiogroup" aria-label="Delivery speed">
                <label className="co-method">
                  <input
                    type="radio"
                    className="gm-check"
                    name="method"
                    value="standard"
                    checked={method === 'standard'}
                    onChange={() => setMethod('standard')}
                  />
                  <span>
                    <strong>Standard</strong>
                    <small>3 to 5 working days</small>
                  </span>
                  <span className="co-method-price">
                    {totals(lines, { code }).shipping ? '$12.00' : 'Free'}
                  </span>
                </label>
                <label className="co-method">
                  <input
                    type="radio"
                    className="gm-check"
                    name="method"
                    value="express"
                    checked={method === 'express'}
                    onChange={() => setMethod('express')}
                  />
                  <span>
                    <strong>Express</strong>
                    <small>Next working day, ordered by 3 pm</small>
                  </span>
                  <span className="co-method-price">$24.00</span>
                </label>
              </div>
            </fieldset>

            <fieldset className="co-section">
              <legend>Payment</legend>
              <div className="co-grid">
                <div className="gm-field co-wide">
                  <label htmlFor="card">Card number</label>
                  <input
                    {...field('card', {
                      autoComplete: 'cc-number',
                      inputMode: 'numeric',
                      placeholder: '1234 1234 1234 1234',
                    })}
                  />
                  {error('card')}
                </div>
                <div className="gm-field">
                  <label htmlFor="expiry">Expiry</label>
                  <input
                    {...field('expiry', {
                      autoComplete: 'cc-exp',
                      inputMode: 'numeric',
                      placeholder: 'MM / YY',
                    })}
                  />
                  {error('expiry')}
                </div>
                <div className="gm-field">
                  <label htmlFor="cvc">Security code</label>
                  <input
                    {...field('cvc', {
                      autoComplete: 'cc-csc',
                      inputMode: 'numeric',
                      placeholder: '3 digits on the back',
                    })}
                  />
                  {error('cvc')}
                </div>
              </div>
              <label className="gm-check-label">
                <input type="checkbox" className="gm-check" name="billing" defaultChecked />
                <span>Bill to the delivery address</span>
              </label>
            </fieldset>

            <button
              className="gm-chip gm-chip-primary co-pay"
              type="submit"
              aria-busy={busy || undefined}
            >
              Pay {money(t.total)}
            </button>
            <p className="co-note">
              Your card is charged when the order ships. You can cancel until then.
            </p>
          </form>
          {summary}
        </div>
      </main>
    </ShopShell>
  );
}
