import { customers, orders } from './data.js';

// The app shell's search: pages, orders by number, and customers by name, from one box.

const PAGES = [
  { label: 'Overview', href: '#', hint: 'Page' },
  { label: 'Orders', href: 'orders.html', hint: 'Page' },
  { label: 'Products', href: 'catalogue.html', hint: 'Page' },
  { label: 'Customers', href: '#', hint: 'Page' },
];

/** What the search box finds for a query: pages, then orders, then customers. */
export function findInApp(query) {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return [];
  const pages = PAGES.filter((p) => p.label.toLowerCase().includes(q));
  const byNumber = orders
    .filter((o) => String(o.number).startsWith(q))
    .slice(0, 4)
    .map((o) => ({ label: `Order #${o.number}`, href: '#', hint: o.customer.name }));
  const people = customers
    .filter((c) => c.name.toLowerCase().includes(q) || c.email.includes(q))
    .slice(0, 4)
    .map((c) => ({ label: c.name, href: '#', hint: c.email }));
  return [...pages, ...byNumber, ...people];
}

/** Wires the shell's gm-search to `findInApp`. */
export function shellSearch(el) {
  if (el) el.source = findInApp;
}
