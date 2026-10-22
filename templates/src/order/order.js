import { toast } from '@glass-midas/components';
import {
  addresses,
  bill,
  cancelOrder,
  cards,
  myOrder,
  myOrders,
  progress,
  timeline,
} from '../shared/account-store.js';
import { addToCart, image } from '../shared/cart-store.js';
import { day, money, pageUrl, product } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// One order, from the shopper's side: where it is (the sentence they came for, the steps and the
// tracking), what's in it and what it cost, where it goes and how it was paid, and everything
// that happened to it. It can be cancelled before it ships, sent back for 60 days once it
// arrives, bought again, and printed as a receipt.

const $ = (s) => document.querySelector(s);
const long = (iso) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
const time = (at) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${at}:00Z`));

/** The sentence people come for. */
function where(p, o) {
  switch (p.stage) {
    case 'processing':
      return `We have your order. It arrives by ${long(p.arrives)}.`;
    case 'packing':
      return `Being packed in Lisbon. It arrives by ${long(p.arrives)}.`;
    case 'shipped':
      return `On its way. It arrives ${long(p.arrives)}.`;
    case 'delivered':
      return p.canReturn
        ? `Delivered ${long(p.delivered)}. You can send it back until ${day(p.returnBy)}.`
        : `Delivered ${long(p.delivered)}.`;
    case 'returning':
      return 'Return started. Drop it off within 14 days; the refund follows when it arrives.';
    case 'cancelled':
      return 'Cancelled. The payment went back to your card.';
    default:
      return `Returned and refunded ${money(bill(o).total)}.`;
  }
}

let order;

function render() {
  const o = order;
  const p = progress(o);
  const b = bill(o);
  const card = cards().find((c) => c.default) ?? cards()[0];
  const home = addresses().find((a) => a.default) ?? addresses()[0];
  document.title = `Order #${o.number} · Ondine`;
  $('#crumb').textContent = `Order #${o.number}`;
  $('#title').textContent = `Order #${o.number}`;
  $('#placed').innerHTML =
    `Placed ${day(o.date)} · <span class="gm-badge"${p.tone ? ` data-tone="${p.tone}"` : ''}>${p.label}</span>`;

  // What can be done with it now, besides printing and asking for help.
  for (const el of $('#actions').querySelectorAll('[data-extra]')) el.remove();
  const extra = [];
  if (p.canReturn)
    extra.push(
      `<a class="gm-chip gm-chip-primary" data-extra href="${pageUrl('returns', `order=${o.number}`)}">Return something</a>`,
    );
  if (['delivered', 'refunded', 'cancelled'].includes(p.stage))
    extra.push('<button class="gm-chip" type="button" data-extra data-again>Buy it again</button>');
  if (p.canCancel)
    extra.push(
      '<button class="gm-chip od-danger" type="button" data-extra data-cancel>Cancel order</button>',
    );
  $('#actions').insertAdjacentHTML('afterbegin', extra.join(''));

  $('#where').textContent = where(p, o);
  $('#steps').innerHTML = p.steps
    .map(
      (s) =>
        `<li${s.state === 'current' ? ' aria-current="step"' : s.state ? ` data-state="${s.state}"` : ''}>${s.label}${s.date ? `<small>${day(s.date)}</small>` : ''}</li>`,
    )
    .join('');
  $('#tracking').hidden = !p.tracking || p.stage === 'cancelled';
  $('#tracking-number').textContent = p.tracking ?? '';

  $('#lines').innerHTML = o.lines
    .map((l) => {
      const piece = product(l.product);
      const href = pageUrl('product', `id=${l.product}&finish=${l.finish.toLowerCase()}`);
      return `<li class="od-line">
        <img src="${image(l.product, l.finish)}" alt="" width="80" height="80">
        <div>
          <h3><a href="${href}">${escape(piece.name)}</a></h3>
          <p>${escape(piece.kind)} · ${l.finish} · ${l.quantity} × ${money(l.price)}</p>
          ${p.stage === 'delivered' || p.stage === 'returning' ? `<a class="od-review" href="${href}#reviews">Write a review</a>` : ''}
        </div>
        <span class="od-line-total">${money(l.price * l.quantity)}</span>
      </li>`;
    })
    .join('');
  $('#totals').innerHTML = `
    <dt>Subtotal</dt><dd>${money(b.subtotal)}</dd>
    <dt>Shipping</dt><dd>${b.shipping ? money(b.shipping) : 'Free'}</dd>
    <dt>Tax</dt><dd>${money(b.tax)}</dd>
    <dt class="gm-totals-total">${p.stage === 'cancelled' || p.stage === 'refunded' ? 'Paid, then refunded' : 'Paid'}</dt><dd class="gm-totals-total">${money(b.total)}</dd>`;
  $('#address').innerHTML = [
    home.name,
    home.line1,
    home.line2,
    `${home.postal} ${home.city}`,
    home.country,
  ]
    .filter(Boolean)
    .map(escape)
    .join('<br>');
  $('#method').textContent = 'Standard delivery, 3 to 5 working days';
  $('#payment').textContent = card ? `${card.brand} ending ${card.last4}` : 'Card';
  $('#history').innerHTML = timeline(o)
    .map(
      (e) =>
        `<li${e.tone ? ` data-tone="${e.tone}"` : ''}><time datetime="${e.at}">${time(e.at)}</time><p>${escape(e.text)}</p>${e.note ? `<p class="gm-timeline-note">${escape(e.note)}</p>` : ''}</li>`,
    )
    .join('');
}

$('#actions').addEventListener('click', (e) => {
  if (e.target.closest('[data-again]')) {
    for (const l of order.lines) addToCart(l.product, l.finish, l.quantity);
    toast(`${order.lines.length === 1 ? 'It is' : 'They are'} back in your cart`, {
      action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
    });
  }
  if (e.target.closest('[data-cancel]')) {
    $('#cancel-text').textContent =
      `It hasn't shipped yet, so nothing is lost: the ${money(bill(order).total)} goes back to your card in 3 to 5 working days.`;
    $('#cancel-dialog').show();
  }
});
$('#cancel-dialog').addEventListener('gm-close', async (e) => {
  if (e.detail.value !== 'cancel') return;
  await cancelOrder(order.number);
  render();
  $('#title').focus();
  toast(`Order #${order.number} is cancelled`);
});
$('#print').addEventListener('click', () => print());
$('#copy-tracking').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#tracking-number').textContent);
    toast('Tracking number copied');
  } catch {
    toast(`The tracking number is ${$('#tracking-number').textContent}`);
  }
});

// Without a number in the address, the newest order.
const n = Number(new URLSearchParams(location.search).get('n'));
(n ? myOrder(n) : myOrders().then((list) => list[0] ?? null)).then((o) => {
  $('#loading').hidden = true;
  if (!o) {
    $('#missing').hidden = false;
    return;
  }
  order = o;
  $('#order').hidden = false;
  render();
});

shopShell();
