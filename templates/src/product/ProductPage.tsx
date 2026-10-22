import type { GmDialog } from '@glass-midas/components';
import { GlassGallery } from '@glass-midas/react/data';
import { GlassQuantity, GlassSelect, GlassUpload } from '@glass-midas/react/forms';
import { GlassDialog, toast } from '@glass-midas/react/overlays';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Price, ProductCard, RatingLine, SaveButton, ShopShell, Stars } from '../shared/ShopKit';
import { addToCart, extra, image, notifyWhenBack, sendReview } from '../shared/cart-store.js';
import {
  collections,
  day,
  products,
  reviews,
  stock,
  type Finish,
  type Review,
} from '../shared/data.js';

// A product: pictures that follow the finish and open large, the finish as swatches that also
// say how many are left (and offer to tell you when a sold-out one is back), a quantity, one
// button to buy and a heart to save it; then the details, and what people said.
// Load product.css too.

type Shown = Review & { pending?: boolean };
type Errors = Partial<Record<'stars' | 'title' | 'body' | 'name' | 'photos', string>>;

export function ProductPage() {
  const params = new URLSearchParams(location.search);
  const p = products.find((x) => x.id === params.get('id')) ?? products[0]!;
  const [finish, setFinish] = useState<Finish>(
    p.finishes.find((f) => f.name.toLowerCase() === params.get('finish')) ?? p.finishes[0]!,
  );
  const [quantity, setQuantity] = useState(1);
  const [notify, setNotify] = useState({ email: '', message: '', ok: false });
  const [sort, setSort] = useState('recent');
  const [list, setList] = useState<Shown[]>(reviews[p.id]!.reviews);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const write = useRef<GmDialog>(null);
  const form = useRef<HTMLFormElement>(null);
  const left = stock[p.id]![finish.name]!;
  const max = Math.max(1, Math.min(9, left));
  const { rating } = reviews[p.id]!;

  useEffect(() => {
    document.title = `${p.name} · Ondine`;
    history.replaceState(null, '', `?id=${p.id}&finish=${finish.name.toLowerCase()}`);
    setQuantity((q) => Math.min(q, max));
    setNotify({ email: '', message: '', ok: false });
  }, [p, finish, max]);

  const pictures = [
    { src: image(p.id, finish.name), alt: `${p.name} in ${finish.name}` },
    { src: image(p.id, finish.name, 'detail'), alt: `${p.name} in ${finish.name}, close up` },
    { src: extra(p.id, 'plate'), alt: `${p.name}'s figure: sand on a plate, drawn by its tuning` },
    { src: extra(p.id, 'box'), alt: `${p.name}'s box` },
  ];

  const buy = (e: FormEvent) => {
    e.preventDefault();
    addToCart(p.id, finish.name, quantity);
    toast(`${p.name} in ${finish.name} is in your cart`, {
      action: {
        label: 'View cart',
        onClick: () => document.querySelector<HTMLElement>('#mini-cart')?.showPopover(),
      },
    });
  };

  const askForIt = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await notifyWhenBack(p.id, finish.name, notify.email.trim());
      setNotify((n) => ({
        ...n,
        ok: true,
        message: `We'll write to ${n.email.trim()} when ${finish.name} is back.`,
      }));
    } catch (err) {
      setNotify((n) => ({ ...n, ok: false, message: (err as Error).message }));
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const data = new FormData(form.current!);
    const text = (k: string) => String(data.get(k) ?? '').trim();
    const found: Errors = {
      stars: data.get('stars') ? undefined : 'Choose from one to five stars.',
      title: text('title') ? undefined : 'Give it a title, a few words.',
      body: text('body').length >= 20 ? undefined : 'Say a little more: 20 characters at least.',
      name: text('name') ? undefined : 'Add the name to show with it.',
    };
    setErrors(found);
    const first = (['stars', 'title', 'body', 'name'] as const).find((k) => found[k]);
    if (first) {
      form
        .current!.querySelector<HTMLElement>(
          first === 'stars' ? '[name="stars"]' : `#review-${first}`,
        )
        ?.focus();
      return;
    }
    setSending(true);
    const review = await sendReview({
      product: p.id,
      name: text('name'),
      city: 'You',
      date: new Date().toISOString().slice(0, 10),
      stars: Number(data.get('stars')),
      title: text('title'),
      body: text('body'),
      finish: finish.name,
      verified: false,
    });
    setSending(false);
    setList((l) => [...l, { ...review, pending: true }]);
    form.current!.reset();
    write.current?.close('sent');
    toast('Thank you. Your review shows here once someone has read it.');
  };

  const sorted = [...list].sort((a, b) =>
    sort === 'high'
      ? b.stars - a.stars || b.date.localeCompare(a.date)
      : sort === 'low'
        ? a.stars - b.stars || b.date.localeCompare(a.date)
        : b.date.localeCompare(a.date),
  );
  const related = products
    .filter((x) => x.collection === p.collection && x.id !== p.id)
    .slice(0, 4);
  const error = (k: keyof Errors) => (errors[k] ? { 'aria-invalid': true as const } : {});

  return (
    <ShopShell current={p.collection}>
      <main id="main" className="shop-main shop-wrap">
        <nav className="gm-breadcrumbs pd-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="storefront.html">Ondine</a>
            </li>
            <li>
              <a href={`collection.html?c=${p.collection}`}>{collections[p.collection]!.name}</a>
            </li>
            <li>
              <span aria-current="page">{p.name}</span>
            </li>
          </ol>
        </nav>
        <div className="pd">
          <GlassGallery className="pd-gallery" zoom aria-label="Pictures">
            {/* Keyed by place: a new finish changes each picture's src, not the pictures. */}
            {pictures.map((pic, i) => (
              <img key={i} src={pic.src} alt={pic.alt} width={800} height={800} />
            ))}
          </GlassGallery>

          <section className="pd-info" aria-labelledby="name">
            <p className="pd-kind">{p.kind}</p>
            <h1 className="on-display" id="name">
              {p.name}
            </h1>
            <p className="pd-rating">
              <a href="#reviews">
                <RatingLine id={p.id} long />
              </a>
            </p>
            <p className="pd-price">
              <Price p={p} />
            </p>
            <p className="pd-blurb">{p.blurb}</p>

            <form className="pd-buy" onSubmit={buy}>
              <fieldset className="gm-swatches pd-finishes">
                <legend>
                  Finish: <strong>{finish.name}</strong>
                </legend>
                {p.finishes.map((f) => {
                  const out = stock[p.id]![f.name] === 0;
                  return (
                    <input
                      key={f.name}
                      type="radio"
                      className="gm-swatch"
                      name="finish"
                      value={f.name}
                      style={{ '--gm-swatch': f.color } as CSSProperties}
                      aria-label={out ? `${f.name}, sold out` : f.name}
                      data-unavailable={out ? '' : undefined}
                      checked={f === finish}
                      onChange={() => setFinish(f)}
                    />
                  );
                })}
              </fieldset>
              <p className="pd-stock" aria-live="polite">
                {left === 0 ? (
                  <>
                    <span className="gm-badge" data-tone="danger">
                      Sold out
                    </span>{' '}
                    in {finish.name}. Back in about three weeks.
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
              {left > 0 && (
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
                  <button className="gm-chip gm-chip-primary" type="submit">
                    Add to cart
                  </button>
                  <SaveButton
                    p={p}
                    finish={finish}
                    className="gm-chip gm-chip-round pd-save"
                    onToggle={(on) =>
                      toast(on ? `${p.name} is saved for later` : `${p.name} is no longer saved`)
                    }
                  />
                </div>
              )}
              <p className="pd-ship">Free shipping over $150 · 60 days to return it</p>
            </form>

            {left === 0 && (
              <form className="pd-notify" onSubmit={askForIt} noValidate>
                <label htmlFor="notify-email">Tell me when it's back</label>
                <div className="pd-notify-row">
                  <input
                    className="gm-input"
                    type="email"
                    id="notify-email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    required
                    aria-describedby="notify-message"
                    aria-invalid={notify.message && !notify.ok ? true : undefined}
                    value={notify.email}
                    onChange={(e) => setNotify({ email: e.target.value, message: '', ok: false })}
                  />
                  <button className="gm-chip" type="submit">
                    Notify me
                  </button>
                </div>
                <p
                  className={`gm-field-error${notify.ok ? ' is-ok' : ''}`}
                  id="notify-message"
                  aria-live="polite"
                >
                  {notify.message}
                </p>
              </form>
            )}

            <div className="gm-accordion pd-more">
              <details name="pd-more" open>
                <summary>Specifications</summary>
                <dl className="pd-specs">
                  {Object.entries(p.specs).map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <details name="pd-more">
                <summary>In the box</summary>
                <p>
                  {p.name}, its cable or case where it has one, a card with its figure, and a cloth
                  bag.
                </p>
              </details>
              <details name="pd-more">
                <summary>Shipping and returns</summary>
                <p>
                  Ships in 2 working days from Lisbon. Free over $150, otherwise $12. Send it back
                  within 60 days, in any condition that isn't damage, for a full refund.
                </p>
              </details>
            </div>
          </section>
        </div>

        <section className="shop-section pd-reviews" id="reviews" aria-labelledby="reviews-title">
          <header>
            <h2 id="reviews-title">Reviews</h2>
            <button className="gm-chip" type="button" onClick={() => write.current?.show()}>
              Write a review
            </button>
          </header>
          <div className="pd-reviews-grid">
            <div className="pd-summary">
              <p className="pd-average">
                <strong>{rating.average}</strong>
                <Stars value={rating.average} />
                <span>{rating.count} reviews</span>
              </p>
              <ol className="pd-spread" aria-label="How the stars spread">
                {rating.spread.map((n, i) => (
                  <li key={i}>
                    <span>
                      {5 - i} {i === 4 ? 'star' : 'stars'}
                    </span>
                    <span
                      className="gm-meter"
                      style={{ '--value': n / rating.count } as CSSProperties}
                      aria-hidden="true"
                    />
                    <span>{n}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="pd-reviews-tools">
                <p>
                  {list.length} of {rating.count}, with words
                </p>
                <GlassSelect>
                  <select
                    aria-label="Sort reviews"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recent">Most recent</option>
                    <option value="high">Highest rated</option>
                    <option value="low">Lowest rated</option>
                  </select>
                </GlassSelect>
              </div>
              <ul className="pd-review-list">
                {sorted.map((r) => (
                  <li key={r.id} className="pd-review">
                    <p className="pd-review-stars">
                      <Stars value={r.stars} />
                      {r.pending && (
                        <span className="gm-badge" data-tone="info">
                          Waiting to be checked
                        </span>
                      )}
                    </p>
                    <h3>{r.title}</h3>
                    <p>{r.body}</p>
                    <p className="pd-review-by">
                      {r.name} · {r.city} · <time dateTime={r.date}>{day(r.date)}</time> ·{' '}
                      {r.finish}
                      {r.verified && (
                        <>
                          {' · '}
                          <span className="pd-verified">Bought it here</span>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

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

        <GlassDialog ref={write} heading="Write a review" placement="end">
          <form className="pd-review-form" ref={form} onSubmit={send} noValidate>
            <fieldset className="gm-rating-input" aria-describedby="stars-error">
              <legend>Your rating</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <input
                  key={n}
                  type="radio"
                  name="stars"
                  value={n}
                  aria-label={n === 1 ? '1 star' : `${n} stars`}
                  required={n === 1}
                />
              ))}
            </fieldset>
            <p className="gm-field-error" id="stars-error" aria-live="polite">
              {errors.stars}
            </p>
            <div className="gm-field">
              <label htmlFor="review-title">Title</label>
              <input
                className="gm-input"
                id="review-title"
                name="title"
                maxLength={80}
                required
                aria-describedby="review-title-error"
                {...error('title')}
              />
              <p className="gm-field-error" id="review-title-error">
                {errors.title}
              </p>
            </div>
            <div className="gm-field">
              <label htmlFor="review-body">Your review</label>
              <textarea
                className="gm-input"
                id="review-body"
                name="body"
                rows={5}
                maxLength={1200}
                required
                aria-describedby="review-body-error"
                {...error('body')}
              />
              <p className="gm-field-error" id="review-body-error">
                {errors.body}
              </p>
            </div>
            <div className="gm-field">
              <label htmlFor="review-photos">
                Photos <span className="pd-optional">(optional)</span>
              </label>
              <GlassUpload
                maxSize="5 MB"
                maxFiles={4}
                onFilesChange={() => setErrors((e) => ({ ...e, photos: undefined }))}
                onReject={(e) => {
                  const { file, reason } = e.detail;
                  const why = {
                    type: "isn't a picture",
                    size: 'is over 5 MB',
                    count: 'is one more than 4',
                  }[reason];
                  setErrors((x) => ({ ...x, photos: `${file.name} ${why}, so it's not added.` }));
                }}
              >
                <input
                  type="file"
                  id="review-photos"
                  name="photos"
                  accept="image/*"
                  multiple
                  aria-describedby="review-photos-error"
                />
              </GlassUpload>
              <p className="gm-field-error" id="review-photos-error" aria-live="polite">
                {errors.photos}
              </p>
            </div>
            <div className="gm-field">
              <label htmlFor="review-name">Name shown</label>
              <input
                className="gm-input"
                id="review-name"
                name="name"
                autoComplete="given-name"
                required
                aria-describedby="review-name-error"
                {...error('name')}
              />
              <p className="gm-field-error" id="review-name-error">
                {errors.name}
              </p>
            </div>
            <div className="pd-review-actions">
              <button
                className="gm-chip gm-chip-plain"
                type="button"
                onClick={() => write.current?.close('cancel')}
              >
                Cancel
              </button>
              <button
                className="gm-chip gm-chip-primary"
                type="submit"
                disabled={sending}
                aria-busy={sending || undefined}
              >
                Send review
              </button>
            </div>
          </form>
        </GlassDialog>
      </main>
    </ShopShell>
  );
}
