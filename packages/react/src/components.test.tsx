import type { GmSearch } from '@glass-midas/components';
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GlassCode,
  GlassGallery,
  GlassNav,
  GlassOtp,
  GlassSearch,
  GlassSelect,
  GlassSlider,
  GlassSurface,
  GlassTab,
  GlassTable,
  GlassTabs,
  GlassUpload,
} from './components.js';

// React only acts synchronously inside act() when it knows it's a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const render = (node: React.ReactNode) => {
  const host = document.body.appendChild(document.createElement('div'));
  act(() => {
    root = createRoot(host);
    root.render(node);
  });
  return host;
};

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('glass components for React', () => {
  it('writes glass options as kebab-case attributes', () => {
    const host = render(
      <GlassSurface tier="blur" specularSaturation={2} caustics={false} className="panel">
        Hi
      </GlassSurface>,
    );
    const el = host.querySelector('gm-surface')!;
    expect(el.getAttribute('specular-saturation')).toBe('2');
    expect(el.getAttribute('caustics')).toBe('false');
    expect(el.className).toBe('panel');
    expect(el.textContent).toBe('Hi');
    expect(el.getAttribute('data-glass-tier')).toBe('blur');
  });

  it('writes component attributes in kebab-case too', () => {
    const host = render(
      <GlassCode labelCopied="Listo">
        <pre>x</pre>
      </GlassCode>,
    );
    expect(host.querySelector('gm-code')!.getAttribute('label-copied')).toBe('Listo');
  });

  it('assigns properties and forwards the element', () => {
    const source = vi.fn(() => []);
    const ref = createRef<GmSearch>();
    render(<GlassSearch ref={ref} source={source} placeholder="Find" />);
    expect(ref.current!.source).toBe(source);
    expect(ref.current!.querySelector('input')!.placeholder).toBe('Find');
  });

  it('listens to events with the latest handler', () => {
    const first = vi.fn();
    const second = vi.fn((e: Event) => e.preventDefault());
    const nav = (onNavigate: (e: Event) => void) => (
      <GlassNav onNavigate={onNavigate}>
        <a href="#a">A</a>
      </GlassNav>
    );
    const host = render(nav(first));
    act(() => root!.render(nav(second)));
    act(() => host.querySelector('a')!.click());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect((second.mock.calls[0]![0] as CustomEvent).detail.href).toBe('#a');
  });

  it('calls onChange when the tab changes', () => {
    const onChange = vi.fn();
    const host = render(
      <GlassTabs onChange={onChange}>
        <GlassTab label="pnpm">a</GlassTab>
        <GlassTab label="npm">b</GlassTab>
      </GlassTabs>,
    );
    act(() => host.querySelectorAll<HTMLButtonElement>('.gm-tab-button')[1]!.click());
    expect(onChange).toHaveBeenCalledOnce();
    expect((onChange.mock.calls[0]![0] as CustomEvent).detail).toEqual({ index: 1, label: 'npm' });
  });

  it('repaints a controlled slider after each render', () => {
    const slider = (value: number) => (
      <GlassSlider>
        <input type="range" value={value} onChange={() => {}} />
      </GlassSlider>
    );
    const host = render(slider(20));
    const el = host.querySelector<HTMLElement>('gm-slider')!;
    expect(el.style.getPropertyValue('--gm-fill')).toBe('20%');
    act(() => root!.render(slider(80)));
    expect(el.style.getPropertyValue('--gm-fill')).toBe('80%');
  });

  it('shows a controlled select, and its onChange fires from the glass list', () => {
    const onChange = vi.fn();
    const select = (value: string) => (
      <GlassSelect>
        <select value={value} onChange={onChange}>
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
        </select>
      </GlassSelect>
    );
    const host = render(select('a'));
    const trigger = () => host.querySelector('.gm-select-trigger')!.textContent;
    expect(trigger()).toBe('Alpha');
    act(() => root!.render(select('b')));
    expect(trigger()).toBe('Beta');
    act(() => host.querySelectorAll<HTMLElement>('[role="option"]')[0]!.click());
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('calls onComplete once the code is whole', () => {
    const onComplete = vi.fn();
    const host = render(
      <GlassOtp onComplete={onComplete}>
        <input maxLength={4} />
      </GlassOtp>,
    );
    const input = host.querySelector('input')!;
    act(() => {
      input.value = '4821';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect((onComplete.mock.calls[0]![0] as CustomEvent).detail.value).toBe('4821');
  });

  it('leaves sorting to React with onSort, and reports the selection', () => {
    const onSort = vi.fn();
    const onSelectionChange = vi.fn();
    const host = render(
      <GlassTable stack onSort={onSort} onSelectionChange={onSelectionChange}>
        <table>
          <thead>
            <tr>
              <th data-sort="name">Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input type="checkbox" className="gm-check" data-select value="b" /> Bo
              </td>
            </tr>
            <tr>
              <td>
                <input type="checkbox" className="gm-check" data-select value="a" /> Al
              </td>
            </tr>
          </tbody>
        </table>
      </GlassTable>,
    );
    const el = host.querySelector('gm-table')!;
    expect(el.hasAttribute('stack')).toBe(true);
    act(() => host.querySelector<HTMLButtonElement>('.gm-table-sort')!.click());
    expect(onSort).toHaveBeenCalledWith({ key: 'name', direction: 'ascending' });
    expect(host.querySelector('tbody td')!.textContent).toContain('Bo');
    const box = host.querySelector<HTMLInputElement>('[data-select]')!;
    act(() => {
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ values: ['b'] });
  });

  it('starts a gallery over when the number of pictures changes, and reports moves', () => {
    const onChange = vi.fn();
    const Pictures = ({ srcs }: { srcs: string[] }) => (
      <GlassGallery zoom aria-label="Pictures" onChange={onChange}>
        {srcs.map((src) => (
          <img key={src} src={src} alt={src} />
        ))}
      </GlassGallery>
    );
    const host = render(<Pictures srcs={['a', 'b']} />);
    const first = host.querySelector('gm-gallery')!;
    expect(first.hasAttribute('zoom')).toBe(true);
    expect(first.querySelectorAll('.gm-gallery-thumbs button')).toHaveLength(2);
    act(() => first.querySelectorAll<HTMLButtonElement>('.gm-gallery-thumbs button')[1]!.click());
    expect((onChange.mock.calls[0]![0] as CustomEvent).detail.index).toBe(1);
    act(() => root!.render(<Pictures srcs={['a', 'b', 'c']} />));
    const second = host.querySelector('gm-gallery')!;
    expect(second).not.toBe(first);
    expect(second.querySelectorAll('.gm-gallery-thumbs button')).toHaveLength(3);
  });

  it('reports the files an upload holds', () => {
    const onFilesChange = vi.fn();
    const host = render(
      <GlassUpload maxSize="1 MB" maxFiles={3} onFilesChange={onFilesChange}>
        <input type="file" multiple />
      </GlassUpload>,
    );
    const el = host.querySelector<HTMLElement & { files: File[] }>('gm-upload')!;
    expect(el.getAttribute('max-size')).toBe('1 MB');
    act(() => {
      el.files = [new File(['x'], 'a.txt')];
    });
    expect((onFilesChange.mock.calls[0]![0] as CustomEvent).detail.files).toHaveLength(1);
  });

  it('leaves out false flags', () => {
    const host = render(
      <GlassNav spy={false}>
        <a href="#a">A</a>
      </GlassNav>,
    );
    expect(host.querySelector('gm-nav')!.hasAttribute('spy')).toBe(false);
  });
});
