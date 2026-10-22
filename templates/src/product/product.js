import { toast } from '@glass-midas/components';
import { addToCart, extra, image } from '../shared/cart-store.js';
import { collections, money, pageUrl, products, stock } from '../shared/data.js';
import { cardSwatches, escape, productCard, shopShell } from '../shared/shop.js';

// A product: pictures that follow the finish and open large, the finish as a radio group that
// also says how many are left, a quantity, and one button to buy.

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const p = products.find((x) => x.id === params.get('id')) ?? products[0];
let finish = p.finishes.find((f) => f.name.toLowerCase() === params.get('finish')) ?? p.finishes[0];
let picture = 0;

const pictures = () => [
  { src: image(p.id, finish.name), alt: `${p.name} in ${finish.name}` },
  { src: image(p.id, finish.name, 'detail'), alt: `${p.name} in ${finish.name}, close up` },
  { src: extra(p.id, 'plate'), alt: `${p.name}'s figure: sand on a plate, drawn by its tuning` },
  { src: extra(p.id, 'box'), alt: `${p.name}'s box` },
];

function show(i) {
  picture = i;
  const all = pictures();
  $('#main-image').src = all[i].src;
  $('#main-image').alt = all[i].alt;
  $('#thumbs').innerHTML = all
    .map(
      (pic, k) =>
        `<button type="button" aria-label="${escape(pic.alt)}" aria-pressed="${k === i}" data-picture="${k}"><img src="${pic.src}" alt="" width="200" height="200"></button>`,
    )
    .join('');
}

function choose(f, { focus = false } = {}) {
  finish = f;
  $('#finish-name').textContent = f.name;
  for (const swatch of $('#finishes').children) {
    const on = swatch.dataset.finish === f.name;
    swatch.setAttribute('aria-checked', String(on));
    swatch.tabIndex = on ? 0 : -1;
    if (on && focus) swatch.focus();
  }
  // How many are left, in words; sold out turns the button off and says why.
  const left = stock[p.id][f.name];
  const add = $('#add');
  add.disabled = left === 0;
  add.textContent = left === 0 ? `Sold out in ${f.name}` : 'Add to cart';
  $('#stock').innerHTML =
    left === 0
      ? `<span class="gm-badge" data-tone="danger">Sold out</span> Back in about three weeks.`
      : left < 10
        ? `<span class="gm-badge" data-tone="warning">${left} left</span> in ${f.name}.`
        : `<span class="gm-badge" data-tone="success">In stock</span> Ships in 2 working days.`;
  $('#quantity').max = String(Math.max(1, Math.min(9, left)));
  $('gm-quantity').sync();
  history.replaceState(null, '', `?id=${p.id}&finish=${f.name.toLowerCase()}`);
  show(picture);
}

document.title = `${p.name} · Ondine`;
$('#crumb-collection').textContent = collections[p.collection].name;
$('#crumb-collection').href = pageUrl('collection', `c=${p.collection}`);
$('#crumb-name').textContent = p.name;
$('#kind').textContent = p.kind;
$('#name').textContent = p.name;
$('#price').textContent = money(p.price);
$('#blurb').textContent = p.blurb;
$('#specs').innerHTML = Object.entries(p.specs)
  .map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`)
  .join('');
$('#box-text').textContent =
  `${p.name}, its cable or case where it has one, a card with its figure, and a cloth bag.`;
$('#finishes').innerHTML = p.finishes
  .map(
    (f) =>
      `<button type="button" role="radio" class="shop-swatch" style="--swatch:${f.color}" aria-label="${f.name}" data-finish="${f.name}"></button>`,
  )
  .join('');

// The finishes are a radio group: click one, or move with the arrow keys.
$('#finishes').addEventListener('click', (e) => {
  const swatch = e.target.closest('[data-finish]');
  if (swatch) choose(p.finishes.find((f) => f.name === swatch.dataset.finish));
});
$('#finishes').addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const i = p.finishes.indexOf(finish);
  choose(p.finishes[(i + step + p.finishes.length) % p.finishes.length], { focus: true });
});

$('#thumbs').addEventListener('click', (e) => {
  const thumb = e.target.closest('[data-picture]');
  if (thumb) show(Number(thumb.dataset.picture));
});
$('#zoom').addEventListener('click', () => {
  const pic = pictures()[picture];
  $('#large-image').src = pic.src;
  $('#large-image').alt = pic.alt;
  $('#large').show();
});

$('#buy').addEventListener('submit', (e) => {
  e.preventDefault();
  const quantity = Number($('#quantity').value) || 1;
  addToCart(p.id, finish.name, quantity);
  toast(`${p.name} in ${finish.name} is in your cart`, {
    action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
  });
});

const related = $('#related');
related.innerHTML = products
  .filter((x) => x.collection === p.collection && x.id !== p.id)
  .slice(0, 4)
  .map((x) => productCard(x))
  .join('');
related.closest('section').hidden = !related.children.length;
cardSwatches(related);

shopShell();
choose(finish);
