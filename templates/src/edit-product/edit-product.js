import { toast } from '@glass-midas/components';
import { adminProduct, problems, saveProduct } from '../shared/admin-store.js';
import { shellSearch } from '../shared/app.js';
import { money, pageUrl } from '../shared/data.js';

// Editing a product: the basics, the pictures, its finishes with their SKUs and stock, the price
// (with what's left after the cost), where it lives and how it shows in search. Nothing saves on
// its own: a bar floats up with the first change, and leaving asks first. Saving checks every
// field, lists what needs a look at the top (each a link to its field) and marks the fields.

const $ = (s) => document.querySelector(s);
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const form = $('#form');
const f = form.elements;
const LABELS = {
  name: 'Name',
  price: 'Price',
  was: 'Price before',
  cost: 'Cost',
  finishes: 'Finishes',
  seoTitle: 'Search title',
  seoDescription: 'Search description',
};
const stamp = (at) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${at}Z`));
const art = () => document.documentElement.dataset.art || 'art/';

let saved; // the product as it was last saved
let tags = [];
let finishes = [];
let pictures = [];

/** The product as the form has it now. */
function collect() {
  const number = (v) =>
    String(v).trim() === '' ? null : Number(String(v).replace(/[^\d.-]/g, ''));
  return {
    ...saved,
    name: f.name.value,
    kind: f.kind.value,
    blurb: f.blurb.value,
    status: form.querySelector('[name="status"]:checked')?.value ?? 'draft',
    price: number(f.price.value) ?? 0,
    was: number(f.was.value),
    cost: number(f.cost.value) ?? 0,
    taxable: f.taxable.checked,
    weight: number(f.weight.value) ?? 0,
    collection: f.collection.value,
    tags: [...tags],
    seoTitle: f.seoTitle.value,
    seoDescription: f.seoDescription.value,
    finishes: finishes.map((x) => ({ ...x })),
    pictures: [...pictures],
  };
}

function fill(p) {
  f.name.value = p.name;
  f.kind.value = p.kind;
  f.blurb.value = p.blurb;
  form.querySelector(`[name="status"][value="${p.status}"]`).checked = true;
  f.price.value = p.price;
  f.was.value = p.was ?? '';
  f.cost.value = p.cost;
  f.taxable.checked = p.taxable;
  f.weight.value = p.weight;
  f.collection.value = p.collection;
  form.querySelector('gm-select')?.sync?.();
  f.seoTitle.value = p.seoTitle;
  f.seoDescription.value = p.seoDescription;
  tags = [...p.tags];
  finishes = p.finishes.map((x) => ({ ...x }));
  pictures = p.pictures ?? [
    ...p.finishes.map((x) => `${art()}products/${p.id}-${x.name.toLowerCase()}.svg`),
    `${art()}products/${p.id}-plate.webp`,
    `${art()}products/${p.id}-box.svg`,
  ];
  drawTags();
  drawFinishes();
  drawPictures();
  derived();
}

/* What follows from the fields: counts, the margin, the search preview, the title. */
function derived() {
  const p = collect();
  $('#title').textContent = p.name || 'Untitled';
  $('#crumb').textContent = p.name || 'Untitled';
  document.title = `${p.name || 'Untitled'} · Products · Ondine`;
  $('#blurb-count').textContent = `${p.blurb.length} of 300`;
  $('#seoTitle-count').textContent = `${p.seoTitle.length} of 60`;
  $('#seoDescription-count').textContent = `${p.seoDescription.length} of 160`;
  $('#seoTitle-count').classList.toggle('is-over', p.seoTitle.length > 60);
  $('#seoDescription-count').classList.toggle('is-over', p.seoDescription.length > 160);
  $('#snippet-url').textContent = `ondine.example › ${p.collection} › ${p.id}`;
  $('#snippet-title').textContent = p.seoTitle || p.name;
  $('#snippet-text').textContent = p.seoDescription || p.blurb;
  const profit = p.price - p.cost;
  $('#margin').innerHTML =
    p.price > 0
      ? `<dt>Profit on each</dt><dd>${money(profit)}</dd><dt class="gm-totals-total">Margin</dt><dd class="gm-totals-total">${Math.round((profit / p.price) * 100)}%</dd>`
      : '';
  const total = finishes.reduce((n, x) => n + (Number(x.stock) || 0), 0);
  $('#stock-total').textContent =
    `${total} in stock across ${finishes.length} ${finishes.length === 1 ? 'finish' : 'finishes'}`;
  const dirty =
    JSON.stringify(p) !== JSON.stringify({ ...saved, pictures: saved.pictures ?? p.pictures });
  $('#bar').hidden = !dirty;
  $('#bar-text').textContent = dirty ? 'Unsaved changes' : '';
  return dirty;
}

/* Finishes: a row each, edited in place. */
function drawFinishes() {
  $('#finishes').innerHTML = finishes
    .map(
      (x, i) => `<tr data-index="${i}">
        <td><input type="color" class="ep-color" value="${x.color}" data-key="color" aria-label="Color of ${escape(x.name || 'the new finish')}"></td>
        <td><input class="gm-input" value="${escape(x.name)}" data-key="name" id="finish-${i}-name" aria-label="Finish name" aria-describedby="finish-${i}-name-error"><p class="gm-field-error" id="finish-${i}-name-error"></p></td>
        <td><input class="gm-input ep-sku" value="${escape(x.sku)}" data-key="sku" id="finish-${i}-sku" aria-label="SKU of ${escape(x.name)}" aria-describedby="finish-${i}-sku-error" spellcheck="false"><p class="gm-field-error" id="finish-${i}-sku-error"></p></td>
        <td class="gm-num"><gm-quantity label-decrease="One fewer in stock" label-increase="One more in stock"><input type="number" min="0" max="9999" value="${x.stock}" data-key="stock" id="finish-${i}-stock" aria-label="${escape(x.name)} in stock"></gm-quantity></td>
        <td><button class="gm-chip gm-chip-plain gm-chip-round" type="button" data-remove aria-label="Remove ${escape(x.name || 'this finish')}"${finishes.length === 1 ? ' disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></td>
      </tr>`,
    )
    .join('');
}
$('#finishes').addEventListener('input', (e) => {
  const row = e.target.closest('[data-index]');
  const key = e.target.dataset.key;
  if (!row || !key) return;
  const i = Number(row.dataset.index);
  finishes[i][key] = key === 'stock' ? Number(e.target.value) : e.target.value;
  derived();
});
$('#finishes').addEventListener('click', (e) => {
  if (!e.target.closest('[data-remove]')) return;
  const i = Number(e.target.closest('[data-index]').dataset.index);
  const [gone] = finishes.splice(i, 1);
  drawFinishes();
  derived();
  (
    $('#finishes').querySelector(
      `[data-index="${Math.min(i, finishes.length - 1)}"] [data-key="name"]`,
    ) ?? $('#add-finish')
  ).focus();
  toast(`${gone.name || 'The finish'} removed`, {
    action: {
      label: 'Undo',
      onClick: () => {
        finishes.splice(i, 0, gone);
        drawFinishes();
        derived();
      },
    },
  });
});
$('#add-finish').addEventListener('click', () => {
  finishes.push({ name: '', color: '#888888', sku: `ON-${saved.id.toUpperCase()}-`, stock: 0 });
  drawFinishes();
  derived();
  $(`#finish-${finishes.length - 1}-name`).focus();
});

