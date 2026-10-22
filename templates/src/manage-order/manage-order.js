import { toast } from '@glass-midas/components';
import {
  adminOrder,
  addNote,
  cancel,
  capture,
  fulfil,
  refund,
  refundAmount,
  setPacked,
} from '../shared/admin-store.js';
import { shellSearch } from '../shared/app.js';
import { day, initials, money, pageUrl, product } from '../shared/data.js';

// One order, as the team sees it: whether it's paid and shipped, the one thing to do next
// (capture, fulfil), the pieces to tick off as they're packed, the money in and out, the
// customer, and a history the team can add notes to. Refunds and fulfilment open in a drawer;
// each says what it will do (the amount, who's told) before it does it.

const $ = (s) => document.querySelector(s);
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const PAYMENT = {
  pending: ['Payment pending', 'warning'],
  paid: ['Paid', 'success'],
  'partly-refunded': ['Partly refunded', 'warning'],
  refunded: ['Refunded', 'danger'],
  voided: ['Voided', ''],
};
const FULFILMENT = {
  unfulfilled: ['Unfulfilled', 'warning'],
  fulfilled: ['Fulfilled', 'success'],
  cancelled: ['Cancelled', ''],
};
const badge = ([label, tone]) =>
  `<span class="gm-badge"${tone ? ` data-tone="${tone}"` : ''}>${label}</span>`;
const time = (at) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${at}Z`));
const sku = (l) => `ON-${l.product.toUpperCase()}-${l.finish.slice(0, 3).toUpperCase()}`;

// A piece's picture, from the art folder (which only previews move).
const image = (l) => {
  const art = document.documentElement.dataset.art || 'art/';
  return `${art}products/${l.product}-${l.finish.toLowerCase()}.svg`;
};

let view;
const number = () => view.order.number;

function render() {
  const v = view;
  const o = v.order;
  document.title = `Order #${o.number} · Ondine`;
  $('#title').textContent = `Order #${o.number}`;
  $('#lede').textContent =
    `${day(o.date)} · ${o.channel === 'Online' ? 'Online' : 'In the studio'}`;
  $('#crumb').textContent = `#${o.number}`;
  $('#states').innerHTML = `${badge(PAYMENT[v.payment])} ${badge(FULFILMENT[v.fulfilment])}`;

  $('#capture').hidden = !v.canCapture;
  $('#open-fulfil').hidden = !v.canFulfil;
  // Refund is the main button only when nothing else is left to do.
  $('#open-refund').hidden = !v.canRefund;
  $('#open-refund').classList.toggle(
    'gm-chip-primary',
    v.canRefund && !v.canFulfil && !v.canCapture,
  );
  $('#menu-cancel').disabled = !v.canCancel;

  // The pieces: ticked off while packing, with SKUs to find them on the shelf.
  const packing = v.fulfilment === 'unfulfilled';
  $('#lines').innerHTML = o.lines
    .map((l, i) => {
      const p = product(l.product);
      const packed = v.packed.includes(i);
      return `<li class="mo-line${packed ? ' is-packed' : ''}">
        ${packing ? `<input type="checkbox" class="gm-check" data-pack="${i}" aria-label="${escape(p.name)} in ${l.finish}, packed"${packed ? ' checked' : ''}>` : ''}
        <img src="${image(l)}" alt="" width="56" height="56">
        <span class="mo-line-name"><a href="${pageUrl('edit-product', `id=${l.product}`)}">${escape(p.name)}</a><small>${l.finish} · ${sku(l)}</small></span>
        <span class="mo-line-qty">${l.quantity} × ${money(l.price)}${v.left[i] < l.quantity ? `<small>${l.quantity - v.left[i]} refunded</small>` : ''}</span>
        <span class="mo-line-total">${money(l.price * l.quantity)}</span>
      </li>`;
    })
    .join('');
  const done = v.packed.length;
  $('#pack-count').textContent = packing
    ? `${done} of ${o.lines.length} packed`
    : v.fulfilment === 'fulfilled'
      ? 'Shipped'
      : 'Not shipping';
  $('#shipment').hidden = !v.shipment;
  if (v.shipment)
    $('#shipment').innerHTML =
      `<p><strong>${v.shipment.carrier}</strong> <span class="mo-mono">${v.shipment.tracking}</span></p>
      <p class="mo-small">Shipped ${time(v.shipment.at)}${v.shipment.notified ? ' · the customer was emailed' : ''}</p>`;

  $('#totals').innerHTML = `
    <dt>Subtotal</dt><dd>${money(v.subtotal)}</dd>
    <dt>Shipping</dt><dd>${v.shipping ? money(v.shipping) : 'Free'}</dd>
    <dt>Tax</dt><dd>${money(v.tax)}</dd>
    <dt>Total</dt><dd>${money(v.total)}</dd>
    ${v.refunded ? `<dt>Refunded</dt><dd>−${money(v.refunded)}</dd>` : ''}
    <dt class="gm-totals-total">${v.payment === 'pending' ? 'Authorized' : v.payment === 'voided' ? 'Kept' : 'Net'}</dt><dd class="gm-totals-total">${money(v.payment === 'voided' ? 0 : v.net)}</dd>`;

  $('#history').innerHTML = v.events
    .map(
      (e) =>
        `<li${e.tone ? ` data-tone="${e.tone}"` : ''}><time datetime="${e.at}">${time(e.at)}</time><p>${escape(e.text)}</p>${e.note ? `<p class="gm-timeline-note">${escape(e.note)}</p>` : ''}</li>`,
    )
    .join('');

  const c = v.customer;
  $('#customer').innerHTML = `<span class="gm-avatar" aria-hidden="true">${initials(c.name)}</span>
    <p><strong>${escape(c.name)}</strong><a href="mailto:${c.email}">${c.email}</a></p>
    <p class="mo-small">${c.orders} ${c.orders === 1 ? 'order' : 'orders'} · ${money(c.spent)} spent · since ${c.since}</p>`;
  $('#returning').textContent =
    c.orders > 1 ? `A returning customer, ${c.orders} orders` : 'A first order';
  $('#address').innerHTML = [
    c.name,
    `${10 + (o.number % 80)} ${['Harbour Road', 'Rua do Sol', 'Linden Street', 'Calle Mayor'][o.number % 4]}`,
    c.city,
  ]
    .map(escape)
    .join('<br>');
}

