import '@glass-midas/components';
import { collections, products } from '../shared/data.js';
import { cardSwatches, productCard, shopShell } from '../shared/shop.js';

// A collection, or every piece, or what a search found: the filter and the sort live in the
// address, so a link shares exactly this view and Back goes to the last one.

const $ = (s) => document.querySelector(s);
const grid = $('#grid');
const SORTS = {
  featured: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name),
};

function view() {
  const params = new URLSearchParams(location.search);
  return {
    c: params.get('c') ?? 'all',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? 'featured',
  };
}

function go(change) {
  const params = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(change)) {
    if (!v || v === 'all' || v === 'featured') params.delete(k);
    else params.set(k, v);
  }
  history.pushState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  render();
}

function render() {
  const { c, q, sort } = view();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = products
    .filter((p) => c === 'all' || p.collection === c)
    .filter((p) =>
      words.every((w) =>
        `${p.name} ${p.kind} ${p.finishes.map((f) => f.name).join(' ')}`.toLowerCase().includes(w),
      ),
    )
    .sort(SORTS[sort] ?? SORTS.featured);
  const title = q ? `“${q}”` : c === 'all' ? 'All pieces' : collections[c].name;
  $('#title').textContent = title;
  $('#lede').textContent = q
    ? 'What the search found.'
    : c === 'all'
      ? 'Everything Ondine makes.'
      : collections[c].blurb;
  document.title = `${q ? `${q} · ` : ''}${c === 'all' ? 'All pieces' : collections[c].name} · Ondine`;
  for (const chip of $('#filters').children)
    chip.setAttribute('aria-pressed', String(chip.dataset.collection === c));
  $('.col-sort').value = sort;
  $('.shop-search input').value = q;
  $('#count').textContent = `${shown.length} ${shown.length === 1 ? 'piece' : 'pieces'}`;
  grid.innerHTML = shown.map((p) => productCard(p)).join('');
  grid.hidden = !shown.length;
  $('#empty').hidden = !!shown.length;
  $('#empty-text').textContent = q
    ? `Nothing called “${q}”. Try another word, or look at every piece.`
    : 'Nothing in this collection right now.';
}

$('#filters').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-collection]');
  if (chip) go({ c: chip.dataset.collection });
});
$('.col-sort').addEventListener('change', (e) => go({ sort: e.target.value }));
$('[data-action="reset"]').addEventListener('click', () =>
  go({ c: 'all', q: '', sort: 'featured' }),
);
addEventListener('popstate', render);
cardSwatches(grid);

shopShell();
render();
