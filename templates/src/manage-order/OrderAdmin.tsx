import type { GmDialog } from '@glass-midas/components';
import { GlassQuantity, GlassSelect } from '@glass-midas/react/forms';
import { GlassDialog, GlassMenu, toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AppShell } from '../shared/AppKit';
import {
  CARRIERS,
  addNote,
  adminOrder,
  cancel,
  capture,
  fulfil,
  refund,
  refundAmount,
  setPacked,
} from '../shared/admin-store.js';
import { day, initials, money, product } from '../shared/data.js';

// One order, as the team sees it: whether it's paid and shipped, the one thing to do next
// (capture, fulfil), the pieces to tick off as they're packed, the money in and out, the
// customer, and a history the team can add notes to. Refunds and fulfilment open in a drawer;
// each says what it will do (the amount, who's told) before it does it. Load manage-order.css too.

type View = NonNullable<Awaited<ReturnType<typeof adminOrder>>>;

const PAYMENT: Record<View['payment'], [string, string]> = {
  pending: ['Payment pending', 'warning'],
  paid: ['Paid', 'success'],
  'partly-refunded': ['Partly refunded', 'warning'],
  refunded: ['Refunded', 'danger'],
  voided: ['Voided', ''],
};
const FULFILMENT: Record<View['fulfilment'], [string, string]> = {
  unfulfilled: ['Unfulfilled', 'warning'],
  fulfilled: ['Fulfilled', 'success'],
  cancelled: ['Cancelled', ''],
};
const REASONS = ['Returned', 'Arrived damaged', 'Wrong piece sent', 'Goodwill', 'Something else'];
const time = (at: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${at}Z`));
const art = () => document.documentElement.dataset.art || 'art/';
const image = (l: { product: string; finish: string }) =>
  `${art()}products/${l.product}-${l.finish.toLowerCase()}.svg`;
const sku = (l: { product: string; finish: string }) =>
  `ON-${l.product.toUpperCase()}-${l.finish.slice(0, 3).toUpperCase()}`;
const Badge = ([label, tone]: [string, string]) => (
  <span className="gm-badge" data-tone={tone || undefined}>
    {label}
  </span>
);

export function OrderAdmin() {
  const [view, setView] = useState<View | null | undefined>(undefined);
  const number = () => view!.order.number;
  const reload = async () => setView(await adminOrder(number()));

  useEffect(() => {
    // Without a number in the address, the newest order still waiting to be paid.
    const n = Number(new URLSearchParams(location.search).get('n')) || 1900;
    adminOrder(n).then(setView);
  }, []);
  useEffect(() => {
    if (view) document.title = `Order #${view.order.number} · Ondine`;
  }, [view]);

  const crumbs = (
    <nav className="gm-breadcrumbs mo-crumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="orders.html">Orders</a>
        </li>
        <li>
          <span aria-current="page">{view ? `#${view.order.number}` : 'Order'}</span>
        </li>
      </ol>
    </nav>
  );

  if (!view)
    return (
      <AppShell
        current="orders"
        title="Order"
        lede="What the store knows about it, and what to do next."
      >
        {crumbs}
        {view === undefined ? (
          <div className="mo-loading" aria-busy="true">
            <span className="gm-skeleton gm-skeleton-text" />
            <span className="gm-skeleton mo-skeleton" />
          </div>
        ) : (
          <div className="gm-empty">
            <span className="on-sigil gm-empty-art" aria-hidden="true" />
            <h2>No order with that number</h2>
            <p>Look it up in the orders, by number, name or email.</p>
            <a className="gm-chip gm-chip-primary" href="orders.html">
              All orders
            </a>
          </div>
        )}
      </AppShell>
    );

  return <Loaded view={view} crumbs={crumbs} reload={reload} number={number} />;
}

