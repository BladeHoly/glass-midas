import { afterEach, describe, expect, it, vi } from 'vitest';
import { glassOptions, type GmSearch, type GmTabs, type SearchResult } from './index.js';

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
    await vi.waitFor(() => expect(button.textContent).toBe('Listo'));
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
