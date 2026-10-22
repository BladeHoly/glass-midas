import '@glass-midas/components';
import { shellSearch } from '../shared/app.js';
import { barList, compact, stackedColumns } from '../shared/charts.js';
import { analytics } from '../shared/store.js';

// Analytics: revenue by collection over time (stacked, the three collections in the brand's three
// chart colors), the path from a visit to an order, and where the revenue comes from.

const $ = (s) => document.querySelector(s);
const dash = $('#dash');
const PERIOD = { 7: '7 days', 30: '30 days', 90: '90 days', 365: '12 months' };
let range = '90';
let stopChart;

const usd = (n) => `$${compact(n)}`;
const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
const share = (part, whole) => `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%`;

async function load() {
  dash.setAttribute('aria-busy', 'true');
  $('#error').hidden = true;
  try {
    const data = await analytics(range);
    $('#compared').textContent = `The last ${PERIOD[range]}.`;
    stopChart?.();
    stopChart = stackedColumns($('#collections'), {
      labels: data.labels,
      series: data.collections.map((c, i) => ({ name: c.name, values: c.values, tone: i + 1 })),
      format: money,
      axis: usd,
      caption: `Revenue by collection, the last ${PERIOD[range]}`,
    });
    // Each step as a share of the one before: where people leave is the story.
    const f = data.funnel;
    barList($('#funnel'), {
      rows: f.map((step, i) => ({
        label: step.step,
        note: i ? `${share(step.count, f[i - 1].count)} of previous` : 'all sessions',
        value: step.count,
      })),
      format: (n) => n.toLocaleString(),
      caption: 'From visit to order',
    });
    $('#funnel-rate').textContent = `${share(f.at(-1).count, f[0].count)} of visits order`;
    const total = data.channels.reduce((n, c) => n + c.revenue, 0);
    barList($('#channels'), {
      rows: data.channels.map((c) => ({
        label: c.channel,
        note: `${share(c.revenue, total)} · ${c.orders} orders`,
        value: c.revenue,
      })),
      format: usd,
      caption: 'Revenue by channel',
    });
    barList($('#cities'), {
      rows: data.cities
        .slice(0, 5)
        .map((c) => ({ label: c.city, note: `${c.orders} orders`, value: c.revenue })),
      format: usd,
      caption: 'Revenue by city, top five',
    });
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