async function reload() {
  view = await adminOrder(number());
  render();
}

/* Packing, capturing */

$('#lines').addEventListener('change', (e) => {
  const box = e.target.closest('[data-pack]');
  if (!box) return;
  const packed = [...$('#lines').querySelectorAll('[data-pack]:checked')].map((b) =>
    Number(b.dataset.pack),
  );
  setPacked(number(), packed);
  view.packed = packed;
  box.closest('.mo-line').classList.toggle('is-packed', box.checked);
  $('#pack-count').textContent = `${packed.length} of ${view.order.lines.length} packed`;
  if (packed.length === view.order.lines.length)
    toast('Everything is packed', { action: { label: 'Fulfil', onClick: openFulfil } });
});

$('#capture').addEventListener('click', async (e) => {
  e.target.setAttribute('aria-busy', 'true');
  await capture(number());
  e.target.removeAttribute('aria-busy');
  await reload();
  toast(`${money(view.total)} captured`);
  $('#open-fulfil').focus();
});

/* Fulfil */

const fulfilDialog = $('#fulfil');
const fulfilForm = $('#fulfil-form');
function openFulfil() {
  fulfilForm.reset();
  $('#tracking-error').textContent = '';
  fulfilForm.elements.tracking.removeAttribute('aria-invalid');
  const unpacked = view.order.lines.length - view.packed.length;
  $('#fulfil-summary').textContent =
    `${view.order.lines.reduce((n, l) => n + l.quantity, 0)} pieces to ${view.customer.name}, ${view.customer.city}.${unpacked ? ` ${unpacked} not ticked as packed yet.` : ''}`;
  fulfilDialog.show();
}
$('#open-fulfil').addEventListener('click', openFulfil);
fulfilForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const send = $('#fulfil-send');
  const tracking = fulfilForm.elements.tracking;
  send.setAttribute('aria-busy', 'true');
  try {
    await fulfil(number(), {
      carrier: fulfilForm.elements.carrier.value,
      tracking: tracking.value,
      notify: fulfilForm.elements.notify.checked,
    });
    fulfilDialog.close('done');
    await reload();
    toast(
      fulfilForm.elements.notify.checked ? 'Fulfilled, and the customer is emailed' : 'Fulfilled',
    );
  } catch (err) {
    $('#tracking-error').textContent = err.message;
    tracking.setAttribute('aria-invalid', 'true');
    tracking.focus();
  } finally {
    send.removeAttribute('aria-busy');
  }
});

