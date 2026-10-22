import { toast } from '@glass-midas/components';
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
} from '../shared/account-store.js';
import { addToCart, image } from '../shared/cart-store.js';
import { day, initials, money, pageUrl, product } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// The shopper's account: their orders (where each one is, and what can be done with it), where
// things go, the cards they keep, and their details. Each tab has its own address (#orders,
// #addresses, #payment, #details), so a link opens the right one.

const $ = (s) => document.querySelector(s);
const PAGE = 6;
const TABS = { orders: 'Orders', addresses: 'Addresses', payment: 'Payment', details: 'Details' };

const who = profile();
$('#avatar').textContent = initials(who.name);
$('#hello').textContent = `Hello, ${who.name.split(' ')[0]}`;
$('#signed-in').textContent = `Signed in as ${who.email}`;

// Tabs follow the address, and the address follows the tabs.
const tabs = $('#tabs');
const fromHash = () => {
  const label = TABS[location.hash.slice(1)];
  if (label) customElements.whenDefined('gm-tabs').then(() => tabs.selectLabel(label, false));
};
tabs.addEventListener('gm-change', (e) => {
  const key = Object.keys(TABS).find((k) => TABS[k] === e.detail.label);
  if (key) history.replaceState(null, '', `#${key}`);
});
addEventListener('hashchange', fromHash);
fromHash();

/* Orders */

let all = [];
let filter = 'all';
let shown = PAGE;
const GROUPS = {
  all: () => true,
  open: (p) => ['processing', 'packing', 'shipped', 'returning'].includes(p.stage),
  delivered: (p) => p.stage === 'delivered',
  closed: (p) => ['cancelled', 'refunded'].includes(p.stage),
};
/** When it comes, or what happened to it, in a line. */
function when(p, o) {
  switch (p.stage) {
    case 'processing':
    case 'packing':
      return `Arrives by ${day(p.arrives)}`;
    case 'shipped':
      return `Arrives ${day(p.arrives)}`;
    case 'delivered':
      return p.canReturn
        ? `Delivered ${day(p.delivered)} · return by ${day(p.returnBy)}`
        : `Delivered ${day(p.delivered)}`;
    case 'returning':
      return 'Return started: drop it off within 14 days';
    case 'cancelled':
      return `Cancelled · ordered ${day(o.date)}`;
    default:
      return `Refunded · ordered ${day(o.date)}`;
  }
}

function orderCard(o) {
  const p = progress(o);
  const link = pageUrl('order', `n=${o.number}`);
  const pics = o.lines.slice(0, 4);
  return `<li class="ac-order">
    <div class="ac-order-top">
      <h3><a href="${link}">Order #${o.number}</a></h3>
      <span class="gm-badge"${p.tone ? ` data-tone="${p.tone}"` : ''}>${p.label}</span>
      <span class="ac-order-total">${money(bill(o).total)}</span>
    </div>
    <p class="ac-order-when">${when(p, o)}</p>
    <ul class="ac-thumbs" aria-label="${o.lines.length} ${o.lines.length === 1 ? 'piece' : 'pieces'}">${pics
      .map(
        (l) =>
          `<li><img src="${image(l.product, l.finish)}" alt="${escape(product(l.product).name)} in ${l.finish}" width="64" height="64" loading="lazy">${l.quantity > 1 ? `<span>×${l.quantity}</span>` : ''}</li>`,
      )
      .join(
        '',
      )}${o.lines.length > 4 ? `<li class="ac-thumbs-more">+${o.lines.length - 4}</li>` : ''}</ul>
    <div class="ac-order-actions">
      <a class="gm-chip" href="${link}">${p.stage === 'shipped' ? 'Track it' : 'View order'}</a>
      ${p.canReturn ? `<a class="gm-chip gm-chip-plain" href="${pageUrl('returns', `order=${o.number}`)}">Return something</a>` : ''}
      ${['delivered', 'refunded', 'cancelled'].includes(p.stage) ? `<button class="gm-chip gm-chip-plain" type="button" data-again="${o.number}">Buy again</button>` : ''}
    </div>
  </li>`;
}

function drawOrders() {
  const list = all.filter((o) => GROUPS[filter](progress(o)));
  const ul = $('#orders');
  ul.removeAttribute('aria-busy');
  ul.innerHTML = list.slice(0, shown).map(orderCard).join('');
  ul.hidden = !list.length;
  $('#order-count').textContent = list.length
    ? `${Math.min(shown, list.length)} of ${list.length} ${list.length === 1 ? 'order' : 'orders'}`
    : '';
  $('#more').hidden = list.length <= shown;
  $('#orders-empty').hidden = !!list.length;
  const filtered = filter !== 'all';
  $('#orders-empty-title').textContent = filtered ? 'None here' : 'No orders yet';
  $('#orders-empty-text').textContent = filtered
    ? 'No orders like that. Look at all of them instead.'
    : 'When you buy something, it shows up here with its tracking.';
  for (const b of $('#order-filters').children)
    b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
}

