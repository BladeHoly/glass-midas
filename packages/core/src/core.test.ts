import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGlass,
  detectTier,
  tokensToCss,
  tokenVar,
  type GlassOptions,
  type SupportEnv,
} from './index.js';

const env = (o: Partial<SupportEnv> & { reduce?: boolean } = {}): SupportEnv => ({
  supports: o.supports ?? (() => true),
  matchMedia: () => ({ matches: o.reduce ?? false }),
  isChromium: o.isChromium ?? false,
});

describe('tokens', () => {
  it('serializes every token as a custom property', () => {
    const css = tokensToCss();
    expect(css).toContain('--gm-blur-md: 16px;');
    expect(css).toContain('--gm-radius-pill: 999px;');
  });

  it('references tokens by var()', () => {
    expect(tokenVar('blur', 'lg')).toBe('var(--gm-blur-lg)');
  });
});

describe('detectTier', () => {
  it('refracts on Chromium', () => expect(detectTier(env({ isChromium: true }))).toBe('refract'));
  it('falls back to blur elsewhere', () => expect(detectTier(env())).toBe('blur'));
  it('is solid without backdrop-filter', () =>
    expect(detectTier(env({ supports: () => false }))).toBe('solid'));
  it('respects prefers-reduced-transparency', () =>
    expect(detectTier(env({ isChromium: true, reduce: true }))).toBe('solid'));
  it('is solid outside the browser', () => expect(detectTier(null)).toBe('solid'));
});

describe('createGlass', () => {
  it('applies the blur tier and cleans up', () => {
    const el = document.createElement('div');
    const glass = createGlass(el, { tier: 'blur' });
    expect(el.dataset.glassTier).toBe('blur');
    expect(el.style.getPropertyValue('backdrop-filter')).toContain('blur(');
    glass.destroy();
    expect(el.dataset.glassTier).toBeUndefined();
  });

  describe('refract', () => {
    // happy-dom has no canvas or layout: a stub canvas and a fixed size let the filter build.
    beforeEach(() => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {},
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:,');
    });
    afterEach(() => vi.restoreAllMocks());

    const surface = (options: GlassOptions) => {
      const el = document.createElement('div');
      Object.defineProperties(el, { offsetWidth: { value: 200 }, offsetHeight: { value: 80 } });
      document.body.append(el);
      const glass = createGlass(el, { tier: 'refract', ...options });
      const id = el.style.getPropertyValue('backdrop-filter').match(/#([\w-]+)/)![1]!;
      return { el, glass, filter: document.getElementById(id)! };
    };
    const scales = (filter: Element) =>
      [...filter.querySelectorAll('feDisplacementMap')].map((d) => Number(d.getAttribute('scale')));

    it('bends once without dispersion', () => {
      const { filter, glass } = surface({});
      expect(scales(filter)).toHaveLength(1);
      glass.destroy();
    });

    it('splits the bend per channel with chroma', () => {
      const { filter, glass } = surface({ chroma: 0.1 });
      const [red, green, blue] = scales(filter);
      expect(red! / green!).toBeCloseTo(0.9);
      expect(blue! / green!).toBeCloseTo(1.1);
      // Each pass keeps one color channel: red's matrix passes R only.
      const matrix = filter.querySelector('feColorMatrix[in="d0"]')!.getAttribute('values');
      expect(matrix).toBe('1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0');
      glass.update({ chroma: 0 });
      expect(scales(document.getElementById(filter.id)!)).toHaveLength(1);
      glass.destroy();
    });
  });
});
