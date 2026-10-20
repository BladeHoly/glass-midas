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
  /** Rim profile exponent: 2 is a circle, 4 (default) a squircle with a flatter top. */
  curvature?: number;
  /** Magnification of the whole surface, 0 to 0.5: content appears 1 / (1 − magnify) larger. */
  magnify?: number;
  /**
   * Let the rim fold the image over itself, as thick real glass does: a band of stretched,
   * mirrored backdrop along the edge. Off by default, which caps magnification at 5×.
   */
  caustics?: boolean;
  /** Direction the rim light comes from, in degrees: 0 from the right, −90 from the top. Default −60. */
  lightAngle?: number;
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

/**
 * Displacement (px, inward) across the bezel in 257 steps, from the rim (index 0) to where the
 * glass turns flat (index 256). Shared by the SVG map and the WebGL renderer.
 */
export function lensProfile(
  bezel: number,
  thickness: number,
  ior: number,
  k: number,
  magnify: number,
  caustics: boolean,
) {
  const rise = Math.min(thickness, bezel); // height of the curved part
  const slab = thickness - rise; // flat glass underneath it
  // Magnifying the surface already compresses the sampled image; leave the rim less room.
  const room = caustics ? Infinity : ((1 - magnify - MIN_STRETCH) * bezel) / STEPS;
  const shift = new Float32Array(STEPS + 1);
  for (let i = STEPS - 1; i >= 0; i--) {
    // h(s) = rise · (1 − (1 − s)^k)^(1/k), s = 0 at the rim.
    const u = 1 - i / STEPS;
    const q = Math.max(1 - u ** k, 1e-12);
    const incidence = Math.atan((rise / bezel) * u ** (k - 1) * q ** (1 / k - 1));
    const physical =
      (slab + rise * q ** (1 / k)) * Math.tan(incidence - Math.asin(Math.sin(incidence) / ior));
    shift[i] = Math.min(physical, shift[i + 1]! + room);
  }
  return shift;
}

/**
 * Builds the displacement map for a rounded rectangle. Red and green hold the
 * horizontal and vertical shift (128 = none). Blue is the rim light: a hairline 1.25 px inside
 * the edge, as bright as (n·L)² for the light direction, like kube.io's liquid glass. The
 * renderer uses it as a mask for a saturated copy of the backdrop and a faint white line.
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
  const shift = lensProfile(
    bezel,
    optics.thickness,
    optics.ior,
    optics.curvature ?? 4,
    magnify,
    optics.caustics ?? false,
  );
  const angle = ((optics.lightAngle ?? -60) * Math.PI) / 180;
  const lx = Math.cos(angle);
  const ly = Math.sin(angle);
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

        // Convex glass samples from further inside, against the outward direction.
        sx -= d * nx;
        sy -= d * ny;
        // Rim light: a parabolic hairline peaking 1.25 px in, lit on both the side facing the
        // light and the opposite one, as (n·L)².
        const line = 1 - (inset - 1.25) ** 2;
        if (line > 0) data[i * 4 + 2] = 255 * line * (nx * lx + ny * ly) ** 2;
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
