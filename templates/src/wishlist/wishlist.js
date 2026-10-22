import { toast } from '@glass-midas/components';
import {
  addToCart,
  image,
  onSaved,
  readSaved,
  setSavedFinish,
  toggleSaved,
} from '../shared/cart-store.js';
import { pageUrl, product, stock } from '../shared/data.js';
import { escape, priceHtml, ratingHtml, shopShell } from '../shared/shop.js';

// Saved pieces: each in the finish it was saved in (which can change here), whether that finish
// is in stock, and a button to buy it; everything in stock into the cart at once; and a link to
// share the list. A shared link opens that list, to look at or keep.

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

/** A list from a link: ?ids=tide:verdigris,ember:ember. */
const shared = (params.get('ids') ?? '')
  .split(',')
  .map((pair) => pair.split(':'))
  .map(([id, finish]) => {
    const p = product(id);
    const f = p?.finishes.find((x) => x.name.toLowerCase() === finish) ?? p?.finishes[0];
    return p && f ? { product: p.id, finish: f.name } : null;
  })
  .filter(Boolean);

const left = (s) => stock[s.product][s.finish];

function card(s, mine) {
  const p = product(s.product);
  const n = left(s);
  const href = pageUrl('product', `id=${p.id}&finish=${s.finish.toLowerCase()}`);
  return `<li class="wl-card" data-product="${p.id}" data-finish="${s.finish}">
    <a class="wl-media" href="${href}" tabindex="-1" aria-hidden="true"><img src="${image(p.id, s.finish)}" alt="" width="400" height="400" loading="lazy"></a>
    <div class="wl-body">
      <h2><a href="${href}">${escape(p.name)}</a></h2>
      <p class="wl-kind">${escape(p.kind)}</p>
      <p class="shop-rating">${ratingHtml(p.id)}</p>
      <p>${priceHtml(p)}</p>
      ${
        mine && p.finishes.length > 1
          ? `<fieldset class="gm-swatches wl-finishes"><legend>Finish: <strong>${s.finish}</strong></legend>${p.finishes
              .map(
                (f) =>
                  `<input type="radio" class="gm-swatch" data-size="sm" name="finish-${p.id}" value="${f.name}" style="--gm-swatch:${f.color}" aria-label="${f.name}${stock[p.id][f.name] ? '' : ', sold out'}"${stock[p.id][f.name] ? '' : ' data-unavailable'}${f.name === s.finish ? ' checked' : ''}>`,
              )
              .join('')}</fieldset>`
          : `<p class="wl-kind">${s.finish}</p>`
      }
      <p class="wl-stock">${
        n === 0
          ? `<span class="gm-badge" data-tone="danger">Sold out</span> in ${s.finish}`
          : n < 10
            ? `<span class="gm-badge" data-tone="warning">${n} left</span>`
            : `<span class="gm-badge" data-tone="success">In stock</span>`
      }</p>
      <div class="wl-buttons">
        ${
          n === 0
            ? `<a class="gm-chip" href="${href}">Tell me when it's back</a>`
            : `<button class="gm-chip gm-chip-primary" type="button" data-action="cart">Add to cart</button>`
        }
        ${mine ? `<button class="gm-chip gm-chip-plain" type="button" data-action="remove" aria-label="Remove ${escape(p.name)} from saved">Remove</button>` : ''}
      </div>
    </div>
  </li>`;
}

function render(list) {
  const mine = !shared.length;
  const shown = mine ? list : shared;
  const ready = shown.filter((s) => left(s) > 0);
  $('#shared').hidden = mine;
  if (!mine) {
    $('#title').textContent = 'A saved list';
    $('#lede').textContent = 'Someone shared these pieces with you.';
    $('#shared-text').textContent =
      `${shown.length} ${shown.length === 1 ? 'piece' : 'pieces'}, as they were saved.`;
  }
  $('#share').hidden = !mine || !shown.length;
  $('#add-all').hidden = !ready.length;
  $('#add-all').textContent =
    ready.length === shown.length ? 'Add all to cart' : `Add the ${ready.length} in stock to cart`;
  $('#count').textContent = shown.length
    ? `${shown.length} ${shown.length === 1 ? 'piece' : 'pieces'}${ready.length < shown.length ? `, ${shown.length - ready.length} sold out in the finish saved` : ''}`
    : '';
  $('#grid').innerHTML = shown.map((s) => card(s, mine)).join('');
  $('#grid').hidden = !shown.length;
  $('#empty').hidden = !!shown.length;
}

$('#grid').addEventListener('change', (e) => {
  const li = e.target.closest('[data-product]');
  if (li && e.target.matches('.gm-swatch')) setSavedFinish(li.dataset.product, e.target.value);
});

$('#grid').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  const li = e.target.closest('[data-product]');
  if (!action || !li) return;
  const { product: id, finish } = li.dataset;
  const name = product(id).name;
  if (action === 'cart') {
    addToCart(id, finish);
    toast(`${name} in ${finish} is in your cart`, {
      action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
    });
  } else {
    // The next card (or the page's heading) takes focus, since this one goes.
    const next = li.nextElementSibling ?? li.previousElementSibling;
    toggleSaved(id, finish);
    (next?.querySelector('h2 a') ?? $('#title')).focus();
    toast(`${name} removed from saved`, {
      action: { label: 'Undo', onClick: () => toggleSaved(id, finish) },
    });
  }
});

$('#add-all').addEventListener('click', () => {
  const ready = (shared.length ? shared : readSaved()).filter((s) => left(s) > 0);
  for (const s of ready) addToCart(s.product, s.finish);
  toast(`${ready.length} ${ready.length === 1 ? 'piece' : 'pieces'} added to your cart`, {
    action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
  });
});

$('#share').addEventListener('click', async () => {
  const ids = readSaved()
    .map((s) => `${s.product}:${s.finish.toLowerCase()}`)
    .join(',');
  const url = `${location.origin}${location.pathname}?ids=${ids}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied. Anyone with it sees this list.');
  } catch {
    toast(`Copy this link: ${url}`);
  }
});

$('#keep').addEventListener('click', () => {
  const have = readSaved();
  let added = 0;
  for (const s of shared)
    if (!have.some((h) => h.product === s.product)) {
      toggleSaved(s.product, s.finish);
      added++;
    }
  toast(added ? `${added} added to your saved pieces` : 'You had all of these saved already', {
    action: { label: 'See my list', onClick: () => (location.href = pageUrl('wishlist')) },
  });
});

shopShell();
render(readSaved());
onSaved(render);
