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

export const FREE_SHIPPING = 150;

/** What the cart costs, all of it, before checkout: no surprises there. */
export function totals(lines) {
  const subtotal = lines.reduce((n, l) => n + (product(l.product)?.price ?? 0) * l.quantity, 0);
  const shipping = !subtotal || subtotal >= FREE_SHIPPING ? 0 : 12;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  return {
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    toFreeShipping: subtotal && subtotal < FREE_SHIPPING ? FREE_SHIPPING - subtotal : 0,
  };
}

// Where the art folder is: beside the page, unless <html data-art="…"> says otherwise.
const ART = (typeof document !== 'undefined' && document.documentElement.dataset.art) || 'art/';

/** The image of a piece in a finish; `view` is 'detail' for the close-up. */
export const image = (id, finish, view = '') =>
  `${ART}products/${id}-${finish.toLowerCase()}${view ? `-${view}` : ''}.svg`;

/** The piece's sand figure, or its box. */
export const extra = (id, kind) =>
  `${ART}products/${id}-${kind === 'plate' ? 'plate.webp' : 'box.svg'}`;
