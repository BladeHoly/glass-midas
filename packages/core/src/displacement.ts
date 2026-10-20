/**
 * Builds a displacement map for a rounded rectangle: neutral (128) in the flat
 * center, bending inward near the rim like the edge of a lens. Red encodes X,
 * green encodes Y, so feDisplacementMap can read it directly.
 */
export function displacementMap(
  width: number,
  height: number,
  radius: number,
  bezel: number,
): ImageData | undefined {
  if (typeof document === 'undefined' || width < 1 || height < 1) return undefined;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;

  const img = ctx.createImageData(width, height);
  const r = Math.min(radius, width / 2, height / 2);
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Distance from the pixel to the rounded rect's edge (positive inside).
      const qx = Math.abs(x - cx) - (cx - r);
      const qy = Math.abs(y - cy) - (cy - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const outside = Math.hypot(ox, oy);
      const dist = r - (outside + Math.min(Math.max(qx, qy), 0));
      // Outward normal: radial in the corners, axis-aligned along the sides.
      let nx = 0;
      let ny = 0;
      if (outside > 0) {
        nx = ox / outside;
        ny = oy / outside;
      } else if (qx > qy) nx = 1;
      else ny = 1;
      const t = Math.max(0, 1 - dist / bezel); // 0 in the flat center, 1 on the rim
      const strength = t * t * 127;
      const i = (y * width + x) * 4;
      img.data[i] = 128 - strength * nx * Math.sign(x - cx);
      img.data[i + 1] = 128 - strength * ny * Math.sign(y - cy);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  return img;
}
