// Ondine's charts: small, hand-made SVG, no library. Thin marks, one axis, recessive grid, a
// hover layer with a crosshair and a tooltip (the keyboard too: focus the chart, then the arrow
// keys), a legend for two or more series, and a table view of every chart. Colors come from
// charts.css, by role (--chart-1…3, --chart-muted), checked for color blindness in both themes.

const NS = 'http://www.w3.org/2000/svg';

/** 1,284 · 12.9K · 4.2M */
export const compact = (n) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Round axis steps: 1, 2, 2.5 or 5 times a power of ten. */
function ticks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.append(node);
  return node;
}

function html(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.append(node);
  return node;
}

/** The color of a series by its role: 1, 2, 3, or 'muted' for context. */
const color = (tone) => (tone === 'muted' ? 'var(--chart-muted)' : `var(--chart-${tone ?? 1})`);

/** The shared frame: legend, plot, tooltip, and the table behind a toggle. */
function frame(root, { series, caption, legendShape }) {
  root.replaceChildren();
  root.classList.add('chart');
  const head = html('div', 'chart-head', root);
  if (series.length > 1) {
    const legend = html('ul', 'chart-legend', head);
    for (const s of series) {
      const item = html('li', '', legend);
      const key = html('span', `chart-key chart-key-${legendShape}`, item);
      key.style.setProperty('--key', color(s.tone));
      item.append(document.createTextNode(s.name));
    }
  }
  const toggle = html('button', 'gm-chip gm-chip-plain chart-toggle', head, 'Table');
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  const plot = html('div', 'chart-plot', root);
  const tip = html('div', 'chart-tip', plot);
  tip.hidden = true;
  tip.setAttribute('role', 'status');
  const table = html('table', 'chart-table', root);
  table.hidden = true;
  if (caption) html('caption', 'on-sr-only', table, caption);
  toggle.addEventListener('click', () => {
    const show = table.hidden;
    table.hidden = !show;
    plot.hidden = show;
    toggle.setAttribute('aria-pressed', String(show));
    toggle.textContent = show ? 'Chart' : 'Table';
  });
  return { plot, tip, table };
}

/** The table twin: one row per label, a column per series. */
function fillTable(table, labels, series, format) {
  const head = html('thead', '', table);
  const row = html('tr', '', head);
  html('th', '', row, '');
  for (const s of series) html('th', 'gm-num', row, s.name);
  const body = html('tbody', '', table);
  labels.forEach((label, i) => {
    const tr = html('tr', '', body);
    html('th', '', tr, label);
    for (const s of series)
      html('td', 'gm-num', tr, s.values[i] == null ? '—' : format(s.values[i]));
  });
}

/** Tooltip rows: the value first and strong, the series after, keyed by a short line. */
function showTip(tip, title, rows, x, plotWidth) {
  tip.replaceChildren();
  html('p', 'chart-tip-title', tip, title);
  for (const r of rows) {
    const line = html('p', 'chart-tip-row', tip);
    const key = html('span', 'chart-key chart-key-line', line);
    key.style.setProperty('--key', color(r.tone));
    html('strong', '', line, r.value);
    html('span', '', line, r.name);
  }
  tip.hidden = false;
  const w = tip.offsetWidth;
  tip.style.left = `${Math.min(Math.max(x - w / 2, 0), plotWidth - w)}px`;
}

/** Calls draw now and whenever the element's width changes; returns the function that stops. */
function responsive(root, draw) {
  let width = 0;
  const run = () => {
    const w = Math.round(root.clientWidth);
    if (w && w !== width) {
      width = w;
      draw(w);
    }
  };
  const observer = new ResizeObserver(run);
  observer.observe(root);
  run();
  return () => observer.disconnect();
}

/**
 * A line chart over time. The first series is the story (with a wash under it); a series with
 * `tone: 'muted'` is context, like the period before. Returns the function that stops it.
 *
 * @param {HTMLElement} root
 * @param {{ labels: string[], series: { name: string, values: (number | null)[], tone?: number | 'muted' }[],
 *   format: (n: number) => string, axis?: (n: number) => string, caption: string, height?: number,
 *   threshold?: { value: number, label: string } }} options
 */
