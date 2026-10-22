import { toast } from '@glass-midas/components';
import { cards, myOrder, myOrders, progress, startReturn } from '../shared/account-store.js';
import { image } from '../shared/cart-store.js';
import { day, money, pageUrl, product } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// Sending something back, in four steps on one page: which pieces (and how many), why (damage
// asks for a photo), how they travel and where the money goes (with the refund worked out before
// anything is sent), and then the code to show at the drop-off and what happens next. Each step
// checks itself before the next; Back keeps what was chosen.

const $ = (s) => document.querySelector(s);
const REASONS = [
  ['mind', 'I changed my mind'],
  ['sound', "It doesn't sound how I expected"],
  ['damaged', 'It arrived damaged'],
  ['wrong', 'Wrong piece or finish'],
  ['broken', 'It stopped working'],
  ['other', 'Something else'],
];
const NEEDS_PHOTO = ['damaged', 'broken'];
const PICKUP = 6;

let order;
/** @type {Map<number, number>} line index → how many go back */
const chosen = new Map();
/** @type {Map<number, { reason: string, note: string }>} */
const why = new Map();
const STEPS = ['pieces', 'why', 'how', 'done'];

function go(step) {
  for (const s of STEPS) $(`#step-${s}`).hidden = s !== step;
  $('#pick').hidden = true;
  const at = STEPS.indexOf(step);
  [...$('#steps').children].forEach((li, i) => {
    li.removeAttribute('aria-current');
    li.removeAttribute('data-state');
    if (i < at) li.dataset.state = 'done';
    if (i === at) li.setAttribute('aria-current', 'step');
  });
  // Each step's heading takes focus, so a screen reader hears where it is.
  $(`#step-${step} h2`).focus();
  scrollTo({
    top: 0,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}

/* 0. Which order, when none was given. */

async function pick() {
  const list = (await myOrders()).filter((o) => progress(o).canReturn);
  $('#loading').hidden = true;
  $('#pick').hidden = false;
  $('#steps').hidden = true;
  $('#pick-empty').hidden = !!list.length;
  $('#pick-list').hidden = !list.length;
  $('#pick .rt-actions').hidden = !list.length;
  $('#pick-list').innerHTML = list
    .map(
      (o, i) =>
        `<label class="gm-option"><input type="radio" class="gm-check" name="order" value="${o.number}"${i ? '' : ' checked'}><span>Order #${o.number}<small>${o.lines.map((l) => escape(product(l.product).name)).join(', ')} · return by ${day(progress(o).returnBy)}</small></span><span>${day(o.date)}</span></label>`,
    )
    .join('');
  $('#pick h2').focus();
}
$('#pick').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = new FormData(e.target).get('order');
  if (!n) return ($('#pick-error').textContent = 'Choose an order.');
  history.replaceState(null, '', `?order=${n}`);
  start(Number(n));
});

/* 1. Pieces */

async function start(n) {
  $('#loading').hidden = false;
  const o = await myOrder(n);
  $('#loading').hidden = true;
  const p = o && progress(o);
  if (!o || !p.canReturn) {
    $('#title').textContent = o ? `Order #${o.number} can't go back` : "We can't find that order";
    $('#lede').textContent = o
      ? p.stage === 'returning'
        ? 'A return is already started for it. Its code is on the order.'
        : 'Returns are open for 60 days after delivery, and only once it has arrived.'
      : 'It may be on another account.';
    $('#steps').hidden = true;
    $('#lede').insertAdjacentHTML(
      'afterend',
      `<p><a class="gm-chip" href="${o ? pageUrl('order', `n=${o.number}`) : pageUrl('account', '')}">${o ? 'See the order' : 'See your orders'}</a></p>`,
    );
    $('#title').focus();
    return;
  }
  order = o;
  $('#steps').hidden = false;
  $('#title').textContent = `Send back from order #${o.number}`;
  $('#lede').textContent = `Delivered ${day(p.delivered)}. You have until ${day(p.returnBy)}.`;
  $('#crumb-order').textContent = `Order #${o.number}`;
  $('#crumb-order').href = pageUrl('order', `n=${o.number}`);
  $('#back-to-order').href = pageUrl('order', `n=${o.number}`);
  $('#lines').innerHTML = o.lines
    .map((l, i) => {
      const piece = product(l.product);
      return `<li class="rt-line" data-line="${i}">
        <label class="rt-line-pick">
          <input type="checkbox" class="gm-check" name="line" value="${i}">
          <img src="${image(l.product, l.finish)}" alt="" width="72" height="72">
          <span><strong>${escape(piece.name)}</strong><small>${l.finish} · ${money(l.price)}${l.quantity > 1 ? ` · ${l.quantity} bought` : ''}</small></span>
        </label>
        ${
          l.quantity > 1
            ? `<gm-quantity hidden><input type="number" min="1" max="${l.quantity}" value="${l.quantity}" aria-label="How many ${escape(piece.name)} go back"></gm-quantity>`
            : ''
        }
      </li>`;
    })
    .join('');
  go('pieces');
}

