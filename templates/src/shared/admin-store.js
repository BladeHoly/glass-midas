import { TODAY, collections, orders, products, stock } from './data.js';

// The team's side of one order and one product: what the store knows and can do about them.
// Paying, packing, shipping, refunding and notes for an order; every field of a product, checked
// before it's saved. Changes are kept in this browser. Replace each function with a call to
// your API.

const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));
/** @param {string} key @param {any} fallback */
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
/** @param {string} key @param {any} value */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
const now = () => `${TODAY}T${new Date().toISOString().slice(11, 19)}`;
/** @param {string} iso @param {number} days */
const plus = (iso, days) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const cents = (/** @type {number} */ n) => Math.round(n * 100) / 100;
const money = (/** @type {number} */ n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export const ME = 'Noor Haddad';
export const CARRIERS = ['Lusa Express', 'DHL', 'UPS', 'FedEx'];

/**
 * @typedef {{ amount: number, lines: { index: number, quantity: number }[], shipping: boolean,
 *   reason: string, at: string, by: string }} Refund
 * @typedef {{ carrier: string, tracking: string, at: string, notified: boolean }} Shipment
 * @typedef {{ text: string, at: string, by: string }} Note
 * @typedef {{ captured?: string, shipment?: Shipment, refunds?: Refund[], notes?: Note[],
 *   cancelled?: string, packed?: number[] }} Changes
 */

/** @param {number} number @returns {Changes} */
const changes = (number) => read('ondine-admin-orders', {})[number] ?? {};
/** @param {number} number @param {(c: Changes) => Changes} fn */
function change(number, fn) {
  const all = read('ondine-admin-orders', {});
  all[number] = fn(all[number] ?? {});
  write('ondine-admin-orders', all);
}

/**
 * Everything the team needs about one order: its money (paid, refunded, what's left), where the
 * pieces are, the customer, and the history with the notes.
 * @param {import('./data.js').Order} o
 */
export function adminView(o) {
  const c = changes(o.number);
  const subtotal = o.lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const shipping = subtotal >= 150 ? 0 : 12;
  const tax = cents(subtotal * 0.08);
  const total = cents(subtotal + shipping + tax);
  const refunds = [
    ...(o.status === 'cancelled'
      ? [
          {
            amount: total,
            lines: [],
            shipping: true,
            reason: 'Cancelled before it shipped',
            at: `${plus(o.date, 1)}T09:30`,
            by: 'Kofi Okafor',
          },
        ]
      : []),
    ...(o.status === 'refunded'
      ? [
          {
            amount: total,
            lines: o.lines.map((l, index) => ({ index, quantity: l.quantity })),
            shipping: true,
            reason: 'Returned unopened',
            at: `${plus(o.date, 21)}T15:10`,
            by: 'Kofi Okafor',
          },
        ]
      : []),
    ...(c.refunds ?? []),
  ];
  const refunded = cents(refunds.reduce((n, r) => n + r.amount, 0));
  const cancelled = o.status === 'cancelled' || !!c.cancelled;
  const captured = o.status !== 'pending' || !!c.captured;
  /** @type {'pending' | 'paid' | 'partly-refunded' | 'refunded' | 'voided'} */
  const payment =
    cancelled && !captured
      ? 'voided'
      : refunded >= total
        ? 'refunded'
        : refunded > 0
          ? 'partly-refunded'
          : captured
            ? 'paid'
            : 'pending';
  const shipped = ['fulfilled', 'refunded'].includes(o.status)
    ? {
        carrier: 'Lusa Express',
        tracking: `LX ${String(o.number * 7919).slice(0, 4)} ${String(o.number * 104729).slice(-4)} PT`,
        at: `${plus(o.date, 2)}T11:40`,
        notified: true,
      }
    : c.shipment;
  /** @type {'unfulfilled' | 'fulfilled' | 'cancelled'} */
  const fulfilment = cancelled ? 'cancelled' : shipped ? 'fulfilled' : 'unfulfilled';
  // How much of each line is still refundable.
  const left = o.lines.map(
    (l, i) =>
      l.quantity -
      refunds.reduce((n, r) => n + (r.lines.find((x) => x.index === i)?.quantity ?? 0), 0),
  );
  const customerOrders = orders.filter((x) => x.customer.id === o.customer.id);
  /** @type {{ at: string, text: string, tone?: string, note?: string, by?: string }[]} */
  const events = [
    {
      at: `${o.date}T10:14`,
      text: `${o.customer.name} placed the order ${o.channel === 'Online' ? 'online' : 'in the studio'}`,
    },
    {
      at: `${o.date}T10:14`,
      text: captured
        ? `Payment of ${money(total)} captured`
        : `Payment of ${money(total)} authorized, waiting to be captured`,
      tone: captured ? 'success' : 'warning',
    },
  ];
  if (c.captured)
    events.push({ at: c.captured, text: `${ME} captured ${money(total)}`, tone: 'success' });
  if (shipped)
    events.push({
      at: shipped.at,
      text: `Fulfilled with ${shipped.carrier}, ${shipped.tracking}${shipped.notified ? '. The customer was emailed' : ''}`,
      tone: 'info',
    });
  for (const r of refunds)
    events.push({
      at: r.at,
      text: `${r.by} refunded ${money(r.amount)}`,
      tone: 'danger',
      note: r.reason,
    });
  if (cancelled)
    events.push({
      at: c.cancelled ?? `${plus(o.date, 1)}T09:30`,
      text: 'Order cancelled',
      tone: 'danger',
    });
  for (const n of c.notes ?? [])
    events.push({ at: n.at, text: `${n.by} left a note`, note: n.text, by: n.by });
  events.sort((a, b) => b.at.localeCompare(a.at));

  return {
    order: o,
    subtotal,
    shipping,
    tax,
    total,
    refunded,
    net: cents(total - refunded),
    payment,
    fulfilment,
    shipment: shipped,
    packed: c.packed ?? [],
    left,
    events,
    customer: {
      ...o.customer,
      orders: customerOrders.length,
      spent: cents(
        customerOrders.filter((x) => x.status !== 'cancelled').reduce((n, x) => n + x.total, 0),
      ),
    },
    canCapture: !captured && !cancelled,
    canFulfil: fulfilment === 'unfulfilled' && captured,
    canRefund: captured && refunded < total && !(cancelled && !captured),
    canCancel: fulfilment === 'unfulfilled',
  };
}

/** @param {number} number */
export async function adminOrder(number) {
  await wait(350);
  const o = orders.find((x) => x.number === number);
  return o ? adminView(o) : null;
}

/** @param {number} number */
export async function capture(number) {
  await wait(600);
  change(number, (c) => ({ ...c, captured: now() }));
}

/** Which lines are packed, as the team ticks them. @param {number} number @param {number[]} packed */
export function setPacked(number, packed) {
  change(number, (c) => ({ ...c, packed }));
}

/**
 * Ships it: the carrier and its tracking number, and whether to email the customer.
 * @param {number} number @param {{ carrier: string, tracking: string, notify: boolean }} s
 */
export async function fulfil(number, s) {
  await wait(700);
  if (!s.tracking.trim())
    throw new Error('Add the tracking number, so the customer can follow it.');
  if (!/^[A-Z0-9 -]{8,30}$/i.test(s.tracking.trim()))
    throw new Error("That doesn't look like a tracking number: 8 to 30 letters and digits.");
  change(number, (c) => ({
    ...c,
    shipment: {
      carrier: s.carrier,
      tracking: s.tracking.trim().toUpperCase(),
      at: now(),
      notified: s.notify,
    },
  }));
}

/**
 * Gives money back for some lines (and the shipping, if asked), never more than is left.
 * @param {number} number @param {{ lines: { index: number, quantity: number }[], shipping: boolean, reason: string }} r
 */
export async function refund(number, r) {
  await wait(800);
  const view = adminView(/** @type {any} */ (orders.find((x) => x.number === number)));
  const amount = refundAmount(view, r);
  if (amount <= 0) throw new Error('Choose what to refund.');
  if (amount > view.net + 0.001)
    throw new Error(`That's more than the ${money(view.net)} left on the order.`);
  change(number, (c) => ({
    ...c,
    refunds: [...(c.refunds ?? []), { ...r, amount, at: now(), by: ME }],
  }));
  return amount;
}

/**
 * What a refund comes to: the lines with their tax, plus the shipping when it's included.
 * @param {ReturnType<typeof adminView>} view
 * @param {{ lines: { index: number, quantity: number }[], shipping: boolean }} r
 */
export function refundAmount(view, r) {
  const goods = r.lines.reduce((n, l) => n + view.order.lines[l.index].price * l.quantity, 0);
  return cents(goods * 1.08 + (r.shipping ? view.shipping : 0));
}

/** @param {number} number */
export async function cancel(number) {
  await wait(700);
  // A paid order gives everything left back as it's cancelled.
  const view = adminView(/** @type {any} */ (orders.find((x) => x.number === number)));
  const back = view.payment === 'pending' ? 0 : view.net;
  change(number, (c) => ({
    ...c,
    cancelled: now(),
    refunds: back
      ? [
          ...(c.refunds ?? []),
          {
            amount: back,
            lines: [],
            shipping: true,
            reason: 'Cancelled before it shipped',
            at: now(),
            by: ME,
          },
        ]
      : c.refunds,
  }));
}

/** @param {number} number @param {string} text */
export async function addNote(number, text) {
  await wait(400);
  if (!text.trim()) throw new Error('Write the note first.');
  change(number, (c) => ({
    ...c,
    notes: [...(c.notes ?? []), { text: text.trim(), at: now(), by: ME }],
  }));
}

/* Products */

/**
 * A product as the team edits it: everything the shop shows, plus what only the team sees.
 * @typedef {{ name: string, color: string, sku: string, stock: number }} EditFinish
 * @typedef {{ id: string, name: string, kind: string, collection: string, blurb: string,
 *   status: 'active' | 'draft' | 'archived', price: number, was: number | null, cost: number,
 *   taxable: boolean, finishes: EditFinish[], weight: number, tags: string[],
 *   seoTitle: string, seoDescription: string, updated: string }} EditProduct
 * @param {string} id
 * @returns {Promise<EditProduct | null>}
 */
export async function adminProduct(id) {
  await wait(350);
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  const saved = read('ondine-admin-products', {})[id];
  if (saved) return saved;
  const grams = Number((p.specs.Weight ?? '').replace(/[^\d.]/g, '')) || 0;
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    collection: p.collection,
    blurb: p.blurb,
    status: 'active',
    price: p.price,
    was: p.was ?? null,
    cost: Math.round(p.price * 0.42),
    taxable: true,
    finishes: p.finishes.map((f) => ({
      name: f.name,
      color: f.color,
      sku: `ON-${p.id.toUpperCase()}-${f.name.slice(0, 3).toUpperCase()}`,
      stock: stock[p.id][f.name],
    })),
    weight: (p.specs.Weight ?? '').includes('kg') ? grams * 1000 : grams,
    tags: [collections[p.collection].name.toLowerCase(), p.kind.split(',')[0].toLowerCase()],
    seoTitle: `${p.name}, ${p.kind.toLowerCase()} · Ondine`,
    seoDescription: p.blurb,
    updated: `${TODAY}T09:12`,
  };
}

