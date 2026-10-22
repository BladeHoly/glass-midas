import { toast } from '@glass-midas/components';
import {
  addToCart,
  extra,
  image,
  isSaved,
  notifyWhenBack,
  sendReview,
  toggleSaved,
} from '../shared/cart-store.js';
import { collections, day, pageUrl, products, reviews, stock } from '../shared/data.js';
import {
  cardSwatches,
  escape,
  priceHtml,
  productCard,
  ratingHtml,
  shopShell,
} from '../shared/shop.js';

// A product: pictures that follow the finish and open large, the finish as swatches that also
// say how many are left (and offer to tell you when a sold-out one is back), a quantity, one
// button to buy and a heart to save it; then the details, and what people said.

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const p = products.find((x) => x.id === params.get('id')) ?? products[0];
let finish = p.finishes.find((f) => f.name.toLowerCase() === params.get('finish')) ?? p.finishes[0];
const { rating, reviews: written } = reviews[p.id];

const pictures = () => [
  { src: image(p.id, finish.name), alt: `${p.name} in ${finish.name}` },
  { src: image(p.id, finish.name, 'detail'), alt: `${p.name} in ${finish.name}, close up` },
  { src: extra(p.id, 'plate'), alt: `${p.name}'s figure: sand on a plate, drawn by its tuning` },
  { src: extra(p.id, 'box'), alt: `${p.name}'s box` },
];

function choose(f) {
  finish = f;
  $('#finish-name').textContent = f.name;
  // The gallery keeps its place; its pictures (and thumbnails) follow the finish.
  const imgs = $('#gallery').querySelectorAll('.gm-gallery-track img, :scope > img');
  pictures().forEach((pic, i) => {
    if (!imgs[i]) return;
    imgs[i].src = pic.src;
    imgs[i].alt = pic.alt;
  });
  // How many are left, in words. Sold out swaps buying for being told when it's back.
  const left = stock[p.id][f.name];
  $('#buy-row').hidden = left === 0;
  $('#notify').hidden = left !== 0;
  $('#notify-message').textContent = '';
  $('#stock').innerHTML =
    left === 0
      ? `<span class="gm-badge" data-tone="danger">Sold out</span> in ${f.name}. Back in about three weeks.`
      : left < 10
        ? `<span class="gm-badge" data-tone="warning">${left} left</span> in ${f.name}.`
        : `<span class="gm-badge" data-tone="success">In stock</span> Ships in 2 working days.`;
  $('#quantity').max = String(Math.max(1, Math.min(9, left)));
  if (Number($('#quantity').value) > Number($('#quantity').max))
    $('#quantity').value = $('#quantity').max;
  $('gm-quantity').sync?.();
  $('#save').dataset.finish = f.name;
  history.replaceState(null, '', `?id=${p.id}&finish=${f.name.toLowerCase()}`);
}

document.title = `${p.name} · Ondine`;
$('#crumb-collection').textContent = collections[p.collection].name;
$('#crumb-collection').href = pageUrl('collection', `c=${p.collection}`);
$('#crumb-name').textContent = p.name;
$('#kind').textContent = p.kind;
$('#name').textContent = p.name;
$('#rating').innerHTML = ratingHtml(p.id, { long: true });
$('#price').innerHTML = priceHtml(p);
$('#blurb').textContent = p.blurb;
$('#specs').innerHTML = Object.entries(p.specs)
  .map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`)
  .join('');
$('#box-text').textContent =
  `${p.name}, its cable or case where it has one, a card with its figure, and a cloth bag.`;

// The finishes are radios: the browser does the arrow keys, and a sold-out one is still
// choosable, to see it and ask for it.
$('#finishes').insertAdjacentHTML(
  'beforeend',
  p.finishes
    .map(
      (f) =>
        `<input type="radio" class="gm-swatch" name="finish" value="${f.name}" style="--gm-swatch:${f.color}" aria-label="${f.name}${stock[p.id][f.name] === 0 ? ', sold out' : ''}"${stock[p.id][f.name] === 0 ? ' data-unavailable' : ''}${f === finish ? ' checked' : ''}>`,
    )
    .join(''),
);
$('#finishes').addEventListener('change', (e) =>
  choose(p.finishes.find((f) => f.name === e.target.value)),
);

$('#save').dataset.save = p.id;
$('#save').setAttribute('aria-pressed', String(isSaved(p.id)));
$('#save').addEventListener('click', () => {
  const on = toggleSaved(p.id, finish.name);
  toast(on ? `${p.name} is saved for later` : `${p.name} is no longer saved`, {
    action: on
      ? { label: 'See saved', onClick: () => (location.href = pageUrl('wishlist')) }
      : undefined,
  });
});

$('#buy').addEventListener('submit', (e) => {
  e.preventDefault();
  const quantity = Number($('#quantity').value) || 1;
  addToCart(p.id, finish.name, quantity);
  toast(`${p.name} in ${finish.name} is in your cart`, {
    action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
  });
});

$('#notify').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#notify-email');
  const message = $('#notify-message');
  try {
    await notifyWhenBack(p.id, finish.name, input.value.trim());
    input.removeAttribute('aria-invalid');
    message.classList.add('is-ok');
    message.textContent = `We'll write to ${input.value.trim()} when ${finish.name} is back.`;
  } catch (err) {
    input.setAttribute('aria-invalid', 'true');
    message.classList.remove('is-ok');
    message.textContent = err.message;
    input.focus();
  }
});

