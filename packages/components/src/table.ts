import { Base, define } from './base.js';

/** Detail of `gm-sort` on `gm-table`: the column and the direction it's now sorted in. */
export interface TableSortDetail {
  key: string;
  direction: 'ascending' | 'descending';
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
 * - **Density:** `density="compact"` (40px rows), `"regular"` (48px) or `"relaxed"` (56px).
 * - **Phones:** with `stack`, each row becomes a card under 40rem, each cell labeled with its
 *   column's header.
 */
export class GmTable extends Base {
  #table: HTMLTableElement | null = null;
  #observer: MutationObserver | undefined;
  #last = '[]';

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
    const labels = [...(head?.children ?? [])].map((c) => c.textContent?.trim() ?? '');
    for (const body of this.#bodies()) {
      for (const row of body.children) {
        [...row.children].forEach((cell, i) => {
          if (labels[i] && !cell.hasAttribute('data-label'))
            cell.setAttribute('data-label', labels[i]);
        });
      }
    }
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
