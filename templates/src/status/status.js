import '@glass-midas/components';
import { shellSearch } from '../shared/app.js';
import { lineChart } from '../shared/charts.js';
import { status } from '../shared/store.js';

// Status: a sentence that says how things are, a tile per service (its state in words and color,
// and its uptime), one service's response time against its budget, and the incidents.

const $ = (s) => document.querySelector(s);
const dash = $('#dash');
const STATE = {
  operational: { label: 'Operational', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  down: { label: 'Down', tone: 'danger' },
};
const INCIDENT = {
  investigating: { label: 'Investigating', tone: 'danger' },
  monitoring: { label: 'Monitoring', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
};
let data;
let stopChart;

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const when = (iso) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso));
const hours = Array.from({ length: 24 }, (_, h) => `${String((h + 1) % 24).padStart(2, '0')}:00`);

function chart(id) {
  const s = data.services.find((x) => x.id === id);
  stopChart?.();
  stopChart = lineChart($('#latency'), {
    labels: hours,
    series: [{ name: s.name, values: s.latency, tone: 1 }],
    format: (n) => `${n} ms`,
    axis: (n) => `${n}`,
    threshold: { value: s.budget, label: `Budget, ${s.budget} ms` },
    caption: `${s.name} response time, the last 24 hours, against its ${s.budget} ms budget`,
  });
}

async function load() {
  dash.setAttribute('aria-busy', 'true');
  $('#error').hidden = true;
  try {
    data = await status();
    const trouble = data.services.filter((s) => s.state !== 'operational');
    const summary = $('#summary');
    summary.dataset.tone = trouble.length ? 'warning' : 'success';
    summary.textContent = trouble.length
      ? `${trouble.map((s) => s.name).join(' and ')} ${trouble.length === 1 ? 'is' : 'are'} ${STATE[trouble[0].state].label.toLowerCase()}. Everything else is working.`
      : 'Every service is working.';
    $('#services').innerHTML = data.services
      .map((s) => {
        const state = STATE[s.state];
        const tone = s.uptime >= 99.9 ? 'success' : s.uptime >= 99.5 ? 'warning' : 'danger';
        return `<article class="status-service">
          <header><h2>${escape(s.name)}</h2><span class="gm-badge" data-tone="${state.tone}">${state.label}</span></header>
          <p><strong>${s.uptime.toFixed(2)}%</strong> up, the last 30 days</p>
          <span class="gm-meter" data-tone="${tone}" role="meter" aria-label="${escape(s.name)} uptime" aria-valuemin="99" aria-valuemax="100" aria-valuenow="${s.uptime}" style="--value: ${(s.uptime - 99).toFixed(3)}"></span>
        </article>`;
      })
      .join('');
    chart($('#service').value);
    $('#incidents').innerHTML = data.incidents
      .map((i) => {
        const st = INCIDENT[i.state];
        const service = data.services.find((s) => s.id === i.service);
        return `<li class="status-incident">
          <header>
            <h3>${escape(i.title)}</h3>
            <span class="gm-badge" data-tone="${st.tone}">${st.label}</span>
          </header>
          <p class="status-meta">${escape(service.name)} · ${i.severity === 'major' ? 'Major' : 'Minor'} · since ${when(i.started)}</p>
          <ol>${i.updates.map((u) => `<li><time datetime="${u.at}">${when(u.at)}</time> ${escape(u.text)}</li>`).join('')}</ol>
        </li>`;
      })
      .join('');
  } catch (failure) {
    $('#error-message').textContent = failure.message;
    $('#error').hidden = false;
  } finally {
    dash.removeAttribute('aria-busy');
  }
}

$('#service').addEventListener('gm-change', (e) => data && chart(e.detail.value));
$('[data-action="retry"]').addEventListener('click', load);

shellSearch($('.app-actions gm-search'));
load();