$('#lines').addEventListener('change', (e) => {
  const li = e.target.closest('[data-line]');
  if (!li) return;
  const i = Number(li.dataset.line);
  const box = li.querySelector('[name="line"]');
  const count = li.querySelector('gm-quantity');
  if (count) count.hidden = !box.checked;
  if (box.checked) chosen.set(i, Number(count?.querySelector('input').value ?? 1));
  else chosen.delete(i);
  $('#pieces-error').textContent = '';
});

$('#step-pieces').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!chosen.size) {
    $('#pieces-error').textContent = 'Choose at least one piece to send back.';
    return $('#lines [name="line"]').focus();
  }
  $('#reasons').innerHTML = [...chosen.keys()]
    .map((i) => {
      const l = order.lines[i];
      const piece = product(l.product);
      const had = why.get(i);
      return `<fieldset class="rt-reason" data-line="${i}">
        <legend><img src="${image(l.product, l.finish)}" alt="" width="40" height="40">${escape(piece.name)}, ${l.finish}</legend>
        <div class="gm-field">
          <label for="reason-${i}">Why</label>
          <gm-select><select id="reason-${i}" name="reason-${i}">${REASONS.map(([v, t]) => `<option value="${v}"${had?.reason === v ? ' selected' : ''}>${t}</option>`).join('')}</select></gm-select>
        </div>
        <div class="gm-field">
          <label for="note-${i}">Anything to add <span class="rt-optional">(optional)</span></label>
          <textarea class="gm-input" id="note-${i}" name="note-${i}" rows="2" maxlength="500">${escape(had?.note ?? '')}</textarea>
        </div>
        <div class="gm-field rt-photos" ${NEEDS_PHOTO.includes(had?.reason) ? '' : 'hidden'}>
          <label for="photos-${i}">Photos of it</label>
          <gm-upload max-size="5 MB" max-files="4"><input type="file" id="photos-${i}" name="photos-${i}" accept="image/*" multiple aria-describedby="photos-${i}-error"></gm-upload>
          <p class="gm-field-error" id="photos-${i}-error" aria-live="polite"></p>
        </div>
      </fieldset>`;
    })
    .join('');
  go('why');
});
$('#lines').addEventListener('input', (e) => {
  const li = e.target.closest('[data-line]');
  if (li && e.target.type === 'number')
    chosen.set(Number(li.dataset.line), Number(e.target.value) || 1);
});

/* 2. Why */

$('#reasons').addEventListener('change', (e) => {
  const set = e.target.closest('.rt-reason');
  if (!set || !e.target.matches('select')) return;
  set.querySelector('.rt-photos').hidden = !NEEDS_PHOTO.includes(e.target.value);
});
$('#reasons').addEventListener('gm-reject', (e) => {
  const { file, reason } = e.detail;
  const words = { type: "isn't a picture", size: 'is over 5 MB', count: 'is one more than 4' }[
    reason
  ];
  e.target.closest('.rt-photos').querySelector('.gm-field-error').textContent =
    `${file.name} ${words}, so it's not added.`;
});

$('#step-why').addEventListener('submit', (e) => {
  e.preventDefault();
  let first;
  for (const set of $('#reasons').children) {
    const i = Number(set.dataset.line);
    const reason = set.querySelector('select').value;
    const note = set.querySelector('textarea').value.trim();
    why.set(i, { reason, note });
    const upload = set.querySelector('gm-upload');
    const error = set.querySelector('.rt-photos .gm-field-error');
    const missing = NEEDS_PHOTO.includes(reason) && !upload.files?.length;
    error.textContent = missing
      ? 'Add a photo of the damage, so we can claim it from the carrier.'
      : '';
    if (missing && !first) first = upload.querySelector('input');
  }
  if (first) return first.focus();
  drawRefund();
  go('how');
});

/* 3. How, and the refund before anything is sent. */

