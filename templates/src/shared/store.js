import {
  TODAY,
  collections,
  incidents,
  orders,
  products,
  services,
  stock,
  visits,
} from './data.js';

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

// Analytics: every number below is counted from the same orders and visits, so the dashboards
// always agree with each other and with the orders table.

const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const todayTime = Date.parse(`${TODAY}T12:00:00Z`);
const monthDay = (t) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(t),
  );
const month = (t) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(t));

/**
 * The buckets of a range: days for a week or a month, weeks for a quarter, months for a year.
 * Each bucket knows its label and which dates fall in it; `offset` shifts it back whole ranges,
 * for the period before.
 */
function buckets(range, offset = 0) {
  const days = Number(range);
  const size = days <= 30 ? 1 : days <= 90 ? 7 : 30;
  const count = Math.round(days / size);
  const end = todayTime - offset * days * DAY;
  return Array.from({ length: count }, (_, k) => {
    const last = end - (count - 1 - k) * size * DAY;
    const first = last - (size - 1) * DAY;
    return {
      label: size === 30 ? month(last) : monthDay(size === 1 ? last : first),
      from: iso(first),
      to: iso(last),
    };
  });
}

const inBucket = (b, date) => date >= b.from && date <= b.to;
// Before the first order there's no data, which isn't the same as no sales.
const EARLIEST = orders.at(-1).date;
const counted = (o) => o.status !== 'cancelled' && o.status !== 'refunded';
const sumVisits = (from, to) =>
  Object.entries(visits).reduce((n, [d, v]) => (d >= from && d <= to ? n + v : n), 0);

function totals(range, offset) {
  const b = buckets(range, offset);
  const from = b[0].from;
  const to = b.at(-1).to;
  const list = orders.filter((o) => o.date >= from && o.date <= to && counted(o));
  const revenue = list.reduce((n, o) => n + o.total, 0);
  const seen = sumVisits(from, to);
  return {
    // Whether the store was open for all of it: a period before the first order can't compare.
    complete: from >= EARLIEST,
    revenue,
    orders: list.length,
    average: list.length ? revenue / list.length : 0,
    conversion: seen ? list.length / seen : 0,
    buckets: b.map((bk) => {
      const inside = list.filter((o) => inBucket(bk, o.date));
      const r = inside.reduce((n, o) => n + o.total, 0);
      const v = sumVisits(bk.from, bk.to);
      if (bk.to < EARLIEST)
        return { label: bk.label, revenue: null, orders: null, average: null, conversion: null };
      return {
        label: bk.label,
        revenue: r,
        orders: inside.length,
        average: inside.length ? r / inside.length : 0,
        conversion: v ? inside.length / v : 0,
      };
    }),
  };
}

/** The overview: four numbers against the period before, revenue over time, what sells, what's new. */
export async function overview(range = '30') {
  await wait();
  if (state === 'error') throw new Error('Check the connection and try again.');
  const now = totals(range, 0);
  const before = totals(range, 1);
  const kpi = (key) => ({
    value: now[key],
    previous: before.complete ? before[key] : null,
    trend: now.buckets.map((b) => b[key]),
  });
  const from = buckets(range)[0].from;
  /** @type {Record<string, { revenue: number, units: number }>} */
  const sold = {};
  for (const o of orders) {
    if (o.date < from || !counted(o)) continue;
    for (const l of o.lines) {
      sold[l.product] ??= { revenue: 0, units: 0 };
      sold[l.product].revenue += l.price * l.quantity;
      sold[l.product].units += l.quantity;
    }
  }
  return {
    kpis: {
      revenue: kpi('revenue'),
      orders: kpi('orders'),
      average: kpi('average'),
      conversion: kpi('conversion'),
    },
    labels: now.buckets.map((b) => b.label),
    revenue: now.buckets.map((b) => b.revenue),
    previous: before.complete ? before.buckets.map((b) => b.revenue) : null,
    best: products
      .map((p) => ({ product: p, ...(sold[p.id] ?? { revenue: 0, units: 0 }) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    recent: orders.slice(0, 5),
    low: products.flatMap((p) =>
      Object.entries(stock[p.id])
        .filter(([, n]) => n < 10)
        .map(([finish, n]) => ({ product: p, finish, count: n })),
    ),
  };
}

/** Analytics: revenue by collection over time, the path from visit to order, and the channels. */
export async function analytics(range = '90') {
  await wait();
  if (state === 'error') throw new Error('Check the connection and try again.');
  const b = buckets(range);
  const from = b[0].from;
  const list = orders.filter((o) => o.date >= from && counted(o));
  const byCollection = Object.keys(collections).map((c) =>
    b.map((bk) =>
      list
        .filter((o) => inBucket(bk, o.date))
        .flatMap((o) => o.lines)
        .filter((l) => products.find((p) => p.id === l.product)?.collection === c)
        .reduce((n, l) => n + l.price * l.quantity, 0),
    ),
  );
  const seen = sumVisits(from, b.at(-1).to);
  // The path to an order: the later steps are each a share of the one before, from the sessions.
  const views = Math.round(seen * 0.46);
  const carts = Math.round(views * 0.19);
  const checkouts = Math.round(carts * 0.58);
  const channels = ['Online', 'Studio'].map((c) => {
    const mine = list.filter((o) => o.channel === c);
    return { channel: c, revenue: mine.reduce((n, o) => n + o.total, 0), orders: mine.length };
  });
  /** @type {Record<string, { orders: number, revenue: number }>} */
  const cities = {};
  for (const o of list) {
    cities[o.customer.city] ??= { orders: 0, revenue: 0 };
    cities[o.customer.city].orders += 1;
    cities[o.customer.city].revenue += o.total;
  }
  return {
    labels: b.map((bk) => bk.label),
    collections: Object.entries(collections).map(([id, c], i) => ({
      id,
      name: c.name,
      values: byCollection[i],
    })),
    funnel: [
      { step: 'Visits', count: seen },
      { step: 'Viewed a piece', count: views },
      { step: 'Added to cart', count: carts },
      { step: 'Started checkout', count: checkouts },
      { step: 'Ordered', count: list.length },
    ],
    channels,
    cities: Object.entries(cities)
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

/** The status page: each service now, the last day of response times, and recent incidents. */
export async function status() {
  await wait(300);
  if (state === 'error') throw new Error('Check the connection and try again.');
  return { services, incidents };
}
