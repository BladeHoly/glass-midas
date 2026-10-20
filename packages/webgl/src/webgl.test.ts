import { describe, expect, it } from 'vitest';
import { contentRect, createWebGLGlass, toBackdrop } from './index.js';

const box = { x: 10, y: 20, width: 400, height: 200 };

describe('contentRect', () => {
  it('fills the box by default', () => {
    expect(contentRect(box, 100, 100)).toEqual(box);
  });

  it('covers: scales to the larger ratio and centers the overflow', () => {
    // 100×100 into 400×200: scale 4, so 400×400 centered vertically.
    expect(contentRect(box, 100, 100, 'cover')).toEqual({ x: 10, y: -80, width: 400, height: 400 });
  });

  it('contains: scales to the smaller ratio and centers the gap', () => {
    expect(contentRect(box, 100, 100, 'contain')).toEqual({
      x: 110,
      y: 20,
      width: 200,
      height: 200,
    });
  });

  it('falls back to the box while the source has no size', () => {
    expect(contentRect(box, 0, 0, 'cover')).toEqual(box);
  });
});

describe('toBackdrop', () => {
  it('passes custom backdrops through', () => {
    const custom = { source: document.createElement('canvas'), rect: () => box };
    expect(toBackdrop(custom)).toBe(custom);
  });

  it('treats canvases and videos as live, images as still', () => {
    expect(toBackdrop(document.createElement('canvas')).live).toBe(true);
    expect(toBackdrop(document.createElement('img')).live).toBe(false);
  });
});

describe('createWebGLGlass', () => {
  it('falls back to the core tiers without WebGL', () => {
    const el = document.createElement('div');
    const glass = createWebGLGlass(el, { backdrop: document.createElement('canvas') });
    expect(glass.tier).not.toBe('webgl');
    expect(el.querySelector('canvas')).toBeNull();
    glass.destroy();
    expect(el.dataset.glassTier).toBeUndefined();
  });
});
