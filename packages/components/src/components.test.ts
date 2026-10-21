import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  glassOptions,
  toast,
  type GmDialog,
  type GmMenu,
  type GmSearch,
  type GmSegmented,
  type GmSelect,
  type GmTable,
  type GmTabs,
  type GmTip,
  type SearchResult,
} from './index.js';

const mount = <T extends HTMLElement>(html: string) => {
  // Through a template, as a browser's innerHTML does: the tree is whole before it connects.
  const template = document.createElement('template');
  template.innerHTML = html;
  document.body.replaceChildren(template.content);
  return document.body.firstElementChild as T;
};

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('glassOptions', () => {
  it('reads numbers, blur and caustics over the defaults', () => {
    const el = document.createElement('div');
    el.setAttribute('radius', '12');
    el.setAttribute('specular-saturation', '2');
    el.setAttribute('blur', '4');
    el.setAttribute('caustics', 'false');
    el.setAttribute('bezel', 'wide');
    expect(glassOptions(el, { radius: 24, bezel: 10 })).toEqual({
      radius: 12,
      bezel: 10,
      specularSaturation: 2,
      blur: '4px',
      caustics: false,
    });
  });

  it('never steps a lite surface up from what the browser supports', () => {
    const el = document.createElement('div');
    // happy-dom isn't Chromium, so detection says blur, and lite keeps it.
    expect(glassOptions(el, {}, true).tier).toBe('blur');
    el.setAttribute('variant', 'full');
    expect(glassOptions(el, {}, true).tier).toBeUndefined();
    el.setAttribute('tier', 'blur');
    expect(glassOptions(el, {}, true).tier).toBe('blur');
  });
});

describe('materials', () => {
  it('frosts heavily with frost, unless blur is set', () => {
    const el = document.createElement('div');
    el.setAttribute('material', 'frost');
    expect(glassOptions(el).blur).toBe('var(--gm-blur-lg, 28px)');
    el.setAttribute('blur', '12');
    expect(glassOptions(el).blur).toBe('12px');
  });

  it('updates a live surface when the material changes', () => {
    const el = mount('<gm-surface tier="blur"></gm-surface>');
    el.setAttribute('material', 'frost');
    expect(el.style.getPropertyValue('backdrop-filter')).toContain('--gm-blur-lg');
  });
});

describe('gm-button', () => {
  it('is a glass pill around its control', () => {
    const el = mount('<gm-button tier="blur"><button>Go</button></gm-button>');
    expect(el.dataset.glassTier).toBe('blur');
    expect(el.querySelector('button')!.textContent).toBe('Go');
  });
});

describe('gm-surface', () => {
  it('becomes glass while connected', () => {
    const el = mount('<gm-surface tier="blur">Hi</gm-surface>');
    expect(el.dataset.glassTier).toBe('blur');
    el.remove();
    expect(el.dataset.glassTier).toBeUndefined();
  });

  it('switches tier when the attribute changes', () => {
    const el = mount('<gm-surface tier="blur"></gm-surface>');
    el.setAttribute('tier', 'solid');
    expect(el.dataset.glassTier).toBe('solid');
  });
});

describe('gm-callout', () => {
  it('defaults to a note and renders its heading once', () => {
    const el = mount('<gm-callout heading="Heads up"><p>Text</p></gm-callout>');
    expect(el.getAttribute('type')).toBe('note');
    expect(el.getAttribute('role')).toBe('note');
    document.body.append(el); // reconnect
    expect(el.querySelectorAll('.gm-callout-heading')).toHaveLength(1);
  });
});

describe('gm-code', () => {
  it('copies the code and confirms on the button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const el = mount('<gm-code label-copied="Listo"><pre>pnpm add x</pre></gm-code>');
    const button = el.querySelector<HTMLButtonElement>('.gm-copy')!;
    button.click();
    await vi.waitFor(() => expect(button.getAttribute('aria-label')).toBe('Listo'));
    expect(writeText).toHaveBeenCalledWith('pnpm add x');
  });
});

