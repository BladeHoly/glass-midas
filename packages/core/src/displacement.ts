/**
 * Optics of a glass slab lying on the page, with a convex bezel along its rim.
 * A vertical ray hits the curved surface, bends by Snell's law and crosses the rest of
 * the glass to the page; how far sideways it lands is the displacement. On top of that,
 * `magnify` lets the whole surface act as a gentle lens, so the glass reads as glass
 * across the component and not only at its edges.
 * Derivation and references: research/refraction-notes.md and refraction-notes-fable.md.
 */
export interface LensOptics {
  /** Corner radius in px. */
  radius: number;
  /** Width of the curved rim in px; half the smaller side curves the whole surface. */
  bezel: number;
  /** Total height of the glass in px; more thickness bends more. */
  thickness: number;
  /** Index of refraction: 1.33 water, 1.5 glass. */
  ior: number;
  /** Rim highlight strength, 0 to 1. */
  specular: number;
  /** Rim profile exponent: 2 is a circle, 4 (default) a squircle with a flatter top. */
  curvature?: number;
  /** Magnification of the whole surface, 0 to 0.5: content appears 1 / (1 − magnify) larger. */
  magnify?: number;
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

const STEPS = 256;
// Smallest allowed growth of the sampled position per px inward. Real optics folds the
// image over itself in a thin band at the rim; capping magnification at 1 / 0.2 = 5x keeps
// the mapping one-to-one and turns that band into a smooth, strongly compressed edge.
const MIN_STRETCH = 0.2;
// Light from the top left, as in Apple's materials.
const LX = -Math.SQRT1_2;
const LY = -Math.SQRT1_2;

/**
 * Displacement (px, inward) and rim reflectance across the bezel, from the rim (index 0)
 * to where the glass turns flat (index STEPS).
 */
function profile(bezel: number, thickness: number, ior: number, k: number, magnify: number) {
  const rise = Math.min(thickness, bezel); // height of the curved part
  const slab = thickness - rise; // flat glass underneath it
  // Magnifying the surface already compresses the sampled image; leave the rim less room.
  const room = ((1 - magnify - MIN_STRETCH) * bezel) / STEPS;
  const shift = new Float32Array(STEPS + 1);
  const shine = new Float32Array(STEPS + 1);
  for (let i = STEPS - 1; i >= 0; i--) {
    // h(s) = rise · (1 − (1 − s)^k)^(1/k), s = 0 at the rim.
    const u = 1 - i / STEPS;
    const q = Math.max(1 - u ** k, 1e-12);
    const incidence = Math.atan((rise / bezel) * u ** (k - 1) * q ** (1 / k - 1));
    const cosT = Math.sqrt(1 - (Math.sin(incidence) / ior) ** 2);
    const physical =
      (slab + rise * q ** (1 / k)) * Math.tan(incidence - Math.asin(Math.sin(incidence) / ior));
    shift[i] = Math.min(physical, shift[i + 1]! + room);
    // Fresnel reflectance (unpolarized), minus the 4% every glass surface reflects head-on.
    const cosI = Math.cos(incidence);
    const rs = (cosI - ior * cosT) / (cosI + ior * cosT);
    const rp = (ior * cosI - cosT) / (ior * cosI + cosT);
    shine[i] = Math.max(0, (rs * rs + rp * rp) / 2 - 0.04) / 0.96;
  }
  return { shift, shine };
}

/**
 * Builds the displacement map for a rounded rectangle. Red and green hold the
 * horizontal and vertical shift (128 = none), blue holds the rim highlight.
 * Pure: no DOM access, so it also runs on a server or in a worker.
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
  const shifts = new Float32Array(w * h * 2);
  const bezel = Math.max(1, Math.min(optics.bezel, width / 2, height / 2));
  const r = Math.min(optics.radius, width / 2, height / 2);
  // Bend directions use a radius of at least the bezel, so they turn smoothly through the
  // corners instead of meeting at a diagonal seam when the corners are sharp.
  const rn = Math.min(Math.max(r, bezel), width / 2, height / 2);
  const magnify = Math.min(Math.max(optics.magnify ?? 0, 0), 0.5);
  const { shift, shine } = profile(
    bezel,
    optics.thickness,
    optics.ior,
    optics.curvature ?? 4,
    magnify,
  );
  let unit = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      data[i * 4 + 3] = 255;
      const px = (x + 0.5) / density - width / 2;
      const py = (y + 0.5) / density - height / 2;
      const ax = Math.abs(px);
      const ay = Math.abs(py);

      // Distance inside the true rounded rectangle.
      const qx = ax - (width / 2 - r);
      const qy = ay - (height / 2 - r);
      const inset =
        r - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0);
      if (inset < 0) continue;

      // The whole surface samples toward the center: a uniform magnifying lens.
      let sx = -magnify * px;
      let sy = -magnify * py;

      if (inset < bezel) {
        // Outward direction of the smoothed rectangle.
        const cx = ax - (width / 2 - rn);
        const cy = ay - (height / 2 - rn);
        let nx = 0;
        let ny = 0;
        if (cx > 0 && cy > 0) {
          const len = Math.hypot(cx, cy);
          nx = cx / len;
          ny = cy / len;
        } else if (cx > cy) nx = 1;
        else ny = 1;
        nx *= Math.sign(px);
        ny *= Math.sign(py);

        // Linear interpolation into the profile.
        const t = (inset / bezel) * STEPS;
        const k = Math.floor(t);
        const f = t - k;
        const d = shift[k]! * (1 - f) + shift[k + 1]! * f;
        const glint = shine[k]! * (1 - f) + shine[k + 1]! * f;

        // Convex glass samples from further inside, against the outward direction.
        sx -= d * nx;
        sy -= d * ny;
        // Brightest where the rim faces the light, with a dimmer reflection opposite.
        const facing = nx * LX + ny * LY;
        data[i * 4 + 2] =
          255 * optics.specular * glint * (0.25 + 0.75 * Math.max(facing, -0.5 * facing));
      }

      shifts[i * 2] = sx;
      shifts[i * 2 + 1] = sy;
      unit = Math.max(unit, Math.abs(sx), Math.abs(sy));
    }
  }

  // Stretch the strongest shift to the full 8-bit range.
  unit ||= 1;
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 128 + Math.round((127 * shifts[i * 2]!) / unit);
    data[i * 4 + 1] = 128 + Math.round((127 * shifts[i * 2 + 1]!) / unit);
  }
  // feDisplacementMap moves by scale · (value / 255 − 0.5).
  return { data, width: w, height: h, density, scale: (unit * 255) / 127 };
}
