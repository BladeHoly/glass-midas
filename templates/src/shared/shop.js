import { image, onCart, onSaved, readCart, readSaved, toggleSaved, totals } from './cart-store.js';
import { money, pageUrl, product, reviews } from './data.js';

// The store shell: the cart's count in the header and the mini cart behind it, kept in step with
// the cart, and the count of saved pieces; and the product card every store page shows pieces with.

export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const HEART =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

/** A price, and what it was when it's on sale (with "was" for screen readers). */
export const priceHtml = (p) =>
  `<span class="gm-price"><data value="${p.price}">${money(p.price)}</data>${
    p.was
      ? `<s><span class="on-sr-only">was </span>${money(p.was)}</s><span class="gm-price-off">−${Math.round((1 - p.price / p.was) * 100)}%</span>`
      : ''
  }</span>`;

/** Stars and how many reviews they come from. */
export const ratingHtml = (id, { long = false } = {}) => {
  const { average, count } = reviews[id].rating;
  return `<span class="gm-rating" style="--gm-rating:${average}" role="img" aria-label="${average} out of 5"></span> <span>${average}${long ? ` · ${count} reviews` : ` (${count})`}</span>`;
};

/** The heart that saves a piece for later, pressed when it's saved. */
export const saveButton = (p, finish, saved) =>
  `<button type="button" class="shop-save" data-save="${p.id}" data-finish="${finish.name}" aria-pressed="${saved}" aria-label="Save ${escape(p.name)} for later">${HEART}</button>`;

/** A product as a card: two pictures (the second on hover), name, kind, price, and its finishes. */
export function productCard(p, finish = p.finishes[0]) {
  const href = pageUrl('product', `id=${p.id}&finish=${finish.name.toLowerCase()}`);
  const saved = readSaved().some((s) => s.product === p.id);
  return `<li class="shop-card" data-product="${p.id}">
    <div class="shop-card-media">
      <img src="${image(p.id, finish.name)}" alt="" loading="lazy" width="400" height="400">
      <img src="${image(p.id, finish.name, 'detail')}" alt="" loading="lazy" width="400" height="400">
      ${p.was ? '<span class="gm-badge shop-card-flag">On sale</span>' : ''}
    </div>
    ${saveButton(p, finish, saved)}
    <h3><a href="${href}">${escape(p.name)}</a></h3>
    <p>${escape(p.kind)}</p>
    <p class="shop-rating">${ratingHtml(p.id)}</p>
    <p class="shop-price">${priceHtml(p)}</p>
    ${
      p.finishes.length > 1
        ? `<div class="shop-swatches" role="group" aria-label="${escape(p.name)} finishes">${p.finishes
            .map(
              (f) =>
                `<button type="button" class="shop-swatch" style="--swatch:${f.color}" aria-label="${f.name}" aria-pressed="${f === finish}" data-finish="${f.name}"></button>`,
            )
            .join('')}</div>`
        : ''
    }
  </li>`;
}

/** Swatches on cards switch the card's pictures and link to that finish; hearts save the piece. */
export function cardSwatches(root) {
  root.addEventListener('click', (e) => {
    const save = e.target.closest('[data-save]');
    if (save) {
      const on = toggleSaved(save.dataset.save, save.dataset.finish);
      save.setAttribute('aria-pressed', String(on));
      return;
    }
    const swatch = e.target.closest('.shop-swatch');
    if (!swatch) return;
    const card = swatch.closest('.shop-card');
    const id = card.dataset.product;
    const finish = swatch.dataset.finish;
    const [front, detail] = card.querySelectorAll('img');
    front.src = image(id, finish);
    detail.src = image(id, finish, 'detail');
    card.querySelector('a').href = pageUrl('product', `id=${id}&finish=${finish.toLowerCase()}`);
    card.querySelector('[data-save]').dataset.finish = finish;
    for (const s of card.querySelectorAll('.shop-swatch'))
      s.setAttribute('aria-pressed', String(s === swatch));
  });
}

function drawMiniCart(lines) {
  const list = document.querySelector('#mini-cart-lines');
  const t = totals(lines);
  const count = document.querySelector('[data-cart-button] .shop-count');
  if (count) count.textContent = t.count ? String(t.count) : '';
  document
    .querySelector('[data-cart-button]')
    ?.setAttribute(
      'aria-label',
      t.count ? `Cart, ${t.count} ${t.count === 1 ? 'item' : 'items'}` : 'Cart, empty',
    );
  if (!list) return;
  const filled = !!lines.length;
  document.querySelector('#mini-cart-empty').hidden = filled;
  document.querySelector('#mini-cart-full').hidden = !filled;
  list.innerHTML = lines
    .map((l) => {
      const p = product(l.product);
      return `<li><img src="${image(l.product, l.finish)}" alt="" width="56" height="56">
        <span>${escape(p.name)}<small>${l.finish} · ${l.quantity} × ${money(p.price)}</small></span>
        <span>${money(p.price * l.quantity)}</span></li>`;
    })
    .join('');
  document.querySelector('#mini-cart-subtotal').textContent = money(t.subtotal);
  document.querySelector('#mini-cart-note').textContent = t.toFreeShipping
    ? `${money(t.toFreeShipping)} more for free shipping.`
    : 'Shipping is free.';
}

function drawSaved(list) {
  const link = document.querySelector('[data-saved-link]');
  if (!link) return;
  link.querySelector('.shop-count').textContent = list.length ? String(list.length) : '';
  link.setAttribute('aria-label', list.length ? `Saved, ${list.length}` : 'Saved, none yet');
  // Hearts elsewhere on the page follow too (another tab, or the product page's own button).
  for (const b of document.querySelectorAll('[data-save]'))
    b.setAttribute('aria-pressed', String(list.some((s) => s.product === b.dataset.save)));
}

/** Wires the shell on a page: the counts, the mini cart, the search box. */
export function shopShell() {
  drawMiniCart(readCart());
  onCart(drawMiniCart);
  drawSaved(readSaved());
  onSaved(drawSaved);
  document.querySelector('.shop-search')?.addEventListener('submit', (e) => {
    const q = e.currentTarget.querySelector('input').value.trim();
    if (!q) e.preventDefault();
  });
}