// Reviews: the average, how the stars spread (as bars, with the numbers in words), and the
// written ones, sorted.
$('#average').innerHTML =
  `<strong>${rating.average}</strong><span class="gm-rating" style="--gm-rating:${rating.average}" role="img" aria-label="${rating.average} out of 5"></span><span>${rating.count} reviews</span>`;
$('#spread').innerHTML = rating.spread
  .map(
    (n, i) =>
      `<li><span>${5 - i} ${i === 4 ? 'star' : 'stars'}</span><span class="gm-meter" style="--value:${n / rating.count}" aria-hidden="true"></span><span>${n}</span></li>`,
  )
  .join('');
$('#reviews-count').textContent = `${written.length} of ${rating.count}, with words`;

const list = [...written];
function drawReviews() {
  const by = $('#review-sort').value;
  const sorted = [...list].sort((a, b) =>
    by === 'high'
      ? b.stars - a.stars || b.date.localeCompare(a.date)
      : by === 'low'
        ? a.stars - b.stars || b.date.localeCompare(a.date)
        : b.date.localeCompare(a.date),
  );
  $('#review-list').innerHTML = sorted
    .map(
      (r) => `<li class="pd-review">
        <p class="pd-review-stars"><span class="gm-rating" style="--gm-rating:${r.stars}" role="img" aria-label="${r.stars} out of 5"></span>${r.pending ? '<span class="gm-badge" data-tone="info">Waiting to be checked</span>' : ''}</p>
        <h3>${escape(r.title)}</h3>
        <p>${escape(r.body)}</p>
        <p class="pd-review-by">${escape(r.name)} · ${escape(r.city)} · <time datetime="${r.date}">${day(r.date)}</time> · ${escape(r.finish)}${r.verified ? ' · <span class="pd-verified">Bought it here</span>' : ''}</p>
      </li>`,
    )
    .join('');
}
$('#review-sort').addEventListener('change', drawReviews);
drawReviews();

// Writing one: a drawer with the stars, a title, the words, photos if they like, and a name.
const dialog = $('#review-dialog');
const form = $('#review-form');
$('#write').addEventListener('click', () => dialog.show());
$('#review-cancel').addEventListener('click', () => dialog.close('cancel'));
const upload = form.querySelector('gm-upload');
upload.addEventListener('gm-reject', (e) => {
  const { file, reason } = e.detail;
  const why = { type: "isn't a picture", size: 'is over 5 MB', count: 'is one more than 4' }[
    reason
  ];
  $('#review-photos-error').textContent = `${file.name} ${why}, so it's not added.`;
});
upload.addEventListener('gm-change', () => ($('#review-photos-error').textContent = ''));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const problems = [
    ['stars', !data.get('stars') && 'Choose from one to five stars.'],
    ['review-title', !String(data.get('title')).trim() && 'Give it a title, a few words.'],
    [
      'review-body',
      String(data.get('body')).trim().length < 20 && 'Say a little more: 20 characters at least.',
    ],
    ['review-name', !String(data.get('name')).trim() && 'Add the name to show with it.'],
  ];
  let first;
  for (const [id, problem] of problems) {
    const error = $(`#${id}-error`);
    error.textContent = problem || '';
    const field = id === 'stars' ? form.querySelector('[name="stars"]') : $(`#${id}`);
    if (id !== 'stars') field.toggleAttribute('aria-invalid', !!problem);
    if (problem && !first) first = field;
  }
  if (first) return first.focus();
  const send = $('#review-send');
  send.setAttribute('aria-busy', 'true');
  send.disabled = true;
  const review = await sendReview({
    product: p.id,
    name: String(data.get('name')).trim(),
    city: 'You',
    date: new Date().toISOString().slice(0, 10),
    stars: Number(data.get('stars')),
    title: String(data.get('title')).trim(),
    body: String(data.get('body')).trim(),
    finish: finish.name,
    verified: false,
  });
  send.removeAttribute('aria-busy');
  send.disabled = false;
  list.push({ ...review, pending: true });
  drawReviews();
  form.reset();
  upload.files = [];
  dialog.close('sent');
  toast('Thank you. Your review shows here once someone has read it.');
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