function refund() {
  const form = $('#step-how');
  const value = [...chosen].reduce((n, [i, q]) => n + order.lines[i].price * q, 0);
  const pickup = form.elements.method.value === 'pickup' ? PICKUP : 0;
  const credit = form.elements.refund.value === 'credit';
  const bonus = credit ? Math.round(value * 0.1 * 100) / 100 : 0;
  return { value, pickup, bonus, total: value - pickup + bonus };
}
function drawRefund() {
  const r = refund();
  const card = cards().find((c) => c.default) ?? cards()[0];
  $('#refund-card').firstChild.textContent = card
    ? `To the ${card.brand} ending ${card.last4}`
    : 'To your card';
  $('#refund-card-amount').textContent = money(r.value - r.pickup);
  $('#refund-credit-amount').textContent = money(
    r.value - r.pickup + Math.round(r.value * 0.1 * 100) / 100,
  );
  const count = [...chosen.values()].reduce((a, b) => a + b, 0);
  $('#summary').innerHTML = `
    <dt>${count} ${count === 1 ? 'piece' : 'pieces'}</dt><dd>${money(r.value)}</dd>
    ${r.pickup ? `<dt>Collection</dt><dd>−${money(r.pickup)}</dd>` : ''}
    ${r.bonus ? `<dt>Store credit bonus</dt><dd>+${money(r.bonus)}</dd>` : ''}
    <dt class="gm-totals-total">You get back</dt><dd class="gm-totals-total">${money(r.total)}</dd>`;
}
$('#step-how').addEventListener('change', drawRefund);

$('#step-how').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const send = $('#send');
  send.setAttribute('aria-busy', 'true');
  send.disabled = true;
  try {
    const r = await startReturn({
      order: order.number,
      lines: [...chosen].map(([i, quantity]) => ({
        product: order.lines[i].product,
        finish: order.lines[i].finish,
        quantity,
        ...why.get(i),
      })),
      method: form.elements.method.value,
      refund: form.elements.refund.value,
    });
    done(r);
  } catch {
    $('#how-error').textContent = "We couldn't start the return. Try again in a moment.";
  } finally {
    send.removeAttribute('aria-busy');
    send.disabled = false;
  }
});

/* 4. Done */

/** A square of cells drawn from the code: something to scan at the counter. */
function codeArt(code) {
  let seed = [...code].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  const rand = () => (seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296;
  const cells = [];
  const finder = (x, y) =>
    `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="var(--rt-paper)"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  const inFinder = (x, y) => (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
  for (let y = 0; y < 29; y++)
    for (let x = 0; x < 29; x++)
      if (!inFinder(x, y) && rand() < 0.48)
        cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  return `<rect width="29" height="29" fill="var(--rt-paper)"/>${finder(0, 0)}${finder(22, 0)}${finder(0, 22)}${cells.join('')}`;
}

function done(r) {
  $('#done-title').textContent = `Return ${r.id} is started`;
  $('#code').innerHTML = codeArt(r.code);
  $('#code-text').textContent = r.code.replace(/(.{4})/g, '$1 ').trim();
  $('#drop-by').innerHTML =
    r.method === 'pickup'
      ? `We'll email you to choose a weekday for the courier, before <strong>${day(r.by)}</strong>.`
      : `Drop it at any Lusa point by <strong>${day(r.by)}</strong>, in its box if you still have it.`;
  $('#print').hidden = r.method === 'pickup';
  $('#next').innerHTML = [
    ['Return started', `Today`, 'current'],
    [r.method === 'pickup' ? 'Collected' : 'Dropped off', `By ${day(r.by)}`],
    ['Checked in Lisbon', 'A day or two after it arrives'],
    [
      r.refundTo === 'credit'
        ? `${money(r.refund)} in store credit`
        : `${money(r.refund)} back to your card`,
      r.refundTo === 'credit' ? 'As soon as it is checked' : '3 to 5 working days after',
    ],
  ]
    .map(
      ([label, note, state]) =>
        `<li${state ? ' aria-current="step"' : ''}>${label}<small>${note}</small></li>`,
    )
    .join('');
  $('#lede').textContent = "We've emailed you the same. Nothing to pay.";
  go('done');
  toast('Return started');
}
$('#print').addEventListener('click', () => print());

for (const back of document.querySelectorAll('[data-back]'))
  back.addEventListener('click', (e) => {
    const step = STEPS[STEPS.indexOf(e.target.closest('form').id.replace('step-', '')) - 1];
    go(step);
  });

const n = Number(new URLSearchParams(location.search).get('order'));
if (n) start(n);
else pick();

shopShell();
