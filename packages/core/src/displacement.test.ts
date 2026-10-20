import { describe, expect, it } from 'vitest';
import { displacementMap, type LensMap, type LensOptics } from './index.js';

const optics: LensOptics = { radius: 10, bezel: 20, thickness: 24, ior: 1.5, specular: 0.6 };

// Horizontal shift in CSS px at pixel (x, y), as feDisplacementMap applies it.
function shiftX(map: LensMap, x: number, y = 50): number {
  return map.scale * (map.data[(y * map.width + x) * 4]! / 255 - 0.5);
}

const row = (o: LensOptics = optics) => {
  const map = displacementMap(200, 100, o)!;
  return Array.from({ length: 200 }, (_, x) => shiftX(map, x));
};

const peak = (o: LensOptics) => Math.max(...row(o).map(Math.abs));

describe('displacementMap', () => {
  it('leaves the flat center untouched', () => {
    const r = row();
    expect(r[100]).toBeCloseTo(0, 1);
    expect(r[30]).toBeCloseTo(0, 1);
  });

  it('bends toward the center on every side', () => {
    const r = row();
    expect(r[3]).toBeGreaterThan(1); // left edge samples to the right
    expect(r[196]).toBeLessThan(-1); // right edge samples to the left
    expect(r[3]).toBeCloseTo(-r[196]!, 0); // symmetric up to 8-bit rounding
  });

  it('never folds the image over itself', () => {
    // The sampled position x + shift must keep increasing across the rim.
    const r = row();
    for (let x = 1; x < 40; x++) expect(x + r[x]! - (x - 1 + r[x - 1]!)).toBeGreaterThan(0.1);
  });

  it('bends more with thicker glass or a higher index', () => {
    const glass = peak(optics);
    expect(peak({ ...optics, thickness: 40 })).toBeGreaterThan(glass);
    expect(peak({ ...optics, thickness: 12 })).toBeLessThan(glass);
    expect(peak({ ...optics, ior: 1.33 })).toBeLessThan(glass);
    // 128 stands for the neutral 127.5, a bias far below a pixel.
    expect(peak({ ...optics, thickness: 0 })).toBeLessThan(0.01);
  });

  it('turns smoothly through sharp corners', () => {
    const map = displacementMap(100, 100, { ...optics, radius: 0 })!;
    // Neighbors across the corner diagonal used to flip between pure x and pure y bends.
    for (let i = 2; i < 18; i++) {
      const a = map.data[(i * 100 + (i + 1)) * 4]!;
      const b = map.data[((i + 1) * 100 + i) * 4]!;
      expect(Math.abs(a - b)).toBeLessThan(30);
    }
  });

  it('lights the rim, brightest on the side facing the light', () => {
    const map = displacementMap(200, 100, optics)!;
    const blue = (x: number) => map.data[(50 * 200 + x) * 4 + 2]!;
    expect(blue(100)).toBe(0);
    expect(blue(0)).toBeGreaterThan(blue(199)); // light comes from the left
  });

  it('renders at higher density without changing the optics', () => {
    const map = displacementMap(200, 100, optics, 2)!;
    expect(map.width).toBe(400);
    expect(map.scale).toBeCloseTo(displacementMap(200, 100, optics)!.scale, 5);
  });

  it('is undefined for an empty box', () => {
    expect(displacementMap(0, 100, optics)).toBeUndefined();
  });
});
