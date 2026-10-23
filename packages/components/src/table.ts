import { Base, define } from './base.js';

/** Detail of `gm-sort` on `gm-table`: the column and the direction it's now sorted in. */
export interface TableSortDetail {
  key: string;
  direction: 'ascending' | 'descending';
}

/** Detail of `gm-filter` on `gm-table`: the column filtered, its chosen values, and every filter on. */
export interface TableFilterDetail {
  key: string;
  values: string[];
  filters: Record<string, string[]>;
}

/** Detail of `gm-selection` on `gm-table`: the values of the selected rows' checkboxes. */
export interface TableSelectionDetail {
  values: string[];
}

const numeric = (s: string) => {
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return s.trim() !== '' && /\d/.test(s) && !Number.isNaN(n) ? n : null;
};

/**
 * `<gm-table><table>…</table></gm-table>`: a native table that sorts, selects rows and fits a
 * phone. It isn't glass: tables are content, so they sit on a plain fill.
 *
 * - **Sort:** a header with `data-sort="key"` becomes a button. Clicking it fires a cancelable
 *   `gm-sort`; unless it's canceled, the rows sort by that column's text, or a cell's
 *   `data-value`, as numbers when they are numbers. `aria-sort` marks the sorted header.
 * - **Select:** row checkboxes with `data-select` (and a `value`) and a header checkbox with
 *   `data-select-all`. The header one checks all, and shows a dash when only some are checked.
 *   Selected rows get `aria-selected`, and every change fires `gm-selection`.
 * - **Filter:** a header with `data-filter="key"` gets a button that opens a list of the column's
 *   values (a cell's `data-value`, else its text), each with how many rows have it, to check one
 *   or several. Each change fires a cancelable `gm-filter`; unless it's canceled, rows that don't
 *   match are hidden. For data that lives on a server, list the choices in
 *   `data-filter-options="paid:Paid,pending:Pending"` (labels may hold commas), cancel the event
 *   and fetch.
 * - **Density:** `density="compact"` (40px rows), `"regular"` (48px) or `"relaxed"` (56px).
 * - **Phones:** with `stack`, each row becomes a card under 40rem, each cell labeled with its
 *   column's header.
 */
export class GmTable extends Base {
  #table: HTMLTableElement | null = null;
  #observer: MutationObserver | undefined;
  #last = '[]';
  #filters = new Map<string, string[]>();
  #local = true;
  #menu: HTMLElement | undefined;
  #opener: HTMLButtonElement | undefined;