/* Refund */

const refundDialog = $('#refund');
const refundForm = $('#refund-form');
function drafted() {
  const lines = [...refundForm.querySelectorAll('[data-refund]')]
    .map((input) => ({ index: Number(input.dataset.refund), quantity: Number(input.value) || 0 }))
    .filter((l) => l.quantity > 0);
  return {
    lines,
    shipping: refundForm.elements.shipping.checked,
    reason: refundForm.elements.reason.value,
  };
}
function drawRefund() {
  const amount = refundAmount(view, drafted());
  const over = amount > view.net + 0.001;
  $('#refund-total').innerHTML =
    `<dt>Left on the order</dt><dd>${money(view.net)}</dd><dt class="gm-totals-total">Refund</dt><dd class="gm-totals-total">${money(amount)}</dd>`;
  $('#refund-send').textContent = amount ? `Refund ${money(amount)}` : 'Refund';
  $('#refund-send').disabled = !amount || over;
  $('#refund-error').textContent = over ? `That's more than the ${money(view.net)} left.` : '';
}
$('#open-refund').addEventListener('click', () => {
  refundForm.reset();
  $('#refund-lines').innerHTML = view.order.lines
    .map((l, i) => {
      const p = product(l.product);
      const left = view.left[i];
      return `<li><img src="${image(l)}" alt="" width="40" height="40"><span>${escape(p.name)}<small>${l.finish} · ${money(l.price)} · ${left} of ${l.quantity} left to refund</small></span>
        ${left ? `<gm-quantity><input type="number" min="0" max="${left}" value="0" data-refund="${i}" aria-label="How many ${escape(p.name)} to refund"></gm-quantity>` : '<span class="gm-badge">Refunded</span>'}</li>`;
    })
    .join('');
  $('#refund-shipping-label').textContent = view.shipping
    ? `Refund the shipping, ${money(view.shipping)}`
    : 'Shipping was free';
  refundForm.elements.shipping.disabled = !view.shipping;
  drawRefund();
  refundDialog.show();
});
refundForm.addEventListener('input', drawRefund);
refundForm.addEventListener('change', drawRefund);
refundForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const send = $('#refund-send');
  send.setAttribute('aria-busy', 'true');
  try {
    const amount = await refund(number(), drafted());
    refundDialog.close('done');
    await reload();
    toast(`${money(amount)} refunded to the card`);
  } catch (err) {
    $('#refund-error').textContent = err.message;
  } finally {
    send.removeAttribute('aria-busy');
  }
});

for (const b of document.querySelectorAll('[data-close]'))
  b.addEventListener('click', (e) => e.target.closest('gm-dialog').close('cancel'));

/* More: the packing slip, a link, cancelling */

$('#more').addEventListener('gm-select', async (e) => {
  const { value } = e.detail;
  if (value === 'slip') print();
  if (value === 'link') {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied');
    } catch {
      toast(location.href);
    }
  }
  if (value === 'cancel') {
    $('#cancel-text').textContent =
      view.payment === 'pending'
        ? "Nothing was charged: the hold on the customer's card is released."
        : `${money(view.net)} goes back to the customer's card, and they're emailed.`;
    $('#cancel').show();
  }
});
$('#cancel').addEventListener('gm-close', async (e) => {
  if (e.detail.value !== 'cancel') return;
  await cancel(number());
  await reload();
  $('#title').focus();
  toast(`Order #${number()} is cancelled`);
});

/* Notes */

$('#note-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const note = $('#note');
  try {
    await addNote(number(), note.value);
    note.value = '';
    $('#note-error').textContent = '';
    note.removeAttribute('aria-invalid');
    await reload();
    toast('Note added');
  } catch (err) {
    $('#note-error').textContent = err.message;
    note.setAttribute('aria-invalid', 'true');
    note.focus();
  }
});

$('#copy-address').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#address').innerText);
    toast('Address copied');
  } catch {
    toast('Select the address to copy it');
  }
});

// Without a number in the address, the newest order still waiting to be paid.
const n = Number(new URLSearchParams(location.search).get('n')) || 1900;
adminOrder(n).then((v) => {
  $('#loading').hidden = true;
  if (!v) {
    $('#missing').hidden = false;
    return;
  }
  view = v;
  $('#order').hidden = false;
  render();
});

shellSearch(document.querySelector('.app-actions gm-search'));