/* Pictures: the ones it has, and new ones dropped in. */
function drawPictures() {
  $('#pictures').innerHTML = pictures
    .map(
      (
        src,
        i,
      ) => `<li><img src="${src}" alt="" width="120" height="120">${i === 0 ? '<span class="gm-badge" data-tone="info">Main</span>' : ''}
        <button class="gm-chip gm-chip-round" type="button" data-picture="${i}" aria-label="Remove picture ${i + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></li>`,
    )
    .join('');
}
$('#pictures').addEventListener('click', (e) => {
  const b = e.target.closest('[data-picture]');
  if (!b) return;
  pictures.splice(Number(b.dataset.picture), 1);
  drawPictures();
  derived();
  ($('#pictures [data-picture]') ?? form.querySelector('gm-upload input')).focus();
});
const upload = form.querySelector('gm-upload');
upload.addEventListener('gm-change', (e) => {
  $('#pictures-error').textContent = '';
  // In a real store, upload them here and add their URLs; the demo shows them from memory.
  for (const file of e.detail.files) pictures.push(URL.createObjectURL(file));
  if (e.detail.files.length) {
    upload.files = [];
    drawPictures();
    derived();
  }
});
upload.addEventListener('gm-reject', (e) => {
  const { file, reason } = e.detail;
  $('#pictures-error').textContent =
    `${file.name} ${{ type: "isn't a picture", size: 'is over 10 MB', count: 'is one too many' }[reason]}, so it's not added.`;
});

