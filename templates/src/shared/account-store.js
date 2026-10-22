import { TODAY, customers, orders, product } from './data.js';

// The shopper's side of the store: who's signed in, their orders and where each one is, their
// addresses, cards and details, and the stand-ins for cancelling an order and sending something
// back. Changes are kept in this browser. Replace each function with a call to your API.

const DAY = 86400000;
const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
const today = Date.parse(`${TODAY}T12:00:00Z`);
/** @param {string} iso @param {number} days */
const plus = (iso, days) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
/** @param {string} iso */
const ago = (iso) => Math.round((today - Date.parse(`${iso}T12:00:00Z`)) / DAY);

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

/** Who's signed in. */
export const me = /** @type {import('./data.js').Customer} */ (
  customers.find((c) => c.id === 'c139')
);

/** Their details, as they last saved them. */
export function profile() {
  return read('ondine-profile', { name: me.name, email: me.email, news: true, restock: true });
}

/**
 * Where an order is, in the shopper's words, and the steps it goes through. Shipped orders are
 * on their way for four days, then delivered; delivered ones can go back for 60 days.
 * @typedef {'processing' | 'packing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'returning'} Stage
 * @typedef {{ label: string, date?: string, state?: 'done' | 'current' | 'problem' }} Step
 * @typedef {{ stage: Stage, label: string, tone: 'info' | 'success' | 'warning' | 'danger' | '',
 *   steps: Step[], arrives?: string, delivered?: string, tracking?: string, returnBy?: string,
 *   canCancel: boolean, canReturn: boolean }} Progress
 * @param {import('./data.js').Order} o
 * @returns {Progress}
 */
export function progress(o) {
  const cancelled = read('ondine-cancelled', []).includes(o.number);
  const returning = read('ondine-returns', []).find((r) => r.order === o.number);
  const status = cancelled ? 'cancelled' : o.status;
  const packed = plus(o.date, 1);
  const shipped = plus(o.date, 2);
  const delivered = plus(o.date, 5);
  const tracking = `LX ${String(o.number * 7919).slice(0, 4)} ${String(o.number * 104729).slice(-4)} PT`;
  /** @type {Step[]} */
  const steps = [
    { label: 'Ordered', date: o.date },
    { label: 'Packed', date: packed },
    { label: 'Shipped', date: shipped },
    { label: 'Delivered', date: delivered },
  ];
  const mark = (/** @type {number} */ at) =>
    steps.forEach((s, i) => (s.state = i < at ? 'done' : i === at ? 'current' : undefined));

  if (status === 'cancelled') {
    steps.splice(1, 3, { label: 'Cancelled', date: cancelled ? TODAY : plus(o.date, 1) });
    steps[0].state = 'done';
    steps[1].state = 'problem';
    return {
      stage: 'cancelled',
      label: 'Cancelled',
      tone: '',
      steps,
      canCancel: false,
      canReturn: false,
    };
  }
  if (status === 'refunded') {
    mark(4);
    steps.push({ label: 'Returned and refunded', date: plus(o.date, 21), state: 'current' });
    return {
      stage: 'refunded',
      label: 'Refunded',
      tone: 'info',
      steps,
      delivered,
      canCancel: false,
      canReturn: false,
    };
  }
  if (status === 'pending') {
    mark(0);
    steps.forEach((s, i) => i > 0 && delete s.date);
    return {
      stage: 'processing',
      label: 'Processing',
      tone: 'warning',
      steps,
      arrives: plus(TODAY, 5),
      canCancel: true,
      canReturn: false,
    };
  }
  if (status === 'paid') {
    mark(1);
    steps.slice(2).forEach((s) => delete s.date);
    return {
      stage: 'packing',
      label: 'Being packed',
      tone: 'info',
      steps,
      arrives: plus(TODAY, 4),
      canCancel: true,
      canReturn: false,
    };
  }
  // Fulfilled: on its way for a few days, then delivered.
  if (ago(o.date) < 5) {
    mark(2);
    delete steps[3].date;
    return {
      stage: 'shipped',
      label: 'On its way',
      tone: 'info',
      steps,
      arrives: delivered,
      tracking,
      canCancel: false,
      canReturn: false,
    };
  }
  mark(4);
  steps[3].state = 'current';
  const returnBy = plus(delivered, 60);
  if (returning)
    return {
      stage: 'returning',
      label: 'Return started',
      tone: 'warning',
      steps: [
        ...steps.map((s) => ({ ...s, state: /** @type {const} */ ('done') })),
        { label: 'Return started', date: returning.date, state: 'current' },
      ],
      delivered,
      tracking,
      returnBy,
      canCancel: false,
      canReturn: false,
    };
  return {
    stage: 'delivered',
    label: 'Delivered',
    tone: 'success',
    steps,
    delivered,
    tracking,
    returnBy,
    canCancel: false,
    canReturn: ago(returnBy) <= 0,
  };
}

