import { toast } from '@glass-midas/components';
import {
  FREE_SHIPPING,
  addToCart,
  image,
  onCart,
  readCart,
  removeFromCart,
  setQuantity,
  totals,
} from '../shared/cart-store.js';
import { money, pageUrl, product } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// The cart: every piece with its quantity, removable with an undo, and every cost before
// checkout, including how far it is to free shipping.

const $ = (s) => document.querySelector(s);

function render(lines) {
  const t = totals(lines);
  $('#cart').hidden = !lines.length;
  $('#empty').hidden = !!lines.length;
  if (!lines.length) return;

  // Rebuild only when the lines themselves change, so a quantity being typed keeps its focus.
  const key = lines.map((l) => `${l.product}/${l.finish}`).join(',');
  const list = $('#lines');
  if (list.dataset.key !== key) {
    list.dataset.key = key;
    list.innerHTML = lines
      .map((l) => {
        const p = product(l.product);
        return `<li class="cart-line" data-product="${l.product}" data-finish="${l.finish}">
          <img src="${image(l.product, l.finish)}" alt="" width="112" height="112">
          <div>
            <h2><a href="${pageUrl('product', `id=${l.product}&finish=${l.finish.toLowerCase()}`)}">${escape(p.name)}</a></h2>
            <p>${escape(p.kind)} · ${l.finish} · ${money(p.price)}</p>
            <div class="cart-line-controls">
              <gm-quantity><input type="number" min="1" max="9" value="${l.quantity}" aria-label="${escape(p.name)} in ${l.finish}, quantity"></gm-quantity>
              <button class="gm-chip gm-chip-plain" type="button" data-action="remove">Remove</button>
            </div>
          </div>
          <span class="cart-line-total"></span>
        </li>`;
      })
      .join('');
  }
  for (const row of list.children) {
    const line = lines.find(
      (l) => l.product === row.dataset.product && l.finish === row.dataset.finish,
    );
    row.querySelector('.cart-line-total').textContent = money(
      product(line.product).price * line.quantity,
    );
    const input = row.querySelector('input');
    if (document.activeElement !== input) input.value = String(line.quantity);
  }

  const missing = t.toFreeShipping;
  $('#free-text').textContent = missing
    ? `${money(missing)} more for free shipping.`
    : 'Shipping is free.';
  const meter = $('#free-meter');
  meter.style.setProperty('--value', String(Math.min(1, t.subtotal / FREE_SHIPPING)));
  meter.setAttribute('aria-valuenow', String(Math.min(FREE_SHIPPING, t.subtotal)));
  $('#totals').innerHTML = `
    <dt>Subtotal</dt><dd>${money(t.subtotal)}</dd>
    <dt>Shipping</dt><dd>${t.shipping ? money(t.shipping) : 'Free'}</dd>
    <dt>Estimated tax</dt><dd>${money(t.tax)}</dd>
    <dt class="is-total">Total</dt><dd class="is-total">${money(t.total)}</dd>`;
}

$('#lines').addEventListener('change', (e) => {
  const row = e.target.closest('.cart-line');
  if (!row || e.target.type !== 'number') return;
  const quantity = Math.max(1, Math.min(9, Math.round(Number(e.target.value)) || 1));
  setQuantity(row.dataset.product, row.dataset.finish, quantity);
});

// Removing is one click, and so is undoing it.
$('#lines').addEventListener('click', (e) => {
  if (!e.target.closest('[data-action="remove"]')) return;
  const row = e.target.closest('.cart-line');
  const { product: id, finish } = row.dataset;
  const line = readCart().find((l) => l.product === id && l.finish === finish);
  removeFromCart(id, finish);
  toast(`${product(id).name} in ${finish} removed`, {
    action: { label: 'Undo', onClick: () => addToCart(id, finish, line.quantity) },
  });
});

shopShell();
render(readCart());
onCart(render);