$('#order-filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  filter = b.dataset.filter;
  shown = PAGE;
  drawOrders();
});
$('#more').addEventListener('click', () => {
  const before = shown;
  shown += PAGE;
  drawOrders();
  // Focus the first of the new orders, so keyboard users carry on from there.
  $('#orders').children[before]?.querySelector('h3 a')?.focus();
});
$('#orders').addEventListener('click', (e) => {
  const b = e.target.closest('[data-again]');
  if (!b) return;
  const o = all.find((x) => x.number === Number(b.dataset.again));
  for (const l of o.lines) addToCart(l.product, l.finish, l.quantity);
  toast(`${o.lines.length === 1 ? 'It is' : 'They are'} back in your cart`, {
    action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
  });
});

myOrders().then((list) => {
  all = list;
  drawOrders();
});

/* Addresses */

const dialog = $('#address-dialog');
const form = $('#address-form');

function drawAddresses() {
  const list = addresses();
  $('#addresses').innerHTML = list
    .map(
      (a) => `<li class="ac-card" data-id="${a.id}">
        <p class="ac-card-top"><strong>${escape(a.name)}</strong>${a.default ? '<span class="gm-badge" data-tone="info">Default</span>' : ''}</p>
        <address>${[a.line1, a.line2, `${a.postal} ${a.city}`, a.country, a.phone].filter(Boolean).map(escape).join('<br>')}</address>
        <div class="ac-card-actions">
          <button class="gm-chip gm-chip-plain" type="button" data-edit aria-label="Edit ${escape(a.name)}">Edit</button>
          ${a.default ? '' : `<button class="gm-chip gm-chip-plain" type="button" data-default aria-label="Use ${escape(a.name)} by default">Make default</button>`}
          <button class="gm-chip gm-chip-plain" type="button" data-remove aria-label="Remove ${escape(a.name)}">Remove</button>
        </div>
      </li>`,
    )
    .join('');
}

function openAddress(a) {
  form.reset();
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
  for (const el of form.querySelectorAll('.gm-field-error')) el.textContent = '';
  dialog.querySelector('.gm-dialog-heading').textContent = a
    ? 'Edit the address'
    : 'Add an address';
  if (a) {
    for (const [k, v] of Object.entries(a))
      if (form.elements[k] && k !== 'default') form.elements[k].value = v;
    form.elements.default.checked = !!a.default;
  }
  form.querySelector('gm-select')?.sync?.();
  dialog.show();
}

$('#add-address').addEventListener('click', () => openAddress(null));
$('#address-cancel').addEventListener('click', () => dialog.close('cancel'));
$('#addresses').addEventListener('click', async (e) => {
  const li = e.target.closest('[data-id]');
  if (!li) return;
  const a = addresses().find((x) => x.id === li.dataset.id);
  if (e.target.closest('[data-edit]')) openAddress(a);
  if (e.target.closest('[data-default]')) {
    await defaultAddress(a.id);
    drawAddresses();
    toast(`${a.line1} is now the default`);
    $('#addresses [data-id] [data-edit]')?.focus();
  }
  if (e.target.closest('[data-remove]')) {
    await removeAddress(a.id);
    drawAddresses();
    $('#add-address').focus();
    toast('Address removed', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await saveAddress({ ...a, id: '' });
          drawAddresses();
        },
      },
    });
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const need = {
    name: 'Add the name on the door.',
    line1: 'Add the street and number.',
    city: 'Add the city.',
    postal: 'Add the postal code.',
  };
  let first;
  for (const [k, message] of Object.entries(need)) {
    const empty = !String(data[k] ?? '').trim();
    form.elements[k].toggleAttribute('aria-invalid', empty);
    $(`#a-${k}-error`).textContent = empty ? message : '';
    if (empty && !first) first = form.elements[k];
  }
  if (first) return first.focus();
  const save = $('#address-save');
  save.setAttribute('aria-busy', 'true');
  await saveAddress({ ...data, default: data.default === 'on' });
  if (data.default === 'on') {
    const saved = addresses().find((a) => a.line1 === data.line1 && a.postal === data.postal);
    if (saved) await defaultAddress(saved.id);
  }
  save.removeAttribute('aria-busy');
  dialog.close('saved');
  drawAddresses();
  toast(data.id ? 'Address saved' : 'Address added');
});

