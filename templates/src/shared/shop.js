import { image, onCart, readCart, totals } from './cart-store.js';
import { money, pageUrl, product } from './data.js';

// The store shell: the cart's count in the header and the mini cart behind it, kept in step with
// the cart; and the product card every store page shows pieces with.

export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A product as a card: two pictures (the second on hover), name, kind, price, and its finishes. */
export function productCard(p, finish = p.finishes[0]) {
  const href = pageUrl('product', `id=${p.id}&finish=${finish.name.toLowerCase()}`);
  return `<li class="shop-card" data-product="${p.id}">
    <div class="shop-card-media">
      <img src="${image(p.id, finish.name)}" alt="" loading="lazy" width="400" height="400">
      <img src="${image(p.id, finish.name, 'detail')}" alt="" loading="lazy" width="400" height="400">
    </div>
    <h3><a href="${href}">${escape(p.name)}</a></h3>
    <p>${escape(p.kind)}</p>
    <p class="shop-price">${money(p.price)}</p>
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

/** Swatches on cards switch the card's pictures and link to that finish. */
export function cardSwatches(root) {
  root.addEventListener('click', (e) => {
    const swatch = e.target.closest('.shop-swatch');
    if (!swatch) return;
    const card = swatch.closest('.shop-card');
    const id = card.dataset.product;
    const finish = swatch.dataset.finish;
    const [front, detail] = card.querySelectorAll('img');
    front.src = image(id, finish);
    detail.src = image(id, finish, 'detail');
    card.querySelector('a').href = pageUrl('product', `id=${id}&finish=${finish.toLowerCase()}`);
    for (const s of card.querySelectorAll('.shop-swatch'))
      s.setAttribute('aria-pressed', String(s === swatch));
  });
}

function drawMiniCart(lines) {
  const list = document.querySelector('#mini-cart-lines');
  const t = totals(lines);
  const count = document.querySelector('.shop-count');
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

/** Wires the shell on a page: the count, the mini cart, the search box. */
export function shopShell() {
  drawMiniCart(readCart());
  onCart(drawMiniCart);
  document.querySelector('.shop-search')?.addEventListener('submit', (e) => {
    const q = e.currentTarget.querySelector('input').value.trim();
    if (!q) e.preventDefault();
  });
}