describe('gm-tabs', () => {
  const html = (sync = '') =>
    `<gm-tabs ${sync}><gm-tab label="pnpm">a</gm-tab><gm-tab label="npm">b</gm-tab><gm-tab label="yarn">c</gm-tab></gm-tabs>`;

  it('builds an accessible tablist', () => {
    const el = mount<GmTabs>(html());
    const tabs = el.querySelectorAll('[role="tab"]');
    const panels = el.querySelectorAll('[role="tabpanel"]');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]!.getAttribute('aria-controls')).toBe(panels[0]!.id);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect((panels[1] as HTMLElement).hidden).toBe(true);
  });

  it('moves with the arrow keys, wrapping around', () => {
    const el = mount<GmTabs>(html());
    const list = el.querySelector('[role="tablist"]')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.selected).toBe(2);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(el.selected).toBe(0);
  });

  it('fires gm-change when the tab changes, not when it stays', () => {
    const el = mount<GmTabs>(html());
    const changes: unknown[] = [];
    el.addEventListener('gm-change', (e) => changes.push((e as CustomEvent).detail));
    el.select(2);
    el.select(2);
    expect(changes).toEqual([{ index: 2, label: 'yarn' }]);
  });

  it('keeps synced tabs together and remembers the choice', () => {
    mount(html('sync="pkg"') + html('sync="pkg"'));
    const [a, b] = document.querySelectorAll<GmTabs>('gm-tabs');
    a!.select(1);
    expect(b!.selected).toBe(1);
    expect(localStorage.getItem('gm-tabs:pkg')).toBe('npm');
    const c = document.createElement('gm-tabs') as GmTabs;
    c.setAttribute('sync', 'pkg');
    c.innerHTML = '<gm-tab label="pnpm">a</gm-tab><gm-tab label="npm">b</gm-tab>';
    document.body.append(c);
    expect(c.selected).toBe(1);
  });
});

describe('gm-nav', () => {
  it('fires a cancelable gm-navigate for in-page links', () => {
    const el = mount(
      '<gm-nav><a href="#a">A</a><a href="#b">B</a></gm-nav><section id="b"></section>',
    );
    const seen = vi.fn((e: Event) => e.preventDefault());
    el.addEventListener('gm-navigate', seen);
    el.querySelectorAll('a')[1]!.click();
    expect(seen).toHaveBeenCalledOnce();
    const { detail } = seen.mock.calls[0]![0] as CustomEvent;
    expect(detail.href).toBe('#b');
    expect(detail.target).toBe(document.getElementById('b'));
    expect(location.hash).toBe('#b');
  });

  it('marks the clicked link current with spy', () => {
    const el = mount('<gm-nav spy><a href="#a">A</a><a href="#b">B</a></gm-nav>');
    el.addEventListener('gm-navigate', (e) => e.preventDefault());
    const links = el.querySelectorAll('a');
    links[1]!.click();
    expect(links[1]!.getAttribute('aria-current')).toBe('location');
    expect(links[0]!.hasAttribute('aria-current')).toBe(false);
  });

  it('moves current to the clicked link without spy', () => {
    const el = mount('<gm-nav><a href="#a" aria-current="true">A</a><a href="#b">B</a></gm-nav>');
    el.addEventListener('gm-navigate', (e) => e.preventDefault());
    const links = el.querySelectorAll('a');
    links[1]!.click();
    expect(links[1]!.getAttribute('aria-current')).toBe('true');
    expect(links[0]!.hasAttribute('aria-current')).toBe(false);
  });
});