function Loaded({
  view: v,
  crumbs,
  reload,
  number,
}: {
  view: View;
  crumbs: ReactNode;
  reload: () => Promise<void>;
  number: () => number;
}) {
  const o = v.order;
  const [packed, setPackedState] = useState(v.packed);
  const [busy, setBusy] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [fulfilForm, setFulfilForm] = useState({
    carrier: CARRIERS[0]!,
    tracking: '',
    notify: true,
  });
  const [draft, setDraft] = useState<{ q: number[]; shipping: boolean; reason: string }>({
    q: o.lines.map(() => 0),
    shipping: false,
    reason: REASONS[0]!,
  });
  const [refundError, setRefundError] = useState('');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const fulfilRef = useRef<GmDialog>(null);
  const refundRef = useRef<GmDialog>(null);
  const cancelRef = useRef<GmDialog>(null);
  const title = useRef<HTMLDivElement>(null);
  useEffect(() => setPackedState(v.packed), [v]);

  const packing = v.fulfilment === 'unfulfilled';
  const lines = draft.q
    .map((quantity, index) => ({ index, quantity }))
    .filter((l) => l.quantity > 0);
  const amount = refundAmount(v, { lines, shipping: draft.shipping });
  const over = amount > v.net + 0.001;
  const c = v.customer;

  const openFulfil = () => {
    setFulfilForm({ carrier: CARRIERS[0]!, tracking: '', notify: true });
    setTrackingError('');
    fulfilRef.current?.show();
  };
  const pack = (i: number, on: boolean) => {
    const next = on ? [...packed, i] : packed.filter((x) => x !== i);
    setPackedState(next);
    setPacked(o.number, next);
    if (next.length === o.lines.length)
      toast('Everything is packed', { action: { label: 'Fulfil', onClick: openFulfil } });
  };
  const doCapture = async () => {
    setBusy('capture');
    await capture(number());
    setBusy('');
    await reload();
    toast(`${money(v.total)} captured`);
  };
  const doFulfil = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('fulfil');
    try {
      await fulfil(number(), fulfilForm);
      fulfilRef.current?.close('done');
      await reload();
      toast(fulfilForm.notify ? 'Fulfilled, and the customer is emailed' : 'Fulfilled');
    } catch (err) {
      setTrackingError((err as Error).message);
      document.querySelector<HTMLElement>('#tracking')?.focus();
    } finally {
      setBusy('');
    }
  };
  const doRefund = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('refund');
    try {
      const done = await refund(number(), {
        lines,
        shipping: draft.shipping,
        reason: draft.reason,
      });
      refundRef.current?.close('done');
      await reload();
      toast(`${money(done)} refunded to the card`);
    } catch (err) {
      setRefundError((err as Error).message);
    } finally {
      setBusy('');
    }
  };
  const doNote = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addNote(number(), note);
      setNote('');
      setNoteError('');
      await reload();
      toast('Note added');
    } catch (err) {
      setNoteError((err as Error).message);
      document.querySelector<HTMLElement>('#note')?.focus();
    }
  };
  const copy = async (text: string, said: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(said);
    } catch {
      toast(text);
    }
  };
  const address = [
    c.name,
    `${10 + (o.number % 80)} ${['Harbour Road', 'Rua do Sol', 'Linden Street', 'Calle Mayor'][o.number % 4]}`,
    c.city,
  ];

  return (
    <AppShell
      current="orders"
      title={`Order #${o.number}`}
      lede={`${day(o.date)} · ${o.channel === 'Online' ? 'Online' : 'In the studio'}`}
    >
      {crumbs}
      <div className="mo-bar" ref={title} tabIndex={-1}>
        <p className="mo-states">
          {Badge(PAYMENT[v.payment])} {Badge(FULFILMENT[v.fulfilment])}
        </p>
        <div className="mo-actions">
          {v.canCapture && (
            <button
              className="gm-chip gm-chip-primary"
              type="button"
              onClick={doCapture}
              aria-busy={busy === 'capture' || undefined}
            >
              Capture payment
            </button>
          )}
          {v.canFulfil && (
            <button className="gm-chip gm-chip-primary" type="button" onClick={openFulfil}>
              Fulfil
            </button>
          )}
          {v.canRefund && (
            <button
              className={`gm-chip${!v.canFulfil && !v.canCapture ? ' gm-chip-primary' : ''}`}
              type="button"
              onClick={() => {
                setDraft({ q: o.lines.map(() => 0), shipping: false, reason: REASONS[0]! });
                setRefundError('');
                refundRef.current?.show();
              }}
            >
              Refund
            </button>
          )}
          <button
            className="gm-chip gm-chip-round"
            type="button"
            popoverTarget="more"
            aria-label="More actions"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
          <GlassMenu
            id="more"
            aria-label="More actions"
            onSelect={(e) => {
              const { value } = e.detail;
              if (value === 'slip') print();
              if (value === 'link') copy(location.href, 'Link copied');
              if (value === 'cancel') cancelRef.current?.show();
            }}
          >
            <button value="slip">Print packing slip</button>
            <button value="link">Copy a link to this order</button>
            <hr />
            <button value="cancel" disabled={!v.canCancel}>
              Cancel order
            </button>
          </GlassMenu>
        </div>
      </div>

      <div className="mo-grid">
        <div className="mo-main">
          <section className="mo-card mo-pack" aria-labelledby="pack-title">
            <header className="mo-card-head">
              <h2 id="pack-title">Pieces</h2>
              <p aria-live="polite">
                {packing
                  ? `${packed.length} of ${o.lines.length} packed`
                  : v.fulfilment === 'fulfilled'
                    ? 'Shipped'
                    : 'Not shipping'}
              </p>
            </header>
            <ul className="mo-lines">
              {o.lines.map((l, i) => {
                const p = product(l.product)!;
                const on = packed.includes(i);
                return (
                  <li key={i} className={`mo-line${on ? ' is-packed' : ''}`}>
                    {packing && (
                      <input
                        type="checkbox"
                        className="gm-check"
                        checked={on}
                        aria-label={`${p.name} in ${l.finish}, packed`}
                        onChange={(e) => pack(i, e.target.checked)}
                      />
                    )}
                    <img src={image(l)} alt="" width={56} height={56} />
                    <span className="mo-line-name">
                      <a href={`edit-product.html?id=${l.product}`}>{p.name}</a>
                      <small>
                        {l.finish} · {sku(l)}
                      </small>
                    </span>
                    <span className="mo-line-qty">
                      {l.quantity} × {money(l.price)}
                      {v.left[i]! < l.quantity && <small>{l.quantity - v.left[i]!} refunded</small>}
                    </span>
                    <span className="mo-line-total">{money(l.price * l.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            {v.shipment && (
              <div className="mo-shipment">
                <p>
                  <strong>{v.shipment.carrier}</strong>{' '}
                  <span className="mo-mono">{v.shipment.tracking}</span>
                </p>
                <p className="mo-small">
                  Shipped {time(v.shipment.at)}
                  {v.shipment.notified && ' · the customer was emailed'}
                </p>
              </div>
            )}
          </section>

          <section className="mo-card" aria-labelledby="money-title">
            <h2 id="money-title">Payment</h2>
            <dl className="gm-totals">
              <dt>Subtotal</dt>
              <dd>{money(v.subtotal)}</dd>
              <dt>Shipping</dt>
              <dd>{v.shipping ? money(v.shipping) : 'Free'}</dd>
              <dt>Tax</dt>
              <dd>{money(v.tax)}</dd>
              <dt>Total</dt>
              <dd>{money(v.total)}</dd>
              {v.refunded > 0 && (
                <>
                  <dt>Refunded</dt>
                  <dd>−{money(v.refunded)}</dd>
                </>
              )}
              <dt className="gm-totals-total">
                {v.payment === 'pending' ? 'Authorized' : v.payment === 'voided' ? 'Kept' : 'Net'}
              </dt>
              <dd className="gm-totals-total">{money(v.payment === 'voided' ? 0 : v.net)}</dd>
            </dl>
          </section>

          <section className="mo-card" aria-labelledby="history-title">
            <h2 id="history-title">History</h2>
            <form className="mo-note" onSubmit={doNote} noValidate>
              <label htmlFor="note" className="on-sr-only">
                A note for the team
              </label>
              <textarea
                className="gm-input"
                id="note"
                rows={2}
                placeholder="A note for the team: only the team sees it"
                aria-describedby="note-error"
                aria-invalid={noteError ? true : undefined}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="gm-field-error" id="note-error" aria-live="polite">
                {noteError}
              </p>
              <button className="gm-chip" type="submit">
                Add note
              </button>
            </form>
            <ol className="gm-timeline">
              {v.events.map((e, i) => (
                <li key={i} data-tone={e.tone}>
                  <time dateTime={e.at}>{time(e.at)}</time>
                  <p>{e.text}</p>
                  {e.note && <p className="gm-timeline-note">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="mo-side">
          <section className="mo-card" aria-labelledby="customer-title">
            <h2 id="customer-title">Customer</h2>
            <div className="mo-customer">
              <span className="gm-avatar" aria-hidden="true">
                {initials(c.name)}
              </span>
              <p>
                <strong>{c.name}</strong>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </p>
              <p className="mo-small">
                {c.orders} {c.orders === 1 ? 'order' : 'orders'} · {money(c.spent)} spent · since{' '}
                {c.since}
              </p>
            </div>
          </section>
          <section className="mo-card" aria-labelledby="ship-title">
            <header className="mo-card-head">
              <h2 id="ship-title">Ship to</h2>
              <button
                className="gm-chip gm-chip-plain"
                type="button"
                onClick={() => copy(address.join('\n'), 'Address copied')}
              >
                Copy
              </button>
            </header>
            <address>
              {address.map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </address>
          </section>
          <section className="mo-card" aria-labelledby="risk-title">
            <h2 id="risk-title">Checks</h2>
            <p className="mo-risk">
              <span className="gm-badge" data-tone="success">
                Low risk
              </span>
            </p>
            <ul className="mo-checks">
              <li>The card's address matches</li>
              <li>The security code matches</li>
              <li>{c.orders > 1 ? `A returning customer, ${c.orders} orders` : 'A first order'}</li>
            </ul>
          </section>
        </aside>
      </div>

      <GlassDialog ref={fulfilRef} heading="Fulfil the order" placement="end">
        <form className="mo-form" onSubmit={doFulfil} noValidate>
          <p className="mo-small">
            {o.lines.reduce((n, l) => n + l.quantity, 0)} pieces to {c.name}, {c.city}.
            {o.lines.length - packed.length > 0 &&
              ` ${o.lines.length - packed.length} not ticked as packed yet.`}
          </p>
          <div className="gm-field">
            <label htmlFor="fulfil-carrier">Carrier</label>
            <GlassSelect>
              <select
                id="fulfil-carrier"
                value={fulfilForm.carrier}
                onChange={(e) => setFulfilForm((f) => ({ ...f, carrier: e.target.value }))}
              >
                {CARRIERS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </GlassSelect>
          </div>
          <div className="gm-field">
            <label htmlFor="tracking">Tracking number</label>
            <input
              className="gm-input"
              id="tracking"
              autoComplete="off"
              spellCheck={false}
              required
              aria-describedby="tracking-error"
              aria-invalid={trackingError ? true : undefined}
              value={fulfilForm.tracking}
              onChange={(e) => setFulfilForm((f) => ({ ...f, tracking: e.target.value }))}
            />
            <p className="gm-field-error" id="tracking-error" aria-live="polite">
              {trackingError}
            </p>
          </div>
          <label className="gm-check-label mo-switch">
            <span>Email the customer the tracking link</span>
            <input
              type="checkbox"
              className="gm-toggle"
              role="switch"
              checked={fulfilForm.notify}
              onChange={(e) => setFulfilForm((f) => ({ ...f, notify: e.target.checked }))}
            />
          </label>
          <div className="mo-form-actions">
            <button
              className="gm-chip gm-chip-plain"
              type="button"
              onClick={() => fulfilRef.current?.close('cancel')}
            >
              Cancel
            </button>
            <button
              className="gm-chip gm-chip-primary"
              type="submit"
              aria-busy={busy === 'fulfil' || undefined}
            >
              Mark as fulfilled
            </button>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog ref={refundRef} heading="Refund" placement="end">
        <form className="mo-form" onSubmit={doRefund} noValidate>
          <ul className="mo-refund-lines">
            {o.lines.map((l, i) => {
              const p = product(l.product)!;
              const left = v.left[i]!;
              return (
                <li key={i}>
                  <img src={image(l)} alt="" width={40} height={40} />
                  <span>
                    {p.name}
                    <small>
                      {l.finish} · {money(l.price)} · {left} of {l.quantity} left to refund
                    </small>
                  </span>
                  {left ? (
                    <GlassQuantity>
                      <input
                        type="number"
                        min={0}
                        max={left}
                        value={draft.q[i]}
                        aria-label={`How many ${p.name} to refund`}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            q: d.q.map((x, k) =>
                              k === i
                                ? Math.min(left, Math.max(0, Number(e.target.value) || 0))
                                : x,
                            ),
                          }))
                        }
                      />
                    </GlassQuantity>
                  ) : (
                    <span className="gm-badge">Refunded</span>
                  )}
                </li>
              );
            })}
          </ul>
          <label className="gm-check-label">
            <input
              type="checkbox"
              className="gm-check"
              disabled={!v.shipping}
              checked={draft.shipping}
              onChange={(e) => setDraft((d) => ({ ...d, shipping: e.target.checked }))}
            />
            <span>
              {v.shipping ? `Refund the shipping, ${money(v.shipping)}` : 'Shipping was free'}
            </span>
          </label>
          <div className="gm-field">
            <label htmlFor="refund-reason">Reason</label>
            <GlassSelect>
              <select
                id="refund-reason"
                value={draft.reason}
                onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              >
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </GlassSelect>
          </div>
          <dl className="gm-totals">
            <dt>Left on the order</dt>
            <dd>{money(v.net)}</dd>
            <dt className="gm-totals-total">Refund</dt>
            <dd className="gm-totals-total">{money(amount)}</dd>
          </dl>
          <p className="gm-field-error" aria-live="polite">
            {over ? `That's more than the ${money(v.net)} left.` : refundError}
          </p>
          <div className="mo-form-actions">
            <button
              className="gm-chip gm-chip-plain"
              type="button"
              onClick={() => refundRef.current?.close('cancel')}
            >
              Cancel
            </button>
            <button
              className="gm-chip gm-chip-primary"
              type="submit"
              disabled={!amount || over}
              aria-busy={busy === 'refund' || undefined}
            >
              {amount ? `Refund ${money(amount)}` : 'Refund'}
            </button>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog
        ref={cancelRef}
        heading="Cancel this order?"
        onClose={async (e) => {
          if (e.detail.value !== 'cancel') return;
          await cancel(number());
          await reload();
          title.current?.focus();
          toast(`Order #${o.number} is cancelled`);
        }}
      >
        <p>
          {v.payment === 'pending'
            ? "Nothing was charged: the hold on the customer's card is released."
            : `${money(v.net)} goes back to the customer's card, and they're emailed.`}
        </p>
        <form method="dialog" className="dialog-actions">
          <button className="gm-chip" value="keep">
            Keep it
          </button>
          <button className="gm-chip mo-danger" value="cancel">
            Cancel the order
          </button>
        </form>
      </GlassDialog>
    </AppShell>
  );
}
