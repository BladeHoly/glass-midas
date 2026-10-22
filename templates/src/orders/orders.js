import { toast } from '@glass-midas/components';
import { STATUS, day, initials, money, product } from '../shared/data.js';
import { listOrders, setStatus } from '../shared/store.js';
import { shellSearch } from '../shared/app.js';

// Orders: search, a status filter, a date range and sorting, all together; rows to select and act
// on; pages of 20; and a state for loading, for nothing found, and for failing.

const $ = (s) => document.querySelector(s);
const panel = $('#panel');
const table = $('#table');
const rows = $('#rows');
const bulk = $('#bulk');
const toolbar = $('#toolbar');
const empty = $('#empty');
const error = $('#error');
const foot = $('#foot');

const view = {
  query: '',
  status: 'all',
  range: 'all',
  sort: { key: 'date', direction: 'descending' },
  page: 1,
};
let request = 0;

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** One row per order; the checkbox's value is the order's id. */
const row = (o) => {
  const status = STATUS[o.status];
  const first = product(o.lines[0].product);
  const more = o.lines.length > 1 ? ` +${o.lines.length - 1}` : '';
  return `<tr>
    <td><input type="checkbox" class="gm-check" data-select value="${o.id}" aria-label="Select order ${o.number}"></td>
    <td><a href="#">#${o.number}</a></td>
    <td data-value="${o.date}">${day(o.date)}</td>
    <td><span class="app-person"><span class="gm-avatar" data-size="sm" aria-hidden="true">${initials(o.customer.name)}</span><span>${escape(o.customer.name)}<small>${o.customer.email}</small></span></span></td>
    <td>${escape(first.name)} · ${o.lines[0].finish}${more}</td>
    <td>${o.channel}</td>
    <td><span class="gm-badge"${status.tone ? ` data-tone="${status.tone}"` : ''}>${status.label}</span></td>
    <td class="gm-num">${money(o.total)}</td>
  </tr>`;
};

/** Skeleton rows, shaped like the real ones, while a page loads. */
const skeleton = () =>
  Array.from(
    { length: 8 },
    () => `<tr aria-hidden="true">
      <td></td><td><span class="gm-skeleton gm-skeleton-text" style="width:3.5rem"></span></td>
      <td><span class="gm-skeleton gm-skeleton-text" style="width:5.5rem"></span></td>
      <td><span class="app-person"><span class="gm-skeleton gm-skeleton-round" style="width:1.5rem;height:1.5rem"></span><span class="gm-skeleton gm-skeleton-text" style="width:8rem"></span></span></td>
      <td><span class="gm-skeleton gm-skeleton-text" style="width:7rem"></span></td>
      <td><span class="gm-skeleton gm-skeleton-text" style="width:3rem"></span></td>
      <td><span class="gm-skeleton gm-skeleton-round" style="width:4.5rem;height:1.4rem"></span></td>
      <td class="gm-num"><span class="gm-skeleton gm-skeleton-text" style="width:4rem;margin-left:auto"></span></td>
    </tr>`,
  ).join('');

/** Page links: the first, the last, and the two either side of the current one. */
function pages(page, count) {
  const shown = [...new Set([1, page - 1, page, page + 1, count])]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  const out = [];
  const link = (p, label, aria) =>
    `<button class="gm-chip ${p === page && !aria ? '' : 'gm-chip-plain'}" type="button" data-page="${p}"${aria ? ` aria-label="${aria}"` : ''}${p === page && !aria ? ' aria-current="page"' : ''}${p < 1 || p > count ? ' disabled' : ''}>${label}</button>`;
  out.push(link(page - 1, '‹', 'Previous page'));
  shown.forEach((p, i) => {
    if (i && p - shown[i - 1] > 1)
      out.push('<span class="gm-pagination-gap" aria-hidden="true">…</span>');
    out.push(link(p, p));
  });
  out.push(link(page + 1, '›', 'Next page'));
  return out.join('');
}

