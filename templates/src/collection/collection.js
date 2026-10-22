import '@glass-midas/components';
import { allFinishes, collections, findPieces } from '../shared/data.js';
import { cardSwatches, escape, productCard, shopShell } from '../shared/shop.js';

// A collection, or every piece, or what a search found. The collection chips filter at once; the
// rest (price, finish, stock, sale) wait in a drawer until "Show". All of it lives in the
// address, so a link shares exactly this view and Back goes to the last one; each filter that's
// on shows as a chip to take it off.

const $ = (s) => document.querySelector(s);
const grid = $('#grid');
const form = $('#filter-form');
const TOP = 1300;

/** The view in the address. */
function view(params = new URLSearchParams(location.search)) {
  return {
    c: params.get('c') ?? 'all',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? 'featured',
    min: Number(params.get('min')) || 0,
    max: Number(params.get('max')) || TOP,
    finishes: params.get('finish')?.split(',').filter(Boolean) ?? [],
    stock: params.get('stock') === '1',
    sale: params.get('sale') === '1',
  };
}

function go(change) {
  const params = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(change)) {
    if (!v || v === 'all' || v === 'featured' || (k === 'max' && v >= TOP)) params.delete(k);
    else params.set(k, v === true ? '1' : String(v));
  }
  history.pushState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  render();
}

/** The drawer's choices, as a view (before they're applied). */
function drafted() {
  const data = new FormData(form);
  return {
    ...view(),
    min: Number(data.get('min')),
    max: Number(data.get('max')),
    finishes: data.getAll('finish').map(String),
    stock: data.has('stock'),
    sale: data.has('sale'),
  };
}

const whole = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
const priceLabel = (min, max) =>
  min <= 0 && max >= TOP
    ? 'Any price'
    : max >= TOP
      ? `${whole(min)} and up`
      : `${whole(min)} – ${whole(max)}`;

$('#finish-choices').innerHTML = allFinishes
  .map(
    (f) =>
      `<label class="gm-choice"><input type="checkbox" name="finish" value="${f.name}"><span class="col-dot" style="--dot:${f.color}" aria-hidden="true"></span>${f.name}</label>`,
  )
  .join('');

/** Puts the applied view into the drawer, so it opens on what's on. */
function fillDrawer(v) {
  const [low, high] = form.querySelectorAll('input[type="range"]');
  low.value = String(v.min);
  high.value = String(Math.min(v.max, TOP));
  $('#price').sync?.();
  for (const box of form.querySelectorAll('[name="finish"]'))
    box.checked = v.finishes.includes(box.value);
  form.elements.stock.checked = v.stock;
  form.elements.sale.checked = v.sale;
  drawDraft();
}

/** As the drawer changes: the price in words, and how many pieces "Show" would show. */
function drawDraft() {
  const d = drafted();
  $('#price-out').textContent = priceLabel(d.min, d.max);
  const n = findPieces(d).length;
  const apply = $('#apply-filters');
  apply.textContent = n ? `Show ${n} ${n === 1 ? 'piece' : 'pieces'}` : 'Nothing matches';
  apply.disabled = !n;
}

function render() {
  const v = view();
  const shown = findPieces(v);
  $('#title').textContent = v.q ? `“${v.q}”` : v.c === 'all' ? 'All pieces' : collections[v.c].name;
  $('#lede').textContent = v.q
    ? 'What the search found.'
    : v.c === 'all'
      ? 'Everything Ondine makes.'
      : collections[v.c].blurb;
  document.title = `${v.q ? `${v.q} · ` : ''}${v.c === 'all' ? 'All pieces' : collections[v.c].name} · Ondine`;
  for (const chip of $('#collections').children)
    chip.setAttribute('aria-pressed', String(chip.dataset.collection === v.c));
  $('#sort').value = v.sort;
  $('.col-sort').sync?.();
  $('.shop-search input').value = v.q;
  $('#count').textContent = `${shown.length} ${shown.length === 1 ? 'piece' : 'pieces'}`;

  // The filters that are on, each a chip that takes it off.
  const on = [];
  if (v.min > 0 || v.max < TOP) on.push(['price', priceLabel(v.min, v.max)]);
  for (const f of v.finishes) on.push([`finish:${f}`, f]);
  if (v.stock) on.push(['stock', 'In stock now']);
  if (v.sale) on.push(['sale', 'On sale']);
  $('#filter-count').textContent = on.length ? ` · ${on.length}` : '';
  $('#open-filters').setAttribute('aria-label', on.length ? `Filters, ${on.length} on` : 'Filters');
  $('#active').hidden = !on.length;
  $('#active').innerHTML = on.length
    ? `${on
        .map(
          ([key, label]) =>
            `<button type="button" class="gm-chip col-active-chip" data-off="${escape(key)}" aria-label="Remove ${escape(label)}">${escape(label)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`,
        )
        .join(
          '',
        )}<button type="button" class="gm-chip gm-chip-plain" data-off="all">Clear all</button>`
    : '';

  grid.innerHTML = shown.map((p) => productCard(p)).join('');
  grid.hidden = !shown.length;
  $('#empty').hidden = !!shown.length;
  $('#empty-text').textContent = v.q
    ? `Nothing called “${v.q}”${on.length ? ' with these filters' : ''}. Try another word, or look at every piece.`
    : on.length
      ? 'Nothing matches these filters. Take one off, or look at every piece.'
      : 'Nothing in this collection right now.';
  fillDrawer(v);
}

$('#collections').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-collection]');
  if (chip) go({ c: chip.dataset.collection });
});
$('#sort').addEventListener('change', (e) => go({ sort: e.target.value }));
$('[data-action="reset"]').addEventListener('click', () =>
  go({ c: 'all', q: '', sort: 'featured', min: 0, max: TOP, finish: '', stock: '', sale: '' }),
);
$('#active').addEventListener('click', (e) => {
  const key = e.target.closest('[data-off]')?.dataset.off;
  if (!key) return;
  const v = view();
  if (key === 'all') go({ min: 0, max: TOP, finish: '', stock: '', sale: '' });
  else if (key === 'price') go({ min: 0, max: TOP });
  else if (key.startsWith('finish:'))
    go({ finish: v.finishes.filter((f) => f !== key.slice(7)).join(',') });
  else go({ [key]: '' });
  // The chip is gone: keep focus in the row, or on the Filters button.
  ($('#active').querySelector('[data-off]') ?? $('#open-filters')).focus();
});

$('#open-filters').addEventListener('click', () => {
  fillDrawer(view());
  $('#filters').show();
});
form.addEventListener('input', drawDraft);
form.addEventListener('change', drawDraft);
$('#clear-filters').addEventListener('click', () => {
  fillDrawer({ ...view(), min: 0, max: TOP, finishes: [], stock: false, sale: false });
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = drafted();
  go({ min: d.min, max: d.max, finish: d.finishes.join(','), stock: d.stock, sale: d.sale });
  $('#filters').close('apply');
});

addEventListener('popstate', render);
cardSwatches(grid);

shopShell();
render();
