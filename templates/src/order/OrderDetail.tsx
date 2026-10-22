import type { GmDialog } from '@glass-midas/components';
import { GlassDialog, toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState } from 'react';
import { ShopShell } from '../shared/ShopKit';
import {
  addresses,
  bill,
  cancelOrder,
  cards,
  myOrder,
  myOrders,
  progress,
  timeline,
  type Progress,
} from '../shared/account-store.js';
import { addToCart, image } from '../shared/cart-store.js';
import { day, money, product, type Order } from '../shared/data.js';

// One order, from the shopper's side: where it is (the sentence they came for, the steps and the
// tracking), what's in it and what it cost, where it goes and how it was paid, and everything
// that happened to it. It can be cancelled before it ships, sent back for 60 days once it
// arrives, bought again, and printed as a receipt. Load order.css too.

const long = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
const time = (at: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${at}:00Z`));

/** The sentence people come for. */
function where(p: Progress, o: Order) {
  switch (p.stage) {
    case 'processing':
      return `We have your order. It arrives by ${long(p.arrives!)}.`;
    case 'packing':
      return `Being packed in Lisbon. It arrives by ${long(p.arrives!)}.`;
    case 'shipped':
      return `On its way. It arrives ${long(p.arrives!)}.`;
    case 'delivered':
      return p.canReturn
        ? `Delivered ${long(p.delivered!)}. You can send it back until ${day(p.returnBy!)}.`
        : `Delivered ${long(p.delivered!)}.`;
    case 'returning':
      return 'Return started. Drop it off within 14 days; the refund follows when it arrives.';
    case 'cancelled':
      return 'Cancelled. The payment went back to your card.';
    default:
      return `Returned and refunded ${money(bill(o).total)}.`;
  }
}

export function OrderDetail() {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [, redraw] = useState(0);
  const cancel = useRef<GmDialog>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Without a number in the address, the newest order.
    const n = Number(new URLSearchParams(location.search).get('n'));
    (n ? myOrder(n) : myOrders().then((list) => list[0] ?? null)).then(setOrder);
  }, []);
  useEffect(() => {
    if (order) document.title = `Order #${order.number} · Ondine`;
  }, [order]);

  const crumbs = (
    <nav className="gm-breadcrumbs od-crumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="account.html">Account</a>
        </li>
        <li>
          <a href="account.html#orders">Orders</a>
        </li>
        <li>
          <span aria-current="page">{order ? `Order #${order.number}` : 'Order'}</span>
        </li>
      </ol>
    </nav>
  );

  if (order === undefined)
    return (
      <ShopShell here="account">
        <main id="main" className="shop-main shop-wrap">
          {crumbs}
          <div className="od-loading" aria-busy="true">
            <h1 className="on-sr-only">Loading your order</h1>
            <span className="gm-skeleton gm-skeleton-text" />
            <span className="gm-skeleton od-skeleton" />
            <span className="gm-skeleton od-skeleton" />
          </div>
        </main>
      </ShopShell>
    );

  if (!order)
    return (
      <ShopShell here="account">
        <main id="main" className="shop-main shop-wrap">
          {crumbs}
          <div className="gm-empty">
            <span className="on-sigil gm-empty-art" aria-hidden="true" />
            <h1>We can't find that order</h1>
            <p>It may be on another account. Your orders are all in one place.</p>
            <a className="gm-chip gm-chip-primary" href="account.html#orders">
              See your orders
            </a>
          </div>
        </main>
      </ShopShell>
    );

  const o = order;
  const p = progress(o);
  const b = bill(o);
  const card = cards().find((c) => c.default) ?? cards()[0];
  const home = addresses().find((a) => a.default) ?? addresses()[0];
  const again = () => {
    for (const l of o.lines) addToCart(l.product, l.finish, l.quantity);
    toast(`${o.lines.length === 1 ? 'It is' : 'They are'} back in your cart`, {
      action: {
        label: 'View cart',
        onClick: () => document.querySelector<HTMLElement>('#mini-cart')?.showPopover(),
      },
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.tracking!);
      toast('Tracking number copied');
    } catch {
      toast(`The tracking number is ${p.tracking}`);
    }
  };

  return (
    <ShopShell here="account">
      <main id="main" className="shop-main shop-wrap">
        {crumbs}
        <article>
          <header className="od-head">
            <div>
              <h1 className="on-display" ref={title} tabIndex={-1}>
                Order #{o.number}
              </h1>
              <p className="od-placed">
                Placed {day(o.date)} ·{' '}
                <span className="gm-badge" data-tone={p.tone || undefined}>
                  {p.label}
                </span>
              </p>
            </div>
            <div className="od-actions">
              {p.canReturn && (
                <a className="gm-chip gm-chip-primary" href={`returns.html?order=${o.number}`}>
                  Return something
                </a>
              )}
              {['delivered', 'refunded', 'cancelled'].includes(p.stage) && (
                <button className="gm-chip" type="button" onClick={again}>
                  Buy it again
                </button>
              )}
              {p.canCancel && (
                <button
                  className="gm-chip od-danger"
                  type="button"
                  onClick={() => cancel.current?.show()}
                >
                  Cancel order
                </button>
              )}
              <button className="gm-chip" type="button" onClick={() => print()}>
                Print receipt
              </button>
              <a className="gm-chip" href="mailto:help@example.com">
                Get help
              </a>
            </div>
          </header>

          <section className="od-card od-progress" aria-labelledby="where">
            <p className="od-where" id="where">
              {where(p, o)}
            </p>
            <ol className="gm-steps" aria-label="Order progress">
              {p.steps.map((s) => (
                <li
                  key={s.label}
                  aria-current={s.state === 'current' ? 'step' : undefined}
                  data-state={s.state && s.state !== 'current' ? s.state : undefined}
                >
                  {s.label}
                  {s.date && <small>{day(s.date)}</small>}
                </li>
              ))}
            </ol>
            {p.tracking && p.stage !== 'cancelled' && (
              <div className="od-tracking">
                <p>
                  <span>Lusa Express</span>
                  <strong>{p.tracking}</strong>
                </p>
                <button className="gm-chip gm-chip-plain" type="button" onClick={copy}>
                  Copy the number
                </button>
                <a className="gm-chip" href="#">
                  Track with the carrier
                </a>
              </div>
            )}
          </section>

          <div className="od-grid">
            <section className="od-card" aria-labelledby="items-title">
              <h2 id="items-title">What's in it</h2>
              <ul className="od-lines">
                {o.lines.map((l, i) => {
                  const piece = product(l.product)!;
                  const href = `product.html?id=${l.product}&finish=${l.finish.toLowerCase()}`;
                  return (
                    <li key={i} className="od-line">
                      <img src={image(l.product, l.finish)} alt="" width={80} height={80} />
                      <div>
                        <h3>
                          <a href={href}>{piece.name}</a>
                        </h3>
                        <p>
                          {piece.kind} · {l.finish} · {l.quantity} × {money(l.price)}
                        </p>
                        {(p.stage === 'delivered' || p.stage === 'returning') && (
                          <a className="od-review" href={`${href}#reviews`}>
                            Write a review
                          </a>
                        )}
                      </div>
                      <span className="od-line-total">{money(l.price * l.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="gm-totals">
                <dt>Subtotal</dt>
                <dd>{money(b.subtotal)}</dd>
                <dt>Shipping</dt>
                <dd>{b.shipping ? money(b.shipping) : 'Free'}</dd>
                <dt>Tax</dt>
                <dd>{money(b.tax)}</dd>
                <dt className="gm-totals-total">
                  {p.stage === 'cancelled' || p.stage === 'refunded'
                    ? 'Paid, then refunded'
                    : 'Paid'}
                </dt>
                <dd className="gm-totals-total">{money(b.total)}</dd>
              </dl>
            </section>

            <div className="od-side">
              <section className="od-card" aria-labelledby="delivery-title">
                <h2 id="delivery-title">Delivery</h2>
                {home && (
                  <address>
                    {[
                      home.name,
                      home.line1,
                      home.line2,
                      `${home.postal} ${home.city}`,
                      home.country,
                    ]
                      .filter(Boolean)
                      .map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))}
                  </address>
                )}
                <p className="od-small">Standard delivery, 3 to 5 working days</p>
              </section>
              <section className="od-card" aria-labelledby="payment-title">
                <h2 id="payment-title">Payment</h2>
                <p>{card ? `${card.brand} ending ${card.last4}` : 'Card'}</p>
              </section>
              <section className="od-card" aria-labelledby="history-title">
                <h2 id="history-title">What happened</h2>
                <ol className="gm-timeline">
                  {timeline(o).map((e, i) => (
                    <li key={i} data-tone={e.tone}>
                      <time dateTime={e.at}>{time(e.at)}</time>
                      <p>{e.text}</p>
                      {e.note && <p className="gm-timeline-note">{e.note}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </article>

        <GlassDialog
          ref={cancel}
          heading="Cancel this order?"
          onClose={async (e) => {
            if (e.detail.value !== 'cancel') return;
            await cancelOrder(o.number);
            redraw((n) => n + 1);
            title.current?.focus();
            toast(`Order #${o.number} is cancelled`);
          }}
        >
          <p>
            It hasn't shipped yet, so nothing is lost: the {money(b.total)} goes back to your card
            in 3 to 5 working days.
          </p>
          <form method="dialog">
            <button className="gm-chip gm-chip-plain" value="keep">
              Keep it
            </button>
            <button className="gm-chip od-danger" value="cancel">
              Cancel the order
            </button>
          </form>
        </GlassDialog>
      </main>
    </ShopShell>
  );
}
