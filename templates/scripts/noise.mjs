// Seeded randomness and 2D gradient noise for the art: the same seed draws the same picture on
// every build and every machine.

/** A seeded random number generator (mulberry32): returns floats in [0, 1). */
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D gradient (Perlin) noise from a seed: noise(x, y) in about [-1, 1]. */
export function gradientNoise(seed) {
  const rand = random(seed);
  const perm = new Uint8Array(512);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const a = rand() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const dot = (h, dx, dy) => gx[h] * dx + gy[h] * dy;
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const u = fade(xf);
    const v = fade(yf);
    const x1 = dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf));
    const x2 = dot(ab, xf, yf - 1) + u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 1.4;
  };
}

/** Fractal Brownian motion: octaves of noise, each twice the frequency and half the amplitude. */
export function fbm(noise, octaves = 5) {
  return (x, y) => {
    let sum = 0;
    let amp = 0.5;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y);
      // Rotate a little between octaves, so their grids don't line up.
      const nx = 1.6 * x + 1.2 * y;
      y = -1.2 * x + 1.6 * y;
      x = nx;
      amp *= 0.5;
    }
    return sum;
  };
}

/** A color as [r, g, b] from "#rrggbb". */
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(Math.max(t, 0), 1));
