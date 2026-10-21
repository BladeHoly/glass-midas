// Draws Ondine's art into dist/shared/art: all of it procedural, seeded, so every build makes the same
// pictures and nothing here is a photo. The techniques, each chosen for a sound brand:
//
// - tide: domain-warped fractal noise, f(p + h(p)), noise fed into its own coordinates. Smoke
//   and liquid marble, still and vivid: the backdrop glass refracts.
// - sigil: a Chladni figure, the lines a plate vibrating at one frequency leaves still,
//   cos(nπx)cos(mπy) ± cos(mπx)cos(nπy) = 0. Sound made visible; the brand's mark.
// - resonance: a flow field (strokes following a field of angles) with a harmonograph (damped
//   pendulums) traced over it, on the tide. For the big panels.
import fs from 'node:fs';
import sharp from 'sharp';
import { fbm, gradientNoise, hex, mix, random } from './noise.mjs';

const OUT = 'dist/shared/art';
fs.mkdirSync(OUT, { recursive: true });

export const PALETTES = {
  dark: {
    base: '#07070d',
    deep: '#1a1640',
    violet: '#5b44b8',
    tide: '#2fb3a3',
    ember: '#ff7a45',
    moon: '#efeaff',
  },
  light: {
    base: '#f4f1f8',
    deep: '#d9d0f5',
    violet: '#9c86f0',
    tide: '#62d3bf',
    ember: '#ffad85',
    moon: '#ffffff',
  },
};

/** The tide: warped fBm, mostly deep water with a few luminous currents, calm behind glass. */
function tide(width, height, palette, seed, scale = 1 / 820) {
  const f = fbm(gradientNoise(seed), 4);
  const c = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, hex(v)]));
  const smooth = (a, b, x) => {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const px = Buffer.alloc(width * height * 3);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = i * scale;
      const y = j * scale;
      const qx = f(x, y);
      const qy = f(x + 5.2, y + 1.3);
      const rx = f(x + 3 * qx + 1.7, y + 3 * qy + 9.2);
      const ry = f(x + 3 * qx + 8.3, y + 3 * qy + 2.8);
      const v = f(x + 3 * rx, y + 3 * ry);
      let col = mix(c.base, c.deep, smooth(-0.35, 0.45, v));
      col = mix(col, c.violet, smooth(0.15, 0.75, Math.hypot(qx, qy)) * 0.85);
      // Currents: thin bright bands where the second warp crosses a level.
      col = mix(col, c.tide, smooth(0.07, 0.0, Math.abs(rx - 0.2)) * 0.8);
      col = mix(col, c.ember, smooth(0.08, 0.0, Math.abs(ry + 0.22)) * smooth(0.1, 0.4, v) * 0.85);
      col = mix(col, c.moon, smooth(0.42, 0.62, v) * 0.7);
      const o = (j * width + i) * 3;
      px[o] = col[0];
      px[o + 1] = col[1];
      px[o + 2] = col[2];
    }
  }
  return px;
}

/** A Chladni figure's nodal lines, by marching squares over [-1, 1]², clipped to a circle. */
function chladni(n, m, sign = 1, grid = 72) {
  const f = (x, y) =>
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) +
    sign * Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
  // Half a cell off the axes, where the figure's lines would fall exactly on the grid.
  const at = (i) => -1 + (2 * (i + 0.5)) / grid;
  const segments = [];
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const corners = [
        [at(i), at(j)],
        [at(i + 1), at(j)],
        [at(i + 1), at(j + 1)],
        [at(i), at(j + 1)],
      ];
      const values = corners.map(([x, y]) => f(x, y));
      const points = [];
      for (let k = 0; k < 4; k++) {
        const a = values[k];
        const b = values[(k + 1) % 4];
        if (a * b < 0) {
          const t = a / (a - b);
          const [x1, y1] = corners[k];
          const [x2, y2] = corners[(k + 1) % 4];
          points.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
        }
      }
      if (points.length >= 2 && points.every(([x, y]) => Math.hypot(x, y) < 0.92)) {
        segments.push(points.slice(0, 2));
        if (points.length === 4) segments.push(points.slice(2));
      }
    }
  }
  return segments;
}

const round = (v) => Math.round(v * 10) / 10;