/** What's wrong with a product, field by field; empty when it can be saved. @param {EditProduct} p */
export function problems(p) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!p.name.trim()) out.name = 'Give it a name.';
  if (!(p.price > 0)) out.price = 'Set a price above zero.';
  if (p.was != null && p.was <= p.price)
    out.was = 'The price before has to be higher than the price now.';
  if (p.cost < 0) out.cost = "The cost can't be below zero.";
  if (!p.finishes.length) out.finishes = 'Keep at least one finish.';
  const skus = p.finishes.map((f) => f.sku.trim().toUpperCase());
  p.finishes.forEach((f, i) => {
    if (!f.name.trim()) out[`finish-${i}-name`] = 'Name this finish.';
    if (!f.sku.trim()) out[`finish-${i}-sku`] = 'Add a SKU.';
    else if (skus.indexOf(skus[i]) !== i) out[`finish-${i}-sku`] = 'Another finish has this SKU.';
    if (!(f.stock >= 0)) out[`finish-${i}-stock`] = "Stock can't be below zero.";
  });
  if (p.seoTitle.length > 60) out.seoTitle = 'Search engines cut titles after about 60 characters.';
  if (p.seoDescription.length > 160)
    out.seoDescription = 'Search engines cut descriptions after about 160 characters.';
  return out;
}

/** Saves it, if it has no problems. @param {EditProduct} p */
export async function saveProduct(p) {
  await wait(700);
  const found = problems(p);
  if (Object.keys(found).length)
    throw Object.assign(new Error('Some fields need a look.'), { fields: found });
  const saved = { ...p, updated: now() };
  write('ondine-admin-products', { ...read('ondine-admin-products', {}), [p.id]: saved });
  return saved;
}

/** Forgets the edits kept in this browser for the demo. */
export function forgetAdmin() {
  for (const key of ['ondine-admin-orders', 'ondine-admin-products'])
    try {
      localStorage.removeItem(key);
    } catch {}
}