async function load() {
  const mine = ++request;
  panel.setAttribute('aria-busy', 'true');
  error.hidden = true;
  if (!rows.children.length || rows.querySelector('[aria-hidden]')) rows.innerHTML = skeleton();
  else rows.style.opacity = '0.5';
  try {
    const result = await listOrders(view);
    if (mine !== request) return; // A newer request is on its way.
    rows.innerHTML = result.rows.map(row).join('');
    rows.style.opacity = '';
    table.hidden = !result.total;
    empty.hidden = !!result.total;
    foot.hidden = !result.total;
    for (const el of document.querySelectorAll('[data-count]')) {
      const n = result.counts[el.dataset.count] ?? 0;
      el.textContent = n ? n.toLocaleString() : '';
    }
    const from = (result.page - 1) * result.perPage + 1;
    const to = from + result.rows.length - 1;
    $('#range-label').textContent = `${from}–${to} of ${result.total.toLocaleString()}`;
    $('#pages').innerHTML = pages(
      result.page,
      Math.max(1, Math.ceil(result.total / result.perPage)),
    );
  } catch (failure) {
    if (mine !== request) return;
    rows.innerHTML = '';
    table.hidden = true;
    empty.hidden = true;
    foot.hidden = true;
    $('#error-message').textContent = failure.message;
    error.hidden = false;
  } finally {
    if (mine === request) panel.removeAttribute('aria-busy');
  }
}

// Search as you type, a moment after the last key.
let typing;
$('#query').addEventListener('input', (e) => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    view.query = e.target.value;
    view.page = 1;
    load();
  }, 250);
});

$('#filters').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-status]');
  if (!chip) return;
  for (const c of $('#filters').children) c.setAttribute('aria-pressed', String(c === chip));
  view.status = chip.dataset.status;
  view.page = 1;
  load();
});

// The select's id moves to its button; its change still bubbles up through gm-select.
const range = $('.app-toolbar-end gm-select');
range.addEventListener('change', (e) => {
  view.range = e.target.value;
  view.page = 1;
  load();
});

$('#density').addEventListener('gm-change', (e) => table.setAttribute('density', e.detail.value));

// The server sorts, so every page is in order: not only the rows on screen.
table.addEventListener('gm-sort', (e) => {
  e.preventDefault();
  view.sort = e.detail;
  view.page = 1;
  load();
});

$('#pages').addEventListener('click', (e) => {
  const button = e.target.closest('[data-page]');
  if (!button || button.disabled) return;
  view.page = Number(button.dataset.page);
  load().then(() => $('#orders-title').scrollIntoView({ block: 'nearest' }));
});

// The bulk bar takes the toolbar's place while rows are checked.
table.addEventListener('gm-selection', (e) => {
  const n = e.detail.values.length;
  bulk.hidden = !n;
  toolbar.hidden = !!n;
  $('#bulk-count').textContent = `${n} selected`;
});

bulk.addEventListener('click', async (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  const ids = table.selected;
  if (action === 'clear') return table.clearSelection();
  if (action === 'export') {
    toast(`Exporting ${ids.length} ${ids.length === 1 ? 'order' : 'orders'} as CSV…`);
    return;
  }
  if (action === 'fulfil') {
    await setStatus(ids, 'fulfilled');
    table.clearSelection();
    await load();
    toast(`${ids.length} ${ids.length === 1 ? 'order' : 'orders'} marked fulfilled`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          await setStatus(ids, 'paid');
          load();
        },
      },
    });
  }
  if (action === 'refund') {
    const total = ids.length;
    $('#refund-text').textContent =
      `${total} ${total === 1 ? 'customer gets their' : 'customers get their'} money back in 5–10 days. A refund can't be undone.`;
    $('#refund').show();
  }
});

$('#refund').addEventListener('gm-close', async (e) => {
  if (e.detail.value !== 'refund') return;
  const ids = table.selected;
  await setStatus(ids, 'refunded');
  table.clearSelection();
  await load();
  toast(`${ids.length} ${ids.length === 1 ? 'order' : 'orders'} refunded`);
});

for (const action of ['reset', 'retry']) {
  document.querySelector(`[data-action="${action}"]`).addEventListener('click', () => {
    if (action === 'reset') {
      Object.assign(view, { query: '', status: 'all', range: 'all', page: 1 });
      $('#query').value = '';
      range.value = 'all';
      for (const c of $('#filters').children)
        c.setAttribute('aria-pressed', String(c.dataset.status === 'all'));
    }
    load();
  });
}

shellSearch(document.querySelector('.app-actions gm-search'));
load();