/* Tags: typed, Enter adds, × or Backspace takes off. */
function drawTags() {
  $('#tags').innerHTML = tags
    .map(
      (t, i) =>
        `<li><span class="gm-chip ep-tag">${escape(t)}<button type="button" data-tag="${i}" aria-label="Remove the tag ${escape(t)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></span></li>`,
    )
    .join('');
  $('#tags').hidden = !tags.length;
}
$('#tag-input').addEventListener('keydown', (e) => {
  const input = e.target;
  if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
    e.preventDefault();
    const t = input.value.trim().toLowerCase().replace(/,$/, '');
    if (!tags.includes(t)) tags.push(t);
    input.value = '';
    drawTags();
    derived();
  } else if (e.key === 'Enter') e.preventDefault();
  else if (e.key === 'Backspace' && !input.value && tags.length) {
    tags.pop();
    drawTags();
    derived();
  }
});
$('#tags').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tag]');
  if (!b) return;
  tags.splice(Number(b.dataset.tag), 1);
  drawTags();
  derived();
  $('#tag-input').focus();
});

form.addEventListener('input', (e) => {
  if (!e.target.closest('#finishes')) derived();
});
form.addEventListener('change', (e) => {
  if (!e.target.closest('#finishes, gm-upload')) derived();
});

/* Saving: check, list what's wrong, or save. */
function showProblems(found) {
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
  for (const el of form.querySelectorAll('.gm-field-error:not(#pictures-error)'))
    el.textContent = '';
  const entries = Object.entries(found);
  $('#summary').hidden = !entries.length;
  if (!entries.length) return;
  for (const [key, message] of entries) {
    const error = $(`#${key}-error`);
    if (error) error.textContent = message;
    $(`#${key}`)?.setAttribute('aria-invalid', 'true');
  }
  const label = (key) => {
    const m = key.match(/^finish-(\d+)-(\w+)$/);
    return m
      ? `${finishes[m[1]].name || `Finish ${Number(m[1]) + 1}`}, ${m[2] === 'sku' ? 'SKU' : m[2]}`
      : (LABELS[key] ?? key);
  };
  $('#summary-title').textContent =
    `${entries.length} ${entries.length === 1 ? 'field needs' : 'fields need'} a look`;
  $('#summary-list').innerHTML = entries
    .map(
      ([key, message]) =>
        `<li><a href="#${key === 'finishes' ? 'add-finish' : key}">${escape(label(key))}</a>: ${escape(message)}</li>`,
    )
    .join('');
  $('#summary').focus();
}
$('#summary').addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  const target = $(a.getAttribute('href'));
  target?.scrollIntoView({ block: 'center' });
  target?.focus();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = collect();
  const found = problems(p);
  showProblems(found);
  if (Object.keys(found).length) return;
  const save = $('#save');
  save.setAttribute('aria-busy', 'true');
  try {
    saved = await saveProduct(p);
    derived();
    $('#lede').textContent = `${saved.kind} · Saved ${stamp(saved.updated)}`;
    toast(`${saved.name} is saved`, {
      action: {
        label: 'View in the store',
        onClick: () => (location.href = pageUrl('product', `id=${saved.id}`)),
      },
    });
  } catch (err) {
    showProblems(err.fields ?? {});
  } finally {
    save.removeAttribute('aria-busy');
  }
});

$('#discard').addEventListener('click', () => {
  fill(saved);
  showProblems({});
  toast('Changes discarded');
  $('#title').focus?.();
});

// Leaving with changes asks first.
addEventListener('beforeunload', (e) => {
  if (saved && !$('#bar').hidden) e.preventDefault();
});

const id = new URLSearchParams(location.search).get('id') || 'tide';
adminProduct(id).then((p) => {
  $('#loading').hidden = true;
  if (!p) {
    $('#missing').hidden = false;
    return;
  }
  saved = p;
  form.hidden = false;
  fill(p);
  saved = collect();
  derived();
  $('#lede').innerHTML =
    `${escape(p.kind)} · Saved ${stamp(p.updated)} · <a href="${pageUrl('product', `id=${p.id}`)}">View in the store</a>`;
});

shellSearch(document.querySelector('.app-actions gm-search'));
