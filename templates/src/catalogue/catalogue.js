import { toast } from '@glass-midas/components';
import { shellSearch } from '../shared/app.js';
import { collections, money, pageUrl } from '../shared/data.js';
import { listCatalogue, setStock } from '../shared/store.js';

// Products: grouped by collection, each opening into its finishes, where stock can be changed in
// place. Search, a collection filter and "low stock" narrow it down; groups fold away.

const LOW = 10;
const $ = (s) => document.querySelector(s);
const panel = $('#panel');
const table = $('#table');
const empty = $('#empty');
const error = $('#error');

const view = { query: '', collection: 'all', low: false };
const open = new Set();
const closedGroups = new Set();
let catalogue = [];

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const total = (p) => Object.values(p.stock).reduce((a, b) => a + b, 0);
const isLow = (p) => Object.values(p.stock).some((n) => n < LOW);

/** A stock count as a badge: the word says it, the color backs it up. */
const badge = (n) =>
  n === 0
    ? '<span class="gm-badge" data-tone="danger">Sold out</span>'
    : n < LOW
      ? `<span class="gm-badge" data-tone="warning">${n} left</span>`
      : `<span class="gm-badge" data-tone="success">${n} in stock</span>`;

const chevron =
  '<svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function matches(p) {
  const q = view.query.trim().toLowerCase();
  return (
    (view.collection === 'all' || p.collection === view.collection) &&
    (!view.low || isLow(p)) &&
    (!q ||
      p.name.toLowerCase().includes(q) ||
      p.kind.toLowerCase().includes(q) ||
      p.finishes.some((f) => f.name.toLowerCase().includes(q)))
  );
}

function render() {
  const shown = catalogue.filter(matches);
  for (const body of table.querySelectorAll('tbody')) body.remove();
  empty.hidden = !!shown.length;
  table.hidden = !shown.length;
  const t = table.querySelector('table');
  for (const [id, collection] of Object.entries(collections)) {
    const items = shown.filter((p) => p.collection === id);
    if (!items.length) continue;
    const folded = closedGroups.has(id);
    const low = items.filter(isLow).length;
    const body = document.createElement('tbody');
    body.innerHTML = `<tr class="cat-group"><th colspan="5" data-label="" scope="rowgroup">
        <button type="button" aria-expanded="${!folded}" data-group="${id}">${chevron}${collection.name}
          <small>${items.length} ${items.length === 1 ? 'piece' : 'pieces'}${low ? ` · ${low} low` : ''}</small></button></th></tr>
      ${folded ? '' : items.map(productRows).join('')}`;
    t.append(body);
  }
}

function productRows(p) {
  // Low stock opens a product, so what needs attention is in view.
  const expanded = open.has(p.id) || (view.low && isLow(p));
  const sum = total(p);
  // A product reads as fine only if every finish is.
  const lowCount = Object.values(p.stock).filter((n) => n < LOW).length;
  return `<tr>
      <td><span class="cat-product">
        <button class="cat-expand" type="button" aria-expanded="${expanded}" aria-controls="${p.finishes.map((f) => `v-${p.id}-${f.name}`).join(' ')}" data-product="${p.id}" aria-label="${escape(p.name)}'s finishes">${chevron}</button>
        <span class="cat-figure" aria-hidden="true"><span class="on-sigil" style="--sigil: url('art/sigil-${p.id}.svg')"></span></span>
        <span><a href="${pageUrl('edit-product', `id=${p.id}`)}">${escape(p.name)}</a><small>${escape(p.kind)}</small></span>
      </span></td>
      <td class="gm-num">${money(p.price)}</td>
      <td><span class="cat-swatches" role="img" aria-label="${p.finishes.map((f) => f.name).join(', ')}">${p.finishes
        .map(
          (f) => `<span class="cat-swatch" style="--swatch:${f.color}" title="${f.name}"></span>`,
        )
        .join('')}</span></td>
      <td>${lowCount && sum ? `<span class="gm-badge" data-tone="warning">${sum} · ${lowCount} ${lowCount === 1 ? 'finish' : 'finishes'} low</span>` : badge(sum)}</td>
      <td class="gm-num">${p.sold}</td>
    </tr>
    ${p.finishes
      .map(
        (f) => `<tr class="cat-variant" id="v-${p.id}-${f.name}"${expanded ? '' : ' hidden'}>
      <td data-label="Finish"><span class="cat-swatch" style="--swatch:${f.color}"></span>${f.name}</td>
      <td data-label=""></td><td data-label=""></td>
      <td data-label="Stock"><label class="cat-stock">
        <span class="on-sr-only">${escape(p.name)}, ${f.name}, in stock</span>
        <input class="gm-input" type="number" min="0" inputmode="numeric" value="${p.stock[f.name]}" data-stock="${p.id}" data-finish="${f.name}">
        ${badge(p.stock[f.name])}
      </label></td>
      <td data-label=""></td>
    </tr>`,
      )
      .join('')}`;
}