/* Cards */

function drawCards() {
  const list = cards();
  $('#cards').innerHTML = list.length
    ? list
        .map((c) => {
          const state = expiry(c.exp);
          return `<li class="ac-card ac-pay" data-id="${c.id}">
            <p class="ac-card-top"><strong>${c.brand} ending ${c.last4}</strong>${c.default ? '<span class="gm-badge" data-tone="info">Default</span>' : ''}</p>
            <p>Expires ${c.exp} ${state === 'expired' ? '<span class="gm-badge" data-tone="danger">Expired</span>' : state === 'soon' ? '<span class="gm-badge" data-tone="warning">Expires soon</span>' : ''}</p>
            <div class="ac-card-actions">
              ${c.default ? '' : `<button class="gm-chip gm-chip-plain" type="button" data-default aria-label="Use the ${c.brand} ending ${c.last4} by default">Make default</button>`}
              <button class="gm-chip gm-chip-plain" type="button" data-remove aria-label="Remove the ${c.brand} ending ${c.last4}">Remove</button>
            </div>
          </li>`;
        })
        .join('')
    : '<li class="gm-empty"><h3>No cards kept</h3><p>Cards you pay with can be kept for next time at checkout.</p></li>';
}
$('#cards').addEventListener('click', async (e) => {
  const li = e.target.closest('[data-id]');
  if (!li) return;
  const c = cards().find((x) => x.id === li.dataset.id);
  if (e.target.closest('[data-default]')) {
    await defaultCard(c.id);
    toast(`The ${c.brand} ending ${c.last4} is now the default`);
  }
  if (e.target.closest('[data-remove]')) {
    await removeCard(c.id);
    toast(`The ${c.brand} ending ${c.last4} is removed`);
  }
  drawCards();
  $('#cards button')?.focus();
});

/* Details */

const details = $('#profile');
details.elements.name.value = who.name;
details.elements.email.value = who.email;
details.elements.news.checked = who.news;
details.elements.restock.checked = who.restock;
details.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = details.elements.name.value.trim();
  const email = details.elements.email.value.trim();
  $('#name-error').textContent = name ? '' : 'Add your name.';
  details.elements.name.toggleAttribute('aria-invalid', !name);
  if (!name) return details.elements.name.focus();
  const save = $('#save-profile');
  save.setAttribute('aria-busy', 'true');
  try {
    await saveProfile({
      name,
      email,
      news: details.elements.news.checked,
      restock: details.elements.restock.checked,
    });
    $('#email-error').textContent = '';
    details.elements.email.removeAttribute('aria-invalid');
    $('#hello').textContent = `Hello, ${name.split(' ')[0]}`;
    $('#signed-in').textContent = `Signed in as ${email}`;
    $('#avatar').textContent = initials(name);
    toast('Your details are saved');
  } catch (err) {
    $('#email-error').textContent = err.message;
    details.elements.email.setAttribute('aria-invalid', 'true');
    details.elements.email.focus();
  } finally {
    save.removeAttribute('aria-busy');
  }
});

const pw = $('#password');
$('#show-password').addEventListener('change', (e) => {
  for (const input of pw.querySelectorAll('.gm-input'))
    input.type = e.target.checked ? 'text' : 'password';
});
pw.addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = pw.elements.current.value;
  const next = pw.elements.new.value;
  for (const id of ['current', 'new']) {
    $(`#${id}-error`).textContent = '';
    pw.elements[id].removeAttribute('aria-invalid');
  }
  if (!current) {
    $('#current-error').textContent = 'Enter the password you use now.';
    pw.elements.current.setAttribute('aria-invalid', 'true');
    return pw.elements.current.focus();
  }
  const save = $('#save-password');
  save.setAttribute('aria-busy', 'true');
  try {
    await changePassword(current, next);
    pw.reset();
    toast('Password changed. Other devices are signed out.');
  } catch (err) {
    const field = err.message.startsWith('That isn') ? 'current' : 'new';
    $(`#${field}-error`).textContent = err.message;
    pw.elements[field].setAttribute('aria-invalid', 'true');
    pw.elements[field].focus();
  } finally {
    save.removeAttribute('aria-busy');
  }
});

$('#delete').addEventListener('click', () => $('#delete-dialog').show());
$('#delete-dialog').addEventListener('gm-close', (e) => {
  if (e.detail.value === 'delete')
    toast("We've had your request, and we'll email you when it's done.");
});

drawAddresses();
drawCards();
shopShell();
