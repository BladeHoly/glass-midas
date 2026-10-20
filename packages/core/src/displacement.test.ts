import { describe, expect, it } from 'vitest';
import { displacementMap, type LensOptics } from './index.js';

const optics: LensOptics = { radius: 10, bezel: 20, thickness: 20, ior: 1.5, specular: 0 };

// Horizontal shift in CSS px at column x of the middle row, as feDisplacementMap applies it.
function shiftAt(x: number, o: LensOptics = optics, width = 200): number {
  const map = displacementMap(width, 100, o)!;
  const i = (50 * map.width + x) * 4;
  return map.scale * (map.data[i]! / 255 - 0.5);
}

describe('displacementMap', () => {
  it('leaves the flat center untouched', () => {
    expect(shiftAt(100)).toBeCloseTo(0, 0);
    expect(shiftAt(30)).toBeCloseTo(0, 0);
  });

  it('peaks in the outer tenth of the bezel and fades inward', () => {
    // The exact zero on the rim sits inside the first pixel, so start at the peak.
    const shifts = Array.from({ length: 20 }, (_, x) => Math.abs(shiftAt(x)));
    const peakAt = shifts.indexOf(Math.max(...shifts));
    expect(peakAt).toBeLessThanOrEqual(2);
    for (let x = peakAt + 1; x < 20; x++) expect(shifts[x]).toBeLessThanOrEqual(shifts[x - 1]!);
  });

  it('bends most just inside the rim, towards the center', () => {
    const near = shiftAt(198); // right side: samples from further left
    expect(near).toBeLessThan(-3);
    expect(Math.abs(near)).toBeGreaterThan(Math.abs(shiftAt(190)));
    expect(shiftAt(1)).toBeCloseTo(-near, 0);
  });

  it('peaks near 0.42 × thickness for a bezel as tall as it is wide', () => {
    let peak = 0;
    for (let x = 0; x < 20; x++) peak = Math.max(peak, Math.abs(shiftAt(x)));
    expect(peak / optics.thickness).toBeGreaterThan(0.3);
    expect(peak / optics.thickness).toBeLessThan(0.45);
  });

  it('bends more with thicker glass and less with water', () => {
    const glass = Math.abs(shiftAt(2));
    expect(Math.abs(shiftAt(2, { ...optics, thickness: 30 }))).toBeGreaterThan(glass);
    expect(Math.abs(shiftAt(2, { ...optics, ior: 1.33 }))).toBeLessThan(glass);
  });

  it('renders at higher density without changing the optics', () => {
    const map = displacementMap(200, 100, optics, 2)!;
    expect(map.width).toBe(400);
    expect(map.density).toBe(2);
  });

  it('is undefined for an empty box', () => {
    expect(displacementMap(0, 100, optics)).toBeUndefined();
  });
});
