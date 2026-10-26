import type { GmDialog, GmTabs } from '@glass-midas/components';
import { GlassSelect } from '@glass-midas/react/forms';
import { GlassTab, GlassTabs } from '@glass-midas/react/navigation';
import { GlassDialog, toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ShopShell } from '../shared/ShopKit';
import {
  addresses,
  bill,
  cards,
  changePassword,
  defaultAddress,
  defaultCard,
  expiry,
  myOrders,
  profile,
  progress,
  removeAddress,
  removeCard,
  saveAddress,
  saveProfile,
  type Address,
  type Progress,
} from '../shared/account-store.js';
import { addToCart, image } from '../shared/cart-store.js';
import { day, initials, money, product, type Order } from '../shared/data.js';

// The shopper's account: their orders (where each one is, and what can be done with it), where
// things go, the cards they keep, and their details. Each tab has its own address (#orders,
// #addresses, #payment, #details), so a link opens the right one. Load account.css too.

const PAGE = 6;
const TABS: Record<string, string> = {
  orders: 'Orders',
  addresses: 'Addresses',
  payment: 'Payment',
  details: 'Details',
};
const GROUPS: Record<string, (p: Progress) => boolean> = {
  all: () => true,
  open: (p) => ['processing', 'packing', 'shipped', 'returning'].includes(p.stage),
  delivered: (p) => p.stage === 'delivered',
  closed: (p) => ['cancelled', 'refunded'].includes(p.stage),
};
const FILTERS = [
  ['all', 'All'],
  ['open', 'In progress'],
  ['delivered', 'Delivered'],
  ['closed', 'Returned or cancelled'],
] as const;

/** When it comes, or what happened to it, in a line. */
function when(p: Progress, o: Order) {
  switch (p.stage) {
    case 'processing':
    case 'packing':
      return `Arrives by ${day(p.arrives!)}`;
    case 'shipped':
      return `Arrives ${day(p.arrives!)}`;
    case 'delivered':
      return p.canReturn
        ? `Delivered ${day(p.delivered!)} · return by ${day(p.returnBy!)}`
        : `Delivered ${day(p.delivered!)}`;
    case 'returning':
      return 'Return started: drop it off within 14 days';
    case 'cancelled':
      return `Cancelled · ordered ${day(o.date)}`;
    default:
      return `Refunded · ordered ${day(o.date)}`;
  }
}

const openCart = () => document.querySelector<HTMLElement>('#mini-cart')?.showPopover();

export function AccountPage() {
  const [who, setWho] = useState(profile);
  const tabs = useRef<GmTabs>(null);

  useEffect(() => {
    const fromHash = () => {
      const label = TABS[location.hash.slice(1)];
      if (label)
        customElements.whenDefined('gm-tabs').then(() => tabs.current?.selectLabel(label, false));
    };
    fromHash();
    addEventListener('hashchange', fromHash);
    return () => removeEventListener('hashchange', fromHash);
  }, []);

  return (
    <ShopShell here="account">
      <main id="main" className="shop-main shop-wrap">
        <header className="ac-head">
          <span className="gm-avatar" data-size="lg" aria-hidden="true">
            {initials(who.name)}
          </span>
          <div>
            <h1 className="on-display">Hello, {who.name.split(' ')[0]}</h1>
            <p>Signed in as {who.email}</p>
          </div>
          <a className="gm-chip gm-chip-plain ac-out" href="sign-in.html">
            Sign out
          </a>
        </header>

        <GlassTabs
          ref={tabs}
          className="ac-tabs"
          onChange={(e) => {
            const key = Object.keys(TABS).find((k) => TABS[k] === e.detail.label);
            if (key) history.replaceState(null, '', `#${key}`);
          }}
        >
          <GlassTab label="Orders">
            <Orders />
          </GlassTab>
          <GlassTab label="Addresses">
            <Addresses />
          </GlassTab>
          <GlassTab label="Payment">
            <Cards />
          </GlassTab>
          <GlassTab label="Details">
            <Details onSaved={setWho} />
          </GlassTab>
        </GlassTabs>
      </main>
    </ShopShell>
  );
}