/** Rows shaped like products, while the catalogue loads. */
function skeleton() {
  const body = document.createElement('tbody');
  body.setAttribute('aria-hidden', 'true');
  body.innerHTML = Array.from(
    { length: 6 },
    () => `<tr>
      <td><span class="cat-product"><span class="gm-skeleton" style="width:2.5rem;height:2.5rem;border-radius:12px"></span><span class="gm-skeleton gm-skeleton-text" style="width:7rem"></span></span></td>
      <td class="gm-num"><span class="gm-skeleton gm-skeleton-text" style="width:4rem;margin-left:auto"></span></td>
      <td><span class="gm-skeleton gm-skeleton-text" style="width:3rem"></span></td>
      <td><span class="gm-skeleton gm-skeleton-round" style="width:5rem;height:1.4rem"></span></td>
      <td class="gm-num"><span class="gm-skeleton gm-skeleton-text" style="width:2rem;margin-left:auto"></span></td>
    </tr>`,
  ).join('');
  table.querySelector('table').append(body);
}

async function load() {
  panel.setAttribute('aria-busy', 'true');
  error.hidden = true;
  table.hidden = false;
  if (!catalogue.length) skeleton();
  try {
    catalogue = await listCatalogue();
    render();
  } catch (failure) {
    table.hidden = true;
    empty.hidden = true;
    $('#error-message').textContent = failure.message;
    error.hidden = false;
  } finally {
    panel.removeAttribute('aria-busy');
  }
}

table.addEventListener('click', (e) => {
  const group = e.target.closest('[data-group]');
  if (group) {
    const id = group.dataset.group;
    closedGroups.has(id) ? closedGroups.delete(id) : closedGroups.add(id);
    render();
    table.querySelector(`[data-group="${id}"]`).focus();
    return;
  }
  const expand = e.target.closest('[data-product]');
  if (!expand) return;
  const id = expand.dataset.product;
  const opening = expand.getAttribute('aria-expanded') !== 'true';
  opening ? open.add(id) : open.delete(id);
  expand.setAttribute('aria-expanded', String(opening));
  for (const row of table.querySelectorAll(`.cat-variant[id^="v-${id}-"]`)) row.hidden = !opening;
});

// Stock saves when the field is left, or on Enter.
table.addEventListener('change', async (e) => {
  const input = e.target.closest('[data-stock]');
  if (!input) return;
  const count = Math.max(0, Math.round(Number(input.value) || 0));
  input.value = String(count);
  const p = catalogue.find((x) => x.id === input.dataset.stock);
  await setStock(p.id, input.dataset.finish, count);
  p.stock[input.dataset.finish] = count;
  input.nextElementSibling.outerHTML = badge(count);
  toast(`${p.name} in ${input.dataset.finish}: ${count} in stock`);
});

let typing;
$('#query').addEventListener('input', (e) => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    view.query = e.target.value;
    render();
  }, 150);
});

$('#filters').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-collection]');
  if (!chip) return;
  for (const c of $('#filters').children) c.setAttribute('aria-pressed', String(c === chip));
  view.collection = chip.dataset.collection;
  render();
});

$('#low').addEventListener('change', (e) => {
  view.low = e.target.checked;
  render();
});

$('#expand-all').addEventListener('click', (e) => {
  const opening = e.target.textContent === 'Open all';
  for (const p of catalogue) opening ? open.add(p.id) : open.delete(p.id);
  closedGroups.clear();
  e.target.textContent = opening ? 'Close all' : 'Open all';
  render();
});

$('[data-action="reset"]').addEventListener('click', () => {
  Object.assign(view, { query: '', collection: 'all', low: false });
  $('#query').value = '';
  $('#low').checked = false;
  for (const c of $('#filters').children)
    c.setAttribute('aria-pressed', String(c.dataset.collection === 'all'));
  render();
});
$('[data-action="retry"]').addEventListener('click', load);

shellSearch(document.querySelector('.app-actions gm-search'));
load();