export function lineChart(
  root,
  { labels, series, format, axis = compact, caption, height = 240, threshold },
) {
  const { plot, tip, table } = frame(root, { series, caption, legendShape: 'line' });
  fillTable(table, labels, series, format);
  let index = -1;
  return responsive(plot, (width) => {
    plot.querySelector('svg')?.remove();
    const pad = { top: 12, right: 16, bottom: 26, left: 44 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const max = Math.max(
      ...series.flatMap((s) => s.values.filter((v) => v != null)),
      threshold?.value ?? 0,
    );
    const yt = ticks(max);
    const top = yt.at(-1);
    const x = (i) => pad.left + (labels.length < 2 ? w / 2 : (i / (labels.length - 1)) * w);
    const y = (v) => pad.top + h - (v / top) * h;

    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      class: 'chart-svg',
      role: 'img',
      tabindex: 0,
    });
    svg.setAttribute(
      'aria-label',
      `${caption}. Use the arrow keys to read each point, or the Table button.`,
    );
    plot.prepend(svg);
    for (const t of yt) {
      el(
        'line',
        { x1: pad.left, x2: width - pad.right, y1: y(t), y2: y(t), class: 'chart-grid' },
        svg,
      );
      el(
        'text',
        { x: pad.left - 8, y: y(t) + 4, class: 'chart-axis', 'text-anchor': 'end' },
        svg,
      ).textContent = axis(t);
    }
    // A few dates along the bottom: the first, the last, and evenly between.
    const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(w / 90))));
    labels.forEach((label, i) => {
      if (i % every && i !== labels.length - 1) return;
      if (i !== labels.length - 1 && labels.length - 1 - i < every / 2) return;
      const anchor = i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle';
      el(
        'text',
        { x: x(i), y: height - 6, class: 'chart-axis', 'text-anchor': anchor },
        svg,
      ).textContent = label;
    });
    if (threshold) {
      el(
        'line',
        {
          x1: pad.left,
          x2: width - pad.right,
          y1: y(threshold.value),
          y2: y(threshold.value),
          class: 'chart-threshold',
        },
        svg,
      );
      el(
        'text',
        {
          x: width - pad.right,
          y: y(threshold.value) - 6,
          class: 'chart-axis',
          'text-anchor': 'end',
        },
        svg,
      ).textContent = threshold.label;
    }
    const path = (values) =>
      values.reduce(
        (d, v, i) =>
          v == null
            ? d
            : `${d}${d && values[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`,
        '',
      );
    // Context first, so the story draws over it.
    const ordered = [...series].sort(
      (a, b) => (a.tone === 'muted' ? -1 : 0) - (b.tone === 'muted' ? -1 : 0),
    );
    const story = series.find((s) => s.tone !== 'muted') ?? series[0];
    const last = story.values.reduce((l, v, i) => (v == null ? l : i), -1);
    el(
      'path',
      {
        d: `${path(story.values)}L${x(last)} ${y(0)}L${x(0)} ${y(0)}Z`,
        fill: color(story.tone),
        class: 'chart-area',
      },
      svg,
    );
    for (const s of ordered)
      el('path', { d: path(s.values), stroke: color(s.tone), class: 'chart-line' }, svg);
    el(
      'circle',
      { cx: x(last), cy: y(story.values[last]), r: 4, fill: color(story.tone), class: 'chart-dot' },
      svg,
    );

    // The hover layer: a crosshair that snaps to the nearest point, and dots on every series.
    const cross = el(
      'line',
      { y1: pad.top, y2: pad.top + h, class: 'chart-cross', visibility: 'hidden' },
      svg,
    );
    const dots = series.map((s) =>
      el('circle', { r: 4, fill: color(s.tone), class: 'chart-dot', visibility: 'hidden' }, svg),
    );
    const show = (i) => {
      index = Math.max(0, Math.min(labels.length - 1, i));
      cross.setAttribute('x1', x(index));
      cross.setAttribute('x2', x(index));
      cross.setAttribute('visibility', 'visible');
      series.forEach((s, k) => {
        const v = s.values[index];
        dots[k].setAttribute('visibility', v == null ? 'hidden' : 'visible');
        if (v != null) {
          dots[k].setAttribute('cx', x(index));
          dots[k].setAttribute('cy', y(v));
        }
      });
      const rows = series
        .filter((s) => s.values[index] != null)
        .map((s) => ({ name: s.name, value: format(s.values[index]), tone: s.tone }));
      showTip(tip, labels[index], rows, x(index), width);
    };
    const hide = () => {
      cross.setAttribute('visibility', 'hidden');
      for (const d of dots) d.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    };
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * width;
      show(Math.round(((px - pad.left) / w) * (labels.length - 1)));
    });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (e) => {
      const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
      if (e.key === 'Escape') return hide();
      if (!(e.key in moves)) return;
      e.preventDefault();
      const step = moves[e.key];
      show(
        Number.isFinite(step)
          ? index < 0
            ? last
            : index + step
          : step < 0
            ? 0
            : labels.length - 1,
      );
    });
  });
}

/**
 * Stacked columns: each label a column, each series a segment, a 2px gap of surface between them.
 *
 * @param {HTMLElement} root
 * @param {{ labels: string[], series: { name: string, values: number[], tone: number }[],
 *   format: (n: number) => string, axis?: (n: number) => string, caption: string, height?: number }} options
 */
