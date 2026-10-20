/**
 * Optics of a plano-convex glass slab whose rim is a convex squircle bezel.
 * A vertical ray hits the curved surface, bends by Snell's law and travels down
 * to the flat back face; how far sideways it lands is the displacement.
 * See research/refraction-notes.md for the derivation and references.
 */
export interface LensOptics {
  /** Corner radius in px. */
  radius: number;
  /** Width of the curved rim in px. */
  bezel: number;
  /** Height of the glass in px; more thickness bends more. */
  thickness: number;
  /** Index of refraction: 1.33 water, 1.5 glass. */
  ior: number;
  /** Rim highlight strength, 0 to 1. */
  specular: number;
}

export interface LensMap {
  /** RGBA bytes, row by row. */
  data: Uint8ClampedArray;
  /** Size in map pixels. */
  width: number;
  height: number;
  /** Map pixels per CSS px. */
  density: number;
  /** feDisplacementMap scale that turns the map back into CSS px. */
  scale: number;
}

// Squircle rim profile h(s) = (1 - (1 - s)^4)^(1/4), s = 0 at the rim, 1 where the glass turns flat.
function shift(s: number, steep: number, ior: number): number {
  const u = 1 - s;
  const base = Math.max(1 - u ** 4, 1e-12);
  const height = base ** 0.25;
  const incidence = Math.atan(steep * u ** 3 * base ** -0.75);
  return height * Math.tan(incidence - Math.asin(Math.sin(incidence) / ior));
}

// Light from the top left, as in Apple's materials.
const LX = -Math.SQRT1_2;
const LY = -Math.SQRT1_2;

/**
 * Builds the displacement map for a rounded rectangle. Red and green hold the
 * horizontal and vertical shift (128 = none), blue holds the rim highlight.
 */
export function displacementMap(
  width: number,
  height: number,
  optics: LensOptics,
  density = 1,
): LensMap | undefined {
  if (width < 1 || height < 1) return undefined;

  const w = Math.round(width * density);
  const h = Math.round(height * density);
  const data = new Uint8ClampedArray(w * h * 4);
  const { bezel, thickness, ior, specular } = optics;
  const r = Math.min(optics.radius, width / 2, height / 2);
  const steep = thickness / bezel;
  const shifts = new Float32Array(w * h * 2);
  let max = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Position relative to the center, in CSS px.
      const px = (x + 0.5) / density - width / 2;
      const py = (y + 0.5) / density - height / 2;
      const qx = Math.abs(px) - (width / 2 - r);
      const qy = Math.abs(py) - (height / 2 - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const outside = Math.hypot(ox, oy);
      const inset = r - outside - Math.min(Math.max(qx, qy), 0);
      const i = y * w + x;
      data[i * 4 + 3] = 255;
      if (inset >= bezel || inset < 0) continue;

      // Outward normal: radial in the corners, axis-aligned along the sides.
      let nx = 0;
      let ny = 0;
      if (outside > 0) {
        nx = ox / outside;
        ny = oy / outside;
      } else if (qx > qy) nx = 1;
      else ny = 1;
      nx *= Math.sign(px);
      ny *= Math.sign(py);

      const d = thickness * shift(inset / bezel, steep, ior);
      shifts[i * 2] = d * nx;
      shifts[i * 2 + 1] = d * ny;
      if (d > max) max = d;

      // A crisp line on the rim plus a soft glow, brightest where the rim faces the light.
      const facing = nx * LX + ny * LY;
      const rim = (1 - inset / bezel) ** 6 + 0.25 * Math.max(0, 1 - inset / 1.5);
      data[i * 4 + 2] = Math.min(
        255,
        255 * specular * rim * (0.2 + 0.8 * Math.max(facing, -0.4 * facing)),
      );
    }
  }

  // Normalize so the strongest shift uses the full 8-bit range. Convex glass samples
  // from further inside, hence the minus sign.
  const unit = max || 1;
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 128 - Math.round((127 * shifts[i * 2]) / unit);
    data[i * 4 + 1] = 128 - Math.round((127 * shifts[i * 2 + 1]) / unit);
  }
  // feDisplacementMap moves by scale * (value / 255 - 0.5).
  return { data, width: w, height: h, density, scale: (unit * 255) / 127 };
}
