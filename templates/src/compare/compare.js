import { toast } from '@glass-midas/components';
import { addToCart, image } from '../shared/cart-store.js';
import { money, products } from '../shared/data.js';
import { escape, shopShell } from '../shared/shop.js';

// Compare: up to three pieces in columns, what they are in rows. Each column's head chooses its
// piece; "Only where they differ" hides the rows that say the same thing everywhere.

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
let chosen = (params.get('ids') ?? 'tide,ripple,ember')
  .split(',')
  .filter((id) => products.some((p) => p.id === id))
  .slice(0, 3);

// Rows, in groups: the money first, then how it sounds, then what it is.
const GROUPS = [
  ['Price', (p) => money(p.price)],
  ['Finishes', (p) => p.finishes.map((f) => f.name).join(', ')],
];

function rows(pieces) {
  const specs = [...new Set(pieces.flatMap((p) => Object.keys(p.specs)))];
  return [
    { group: 'The basics' },
    ...GROUPS.map(([label, get]) => ({ label, values: pieces.map(get) })),
    { group: 'Inside' },
    ...specs.map((label) => ({ label, values: pieces.map((p) => p.specs[label] ?? null) })),
  ];
}

function render() {
  const pieces = chosen.map((id) => products.find((p) => p.id === id));
  const only = $('#differences').checked;
  $('#head').innerHTML = `<tr><th scope="col"><span class="on-sr-only">Piece</span></th>${pieces
    .map(
      (p, i) => `<th scope="col"><div class="cmp-piece">
        <img src="${image(p.id, p.finishes[0].name)}" alt="" width="176" height="176">
        <gm-select><select aria-label="Column ${i + 1}" data-column="${i}">
          ${products.map((x) => `<option value="${x.id}"${x.id === p.id ? ' selected' : ''}>${escape(x.name)}</option>`).join('')}
        </select></gm-select>
        <span class="cmp-price">${money(p.price)}</span>
        <button class="gm-chip" type="button" data-add="${p.id}">Add to cart</button>
      </div></th>`,
    )
    .join('')}</tr>`;
  $('#rows').innerHTML = rows(pieces)
    .filter((r) => r.group || !only || new Set(r.values.map(String)).size > 1)
    .map((r) =>
      r.group
        ? `<tr class="cmp-group"><th scope="rowgroup" colspan="${pieces.length + 1}">${r.group}</th></tr>`
        : `<tr><th scope="row">${escape(r.label)}</th>${r.values
            .map(
              (v) =>
                `<td>${v == null ? '<span class="cmp-dash" aria-label="Not applicable">—</span>' : escape(v)}</td>`,
            )
            .join('')}</tr>`,
    )
    .join('');
}

$('#head').addEventListener('change', (e) => {
  const select = e.target.closest('[data-column]');
  if (!select) return;
  chosen[Number(select.dataset.column)] = select.value;
  history.replaceState(null, '', `?ids=${chosen.join(',')}`);
  render();
});
$('#head').addEventListener('click', (e) => {
  const button = e.target.closest('[data-add]');
  if (!button) return;
  const p = products.find((x) => x.id === button.dataset.add);
  addToCart(p.id, p.finishes[0].name);
  toast(`${p.name} in ${p.finishes[0].name} is in your cart`, {
    action: { label: 'View cart', onClick: () => $('#mini-cart').showPopover() },
  });
});
$('#differences').addEventListener('change', render);

shopShell();
render();