/** What the order cost: the same rules as the cart. @param {import('./data.js').Order} o */
export function bill(o) {
  const subtotal = o.lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const shipping = subtotal >= 150 ? 0 : 12;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

/** Everything that happened to an order, newest first. @param {import('./data.js').Order} o */
export function timeline(o) {
  const p = progress(o);
  const card = cards()[0];
  /** @type {{ at: string, text: string, tone?: string, note?: string }[]} */
  const events = [
    {
      at: `${o.date}T10:14`,
      text: `Paid ${money(bill(o).total)} with ${card ? `${card.brand} ending ${card.last4}` : 'a card'}`,
      tone: 'success',
    },
    { at: `${o.date}T10:14`, text: `Order #${o.number} placed online` },
  ];
  const s = p.steps;
  if (p.stage === 'cancelled')
    events.unshift({
      at: `${s[1].date}T09:30`,
      text: 'Cancelled, and the payment returned in full',
      tone: 'danger',
    });
  if (s[1]?.state === 'done' || s[1]?.state === 'current')
    if (p.stage !== 'cancelled')
      events.unshift({ at: `${s[1].date}T16:05`, text: 'Packed in Lisbon' });
  if (s[2]?.state === 'done' || s[2]?.state === 'current')
    events.unshift({
      at: `${s[2].date}T11:40`,
      text: `Handed to the carrier, tracking ${p.tracking}`,
      tone: 'info',
    });
  if (p.delivered && (s[3]?.state === 'done' || s[3]?.state === 'current'))
    events.unshift({
      at: `${p.delivered}T13:22`,
      text: 'Delivered, left with the concierge',
      tone: 'success',
    });
  if (p.stage === 'refunded')
    events.unshift({
      at: `${s[4].date}T15:10`,
      text: `Refunded ${money(bill(o).total)}`,
      tone: 'info',
      note: 'Returned unopened. Refunded to the card it was paid with.',
    });
  const r = read('ondine-returns', []).find((x) => x.order === o.number);
  if (r)
    events.unshift({
      at: `${r.date}T12:00`,
      text: `Return ${r.id} started for ${r.count} ${r.count === 1 ? 'piece' : 'pieces'}`,
      tone: 'warning',
    });
  return events;
}

const money = (/** @type {number} */ n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

/** Their orders, newest first. */
export async function myOrders() {
  await wait(350);
  return orders.filter((o) => o.customer.id === me.id);
}

/** One of their orders by its number, or null. @param {number} number */
export async function myOrder(number) {
  await wait(300);
  return orders.find((o) => o.customer.id === me.id && o.number === number) ?? null;
}

/** Cancels an order that hasn't shipped. @param {number} number */
export async function cancelOrder(number) {
  await wait(700);
  write('ondine-cancelled', [...read('ondine-cancelled', []), number]);
}

/**
 * Starts a return: which pieces, why, how they come back and where the money goes.
 * @param {{ order: number, lines: { product: string, finish: string, quantity: number, reason: string, note?: string }[],
 *   method: 'drop-off' | 'pickup', refund: 'card' | 'credit' }} request
 */
export async function startReturn(request) {
  await wait(900);
  const o = orders.find((x) => x.number === request.order);
  const value = request.lines.reduce(
    (n, l) =>
      n +
      (o?.lines.find((x) => x.product === l.product)?.price ?? product(l.product)?.price ?? 0) *
        l.quantity,
    0,
  );
  const credit = request.refund === 'credit';
  const r = {
    id: `R-${request.order}-${String(Date.now()).slice(-3)}`,
    order: request.order,
    date: TODAY,
    count: request.lines.reduce((n, l) => n + l.quantity, 0),
    refund: Math.round(value * (credit ? 1.1 : 1) * 100) / 100,
    refundTo: request.refund,
    method: request.method,
    by: plus(TODAY, 14),
    code: `ON${request.order}${String(Date.now()).slice(-4)}`,
  };
  write('ondine-returns', [...read('ondine-returns', []).filter((x) => x.order !== r.order), r]);
  return r;
}

/**
 * Where they send things. The first one marked default is used at checkout.
 * @typedef {{ id: string, name: string, line1: string, line2?: string, city: string,
 *   postal: string, country: string, phone?: string, default?: boolean }} Address
 * @returns {Address[]}
 */
export function addresses() {
  return read('ondine-addresses', [
    {
      id: 'a1',
      name: me.name,
      line1: 'Rua das Flores 12, 3º',
      city: 'Lisbon',
      postal: '1200-195',
      country: 'Portugal',
      phone: '+351 912 000 481',
      default: true,
    },
    {
      id: 'a2',
      name: `${me.name}, studio`,
      line1: 'Calle de Atocha 34',
      line2: 'Studio B',
      city: 'Madrid',
      postal: '28012',
      country: 'Spain',
    },
  ]);
}

/** Adds an address, or replaces the one with its id. @param {Address} a */
export async function saveAddress(a) {
  await wait(500);
  const list = addresses();
  const next = a.id
    ? list.map((x) => (x.id === a.id ? { ...x, ...a } : x))
    : [...list, { ...a, id: `a${Date.now()}` }];
  write('ondine-addresses', next.length === 1 ? [{ ...next[0], default: true }] : next);
}

/** @param {string} id */
export async function removeAddress(id) {
  await wait(300);
  const next = addresses().filter((a) => a.id !== id);
  if (next.length && !next.some((a) => a.default)) next[0].default = true;
  write('ondine-addresses', next);
}

/** @param {string} id */
export async function defaultAddress(id) {
  await wait(300);
  write(
    'ondine-addresses',
    addresses().map((a) => ({ ...a, default: a.id === id })),
  );
}

/**
 * Cards they've kept. Only the brand, the last four digits and the expiry: the rest lives with the
 * payment provider.
 * @typedef {{ id: string, brand: string, last4: string, exp: string, default?: boolean }} Card
 * @returns {Card[]}
 */
export function cards() {
  return read('ondine-cards', [
    { id: 'k1', brand: 'Visa', last4: '4242', exp: '08/28', default: true },
    { id: 'k2', brand: 'Mastercard', last4: '5100', exp: '11/26' },
  ]);
}

/** @param {string} id */
export async function removeCard(id) {
  await wait(300);
  const next = cards().filter((c) => c.id !== id);
  if (next.length && !next.some((c) => c.default)) next[0].default = true;
  write('ondine-cards', next);
}

/** @param {string} id */
export async function defaultCard(id) {
  await wait(300);
  write(
    'ondine-cards',
    cards().map((c) => ({ ...c, default: c.id === id })),
  );
}

/** Whether a card's expiry (MM/YY) has passed, or passes within two months. @param {string} exp */
export function expiry(exp) {
  const [m, y] = exp.split('/').map(Number);
  const end = Date.UTC(2000 + (y ?? 0), m ?? 0, 1);
  return end <= today ? 'expired' : end - today < 62 * DAY ? 'soon' : 'ok';
}

/** Saves their name, email and what they want to hear about. @param {{ name: string, email: string, news: boolean, restock: boolean }} p */
export async function saveProfile(p) {
  await wait(600);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email))
    throw new Error('Enter an email address like name@example.com.');
  write('ondine-profile', p);
}

/** A stand-in: "wrong" is the wrong current password. @param {string} current @param {string} next */
export async function changePassword(current, next) {
  await wait(700);
  if (current === 'wrong') throw new Error("That isn't your current password.");
  if (next.length < 10) throw new Error('Use at least 10 characters.');
  if (next === current) throw new Error("That's the password you have now.");
}

/** Forgets everything kept in this browser for the demo, like signing out of it. */
export function forget() {
  for (const key of [
    'ondine-profile',
    'ondine-addresses',
    'ondine-cards',
    'ondine-cancelled',
    'ondine-returns',
  ])
    try {
      localStorage.removeItem(key);
    } catch {}
}
