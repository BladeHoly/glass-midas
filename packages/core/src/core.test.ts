import { describe, expect, it } from 'vitest';
import { createGlass, detectTier, tokensToCss, tokenVar, type SupportEnv } from './index.js';

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
});
