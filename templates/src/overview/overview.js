import '@glass-midas/components';
import { shellSearch } from '../shared/app.js';
import { barList, compact, lineChart, sparkline } from '../shared/charts.js';
import { STATUS, initials, money } from '../shared/data.js';
import { overview } from '../shared/store.js';

// The overview: four numbers against the period before, revenue over time with the period before
// as context, the best sellers, the latest orders and what's running low. One filter, the period,
// scopes all of it.

const $ = (s) => document.querySelector(s);
const dash = $('#dash');
const PERIOD = { 7: '7 days', 30: '30 days', 90: '90 days', 365: '12 months' };
let range = '30';
let stopChart;

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const usd = (n) => `$${compact(n)}`;
const percent = (n) => `${(n * 100).toFixed(1)}%`;

/** A number, how it moved against the period before, and its shape over this one. */
function stat(label, kpi, format, { points = false } = {}) {
  if (kpi.previous == null) {
    return `<article class="gm-stat">
      <p class="gm-stat-label">${label}</p>
      <p class="gm-stat-value">${format(kpi.value)}</p>
      <p class="gm-stat-delta">No earlier ${PERIOD[range]} to compare</p>
      ${sparkline(kpi.trend.map((v) => v ?? 0))}
    </article>`;
  }
  const change = points
    ? (kpi.value - kpi.previous) * 100
    : kpi.previous
      ? ((kpi.value - kpi.previous) / kpi.previous) * 100
      : 0;
  const direction = change > 0.05 ? 'up' : change < -0.05 ? 'down' : '';
  // Here more is better for every number, so up is good.
  const tone = direction === 'up' ? 'good' : direction === 'down' ? 'bad' : '';
  const amount = `${change > 0 ? '+' : ''}${change.toFixed(1)}${points ? ' pts' : '%'}`;
  return `<article class="gm-stat">
    <p class="gm-stat-label">${label}</p>
    <p class="gm-stat-value">${format(kpi.value)}</p>
    <p class="gm-stat-delta"${direction ? ` data-direction="${direction}"` : ''}${tone ? ` data-tone="${tone}"` : ''}>
      ${amount} <span>vs. the ${PERIOD[range]} before</span>
    </p>
    ${sparkline(kpi.trend)}
  </article>`;
}

async function load() {
  dash.setAttribute('aria-busy', 'true');
  $('#error').hidden = true;
  try {
    const data = await overview(range);
    const k = data.kpis;
    $('#kpis').innerHTML = [
      stat('Revenue', k.revenue, usd),
      stat('Orders', k.orders, (n) => n.toLocaleString()),
      stat('Average order', k.average, money),
      stat('Conversion', k.conversion, percent, { points: true }),
    ].join('');
    $('#compared').textContent = data.previous
      ? `The last ${PERIOD[range]}, against the ${PERIOD[range]} before.`
      : `The last ${PERIOD[range]}: the store's first, so there's nothing before to compare.`;

    stopChart?.();
    stopChart = lineChart($('#revenue'), {
      labels: data.labels,
      series: [
        { name: `Last ${PERIOD[range]}`, values: data.revenue, tone: 1 },
        ...(data.previous ? [{ name: 'Period before', values: data.previous, tone: 'muted' }] : []),
      ],
      format: money,
      axis: usd,
      caption: `Revenue, the last ${PERIOD[range]} against the period before`,
    });

    barList($('#best'), {
      rows: data.best.map((b) => ({
        label: b.product.name,
        note: `${b.units} sold`,
        value: b.revenue,
      })),
      format: usd,
      caption: 'Best sellers by revenue',
    });

    $('#recent').innerHTML = data.recent
      .map(
        (o) => `<li>
          <span class="gm-avatar" data-size="sm" aria-hidden="true">${initials(o.customer.name)}</span>
          <span>${escape(o.customer.name)}<small>#${o.number} · <span class="gm-badge"${STATUS[o.status].tone ? ` data-tone="${STATUS[o.status].tone}"` : ''}>${STATUS[o.status].label}</span></small></span>
          <span>${money(o.total)}</span>
        </li>`,
      )
      .join('');

    $('#low').innerHTML = data.low.length
      ? data.low
          .map(
            (l) => `<li>
          <span>${escape(l.product.name)}<small>${l.finish}</small></span>
          <span class="gm-badge" data-tone="${l.count ? 'warning' : 'danger'}">${l.count ? `${l.count} left` : 'Sold out'}</span>
        </li>`,
          )
          .join('')
      : '<li><span>Every finish is well stocked.</span></li>';
  } catch (failure) {
    $('#error-message').textContent = failure.message;
    $('#error').hidden = false;
  } finally {
    dash.removeAttribute('aria-busy');
  }
}

$('#range').addEventListener('gm-change', (e) => {
  range = e.detail.value;
  load();
});
$('[data-action="retry"]').addEventListener('click', load);

shellSearch($('.app-actions gm-search'));
load();
