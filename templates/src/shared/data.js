// Ondine's data: one catalogue, its customers and its orders, shared by every template so they
// all tell the same story. Orders are drawn from a seed, the same on every load. Replace this
// file with calls to your API.

/**
 * @typedef {{ name: string, color: string }} Finish
 * @typedef {{ id: string, name: string, kind: string, collection: string, price: number,
 *   finishes: Finish[], blurb: string, figure: [number, number], specs: Record<string, string> }} Product
 * @typedef {{ id: string, name: string, email: string, city: string, since: string }} Customer
 * @typedef {'paid' | 'fulfilled' | 'pending' | 'refunded' | 'cancelled'} OrderStatus
 * @typedef {{ product: string, finish: string, quantity: number, price: number }} Line
 * @typedef {{ id: string, number: number, customer: Customer, date: string, status: OrderStatus,
 *   lines: Line[], total: number, channel: 'Online' | 'Studio' }} Order
 */

/** @type {Record<string, { name: string, blurb: string }>} */
export const collections = {
  listen: { name: 'Listen', blurb: 'Headphones and earbuds, for one.' },
  room: { name: 'Room', blurb: 'Speakers that fill a room, or follow you out of it.' },
  ritual: {
    name: 'Ritual',
    blurb: 'The turntable, the amplifier, and what keeps them sounding right.',
  },
};

/** @type {Record<string, string>} */
const colors = {
  Obsidian: '#1c1b22',
  Moonstone: '#d9d6e6',
  Verdigris: '#5fae9c',
  Pearl: '#f1ece4',
  Walnut: '#6b4a33',
  Ash: '#c9bba4',
  Ember: '#d9673a',
  Brass: '#b8924a',
  Silver: '#b9bcc4',
  Natural: '#e8dfcf',
};
/** @param {string[]} names */
const finishes = (...names) => names.map((name) => ({ name, color: colors[name] }));

/**
 * The catalogue. `figure` is each piece's Chladni figure (n, m): the pattern its tuning draws.
 * @type {Product[]}
 */
export const products = [
  {
    id: 'tide',
    name: 'Tide',
    kind: 'Over-ear headphones',
    collection: 'listen',
    price: 449,
    finishes: finishes('Obsidian', 'Moonstone', 'Verdigris'),
    blurb: 'Closed-back, 40 hours a charge, and quiet enough to hear the room tone of a record.',
    figure: [3, 7],
    specs: {
      Driver: '50 mm beryllium',
      Response: '5 Hz – 40 kHz',
      Battery: '40 h',
      Weight: '310 g',
      Connection: 'Bluetooth 5.4, USB-C, 3.5 mm',
    },
  },
  {
    id: 'ripple',
    name: 'Ripple',
    kind: 'Earbuds',
    collection: 'listen',
    price: 229,
    finishes: finishes('Obsidian', 'Pearl'),
    blurb: 'Small enough to forget, with a case that charges them four times over.',
    figure: [1, 4],
    specs: {
      Driver: '11 mm dynamic',
      Response: '20 Hz – 20 kHz',
      Battery: '8 h (32 h with case)',
      Weight: '5 g each',
      Connection: 'Bluetooth 5.4',
    },
  },
  {
    id: 'choir',
    name: 'Choir',
    kind: 'Bookshelf speakers, pair',
    collection: 'room',
    price: 1290,
    finishes: finishes('Walnut', 'Ash', 'Obsidian'),
    blurb: 'A pair tuned as one, in solid wood, for rooms that deserve them.',
    figure: [4, 7],
    specs: {
      Driver: '6.5" woofer, 1" silk dome',
      Response: '38 Hz – 25 kHz',
      Power: '2 × 100 W',
      Weight: '7.4 kg each',
      Connection: 'Wi-Fi, Bluetooth, HDMI ARC, phono in',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    kind: 'Portable speaker',
    collection: 'room',
    price: 279,
    finishes: finishes('Ember', 'Moonstone', 'Verdigris'),
    blurb: 'Takes a fall and a rain shower, and still sounds bigger than it is.',
    figure: [2, 9],
    specs: {
      Driver: '2 × 2" full range, passive radiator',
      Response: '55 Hz – 20 kHz',
      Power: '30 W',
      Battery: '18 h',
      Weight: '890 g',
      Connection: 'Bluetooth 5.4',
    },
  },
  {
    id: 'orbit',
    name: 'Orbit',
    kind: 'Turntable',
    collection: 'ritual',
    price: 890,
    finishes: finishes('Walnut', 'Obsidian'),
    blurb: 'Belt-driven, with a phono stage inside, so it plays into anything.',
    figure: [3, 8],
    specs: {
      Drive: 'Belt, 33⅓ and 45 rpm',
      Cartridge: 'Moving magnet',
      Weight: '6.1 kg',
      Connection: 'RCA, built-in phono stage',
    },
  },
  {
    id: 'lantern',
    name: 'Lantern',
    kind: 'Headphone amplifier',
    collection: 'ritual',
    price: 640,
    finishes: finishes('Brass', 'Obsidian'),
    blurb: 'A tube stage that warms up as the evening does.',
    figure: [5, 9],
    specs: {
      Output: '1.5 W into 32 Ω',
      Response: '10 Hz – 100 kHz',
      Weight: '2.2 kg',
      Connection: 'USB-C DAC, RCA in, 6.35 mm and 4.4 mm out',
    },
  },
  {
    id: 'thread',
    name: 'Thread',
    kind: 'Braided cable',
    collection: 'ritual',
    price: 59,
    finishes: finishes('Silver', 'Obsidian'),
    blurb: 'Silver-plated copper in a cloth braid, 1.5 m.',
    figure: [4, 9],
    specs: {
      Length: '1.5 m',
      Conductor: 'Silver-plated copper',
      Ends: '3.5 mm to 3.5 mm or 4.4 mm',
    },
  },
  {
    id: 'vesper',
    name: 'Vesper',
    kind: 'Record cleaning kit',
    collection: 'ritual',
    price: 79,
    finishes: finishes('Natural'),
    blurb: 'A goat-hair brush, a fluid that leaves nothing behind, and a stylus brush.',
    figure: [1, 6],
    specs: { Includes: 'Brush, 100 ml fluid, stylus brush, cloth' },
  },
];

/** @param {string} id */
export const product = (id) => products.find((p) => p.id === id);

/** A seeded random number generator: the same numbers on every load. */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  'Ada',
  'Lio',
  'Mira',
  'Noor',
  'Tomás',
  'Yuki',
  'Amara',
  'Felix',
  'Inès',
  'Kofi',
  'Sana',
  'Jonah',
  'Elif',
  'Mateo',
  'Priya',
  'Oskar',
  'Leila',
  'Ren',
  'Zara',
  'Hugo',
];
const LAST = [
  'Moreau',
  'Hart',
  'Sol',
  'Haddad',
  'Varga',
  'Tanaka',
  'Okafor',
  'Lindqvist',
  'Duarte',
  'Mensah',
  'Iqbal',
  'Reyes',
  'Kaya',
  'Romero',
  'Shah',
  'Berg',
  'Farah',
  'Ito',
  'Novak',
  'Laurent',
];
const CITIES = [
  'Lisbon',
  'Montréal',
  'Osaka',
  'Berlin',
  'Buenos Aires',
  'Accra',
  'Melbourne',
  'Copenhagen',
  'Mexico City',
  'Seoul',
];

