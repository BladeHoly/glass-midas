// Figures drawn from sound: Chladni's plates and the harmonograph's pendulums. Shared by the art
// and the product images.
import { random } from './noise.mjs';

export const round = (v) => Math.round(v * 10) / 10;

/** A Chladni figure's nodal lines, by marching squares over [-1, 1]², clipped to a circle. */
export function chladni(n, m, sign = 1, grid = 72) {
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

/** A harmonograph: two damped pendulums per axis, traced as one long line. */
export function harmonograph(seed, size, steps = 6000) {
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
