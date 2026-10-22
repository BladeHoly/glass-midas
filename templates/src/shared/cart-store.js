import { product } from './data.js';

// The cart: kept in this browser, shared by every store page, and announced when it changes so
// the header's count and the mini cart follow. Replace with your cart API; keep the same shape.

const KEY = 'ondine-cart';
const listeners = new Set();

/** @typedef {{ product: string, finish: string, quantity: number }} CartLine */

/** @returns {CartLine[]} */
export function readCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** @param {CartLine[]} lines */
function write(lines) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  for (const fn of listeners) fn(lines);
}

/** Adds a piece in a finish; the same piece and finish again adds to its line. */
export function addToCart(id, finish, quantity = 1) {
  const lines = readCart();
  const line = lines.find((l) => l.product === id && l.finish === finish);
  if (line) line.quantity = Math.min(9, line.quantity + quantity);
  else lines.push({ product: id, finish, quantity });
  write(lines);
}

/** Sets a line's quantity; 0 removes it. */
export function setQuantity(id, finish, quantity) {
  const lines = readCart()
    .map((l) => (l.product === id && l.finish === finish ? { ...l, quantity } : l))
    .filter((l) => l.quantity > 0);
  write(lines);
}

export const removeFromCart = (id, finish) => setQuantity(id, finish, 0);
export const clearCart = () => write([]);

/** Calls `fn` with the lines whenever the cart changes, here or in another tab. Returns the stop. */
export function onCart(fn) {
  listeners.add(fn);
  const storage = (e) => e.key === KEY && fn(readCart());
  addEventListener('storage', storage);
  return () => {
    listeners.delete(fn);
    removeEventListener('storage', storage);
  };
}

/**
 * Saved for later: pieces kept for another day, in this browser like the cart, each with the finish
 * it was saved in. Replace with your wishlist API; keep the same shape.
 * @typedef {{ product: string, finish: string, at: string }} SavedPiece
 */
const SAVED = 'ondine-saved';
const savedListeners = new Set();

/** @returns {SavedPiece[]} */
export function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED) ?? '[]');
  } catch {
    return [];
  }
}

/** @param {SavedPiece[]} list */
function writeSaved(list) {
  try {
    localStorage.setItem(SAVED, JSON.stringify(list));
  } catch {}
  for (const fn of savedListeners) fn(list);
}

export const isSaved = (id) => readSaved().some((s) => s.product === id);

/** Saves a piece, or forgets it if it was saved. Resolves to whether it's saved now. */
export function toggleSaved(id, finish) {
  const list = readSaved();
  const saved = list.some((s) => s.product === id);
  writeSaved(
    saved
      ? list.filter((s) => s.product !== id)
      : [{ product: id, finish, at: new Date().toISOString() }, ...list],
  );
  return !saved;
}

/** Changes the finish a saved piece is kept in. */
export const setSavedFinish = (id, finish) =>
  writeSaved(readSaved().map((s) => (s.product === id ? { ...s, finish } : s)));

/** Calls `fn` with the saved pieces whenever they change, here or in another tab. */
export function onSaved(fn) {
  savedListeners.add(fn);
  const storage = (e) => e.key === SAVED && fn(readSaved());
  addEventListener('storage', storage);
  return () => {
    savedListeners.delete(fn);
    removeEventListener('storage', storage);
  };
}

/** Asks to be told when a sold-out finish is back. A stand-in: resolves after a moment. */
export async function notifyWhenBack(id, finish, email) {
  await wait(500);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error('Enter an email address like name@example.com.');
  return { product: id, finish, email };
}

/** Sends a review. A stand-in: it would wait for a check before showing. */
export async function sendReview(review) {
  await wait(700);
  return { ...review, id: `new-${Date.now()}` };
}

export const FREE_SHIPPING = 150;

/** Discount codes the stand-in knows: the rate off the subtotal. */
const CODES = { RESONANCE: 0.1 };

/**
 * What the cart costs, all of it, before checkout: no surprises there. `method` is the delivery
 * speed, `code` an applied discount code.
 */
export function totals(lines, { method = 'standard', code = '' } = {}) {
  const subtotal = lines.reduce((n, l) => n + (product(l.product)?.price ?? 0) * l.quantity, 0);
  const discount = Math.round(subtotal * (CODES[code] ?? 0) * 100) / 100;
  const after = subtotal - discount;
  const shipping = !subtotal ? 0 : method === 'express' ? 24 : after >= FREE_SHIPPING ? 0 : 12;
  const tax = Math.round(after * 0.08 * 100) / 100;
  return {
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    discount,
    shipping,
    tax,
    total: after + shipping + tax,
    toFreeShipping: after && after < FREE_SHIPPING ? FREE_SHIPPING - after : 0,
  };
}

const wait = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));

/** Checks a discount code; resolves to its normalized name, or throws why it can't apply. */
export async function applyCode(code) {
  await wait(400);
  const name = code.trim().toUpperCase();
  if (!(name in CODES))
    throw new Error(`“${code.trim()}” isn't a code we know. Check its spelling.`);
  return name;
}

/**
 * Places the order: a stand-in for your payment provider. In this demo the card 4000 0000 0000 0002
 * is declined. The order is kept for the confirmation page, and the cart is emptied.
 */
export async function placeOrder(details) {
  await wait(1200);
  if (details.card.replace(/\D/g, '') === '4000000000000002') {
    throw new Error('The card was declined. Try another card, or the wallet.');
  }
  const lines = readCart();
  const order = {
    number: 1901 + Math.floor(Math.random() * 90),
    email: details.email,
    name: details.name,
    address: [
      details.address,
      details.address2,
      `${details.city} ${details.postal}`,
      details.country,
    ].filter(Boolean),
    method: details.method,
    lines,
    totals: totals(lines, details),
  };
  try {
    sessionStorage.setItem('ondine-order', JSON.stringify(order));
  } catch {}
  clearCart();
  return order;
}

/**
 * @typedef {{ number: number, email: string, name: string, address: string[], method: string,
 *   lines: CartLine[], totals: ReturnType<typeof totals> }} Order
 */

/** The order just placed, for the confirmation page. @returns {Order | null} */
export function lastOrder() {
  try {
    return JSON.parse(sessionStorage.getItem('ondine-order') ?? 'null');
  } catch {
    return null;
  }
}

// Where the art folder is: beside the page, unless <html data-art="…"> says otherwise.
const ART = (typeof document !== 'undefined' && document.documentElement.dataset.art) || 'art/';

/** The image of a piece in a finish; `view` is 'detail' for the close-up. */
export const image = (id, finish, view = '') =>
  `${ART}products/${id}-${finish.toLowerCase()}${view ? `-${view}` : ''}.svg`;

/** The piece's sand figure, or its box. */
export const extra = (id, kind) =>
  `${ART}products/${id}-${kind === 'plate' ? 'plate.webp' : 'box.svg'}`;