describe('gm-segmented', () => {
  const seg = (value = 'voice') =>
    mount<GmSegmented>(
      `<gm-segmented label="Mode" value="${value}"><button value="chat">Chat</button><button value="voice">Voice</button><button value="video">Video</button></gm-segmented>`,
    );
  const radios = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')];

  it('is a labelled radio group starting on its value', () => {
    const el = seg();
    expect(el.getAttribute('role')).toBe('radiogroup');
    expect(el.getAttribute('aria-label')).toBe('Mode');
    expect(radios(el).map((r) => r.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(radios(el).map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    expect(el.value).toBe('voice');
  });

  it('fires gm-change when the user picks another option', () => {
    const el = seg();
    const changes: unknown[] = [];
    el.addEventListener('gm-change', (e) => changes.push((e as CustomEvent).detail));
    radios(el)[2]!.click();
    radios(el)[2]!.click();
    expect(changes).toEqual([{ value: 'video', index: 2 }]);
    expect(el.getAttribute('value')).toBe('video');
  });

  it('moves with the arrow keys, wrapping', () => {
    const el = seg('chat');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.value).toBe('video');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(el.value).toBe('chat');
  });

  it('follows a value set from outside, without gm-change', () => {
    const el = seg();
    const changed = vi.fn();
    el.addEventListener('gm-change', changed);
    el.value = 'chat';
    expect(radios(el)[0]!.getAttribute('aria-checked')).toBe('true');
    expect(changed).not.toHaveBeenCalled();
  });
});

describe('gm-menu', () => {
  const menu = () =>
    mount<GmMenu>(
      '<gm-menu id="actions"><button value="rename">Rename</button><hr><button value="delete">Delete</button><a href="#help">Help</a></gm-menu><button popovertarget="actions" id="opener">More</button>',
    );
  const items = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[role="menuitem"]')];

  it('is a frosted popover menu of items, with separators', () => {
    const el = menu();
    expect(el.getAttribute('popover')).toBe('auto');
    expect(el.getAttribute('material')).toBe('frost');
    expect(el.getAttribute('role')).toBe('menu');
    expect(items(el)).toHaveLength(3);
    expect(items(el).every((i) => i.tabIndex === -1)).toBe(true);
    expect(el.querySelector('hr')!.getAttribute('role')).toBe('separator');
    expect(el.opener).toBe(document.getElementById('opener'));
  });

  it('fires gm-select with the value and label of the item', () => {
    const el = menu();
    const picked: unknown[] = [];
    el.addEventListener('gm-select', (e) => {
      picked.push((e as CustomEvent).detail);
      e.preventDefault(); // keep it open: happy-dom has no popover to close
    });
    items(el)[1]!.click();
    items(el)[2]!.click();
    expect(picked).toEqual([
      { value: 'delete', label: 'Delete' },
      { value: 'Help', label: 'Help' },
    ]);
  });

  it('moves focus through the items with the arrow keys, wrapping', () => {
    const el = menu();
    const key = (k: string) =>
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    key('ArrowDown');
    expect(document.activeElement).toBe(items(el)[0]);
    key('ArrowUp');
    expect(document.activeElement).toBe(items(el)[2]);
    key('Home');
    expect(document.activeElement).toBe(items(el)[0]);
  });
});

describe('gm-dialog', () => {
  const dialog = () =>
    mount<GmDialog>(
      '<gm-dialog heading="Delete this page?"><p>It can’t be undone.</p><form method="dialog"><button value="delete">Delete</button></form></gm-dialog>',
    );

  it('wraps its content in a frosted, labelled <dialog>', () => {
    const el = dialog();
    const panel = el.querySelector(':scope > dialog.gm-dialog-panel')!;
    expect(el.getAttribute('material')).toBe('frost');
    const heading = panel.querySelector('.gm-dialog-heading')!;
    expect(heading.textContent).toBe('Delete this page?');
    expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(panel.querySelector('p')!.textContent).toBe('It can’t be undone.');
    expect(panel.getAttribute('data-glass-tier')).toBeTruthy();
  });

  it('reports why it closed in gm-close', () => {
    const el = dialog();
    const closed = vi.fn();
    el.addEventListener('gm-close', (e) => closed((e as CustomEvent).detail.value));
    el.show();
    expect(el.open).toBe(true);
    el.close('delete');
    expect(el.open).toBe(false);
    expect(closed).toHaveBeenCalledWith('delete');
  });

  it('puts its content back when it leaves the page', () => {
    const el = dialog();
    el.remove();
    expect(el.querySelector('dialog')).toBeNull();
    expect(el.querySelector('p')).not.toBeNull();
    expect(el.querySelector('.gm-dialog-heading')).toBeNull();
  });
});

describe('gm-slider', () => {
  it('paints the fill up to the value, and follows the input', () => {
    const el = mount('<gm-slider><input type="range" min="0" max="200" value="50"></gm-slider>');
    expect(el.style.getPropertyValue('--gm-fill')).toBe('25%');
    const input = el.querySelector('input')!;
    input.value = '150';
    input.dispatchEvent(new Event('input'));
    expect(el.style.getPropertyValue('--gm-fill')).toBe('75%');
  });
});

describe('gm-select', () => {
  const select = () =>
    mount<GmSelect>(
      `<gm-select><select id="country" name="country" required aria-describedby="hint">
        <option value="" disabled selected hidden>Choose a country</option>
        <option value="ar">Argentina</option>
        <optgroup label="Europe"><option value="es">Spain</option><option value="fr" disabled>France</option></optgroup>
      </select></gm-select>`,
    );
  const options = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[role="option"]')];

  it('puts a button over the native select, which keeps the name for forms', () => {
    const el = select();
    const trigger = el.querySelector('button')!;
    const native = el.querySelector('select')!;
    expect(trigger.id).toBe('country');
    expect(native.id).toBe('');
    expect(native.name).toBe('country');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-describedby')).toBe('hint');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.textContent).toBe('Choose a country');
    expect(trigger.classList.contains('gm-select-placeholder')).toBe(true);
  });

  it('lists the options but not the placeholder, with groups', () => {
    const el = select();
    expect(options(el).map((o) => o.textContent)).toEqual(['Argentina', 'Spain', 'France']);
    expect(options(el)[2]!.getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('.gm-select-group')!.textContent).toBe('Europe');
  });

  it('picks an option: the select changes and both events fire', () => {
    const el = select();
    const native = el.querySelector('select')!;
    const seen: string[] = [];
    native.addEventListener('change', () => seen.push(`change:${native.value}`));
    el.addEventListener('gm-change', (e) =>
      seen.push(`gm-change:${(e as CustomEvent).detail.label}`),
    );
    options(el)[1]!.click();
    expect(el.value).toBe('es');
    expect(seen).toEqual(['change:es', 'gm-change:Spain']);
    expect(el.querySelector('button')!.textContent).toBe('Spain');
    expect(options(el)[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it("doesn't pick a disabled option", () => {
    const el = select();
    options(el)[2]!.click();
    expect(el.value).toBe('');
  });

  it('follows a value set from code, and new options', () => {
    const el = select();
    el.value = 'ar';
    expect(el.querySelector('button')!.textContent).toBe('Argentina');
    el.querySelector('select')!.insertAdjacentHTML(
      'beforeend',
      '<option value="cl">Chile</option>',
    );
    el.sync();
    expect(options(el).map((o) => o.textContent)).toContain('Chile');
  });

  it('gives the select its id back when removed', () => {
    const el = select();
    el.remove();
    expect(el.querySelector('select')!.id).toBe('country');
    expect(el.querySelector('button')).toBeNull();
  });
});

describe('gm-otp', () => {
  it('draws one box per character, keeping only digits', () => {
    const el = mount('<gm-otp><input maxlength="4"></gm-otp>');
    const input = el.querySelector('input')!;
    expect(input.inputMode).toBe('numeric');
    expect(input.autocomplete).toBe('one-time-code');
    const cells = () => [...el.querySelectorAll('.gm-otp-cells > span')].map((c) => c.textContent);
    expect(cells()).toEqual(['', '', '', '']);
    const done: string[] = [];
    el.addEventListener('gm-complete', (e) => done.push((e as CustomEvent).detail.value));
    input.value = '1a2';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('12');
    expect(cells()).toEqual(['1', '2', '', '']);
    input.value = '123456';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('1234');
    expect(done).toEqual(['1234']);
  });
});

describe('gm-table', () => {
  const table = () =>
    mount<GmTable>(`<gm-table stack><table>
      <thead><tr><th><input type="checkbox" class="gm-check" data-select-all></th><th data-sort="name">Name</th><th data-sort="total" class="gm-num">Total</th></tr></thead>
      <tbody>
        <tr><td><input type="checkbox" class="gm-check" data-select value="a"></td><td>Mira</td><td data-value="120">$120</td></tr>
        <tr><td><input type="checkbox" class="gm-check" data-select value="b"></td><td>Ada</td><td data-value="1450">$1,450</td></tr>
        <tr><td><input type="checkbox" class="gm-check" data-select value="c"></td><td>Lio</td><td data-value="98">$98</td></tr>
      </tbody></table></gm-table>`);
  const names = (el: HTMLElement) =>
    [...el.querySelectorAll('tbody tr')].map(
      (r) => (r as HTMLTableRowElement).cells[1]!.textContent,
    );

  it('turns sortable headers into buttons and sorts, numbers as numbers', () => {
    const el = table();
    const buttons = el.querySelectorAll<HTMLButtonElement>('.gm-table-sort');
    expect(buttons).toHaveLength(2);
    buttons[1]!.click();
    expect(names(el)).toEqual(['Lio', 'Mira', 'Ada']);
    expect(el.querySelector('[data-sort="total"]')!.getAttribute('aria-sort')).toBe('ascending');
    buttons[1]!.click();
    expect(names(el)).toEqual(['Ada', 'Mira', 'Lio']);
    buttons[0]!.click();
    expect(names(el)).toEqual(['Ada', 'Lio', 'Mira']);
    expect(el.querySelector('[data-sort="total"]')!.hasAttribute('aria-sort')).toBe(false);
  });

  it('leaves the rows alone when gm-sort is canceled', () => {
    const el = table();
    el.addEventListener('gm-sort', (e) => e.preventDefault());
    el.sort('name');
    expect(names(el)).toEqual(['Mira', 'Ada', 'Lio']);
  });

  it('selects rows, all or some, and says so', () => {
    const el = table();
    const seen: string[][] = [];
    el.addEventListener('gm-selection', (e) => seen.push((e as CustomEvent).detail.values));
    const all = el.querySelector<HTMLInputElement>('[data-select-all]')!;
    const rows = el.querySelectorAll<HTMLInputElement>('[data-select]');
    rows[1]!.checked = true;
    rows[1]!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(all.indeterminate).toBe(true);
    expect(rows[1]!.closest('tr')!.getAttribute('aria-selected')).toBe('true');
    all.checked = true;
    all.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.selected).toEqual(['a', 'b', 'c']);
    expect(all.indeterminate).toBe(false);
    el.clearSelection();
    expect(seen).toEqual([['b'], ['a', 'b', 'c'], []]);
  });

  it('labels each cell with its column, for phones', () => {
    const el = table();
    expect(el.querySelector('tbody td:nth-child(3)')!.getAttribute('data-label')).toBe('Total');
  });
});

describe('toast', () => {
  afterEach(() => vi.useRealTimers());

  it('shows a frosted toast in a polite live region, then goes away', () => {
    vi.useFakeTimers();
    const el = toast('Saved', { duration: 1000 });
    const region = document.querySelector('.gm-toasts')!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(el.parentElement).toBe(region);
    expect(el.getAttribute('material')).toBe('frost');
    expect(el.textContent).toBe('Saved');
    vi.advanceTimersByTime(1000);
    expect(el.hasAttribute('leaving')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(el.isConnected).toBe(false);
  });

  it('waits while the pointer is on it', () => {
    vi.useFakeTimers();
    const el = toast('Saved', { duration: 1000 });
    vi.advanceTimersByTime(400);
    el.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(2000);
    expect(el.hasAttribute('leaving')).toBe(false);
    el.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(600);
    expect(el.hasAttribute('leaving')).toBe(true);
  });

  it('runs its action and closes', () => {
    const run = vi.fn();
    const el = toast('Deleted', { action: { label: 'Undo', onClick: run }, duration: 0 });
    el.querySelector<HTMLButtonElement>('.gm-chip')!.click();
    expect(run).toHaveBeenCalledOnce();
    expect(el.hasAttribute('leaving')).toBe(true);
  });

  it('keeps three at most', () => {
    const toasts = [1, 2, 3, 4].map((n) => toast(`#${n}`, { duration: 0 }));
    expect(toasts[0]!.hasAttribute('leaving')).toBe(true);
    expect(document.querySelectorAll('gm-toast:not([leaving])')).toHaveLength(3);
  });
});

describe('gm-tip', () => {
  const tip = (attrs = '') =>
    mount<GmTip>(
      `<gm-tip heading="Search everything" ${attrs}><svg slot="icon"></svg><p>Press Ctrl K.</p></gm-tip>`,
    );

  it('builds a frosted card: icon, heading, message, close', () => {
    const el = tip();
    expect(el.getAttribute('material')).toBe('frost');
    expect(el.getAttribute('role')).toBe('note');
    const card = el.querySelector(':scope > .gm-tip-card')!;
    expect(
      [...card.children].map((c) => c.className || c.getAttribute('slot') || c.tagName),
    ).toEqual(['icon', 'gm-tip-heading', 'P', 'gm-tip-close']);
    expect(card.getAttribute('data-glass-tier')).toBeTruthy();
    expect(el.querySelector('.gm-tip-arrow')).toBeNull();
  });

  it('closes, remembers, and comes back with show()', () => {
    const el = tip('remember="search"');
    el.querySelector<HTMLButtonElement>('.gm-tip-close')!.click();
    expect(el.hidden).toBe(true);
    expect(localStorage.getItem('gm-tip:search')).toBe('dismissed');
    expect(tip('remember="search"').hidden).toBe(true);
    const again = document.querySelector<GmTip>('gm-tip')!;
    again.show();
    expect(again.hidden).toBe(false);
    expect(localStorage.getItem('gm-tip:search')).toBeNull();
  });

  it('stays open when gm-dismiss is canceled', () => {
    const el = tip();
    el.addEventListener('gm-dismiss', (e) => e.preventDefault());
    el.dismiss();
    expect(el.hidden).toBe(false);
  });

  it('floats next to its anchor with an arrow', async () => {
    const el = mount<GmTip>(
      '<gm-tip anchor="target" heading="Here"><p>Hi</p></gm-tip><button id="target">x</button>',
    );
    expect(el.querySelector(':scope > .gm-tip-arrow')).not.toBeNull();
    await vi.waitFor(() => expect(el.style.top).not.toBe(''));
    expect(el.style.getPropertyValue('--gm-tip-arrow')).toMatch(/px$/);
  });

  it('builds once across reconnects', () => {
    const el = tip();
    document.body.append(el);
    expect(el.querySelectorAll('.gm-tip-heading')).toHaveLength(1);
    expect(el.querySelectorAll('.gm-tip-card')).toHaveLength(1);
  });
});

describe('gm-search', () => {
  const results: SearchResult[] = [
    { label: 'Tokens', href: '#tokens' },
    { label: 'Tiers', href: '#tiers', hint: 'Guide' },
  ];

  const open = async () => {
    const el = mount<GmSearch>('<gm-search hotkey="k" tier="blur"></gm-search>');
    el.source = (q) => results.filter((r) => r.label.toLowerCase().includes(q.toLowerCase()));
    const input = el.querySelector('input')!;
    input.focus();
    await vi.waitFor(() => expect(el.querySelectorAll('[role="option"]')).toHaveLength(2));
    return { el, input };
  };

  it('lists results on focus and selects with the keyboard', async () => {
    const { el, input } = await open();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(input.getAttribute('aria-activedescendant')).toBe(
      el.querySelectorAll('[role="option"]')[1]!.id,
    );
    const picked = vi.fn((e: Event) => e.preventDefault());
    el.addEventListener('gm-select', picked);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect((picked.mock.calls[0]![0] as CustomEvent).detail).toBe(results[1]);
    expect(el.querySelector<HTMLElement>('[role="listbox"]')!.hidden).toBe(true);
  });

  it('ignores stale answers', async () => {
    const { el, input } = await open();
    let resolveSlow!: (r: SearchResult[]) => void;
    el.source = (q) =>
      q === 'slow' ? new Promise((r) => (resolveSlow = r)) : [{ label: 'Fast', href: '#f' }];
    input.value = 'slow';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(resolveSlow).toBeDefined());
    input.value = 'fast';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(el.textContent).toContain('Fast'));
    resolveSlow([{ label: 'Slow', href: '#s' }]);
    await Promise.resolve();
    expect(el.textContent).not.toContain('Slow');
  });

  it('focuses on its hotkey', () => {
    const el = mount<GmSearch>('<gm-search hotkey="k"></gm-search>');
    dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(document.activeElement).toBe(el.querySelector('input'));
  });
});
