import type { GmUpload } from '@glass-midas/components';
import { GlassQuantity, GlassSelect, GlassUpload } from '@glass-midas/react/forms';
import { toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ShopShell } from '../shared/ShopKit';
import { cards, myOrder, myOrders, progress, startReturn } from '../shared/account-store.js';
import { image } from '../shared/cart-store.js';
import { day, money, product, type Order } from '../shared/data.js';

// Sending something back, in four steps on one page: which pieces (and how many), why (damage
// asks for a photo), how they travel and where the money goes (with the refund worked out before
// anything is sent), and then the code to show at the drop-off and what happens next. Each step
// checks itself before the next; Back keeps what was chosen. Load returns.css too.

const REASONS = [
  ['mind', 'I changed my mind'],
  ['sound', "It doesn't sound how I expected"],
  ['damaged', 'It arrived damaged'],
  ['wrong', 'Wrong piece or finish'],
  ['broken', 'It stopped working'],
  ['other', 'Something else'],
] as const;
const NEEDS_PHOTO = ['damaged', 'broken'];
const PICKUP = 6;
const STEPS = ['pieces', 'why', 'how', 'done'] as const;
type Step = (typeof STEPS)[number];
type Started = Awaited<ReturnType<typeof startReturn>>;

/** A square of cells drawn from the code: something to scan at the counter. */
function CodeArt({ code }: { code: string }) {
  let seed = [...code].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  const rand = () => (seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296;
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
  const cells: [number, number][] = [];
  for (let y = 0; y < 29; y++)
    for (let x = 0; x < 29; x++) if (!inFinder(x, y) && rand() < 0.48) cells.push([x, y]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="var(--rt-paper)" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </g>
  );
  return (
    <svg className="rt-code" viewBox="0 0 29 29" role="img" aria-labelledby="code-text">
      <rect width={29} height={29} fill="var(--rt-paper)" />
      {finder(0, 0)}
      {finder(22, 0)}
      {finder(0, 22)}
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </svg>
  );
}

export function ReturnRequest() {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [returnable, setReturnable] = useState<Order[] | null>(null);
  const [step, setStep] = useState<Step>('pieces');
  const [chosen, setChosen] = useState<Map<number, number>>(new Map());
  const [why, setWhy] = useState<Map<number, { reason: string; note: string }>>(new Map());
  const [method, setMethod] = useState<'drop-off' | 'pickup'>('drop-off');
  const [refundTo, setRefundTo] = useState<'card' | 'credit'>('card');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<Started | null>(null);
  const uploads = useRef(new Map<number, GmUpload>());
  const card = useRef(cards().find((c) => c.default) ?? cards()[0]).current;

  const load = (n: number) => {
    setOrder(undefined);
    myOrder(n).then(setOrder);
  };
  useEffect(() => {
    const n = Number(new URLSearchParams(location.search).get('order'));
    if (n) load(n);
    else myOrders().then((list) => setReturnable(list.filter((o) => progress(o).canReturn)));
  }, []);

  // Each step's heading takes focus, so a screen reader hears where it is.
  useEffect(() => {
    document.querySelector<HTMLElement>('.rt-card:not([hidden]) h2')?.focus();
  }, [step, order, returnable]);
  const go = (next: Step) => {
    setStep(next);
    scrollTo({
      top: 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  const crumbs = (
    <nav className="gm-breadcrumbs rt-crumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="account.html">Account</a>
        </li>
        <li>
          <a href={order ? `order.html?n=${order.number}` : 'account.html#orders'}>
            {order ? `Order #${order.number}` : 'Orders'}
          </a>
        </li>
        <li>
          <span aria-current="page">Return</span>
        </li>
      </ol>
    </nav>
  );

  // No order in the address: the ones that can still go back.
  if (!order && returnable && order !== null) {
    const choose = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const n = new FormData(e.currentTarget).get('order');
      if (!n) return;
      history.replaceState(null, '', `?order=${n}`);
      load(Number(n));
    };
    return (
      <ShopShell here="account">
        <main id="main" className="shop-main shop-wrap rt">
          {crumbs}
          <header className="rt-head">
            <h1 className="on-display">Send something back</h1>
            <p>60 days from delivery, in any state that isn't damage you caused.</p>
          </header>
          <form className="rt-card" onSubmit={choose}>
            <h2 tabIndex={-1}>Which order?</h2>
            {returnable.length ? (
              <>
                <fieldset className="gm-options" aria-label="Orders you can return">
                  {returnable.map((o, i) => (
                    <label key={o.number} className="gm-option">
                      <input
                        type="radio"
                        className="gm-check"
                        name="order"
                        value={o.number}
                        defaultChecked={!i}
                      />
                      <span>
                        Order #{o.number}
                        <small>
                          {o.lines.map((l) => product(l.product)!.name).join(', ')} · return by{' '}
                          {day(progress(o).returnBy!)}
                        </small>
                      </span>
                      <span>{day(o.date)}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="rt-actions">
                  <button className="gm-chip gm-chip-primary" type="submit">
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <div className="gm-empty">
                <h3>Nothing to send back</h3>
                <p>
                  Orders can go back for 60 days after they arrive. None of yours are in that
                  window.
                </p>
                <a className="gm-chip" href="account.html#orders">
                  See your orders
                </a>
              </div>
            )}
          </form>
        </main>
      </ShopShell>
    );
  }

  if (order === undefined)
    return (
      <ShopShell here="account">
        <main id="main" className="shop-main shop-wrap rt">
          {crumbs}
          <header className="rt-head">
            <h1 className="on-display">Send something back</h1>
          </header>
          <div className="rt-card" aria-busy="true">
            <span className="gm-skeleton gm-skeleton-text" />
            <span className="gm-skeleton rt-skeleton" />
          </div>
        </main>
      </ShopShell>
    );

  const p = order && progress(order);
  // Once a return is started the order can't go back again, but this page still shows it done.
  if (!order || (!p!.canReturn && !started))
    return (
      <ShopShell here="account">
        <main id="main" className="shop-main shop-wrap rt">
          {crumbs}
          <header className="rt-head">
            <h1 className="on-display">
              {order ? `Order #${order.number} can't go back` : "We can't find that order"}
            </h1>
            <p>
              {!order
                ? 'It may be on another account.'
                : p!.stage === 'returning'
                  ? 'A return is already started for it. Its code is on the order.'
                  : 'Returns are open for 60 days after delivery, and only once it has arrived.'}
            </p>
            <p>
              <a
                className="gm-chip"
                href={order ? `order.html?n=${order.number}` : 'account.html#orders'}
              >
                {order ? 'See the order' : 'See your orders'}
              </a>
            </p>
          </header>
        </main>
      </ShopShell>
    );

  const o = order;
  const at = STEPS.indexOf(step);
  const value = [...chosen].reduce((n, [i, q]) => n + o.lines[i]!.price * q, 0);
  const pickup = method === 'pickup' ? PICKUP : 0;
  const bonus = refundTo === 'credit' ? Math.round(value * 0.1 * 100) / 100 : 0;
  const count = [...chosen.values()].reduce((a, b) => a + b, 0);

  const toggle = (i: number, on: boolean) =>
    setChosen((m) => {
      const next = new Map(m);
      if (on) next.set(i, o.lines[i]!.quantity);
      else next.delete(i);
      return next;
    });
  const piecesDone = (e: FormEvent) => {
    e.preventDefault();
    if (!chosen.size) {
      setErrors({ pieces: 'Choose at least one piece to send back.' });
      return document.querySelector<HTMLElement>('.rt-line input')?.focus();
    }
    setErrors({});
    setWhy((m) => {
      const next = new Map(m);
      for (const i of chosen.keys()) if (!next.has(i)) next.set(i, { reason: 'mind', note: '' });
      return next;
    });
    go('why');
  };
  const whyDone = (e: FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    for (const i of chosen.keys())
      if (NEEDS_PHOTO.includes(why.get(i)?.reason ?? '') && !uploads.current.get(i)?.files.length)
        found[`photos-${i}`] = 'Add a photo of the damage, so we can claim it from the carrier.';
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return document.querySelector<HTMLElement>(`#${first}`)?.focus();
    go('how');
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await startReturn({
        order: o.number,
        lines: [...chosen].map(([i, quantity]) => ({
          product: o.lines[i]!.product,
          finish: o.lines[i]!.finish,
          quantity,
          ...why.get(i)!,
        })),
        method,
        refund: refundTo,
      });
      setStarted(r);
      go('done');
      toast('Return started');
    } catch {
      setErrors({ how: "We couldn't start the return. Try again in a moment." });
    } finally {
      setBusy(false);
    }
  };
  const setReason = (i: number, change: Partial<{ reason: string; note: string }>) =>
    setWhy((m) => new Map(m).set(i, { ...m.get(i)!, ...change }));

  return (
    <ShopShell here="account">
      <main id="main" className="shop-main shop-wrap rt">
        {crumbs}
        <header className="rt-head">
          <h1 className="on-display">Send back from order #{o.number}</h1>
          <p>
            {step === 'done'
              ? "We've emailed you the same. Nothing to pay."
              : `Delivered ${day(p!.delivered!)}. You have until ${day(p!.returnBy!)}.`}
          </p>
        </header>

        <ol className="gm-steps rt-steps" aria-label="Return progress">
          {['Pieces', 'Why', 'How', 'Done'].map((label, i) => (
            <li
              key={label}
              aria-current={i === at ? 'step' : undefined}
              data-state={i < at ? 'done' : undefined}
            >
              {label}
            </li>
          ))}
        </ol>

        {/* Every step stays mounted (hidden when it isn't the one), so Back keeps what was chosen. */}
        <form className="rt-card" hidden={step !== 'pieces'} onSubmit={piecesDone} noValidate>
          <h2 tabIndex={-1}>What's going back?</h2>
          <ul className="rt-lines">
            {o.lines.map((l, i) => {
              const piece = product(l.product)!;
              const on = chosen.has(i);
              return (
                <li key={i} className="rt-line">
                  <label className="rt-line-pick">
                    <input
                      type="checkbox"
                      className="gm-check"
                      checked={on}
                      onChange={(e) => {
                        toggle(i, e.target.checked);
                        setErrors({});
                      }}
                    />
                    <img src={image(l.product, l.finish)} alt="" width={72} height={72} />
                    <span>
                      <strong>{piece.name}</strong>
                      <small>
                        {l.finish} · {money(l.price)}
                        {l.quantity > 1 && ` · ${l.quantity} bought`}
                      </small>
                    </span>
                  </label>
                  {l.quantity > 1 && on && (
                    <GlassQuantity>
                      <input
                        type="number"
                        min={1}
                        max={l.quantity}
                        value={chosen.get(i)}
                        aria-label={`How many ${piece.name} go back`}
                        onChange={(e) =>
                          setChosen((m) =>
                            new Map(m).set(
                              i,
                              Math.min(l.quantity, Math.max(1, Number(e.target.value) || 1)),
                            ),
                          )
                        }
                      />
                    </GlassQuantity>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="gm-field-error" aria-live="polite">
            {errors.pieces}
          </p>
          <div className="rt-actions">
            <a className="gm-chip gm-chip-plain" href={`order.html?n=${o.number}`}>
              Not now
            </a>
            <button className="gm-chip gm-chip-primary" type="submit">
              Continue
            </button>
          </div>
        </form>

        <form className="rt-card" hidden={step !== 'why'} onSubmit={whyDone} noValidate>
          <h2 tabIndex={-1}>Why is it going back?</h2>
          <p className="rt-small">
            It doesn't change the refund. It tells us what to fix, and photos of damage let us claim
            it from the carrier.
          </p>
          <div className="rt-reasons">
            {o.lines.map((l, i) => {
              const w = why.get(i);
              if (!chosen.has(i) || !w) return null;
              return (
                <fieldset key={i} className="rt-reason">
                  <legend>
                    <img src={image(l.product, l.finish)} alt="" width={40} height={40} />
                    {product(l.product)!.name}, {l.finish}
                  </legend>
                  <div className="gm-field">
                    <label htmlFor={`reason-${i}`}>Why</label>
                    <GlassSelect>
                      <select
                        id={`reason-${i}`}
                        value={w.reason}
                        onChange={(e) => setReason(i, { reason: e.target.value })}
                      >
                        {REASONS.map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </GlassSelect>
                  </div>
                  <div className="gm-field">
                    <label htmlFor={`note-${i}`}>
                      Anything to add <span className="rt-optional">(optional)</span>
                    </label>
                    <textarea
                      className="gm-input"
                      id={`note-${i}`}
                      rows={2}
                      maxLength={500}
                      value={w.note}
                      onChange={(e) => setReason(i, { note: e.target.value })}
                    />
                  </div>
                  <div className="gm-field rt-photos" hidden={!NEEDS_PHOTO.includes(w.reason)}>
                    <label htmlFor={`photos-${i}`}>Photos of it</label>
                    <GlassUpload
                      ref={(el) => {
                        if (el) uploads.current.set(i, el);
                      }}
                      maxSize="5 MB"
                      maxFiles={4}
                      onFilesChange={() => setErrors((x) => ({ ...x, [`photos-${i}`]: '' }))}
                      onReject={(e) => {
                        const words = {
                          type: "isn't a picture",
                          size: 'is over 5 MB',
                          count: 'is one more than 4',
                        }[e.detail.reason];
                        setErrors((x) => ({
                          ...x,
                          [`photos-${i}`]: `${e.detail.file.name} ${words}, so it's not added.`,
                        }));
                      }}
                    >
                      <input
                        type="file"
                        id={`photos-${i}`}
                        accept="image/*"
                        multiple
                        aria-describedby={`photos-${i}-error`}
                      />
                    </GlassUpload>
                    <p className="gm-field-error" id={`photos-${i}-error`} aria-live="polite">
                      {errors[`photos-${i}`]}
                    </p>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="rt-actions">
            <button className="gm-chip gm-chip-plain" type="button" onClick={() => go('pieces')}>
              Back
            </button>
            <button className="gm-chip gm-chip-primary" type="submit">
              Continue
            </button>
          </div>
        </form>

        <form className="rt-card" hidden={step !== 'how'} onSubmit={send} noValidate>
          <h2 tabIndex={-1}>How it comes back</h2>
          <fieldset className="gm-options">
            <legend>Getting it to us</legend>
            <label className="gm-option">
              <input
                type="radio"
                className="gm-check"
                name="method"
                checked={method === 'drop-off'}
                onChange={() => setMethod('drop-off')}
              />
              <span>
                Drop it at a Lusa point
                <small>Over 2,000 of them; bring the code, no printer needed</small>
              </span>
              <span>Free</span>
            </label>
            <label className="gm-option">
              <input
                type="radio"
                className="gm-check"
                name="method"
                checked={method === 'pickup'}
                onChange={() => setMethod('pickup')}
              />
              <span>
                Collected from your door
                <small>A courier comes on a weekday you choose by email</small>
              </span>
              <span>{money(PICKUP)}</span>
            </label>
          </fieldset>
          <fieldset className="gm-options">
            <legend>Your refund</legend>
            <label className="gm-option">
              <input
                type="radio"
                className="gm-check"
                name="refund"
                checked={refundTo === 'card'}
                onChange={() => setRefundTo('card')}
              />
              <span>
                {card ? `To the ${card.brand} ending ${card.last4}` : 'To your card'}
                <small>3 to 5 working days after it reaches us</small>
              </span>
              <span>{money(value - pickup)}</span>
            </label>
            <label className="gm-option">
              <input
                type="radio"
                className="gm-check"
                name="refund"
                checked={refundTo === 'credit'}
                onChange={() => setRefundTo('credit')}
              />
              <span>
                As store credit, with 10% more
                <small>As soon as it's checked in, for anything</small>
              </span>
              <span>{money(value - pickup + Math.round(value * 0.1 * 100) / 100)}</span>
            </label>
          </fieldset>
          <dl className="gm-totals">
            <dt>
              {count} {count === 1 ? 'piece' : 'pieces'}
            </dt>
            <dd>{money(value)}</dd>
            {pickup > 0 && (
              <>
                <dt>Collection</dt>
                <dd>−{money(pickup)}</dd>
              </>
            )}
            {bonus > 0 && (
              <>
                <dt>Store credit bonus</dt>
                <dd>+{money(bonus)}</dd>
              </>
            )}
            <dt className="gm-totals-total">You get back</dt>
            <dd className="gm-totals-total">{money(value - pickup + bonus)}</dd>
          </dl>
          <p className="gm-field-error" aria-live="polite">
            {errors.how}
          </p>
          <div className="rt-actions">
            <button className="gm-chip gm-chip-plain" type="button" onClick={() => go('why')}>
              Back
            </button>
            <button
              className="gm-chip gm-chip-primary"
              type="submit"
              disabled={busy}
              aria-busy={busy || undefined}
            >
              Start the return
            </button>
          </div>
        </form>

        {started && (
          <section
            className="rt-card rt-done"
            hidden={step !== 'done'}
            aria-labelledby="done-title"
          >
            <h2 id="done-title" tabIndex={-1}>
              Return {started.id} is started
            </h2>
            <div className="rt-label">
              <CodeArt code={started.code} />
              <div>
                <p className="rt-small">Show this at the drop-off point, or read out the code:</p>
                <p className="rt-code-text" id="code-text">
                  {started.code.replace(/(.{4})/g, '$1 ').trim()}
                </p>
                <p>
                  {started.method === 'pickup' ? (
                    <>
                      We'll email you to choose a weekday for the courier, before{' '}
                      <strong>{day(started.by)}</strong>.
                    </>
                  ) : (
                    <>
                      Drop it at any Lusa point by <strong>{day(started.by)}</strong>, in its box if
                      you still have it.
                    </>
                  )}
                </p>
                {started.method !== 'pickup' && (
                  <button className="gm-chip" type="button" onClick={() => print()}>
                    Print the label instead
                  </button>
                )}
              </div>
            </div>
            <h3>What happens next</h3>
            <ol className="gm-steps" data-orientation="vertical">
              <li aria-current="step">
                Return started<small>Today</small>
              </li>
              <li>
                {started.method === 'pickup' ? 'Collected' : 'Dropped off'}
                <small>By {day(started.by)}</small>
              </li>
              <li>
                Checked in Lisbon<small>A day or two after it arrives</small>
              </li>
              <li>
                {started.refundTo === 'credit'
                  ? `${money(started.refund)} in store credit`
                  : `${money(started.refund)} back to your card`}
                <small>
                  {started.refundTo === 'credit'
                    ? 'As soon as it is checked'
                    : '3 to 5 working days after'}
                </small>
              </li>
            </ol>
            <div className="rt-actions">
              <a className="gm-chip" href="account.html#orders">
                Back to your orders
              </a>
              <a className="gm-chip gm-chip-primary" href="collection.html">
                Keep browsing
              </a>
            </div>
          </section>
        )}
      </main>
    </ShopShell>
  );
}
