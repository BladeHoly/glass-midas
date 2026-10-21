import type { GmSearch } from '@glass-midas/components';
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GlassCode,
  GlassNav,
  GlassSearch,
  GlassSurface,
  GlassTab,
  GlassTabs,
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

  it('leaves out false flags', () => {
    const host = render(
      <GlassNav spy={false}>
        <a href="#a">A</a>
      </GlassNav>,
    );
    expect(host.querySelector('gm-nav')!.hasAttribute('spy')).toBe(false);
  });
});
