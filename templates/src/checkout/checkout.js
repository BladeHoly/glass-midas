import '@glass-midas/components';
import { applyCode, image, placeOrder, readCart, totals } from '../shared/cart-store.js';
import { money, pageUrl, product } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// Checkout: one page, as a guest by default. Express first; then contact, delivery and payment,
// checked as they're left and all together on Pay, with a list of what's wrong that links to each
// field. The total on the button is the total you pay.

const $ = (s) => document.querySelector(s);
const form = $('#form');
let code = '';

const method = () => form.querySelector('[name="method"]:checked').value;

function render() {
  const lines = readCart();
  if (!lines.length) {
    location.replace(pageUrl('cart'));
    return;
  }
  const t = totals(lines, { method: method(), code });
  $('#lines').innerHTML = lines
    .map((l) => {
      const p = product(l.product);
      return `<li><img src="${image(l.product, l.finish)}" alt="" width="56" height="56">
        <span>${escape(p.name)}<small>${l.finish} · ${l.quantity} × ${money(p.price)}</small></span>
        <span>${money(p.price * l.quantity)}</span></li>`;
    })
    .join('');
  $('#totals').innerHTML = `
    <dt>Subtotal</dt><dd>${money(t.subtotal)}</dd>
    ${t.discount ? `<dt>Discount (${code})</dt><dd>−${money(t.discount)}</dd>` : ''}
    <dt>Shipping</dt><dd>${t.shipping ? money(t.shipping) : 'Free'}</dd>
    <dt>Tax</dt><dd>${money(t.tax)}</dd>
    <dt class="is-total">Total</dt><dd class="is-total">${money(t.total)}</dd>`;
  $('#standard-price').textContent = totals(lines, { code }).shipping ? '$12.00' : 'Free';
  $('#toggle-total').textContent = money(t.total);
  $('#pay').textContent = `Pay ${money(t.total)}`;
}

// What each field needs, in words that say how to fix it.
const CHECKS = {
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
const LABELS = {
  email: 'Email',
  name: 'Full name',
  address: 'Address',
  city: 'City',
  postal: 'Postal code',
  card: 'Card number',
  expiry: 'Expiry',
  cvc: 'Security code',
};

function check(name) {
  const input = form.elements[name];
  const message = CHECKS[name](input.value.trim());
  $(`#${name}-error`).textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  return message;
}

for (const name of Object.keys(CHECKS)) {
  const input = form.elements[name];
  input.addEventListener('blur', () => input.value && check(name));
  input.addEventListener('input', () => input.hasAttribute('aria-invalid') && check(name));
}

// The card number in groups of four, the expiry as MM / YY, as they're typed.
form.elements.card.addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
  e.target.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
});
form.elements.expiry.addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
});
form.elements.cvc.addEventListener(
  'input',
  (e) => (e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)),
);

$('#methods').addEventListener('change', render);

$('#code-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#code');
  const message = $('#code-message');
  try {
    code = await applyCode(input.value);
    message.textContent = `${code}: 10% off.`;
    input.removeAttribute('aria-invalid');
  } catch (failure) {
    message.textContent = failure.message;
    input.setAttribute('aria-invalid', 'true');
  }
  render();
});

const alert = $('#alert');
function fail(html) {
  alert.innerHTML = html;
  alert.hidden = false;
  alert.focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alert.hidden = true;
  const wrong = Object.keys(CHECKS).filter((name) => check(name));
  if (wrong.length) {
    // A list of what to fix, each one a link to its field.
    return fail(
      `<strong>${wrong.length === 1 ? 'One thing to fix' : `${wrong.length} things to fix`} before paying:</strong>
      <ul>${wrong.map((name) => `<li><a href="#${name}">${LABELS[name]}: ${escape($(`#${name}-error`).textContent)}</a></li>`).join('')}</ul>`,
    );
  }
  const pay = $('#pay');
  pay.setAttribute('aria-busy', 'true');
  try {
    const data = Object.fromEntries(new FormData(form));
    // The country's name, not its code, for the confirmation.
    data.country = form.elements.country.selectedOptions[0]?.text ?? data.country;
    await placeOrder({ ...data, method: method(), code });
    location.assign(pageUrl('confirmation'));
  } catch (failure) {
    pay.removeAttribute('aria-busy');
    form.elements.card.setAttribute('aria-invalid', 'true');
    $('#card-error').textContent = failure.message;
    fail(`<strong>${escape(failure.message)}</strong>`);
  }
});

alert.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  e.preventDefault();
  form.elements[link.hash.slice(1)]?.focus();
});

$('[data-action="wallet"]').addEventListener('click', () => {
  // With a provider: open the device wallet here (the Payment Request API), then place the order.
  fail('<strong>The wallet isn’t connected in this template.</strong> Pay by card below.');
});

shopShell();
render();