function Orders() {
  const [all, setAll] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => void myOrders().then(setAll), []);

  const matching = (all ?? []).filter((o) => GROUPS[filter]!(progress(o)));
  const more = () => {
    const before = shown;
    setShown(shown + PAGE);
    // Focus the first of the new orders, so keyboard users carry on from there.
    requestAnimationFrame(() =>
      list.current?.children[before]?.querySelector<HTMLElement>('h3 a')?.focus(),
    );
  };
  const again = (o: Order) => {
    for (const l of o.lines) addToCart(l.product, l.finish, l.quantity);
    toast(`${o.lines.length === 1 ? 'It is' : 'They are'} back in your cart`, {
      action: { label: 'View cart', onClick: openCart },
    });
  };

  return (
    <>
      <div className="ac-tools">
        <div className="app-filters" role="group" aria-label="Show">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              className="gm-chip"
              type="button"
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key);
                setShown(PAGE);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="ac-count" aria-live="polite">
          {all && matching.length
            ? `${Math.min(shown, matching.length)} of ${matching.length} ${matching.length === 1 ? 'order' : 'orders'}`
            : ''}
        </p>
      </div>
      {!all ? (
        <ul className="ac-orders" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="ac-order">
              <span className="gm-skeleton gm-skeleton-text" />
              <span className="gm-skeleton ac-skeleton" />
            </li>
          ))}
        </ul>
      ) : matching.length ? (
        <ul className="ac-orders" ref={list}>
          {matching.slice(0, shown).map((o) => {
            const p = progress(o);
            const link = `order.html?n=${o.number}`;
            return (
              <li key={o.number} className="ac-order">
                <div className="ac-order-top">
                  <h2>
                    <a href={link}>Order #{o.number}</a>
                  </h2>
                  <span className="gm-badge" data-tone={p.tone || undefined}>
                    {p.label}
                  </span>
                  <span className="ac-order-total">{money(bill(o).total)}</span>
                </div>
                <p className="ac-order-when">{when(p, o)}</p>
                <ul
                  className="ac-thumbs"
                  aria-label={`${o.lines.length} ${o.lines.length === 1 ? 'piece' : 'pieces'}`}
                >
                  {o.lines.slice(0, 4).map((l, i) => (
                    <li key={i}>
                      <img
                        src={image(l.product, l.finish)}
                        alt={`${product(l.product)!.name} in ${l.finish}`}
                        width={64}
                        height={64}
                        loading="lazy"
                      />
                      {l.quantity > 1 && <span>×{l.quantity}</span>}
                    </li>
                  ))}
                  {o.lines.length > 4 && <li className="ac-thumbs-more">+{o.lines.length - 4}</li>}
                </ul>
                <div className="ac-order-actions">
                  <a className="gm-chip" href={link}>
                    {p.stage === 'shipped' ? 'Track it' : 'View order'}
                  </a>
                  {p.canReturn && (
                    <a className="gm-chip gm-chip-plain" href={`returns.html?order=${o.number}`}>
                      Return something
                    </a>
                  )}
                  {['delivered', 'refunded', 'cancelled'].includes(p.stage) && (
                    <button
                      className="gm-chip gm-chip-plain"
                      type="button"
                      onClick={() => again(o)}
                    >
                      Buy again
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="gm-empty">
          <span className="on-sigil gm-empty-art" aria-hidden="true" />
          <h2>{filter === 'all' ? 'No orders yet' : 'None here'}</h2>
          <p>
            {filter === 'all'
              ? 'When you buy something, it shows up here with its tracking.'
              : 'No orders like that. Look at all of them instead.'}
          </p>
          <a className="gm-chip gm-chip-primary" href="collection.html">
            Browse the pieces
          </a>
        </div>
      )}
      {matching.length > shown && (
        <div className="ac-more">
          <button className="gm-chip" type="button" onClick={more}>
            Show more orders
          </button>
        </div>
      )}
    </>
  );
}

const NEED: Record<string, string> = {
  name: 'Add the name on the door.',
  line1: 'Add the street and number.',
  city: 'Add the city.',
  postal: 'Add the postal code.',
};

function Addresses() {
  const [list, setList] = useState(addresses);
  const [editing, setEditing] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const drawer = useRef<GmDialog>(null);
  const form = useRef<HTMLFormElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const refresh = () => setList(addresses());

  // The drawer keeps one form (the dialog holds it, so React mustn't swap it): filling it in
  // is done here, like the heading.
  const open = (a: Address | null) => {
    setEditing(a);
    setErrors({});
    const f = form.current!;
    f.reset();
    for (const el of f.elements as unknown as HTMLInputElement[]) {
      if (!el.name) continue;
      if (el.type === 'checkbox') el.checked = !!a?.default;
      else
        el.value =
          (a?.[el.name as keyof Address] as string) ?? (el.name === 'country' ? 'Portugal' : '');
    }
    f.querySelector<HTMLElement & { sync?: () => void }>('gm-select')?.sync?.();
    const heading = drawer.current?.querySelector('.gm-dialog-heading');
    if (heading) heading.textContent = a ? 'Edit the address' : 'Add an address';
    drawer.current?.show();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form.current!)) as Record<string, string>;
    const found: Record<string, string> = {};
    for (const [k, message] of Object.entries(NEED)) if (!data[k]?.trim()) found[k] = message;
    setErrors(found);
    const first = Object.keys(NEED).find((k) => found[k]);
    if (first) return form.current!.querySelector<HTMLElement>(`#a-${first}`)?.focus();
    setBusy(true);
    await saveAddress({
      ...(data as unknown as Address),
      id: editing?.id ?? '',
      default: data.default === 'on',
    });
    if (data.default === 'on') {
      const saved = addresses().find((a) => a.line1 === data.line1 && a.postal === data.postal);
      if (saved) await defaultAddress(saved.id);
    }
    setBusy(false);
    drawer.current?.close('saved');
    refresh();
    toast(editing ? 'Address saved' : 'Address added');
  };
  const field = (name: string, label: string, auto: string, optional = '') => (
    <div className="gm-field">
      <label htmlFor={`a-${name}`}>
        {label} {optional && <span className="ac-optional">({optional})</span>}
      </label>
      <input
        className="gm-input"
        id={`a-${name}`}
        name={name}
        autoComplete={`shipping ${auto}`}
        required={!optional}
        aria-describedby={optional ? undefined : `a-${name}-error`}
        aria-invalid={errors[name] ? true : undefined}
      />
      {!optional && (
        <p className="gm-field-error" id={`a-${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <>
      <ul className="ac-cards">
        {list.map((a) => (
          <li key={a.id} className="ac-card">
            <p className="ac-card-top">
              <strong>{a.name}</strong>
              {a.default && (
                <span className="gm-badge" data-tone="info">
                  Default
                </span>
              )}
            </p>
            <address>
              {[a.line1, a.line2, `${a.postal} ${a.city}`, a.country, a.phone]
                .filter(Boolean)
                .map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
            </address>
            <div className="ac-card-actions">
              <button
                className="gm-chip gm-chip-plain"
                type="button"
                aria-label={`Edit ${a.name}`}
                onClick={() => open(a)}
              >
                Edit
              </button>
              {!a.default && (
                <button
                  className="gm-chip gm-chip-plain"
                  type="button"
                  aria-label={`Use ${a.name} by default`}
                  onClick={async () => {
                    await defaultAddress(a.id);
                    refresh();
                    toast(`${a.line1} is now the default`);
                  }}
                >
                  Make default
                </button>
              )}
              <button
                className="gm-chip gm-chip-plain"
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={async () => {
                  await removeAddress(a.id);
                  refresh();
                  add.current?.focus();
                  toast('Address removed', {
                    action: {
                      label: 'Undo',
                      onClick: async () => {
                        await saveAddress({ ...a, id: '' });
                        refresh();
                      },
                    },
                  });
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="gm-chip" type="button" ref={add} onClick={() => open(null)}>
        Add an address
      </button>

      <GlassDialog ref={drawer} heading="Add an address" placement="end">
        <form className="ac-address-form" ref={form} onSubmit={submit} noValidate>
          {field('name', 'Full name', 'name')}
          {field('line1', 'Address', 'address-line1')}
          {field('line2', 'Apartment, floor', 'address-line2', 'optional')}
          <div className="ac-row">
            {field('city', 'City', 'address-level2')}
            {field('postal', 'Postal code', 'postal-code')}
          </div>
          <div className="gm-field">
            <label htmlFor="a-country">Country</label>
            <GlassSelect>
              <select
                id="a-country"
                name="country"
                autoComplete="shipping country-name"
                defaultValue="Portugal"
              >
                {[
                  'Portugal',
                  'Spain',
                  'France',
                  'Germany',
                  'United Kingdom',
                  'United States',
                  'Canada',
                  'Argentina',
                  'Japan',
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </GlassSelect>
          </div>
          {field('phone', 'Phone', 'tel', 'optional, for the courier')}
          <label className="gm-check-label">
            <input type="checkbox" className="gm-check" name="default" />
            <span>Use it by default</span>
          </label>
          <div className="ac-form-actions">
            <button
              className="gm-chip gm-chip-plain"
              type="button"
              onClick={() => drawer.current?.close('cancel')}
            >
              Cancel
            </button>
            <button className="gm-chip gm-chip-primary" type="submit" aria-busy={busy || undefined}>
              Save address
            </button>
          </div>
        </form>
      </GlassDialog>
    </>
  );
}

function Cards() {
  const [list, setList] = useState(cards);
  return (
    <>
      <ul className="ac-cards">
        {list.length ? (
          list.map((c) => {
            const state = expiry(c.exp);
            const name = `${c.brand} ending ${c.last4}`;
            return (
              <li key={c.id} className="ac-card ac-pay">
                <p className="ac-card-top">
                  <strong>{name}</strong>
                  {c.default && (
                    <span className="gm-badge" data-tone="info">
                      Default
                    </span>
                  )}
                </p>
                <p>
                  Expires {c.exp}{' '}
                  {state === 'expired' ? (
                    <span className="gm-badge" data-tone="danger">
                      Expired
                    </span>
                  ) : state === 'soon' ? (
                    <span className="gm-badge" data-tone="warning">
                      Expires soon
                    </span>
                  ) : null}
                </p>
                <div className="ac-card-actions">
                  {!c.default && (
                    <button
                      className="gm-chip gm-chip-plain"
                      type="button"
                      aria-label={`Use the ${name} by default`}
                      onClick={async () => {
                        await defaultCard(c.id);
                        setList(cards());
                        toast(`The ${name} is now the default`);
                      }}
                    >
                      Make default
                    </button>
                  )}
                  <button
                    className="gm-chip gm-chip-plain"
                    type="button"
                    aria-label={`Remove the ${name}`}
                    onClick={async () => {
                      await removeCard(c.id);
                      setList(cards());
                      toast(`The ${name} is removed`);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })
        ) : (
          <li className="gm-empty">
            <h2>No cards kept</h2>
            <p>Cards you pay with can be kept for next time at checkout.</p>
          </li>
        )}
      </ul>
      <p className="ac-small">
        New cards are added when you check out. We keep the brand, the last four digits and the
        expiry; the rest stays with the payment provider.
      </p>
    </>
  );
}

function Details({ onSaved }: { onSaved: (p: ReturnType<typeof profile>) => void }) {
  const start = useRef(profile()).current;
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pwErrors, setPwErrors] = useState({ current: '', next: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState({ profile: false, password: false });
  const del = useRef<GmDialog>(null);

  const saveDetails = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const data = new FormData(f);
    const name = String(data.get('name')).trim();
    const email = String(data.get('email')).trim();
    setNameError(name ? '' : 'Add your name.');
    if (!name) return f.querySelector<HTMLElement>('#name')?.focus();
    setBusy((b) => ({ ...b, profile: true }));
    const next = { name, email, news: data.has('news'), restock: data.has('restock') };
    try {
      await saveProfile(next);
      setEmailError('');
      onSaved(next);
      toast('Your details are saved');
    } catch (err) {
      setEmailError((err as Error).message);
      f.querySelector<HTMLElement>('#email')?.focus();
    } finally {
      setBusy((b) => ({ ...b, profile: false }));
    }
  };

  const savePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const current = String(new FormData(f).get('current'));
    const next = String(new FormData(f).get('new'));
    if (!current) {
      setPwErrors({ current: 'Enter the password you use now.', next: '' });
      return f.querySelector<HTMLElement>('#current')?.focus();
    }
    setBusy((b) => ({ ...b, password: true }));
    try {
      await changePassword(current, next);
      setPwErrors({ current: '', next: '' });
      f.reset();
      toast('Password changed. Other devices are signed out.');
    } catch (err) {
      const message = (err as Error).message;
      const onCurrent = message.startsWith('That isn');
      setPwErrors({ current: onCurrent ? message : '', next: onCurrent ? '' : message });
      f.querySelector<HTMLElement>(onCurrent ? '#current' : '#new')?.focus();
    } finally {
      setBusy((b) => ({ ...b, password: false }));
    }
  };

  return (
    <div className="ac-details">
      <form className="ac-panel" onSubmit={saveDetails} noValidate>
        <h2>Your details</h2>
        <div className="gm-field">
          <label htmlFor="name">Name</label>
          <input
            className="gm-input"
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={start.name}
            aria-describedby="name-error"
            aria-invalid={nameError ? true : undefined}
          />
          <p className="gm-field-error" id="name-error">
            {nameError}
          </p>
        </div>
        <div className="gm-field">
          <label htmlFor="email">Email</label>
          <input
            className="gm-input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={start.email}
            aria-describedby="email-error"
            aria-invalid={emailError ? true : undefined}
          />
          <p className="gm-field-error" id="email-error">
            {emailError}
          </p>
        </div>
        <fieldset className="ac-switches">
          <legend>Emails</legend>
          <label className="gm-check-label">
            <span>New pieces and the journal, once a month</span>
            <input
              type="checkbox"
              className="gm-toggle"
              role="switch"
              name="news"
              defaultChecked={start.news}
            />
          </label>
          <label className="gm-check-label">
            <span>When something I saved is back in stock</span>
            <input
              type="checkbox"
              className="gm-toggle"
              role="switch"
              name="restock"
              defaultChecked={start.restock}
            />
          </label>
        </fieldset>
        <button
          className="gm-chip gm-chip-primary"
          type="submit"
          aria-busy={busy.profile || undefined}
        >
          Save
        </button>
      </form>

      <form className="ac-panel" onSubmit={savePassword} noValidate>
        <h2>Password</h2>
        <div className="gm-field">
          <label htmlFor="current">Current password</label>
          <input
            className="gm-input"
            id="current"
            name="current"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            aria-describedby="current-error"
            aria-invalid={pwErrors.current ? true : undefined}
          />
          <p className="gm-field-error" id="current-error">
            {pwErrors.current}
          </p>
        </div>
        <div className="gm-field">
          <label htmlFor="new">New password</label>
          <input
            className="gm-input"
            id="new"
            name="new"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={10}
            required
            aria-describedby="new-hint new-error"
            aria-invalid={pwErrors.next ? true : undefined}
          />
          <p className="gm-field-hint" id="new-hint">
            At least 10 characters. A few words work well.
          </p>
          <p className="gm-field-error" id="new-error">
            {pwErrors.next}
          </p>
        </div>
        <label className="gm-check-label">
          <input
            type="checkbox"
            className="gm-check"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          <span>Show passwords</span>
        </label>
        <button className="gm-chip" type="submit" aria-busy={busy.password || undefined}>
          Change password
        </button>
      </form>

      <section className="ac-panel ac-leave" aria-labelledby="leave-title">
        <h2 id="leave-title">Delete your account</h2>
        <p>
          Your orders stay with us for the law's seven years; everything else goes: your addresses,
          cards, saved pieces and the name on your reviews.
        </p>
        <button className="gm-chip ac-danger" type="button" onClick={() => del.current?.show()}>
          Delete my account
        </button>
      </section>

      <GlassDialog
        ref={del}
        heading="Delete your account?"
        onClose={(e) => {
          if (e.detail.value === 'delete')
            toast("We've had your request, and we'll email you when it's done.");
        }}
      >
        <p>
          You'll be signed out, and your addresses, cards and saved pieces are gone for good. Orders
          already placed still arrive.
        </p>
        <form method="dialog">
          <button className="gm-chip gm-chip-plain" value="cancel">
            Keep my account
          </button>
          <button className="gm-chip ac-danger" value="delete">
            Delete it
          </button>
        </form>
      </GlassDialog>
    </div>
  );
}
