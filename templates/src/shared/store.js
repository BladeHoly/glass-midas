import { TODAY, orders, products, stock } from './data.js';

// A stand-in for the store's API, over data.js: it filters, sorts and pages like a server would,
// and takes a moment to answer. Replace each method with a call to yours.
//
// For the demo, `?state=error` makes it fail and `?state=slow` makes it slow, to show those states.

const state =
  typeof location === 'undefined' ? '' : new URLSearchParams(location.search).get('state');
const wait = (ms = 450) =>
  new Promise((resolve) => setTimeout(resolve, state === 'slow' ? ms * 6 : ms));

/** @param {string} iso */
const daysAgo = (iso) =>
  (Date.parse(`${TODAY}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86400000;

export const RANGES = {
  30: 'Last 30 days',
  90: 'Last 90 days',
  365: 'Last 12 months',
  all: 'All time',
};

/**
 * @param {{ query?: string, status?: string, range?: string, sort?: { key: string, direction: string },
 *   page?: number, perPage?: number }} options
 */
export async function listOrders({
  query = '',
  status = 'all',
  range = 'all',
  sort,
  page = 1,
  perPage = 20,
} = {}) {
  await wait();
  if (state === 'error') throw new Error('Check the connection and try again.');
  const q = query.trim().toLowerCase().replace(/^#/, '');
  const inRange = orders.filter((o) => range === 'all' || daysAgo(o.date) <= Number(range));
  const matching = inRange.filter(
    (o) =>
      !q ||
      String(o.number).includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.email.includes(q) ||
      o.lines.some((l) => l.product.includes(q)),
  );
  /** @type {Record<string, number>} */
  const counts = { all: matching.length };
  for (const o of matching) counts[o.status] = (counts[o.status] ?? 0) + 1;
  const rows = matching.filter((o) => status === 'all' || o.status === status);
  if (sort) {
    const sign = sort.direction === 'descending' ? -1 : 1;
    /** @type {Record<string, (o: typeof orders[number]) => string | number>} */
    const by = {
      number: (o) => o.number,
      date: (o) => o.date,
      customer: (o) => o.customer.name,
      total: (o) => o.total,
    };
    const value = by[sort.key] ?? by.number;
    rows.sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      return (
        sign *
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y)))
      );
    });
  }
  const start = (page - 1) * perPage;
  return { rows: rows.slice(start, start + perPage), total: rows.length, counts, page, perPage };
}

/** @param {string[]} ids @param {string} status */
export async function setStatus(ids, status) {
  await wait();
  for (const o of orders) if (ids.includes(o.id)) o.status = /** @type {any} */ (status);
}

export async function listCatalogue() {
  await wait();
  if (state === 'error') throw new Error('Check the connection and try again.');
  return products.map((p) => ({
    ...p,
    stock: stock[p.id],
    sold: orders
      .filter((o) => o.status !== 'cancelled')
      .flatMap((o) => o.lines)
      .filter((l) => l.product === p.id)
      .reduce((n, l) => n + l.quantity, 0),
  }));
}

/** @param {string} id @param {string} finish @param {number} count */
export async function setStock(id, finish, count) {
  await wait(300);
  stock[id][finish] = count;
}
