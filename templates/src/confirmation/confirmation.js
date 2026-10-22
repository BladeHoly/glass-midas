import { toast } from '@glass-midas/components';
import { image, lastOrder } from '../shared/cart-store.js';
import { money, product } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// The confirmation: thanks by name, the order's number, what happens next and when it arrives,
// what was ordered and where it goes, and an offer to save the details, never a requirement.

const $ = (s) => document.querySelector(s);
const order = lastOrder();

const arrival = (days) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(
    new Date(Date.now() + days * 86400000),
  );

if (!order) {
  $('#done').hidden = true;
  $('#none').hidden = false;
} else {
  const first = order.name.split(' ')[0];
  document.title = `Thank you, ${first} · Ondine`;
  $('#number').textContent = `Order #${order.number}`;
  $('#thanks').textContent = `Thank you, ${first}`;
  $('#lede').textContent =
    `We've sent the receipt to ${order.email}. We'll email again when it ships.`;
  $('#arrives').textContent = order.method === 'express' ? arrival(1) : `By ${arrival(5)}`;
  $('#lines').innerHTML = order.lines
    .map((l) => {
      const p = product(l.product);
      return `<li><img src="${image(l.product, l.finish)}" alt="" width="56" height="56">
        <span>${escape(p.name)}<small>${l.finish} · ${l.quantity} × ${money(p.price)}</small></span>
        <span>${money(p.price * l.quantity)}</span></li>`;
    })
    .join('');
  const t = order.totals;
  $('#totals').innerHTML = `
    <dt>Subtotal</dt><dd>${money(t.subtotal)}</dd>
    ${t.discount ? `<dt>Discount</dt><dd>−${money(t.discount)}</dd>` : ''}
    <dt>Shipping</dt><dd>${t.shipping ? money(t.shipping) : 'Free'}</dd>
    <dt>Tax</dt><dd>${money(t.tax)}</dd>
    <dt class="gm-totals-total">Paid</dt><dd class="gm-totals-total">${money(t.total)}</dd>`;
  $('#address').innerHTML = [order.name, ...order.address].map(escape).join('<br>');
  $('#save-email').value = order.email;
  $('#thanks').focus();

  $('#save').addEventListener('submit', (e) => {
    e.preventDefault();
    const password = $('#new-password');
    if (password.value.length < 10) {
      $('#save-error').textContent = 'Use at least 10 characters.';
      password.setAttribute('aria-invalid', 'true');
      return password.focus();
    }
    // With a server: create the account with the order's email, then sign in.
    e.target.innerHTML = '<p>Your account is ready. This order is in it.</p>';
    toast('Account created');
  });
}

shopShell();