/** The sigil: a Chladni figure in two rings, as a small SVG in the current color. */
function sigil(n = 2, m = 5) {
  const k = 50;
  const path = chladni(n, m, 1, 64)
    .map(
      ([[x1, y1], [x2, y2]]) =>
        `M${round(k + x1 * k)} ${round(k + y1 * k)}L${round(k + x2 * k)} ${round(k + y2 * k)}`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 108" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="50" cy="50" r="50" stroke-width="3"/><path d="${path}" stroke-width="3.4"/></svg>`;
}

/** A harmonograph: two damped pendulums per axis, traced as one long line. */
function harmonograph(seed, size, steps = 6000) {
  const rand = random(seed);
  const pend = () => ({
    f: [2, 3, 3, 4][Math.floor(rand() * 4)] + (rand() - 0.5) * 0.02,
    p: rand() * Math.PI * 2,
    d: 0.002 + rand() * 0.003,
  });
  const [a, b, c, d] = [pend(), pend(), pend(), pend()];
  const pts = [];
  for (let s = 0; s < steps; s++) {
    const t = s * 0.06;
    const x =
      Math.sin(a.f * t + a.p) * Math.exp(-a.d * t) + Math.sin(b.f * t + b.p) * Math.exp(-b.d * t);
    const y =
      Math.sin(c.f * t + c.p) * Math.exp(-c.d * t) + Math.sin(d.f * t + d.p) * Math.exp(-d.d * t);
    pts.push(`${round(size / 2 + (x * size) / 4.6)} ${round(size / 2 + (y * size) / 4.6)}`);
  }
  return `M${pts.join('L')}`;
}

/** Strokes that follow a field of angles from noise, as SVG paths. */
function flowField(seed, width, height, palette, count = 1100) {
  const rand = random(seed);
  const f = fbm(gradientNoise(seed + 1), 3);
  const colors = [palette.moon, palette.tide, palette.violet, palette.ember];
  const lines = [];
  for (let n = 0; n < count; n++) {
    let x = rand() * width;
    let y = rand() * height;
    const pts = [`${round(x)} ${round(y)}`];
    for (let s = 0; s < 70; s++) {
      const angle = f(x / 520, y / 520) * Math.PI * 3;
      x += Math.cos(angle) * 6;
      y += Math.sin(angle) * 6;
      if (x < 0 || y < 0 || x > width || y > height) break;
      pts.push(`${round(x)} ${round(y)}`);
    }
    if (pts.length < 8) continue;
    const color = colors[Math.floor(rand() ** 1.6 * colors.length)];
    const width_ = round(0.6 + rand() * 1.6);
    lines.push(
      `<path d="M${pts.join('L')}" stroke="${color}" stroke-width="${width_}" opacity="${round(0.25 + rand() * 0.5)}"/>`,
    );
  }
  return lines.join('');
}

async function main() {
  const started = performance.now();
  const W = 1600;
  const H = 1000;
  for (const [name, palette] of Object.entries(PALETTES)) {
    const raw = tide(W, H, palette, 7);
    await sharp(raw, { raw: { width: W, height: H, channels: 3 } })
      .webp({ quality: 80 })
      .toFile(`${OUT}/tide-${name}.webp`);

    // Resonance: a tall panel, the tide under a flow field and a harmonograph.
    const PW = 1000;
    const PH = 1300;
    const base = await sharp(tide(PW, PH, palette, 23, 1 / 700), {
      raw: { width: PW, height: PH, channels: 3 },
    })
      .png()
      .toBuffer();
    const s = Math.min(PW, PH) * 0.8;
    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" fill="none" stroke-linecap="round"><g>${flowField(11, PW, PH, palette)}</g><g transform="translate(${(PW - s) / 2} ${(PH - s) / 2})"><path d="${harmonograph(5, s)}" stroke="${palette.moon}" stroke-width="0.9" opacity="0.85"/></g></svg>`;
    await sharp(base)
      .composite([{ input: Buffer.from(overlay) }])
      .webp({ quality: 80 })
      .toFile(`${OUT}/resonance-${name}.webp`);
  }
  fs.writeFileSync(`${OUT}/sigil.svg`, sigil());
  console.log(
    `art: ${fs.readdirSync(OUT).join(', ')} in ${Math.round(performance.now() - started)} ms`,
  );
}

await main();