/** @type {Customer[]} */
export const customers = (() => {
  const rand = random(11);
  return Array.from({ length: 48 }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + 3) % LAST.length];
    const year = 2022 + Math.floor(rand() * 4);
    return {
      id: `c${100 + i}`,
      name: `${first} ${last}`,
      email: `${first.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}.${last.toLowerCase()}@example.com`,
      city: CITIES[Math.floor(rand() * CITIES.length)],
      since: `${year}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}`,
    };
  });
})();

/** "Today", for the demo: every date is counted back from here, so the data never ages. */
export const TODAY = '2026-10-21';

/** @type {Order[]} */
export const orders = (() => {
  const rand = random(7);
  const pick = (/** @type {any[]} */ list) => list[Math.floor(rand() * list.length)];
  const today = new Date(`${TODAY}T12:00:00Z`);
  return Array.from({ length: 214 }, (_, i) => {
    const number = 1214 - i;
    // Newer orders first, a few a day; the newest are still waiting to ship.
    const date = new Date(today.getTime() - Math.floor(i * 0.42 + rand() * 0.4) * 86400000);
    const lines = Array.from({ length: 1 + Math.floor(rand() ** 2 * 3) }, () => {
      const p = rand() < 0.3 ? pick(products.slice(5)) : pick(products);
      return {
        product: p.id,
        finish: pick(p.finishes).name,
        quantity: rand() < 0.85 ? 1 : 2,
        price: p.price,
      };
    });
    const roll = rand();
    /** @type {OrderStatus} */
    const status =
      i < 6
        ? roll < 0.5
          ? 'pending'
          : 'paid'
        : roll < 0.08
          ? 'refunded'
          : roll < 0.12
            ? 'cancelled'
            : roll < 0.2
              ? 'paid'
              : 'fulfilled';
    return {
      id: `o${number}`,
      number,
      customer: customers[Math.floor(rand() * customers.length)],
      date: date.toISOString().slice(0, 10),
      status,
      lines,
      total: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      channel: rand() < 0.82 ? 'Online' : 'Studio',
    };
  });
})();

/** How each status reads, and its badge's tone. */
export const STATUS = {
  paid: { label: 'Paid', tone: 'info' },
  fulfilled: { label: 'Fulfilled', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: '' },
};

/** Stock per product and finish, for the catalogue. */
export const stock = (() => {
  const rand = random(3);
  /** @type {Record<string, Record<string, number>>} */
  const out = {};
  for (const p of products) {
    out[p.id] = {};
    for (const f of p.finishes)
      out[p.id][f.name] = rand() < 0.12 ? 0 : Math.floor(rand() ** 1.6 * 140);
  }
  return out;
})();

export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export const day = (iso) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));

export const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