  connectedCallback() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.isConnected && this.#build(), {
        once: true,
      });
    } else this.#build();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#table?.removeEventListener('change', this.#onChange);
    this.#table = null;
  }

  #build() {
    const table = this.querySelector<HTMLTableElement>(':scope > table');
    if (!table || this.#table) return;
    this.#table = table;
    for (const th of table.querySelectorAll<HTMLElement>('thead th[data-sort]')) {
      if (th.querySelector(':scope > .gm-table-sort')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gm-table-sort';
      button.append(...th.childNodes);
      th.append(button);
      button.addEventListener('click', () => {
        const now = th.getAttribute('aria-sort');
        this.sort(th.dataset.sort!, now === 'ascending' ? 'descending' : 'ascending');
      });
    }
    for (const th of table.querySelectorAll<HTMLElement>('thead th[data-filter]')) {
      if (th.querySelector(':scope > .gm-table-filter')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gm-table-filter';
      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', `Filter by ${th.textContent?.trim()}`);
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16l-6 7v5l-4 2v-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span></span>';
      button.addEventListener('click', () => this.#open(th.dataset.filter!, button));
      th.append(button);
    }
    table.addEventListener('change', this.#onChange);
    // Rows come and go (filters, pages, a framework): label them and keep the selection true.
    this.#observer = new MutationObserver(() => this.sync());
    for (const body of this.#bodies()) this.#observer.observe(body, { childList: true });
    this.sync();
  }

  /** Sorts by a column, firing `gm-sort`; a listener that cancels it sorts its own way. */
  sort(key: string, direction: TableSortDetail['direction'] = 'ascending') {
    const table = this.#table;
    if (!table) return;
    const headers = [...table.querySelectorAll<HTMLTableCellElement>('thead th')];
    const th = headers.find((h) => h.dataset.sort === key);
    if (!th) return;
    for (const h of headers) h.removeAttribute('aria-sort');
    th.setAttribute('aria-sort', direction);
    const go = this.dispatchEvent(
      new CustomEvent<TableSortDetail>('gm-sort', {
        detail: { key, direction },
        cancelable: true,
        bubbles: true,
      }),
    );
    if (!go) return;
    const column = [...th.parentElement!.children].indexOf(th);
    const sign = direction === 'ascending' ? 1 : -1;
    const value = (row: Element) => {
      const cell = row.children[column] as HTMLElement | undefined;
      return cell?.dataset.value ?? cell?.textContent?.trim() ?? '';
    };
    for (const body of this.#bodies()) {
      const rows = [...body.children];
      rows.sort((a, b) => {
        const [x, y] = [value(a), value(b)];
        const [nx, ny] = [numeric(x), numeric(y)];
        return sign * (nx !== null && ny !== null ? nx - ny : x.localeCompare(y));
      });
      this.#observer?.disconnect();
      body.append(...rows);
      this.#observer?.observe(body, { childList: true });
    }
  }

  /** The filters that are on: each column's chosen values. */
  get filters(): Record<string, string[]> {
    return Object.fromEntries(this.#filters);
  }

  /**
   * Shows only the rows whose column `key` has one of `values` (none: no filter on it), firing
   * `gm-filter`; a listener that cancels it filters its own way.
   */
  filter(key: string, values: string[]) {
    if (values.length) this.#filters.set(key, [...values]);
    else this.#filters.delete(key);
    for (const button of this.querySelectorAll<HTMLElement>('.gm-table-filter')) {
      const th = button.closest<HTMLElement>('th');
      const n = this.#filters.get(th?.dataset.filter ?? '')?.length ?? 0;
      const name = th?.firstChild?.textContent?.trim() ?? '';
      button.toggleAttribute('data-active', n > 0);
      button.querySelector('span')!.textContent = n ? String(n) : '';
      button.setAttribute('aria-label', n ? `Filter by ${name}, ${n} chosen` : `Filter by ${name}`);
    }
    this.#local = this.dispatchEvent(
      new CustomEvent<TableFilterDetail>('gm-filter', {
        detail: { key, values: [...values], filters: this.filters },
        cancelable: true,
        bubbles: true,
      }),
    );
    this.#hide();
  }

  /** Clears every filter. */
  clearFilters() {
    for (const key of [...this.#filters.keys()]) this.filter(key, []);
  }

  #column(key: string) {
    const headers = [...(this.#table?.querySelectorAll<HTMLElement>('thead th') ?? [])];
    return headers.findIndex((h) => h.dataset.filter === key);
  }

  #cellValue(row: Element, column: number) {
    const cell = row.children[column] as HTMLElement | undefined;
    return cell?.dataset.value ?? cell?.textContent?.trim() ?? '';
  }

  /** Hides the rows the filters leave out, when filtering here rather than on a server. */
  #hide() {
    const rules = [...this.#filters].map(([key, values]) => [this.#column(key), values] as const);
    // Only rows the filter hid are shown again: others may be hidden by the page, for its own
    // reasons (a folded group, a filter it runs itself).
    for (const body of this.#bodies())
      for (const row of [...body.children] as HTMLElement[]) {
        const out =
          this.#local &&
          rules.some(([c, values]) => c >= 0 && !values.includes(this.#cellValue(row, c)));
        if (out) {
          row.hidden = true;
          row.dataset.gmFiltered = '';
        } else if (row.hasAttribute('data-gm-filtered')) {
          row.hidden = false;
          delete row.dataset.gmFiltered;
        }
      }
  }

  /** Opens a column's list of values under its button, in the top layer. */
  #open(key: string, button: HTMLButtonElement) {
    const th = button.closest<HTMLElement>('th')!;
    const column = this.#column(key);
    let options: [string, string, number | null][];
    if (th.dataset.filterOptions) {
      // Split on the commas that start a new "value:", so a label can hold one ("$1,000").
      options = th.dataset.filterOptions.split(/,(?=[^,:]+:)/).map((o) => {
        const [value = '', label] = o.split(':');
        return [value.trim(), (label ?? value).trim(), null];
      });
    } else {
      const counts = new Map<string, [string, number]>();
      for (const body of this.#bodies())
        for (const row of body.children) {
          const value = this.#cellValue(row, column);
          const label = row.children[column]?.textContent?.trim() || value;
          counts.set(value, [label, (counts.get(value)?.[1] ?? 0) + 1]);
        }
      options = [...counts].map(([value, [label, n]]) => [value, label, n]);
    }
    const chosen = this.#filters.get(key) ?? [];
    const attr = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const menu = (this.#menu ??= this.#makeMenu());
    menu.dataset.key = key;
    menu.setAttribute('aria-label', `Filter by ${th.firstChild?.textContent?.trim() ?? key}`);
    menu.querySelector('.gm-table-filter-list')!.innerHTML = options
      .map(
        ([value, label, n]) =>
          `<label class="gm-check-label"><input type="checkbox" class="gm-check" value="${attr(value)}"${chosen.includes(value) ? ' checked' : ''}><span>${attr(label)}</span>${n === null ? '' : `<small>${n}</small>`}</label>`,
      )
      .join('');
    this.#opener = button;
    const box = button.getBoundingClientRect();
    menu.style.top = `${box.bottom + 6}px`;
    menu.style.left = `${Math.max(8, Math.min(box.left, innerWidth - 256))}px`;
    menu.showPopover?.();
    button.setAttribute('aria-expanded', 'true');
    menu.querySelector<HTMLElement>('input')?.focus();
  }

  #makeMenu() {
    const menu = document.createElement('div');
    menu.className = 'gm-table-filter-menu';
    menu.setAttribute('popover', '');
    menu.setAttribute('role', 'dialog');
    menu.innerHTML =
      '<div class="gm-table-filter-list"></div><button type="button" class="gm-chip gm-chip-plain">Clear</button>';
    menu.addEventListener('change', () => {
      const values = [...menu.querySelectorAll<HTMLInputElement>('input:checked')].map(
        (i) => i.value,
      );
      this.filter(menu.dataset.key!, values);
    });
    menu.querySelector('button')!.addEventListener('click', () => {
      for (const box of menu.querySelectorAll<HTMLInputElement>('input')) box.checked = false;
      this.filter(menu.dataset.key!, []);
    });
    // Closing gives focus back to the button that opened it.
    menu.addEventListener('toggle', (e) => {
      if ((e as Event & { newState?: string }).newState !== 'closed') return;
      this.#opener?.setAttribute('aria-expanded', 'false');
      if (
        !document.activeElement ||
        document.activeElement === document.body ||
        menu.contains(document.activeElement)
      )
        this.#opener?.focus();
    });
    this.append(menu);
    return menu;
  }

  /** The values of the selected rows. */
  get selected(): string[] {
    return this.#boxes()
      .filter((b) => b.checked)
      .map((b) => b.value);
  }

  /** Unchecks every row. */
  clearSelection() {
    for (const box of this.#boxes()) box.checked = false;
    this.#selectionChanged();
  }

  /** Labels new rows and redraws the selection; runs on its own when rows change. */
  sync = () => {
    const table = this.#table;
    if (!table) return;
    const head = table.querySelector(':scope > thead > tr');
    // A header's own words: not the count on its filter button.
    const labels = [...(head?.children ?? [])].map((c) => c.firstChild?.textContent?.trim() ?? '');
    for (const body of this.#bodies()) {
      for (const row of body.children) {
        [...row.children].forEach((cell, i) => {
          if (labels[i] && !cell.hasAttribute('data-label'))
            cell.setAttribute('data-label', labels[i]);
        });
      }
    }
    // New rows meet the filters that are on.
    if (this.#filters.size) this.#hide();
    // Rows that left took their selection with them: say so.
    if (JSON.stringify(this.selected) !== this.#last) this.#selectionChanged();
    else this.#paint();
  };

  #bodies() {
    return [...(this.#table?.querySelectorAll<HTMLElement>(':scope > tbody') ?? [])];
  }

  #boxes() {
    return [...(this.#table?.querySelectorAll<HTMLInputElement>('tbody input[data-select]') ?? [])];
  }

  #onChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.matches('[data-select-all]')) {
      for (const box of this.#boxes()) if (!box.disabled) box.checked = target.checked;
    } else if (!target.matches('[data-select]')) return;
    this.#selectionChanged();
  };

  #selectionChanged() {
    this.#paint();
    this.#last = JSON.stringify(this.selected);
    this.dispatchEvent(
      new CustomEvent<TableSelectionDetail>('gm-selection', {
        detail: { values: this.selected },
        bubbles: true,
      }),
    );
  }

  #paint() {
    const boxes = this.#boxes();
    const checked = boxes.filter((b) => b.checked).length;
    for (const box of boxes) {
      const row = box.closest('tr');
      if (box.checked) row?.setAttribute('aria-selected', 'true');
      else row?.removeAttribute('aria-selected');
    }
    const all = this.#table?.querySelector<HTMLInputElement>('[data-select-all]');
    if (all) {
      all.checked = boxes.length > 0 && checked === boxes.length;
      all.indeterminate = checked > 0 && checked < boxes.length;
    }
  }
}

define('gm-table', GmTable);