export function stackedColumns(
  root,
  { labels, series, format, axis = compact, caption, height = 240 },
) {
  const { plot, tip, table } = frame(root, { series, caption, legendShape: 'box' });
  fillTable(
    table,
    labels,
    [
      ...series,
      { name: 'Total', values: labels.map((_, i) => series.reduce((t, s) => t + s.values[i], 0)) },
    ],
    format,
  );
  return responsive(plot, (width) => {
    plot.querySelector('svg')?.remove();
    const pad = { top: 12, right: 8, bottom: 26, left: 44 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const totals = labels.map((_, i) => series.reduce((t, s) => t + s.values[i], 0));
    const yt = ticks(Math.max(...totals));
    const top = yt.at(-1);
    const band = w / labels.length;
    const bar = Math.min(24, band * 0.6);
    const y = (v) => pad.top + h - (v / top) * h;

    const svg = el(
      'svg',
      { viewBox: `0 0 ${width} ${height}`, width, height, class: 'chart-svg', role: 'group' },
      null,
    );
    svg.setAttribute(
      'aria-label',
      `${caption}. Each column is focusable; the Table button lists every value.`,
    );
    plot.prepend(svg);
    for (const t of yt) {
      el(
        'line',
        { x1: pad.left, x2: width - pad.right, y1: y(t), y2: y(t), class: 'chart-grid' },
        svg,
      );
      el(
        'text',
        { x: pad.left - 8, y: y(t) + 4, class: 'chart-axis', 'text-anchor': 'end' },
        svg,
      ).textContent = axis(t);
    }
    const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(w / 48))));
    labels.forEach((label, i) => {
      const cx = pad.left + band * i + band / 2;
      if (i % every === 0)
        el(
          'text',
          { x: cx, y: height - 6, class: 'chart-axis', 'text-anchor': 'middle' },
          svg,
        ).textContent = label;
      const column = el('g', { class: 'chart-column', tabindex: 0, role: 'img' }, svg);
      column.setAttribute(
        'aria-label',
        `${label}: ${series.map((s) => `${s.name} ${format(s.values[i])}`).join(', ')}`,
      );
      // The hit target is the whole band, not just the painted segments.
      el(
        'rect',
        { x: pad.left + band * i, y: pad.top, width: band, height: h, fill: 'transparent' },
        column,
      );
      let base = 0;
      series.forEach((s, k) => {
        const v = s.values[i];
        if (!v) return;
        const y0 = y(base);
        const y1 = y(base + v);
        const topmost = series.slice(k + 1).every((n) => !n.values[i]);
        // A 2px gap of surface under each segment but the first; the top one gets round corners.
        const gap = base ? 2 : 0;
        const hgt = Math.max(0, y0 - y1 - gap);
        const r = topmost ? Math.min(4, hgt / 2) : 0;
        const x0 = cx - bar / 2;
        const d = `M${x0} ${y0 - gap}V${y1 + r}${r ? `a${r} ${r} 0 0 1 ${r} -${r}` : ''}H${x0 + bar - r}${r ? `a${r} ${r} 0 0 1 ${r} ${r}` : ''}V${y0 - gap}Z`;
        el('path', { d, fill: color(s.tone), class: 'chart-segment' }, column);
        base += v;
      });
      const show = () =>
        showTip(
          tip,
          label,
          [...series]
            .reverse()
            .map((s) => ({ name: s.name, value: format(s.values[i]), tone: s.tone })),
          cx,
          width,
        );
      column.addEventListener('pointerenter', show);
      column.addEventListener('focus', show);
      column.addEventListener('pointerleave', () => (tip.hidden = true));
      column.addEventListener('blur', () => (tip.hidden = true));
    });
  });
}

/**
 * Horizontal bars, ranked: the label, a bar to scale, and the value at its tip. HTML, so every
 * value is already text; no tooltip needed.
 *
 * @param {HTMLElement} root
 * @param {{ rows: { label: string, value: number, note?: string }[], format: (n: number) => string, caption: string }} options
 */
export function barList(root, { rows, format, caption }) {
  root.replaceChildren();
  const list = html('ol', 'chart-bars', root);
  list.setAttribute('aria-label', caption);
  const max = Math.max(...rows.map((r) => r.value), 1);
  for (const r of rows) {
    const item = html('li', '', list);
    const label = html('span', 'chart-bars-label', item, r.label);
    if (r.note) html('small', '', label, r.note);
    const track = html('span', 'chart-bars-track', item);
    track.setAttribute('aria-hidden', 'true');
    html('span', 'chart-bars-bar', track).style.width = `${(r.value / max) * 100}%`;
    html('span', 'chart-bars-value', item, format(r.value));
  }
}

/** A sparkline as SVG markup: the shape of recent values, the last one marked. */
export function sparkline(values) {
  const w = 120;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i) => (i / (values.length - 1)) * (w - 6) + 3;
  const y = (v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const last = values.length - 1;
  return `<svg class="gm-stat-trend" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--chart-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="M${x(last)} ${y(values[last])}h0" stroke="var(--chart-1)" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}
