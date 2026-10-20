export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Fit = 'cover' | 'contain' | 'fill';

/** What sits behind the glass, and where it appears on screen. */
export interface Backdrop {
  /** Pixels to refract. */
  source: TexImageSource;
  /** The box the source is drawn into, in viewport coordinates. */
  rect(): Rect;
  /** How the source fills that box, like CSS object-fit. Defaults to `fill`. */
  fit?: Fit;
  /** Re-upload the source every frame (video, animated canvas). */
  live?: boolean;
}

export type BackdropInput = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | Backdrop;

/** Intrinsic size of a source, or 0 × 0 while it isn't loaded yet. */
export function sourceSize(source: TexImageSource): [number, number] {
  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement)
    return [source.naturalWidth, source.naturalHeight];
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement)
    return [source.videoWidth, source.videoHeight];
  const s = source as { width?: number; height?: number };
  return [s.width ?? 0, s.height ?? 0];
}

/** Where the source's pixels land inside its box, for a centered object-fit. */
export function contentRect(box: Rect, width: number, height: number, fit: Fit = 'fill'): Rect {
  if (fit === 'fill' || !width || !height) return box;
  const pick = fit === 'cover' ? Math.max : Math.min;
  const scale = pick(box.width / width, box.height / height);
  const w = width * scale;
  const h = height * scale;
  return { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h };
}

/** Wraps an image, video or canvas element that's visible behind the glass. */
export function toBackdrop(input: BackdropInput): Backdrop {
  if (!(input instanceof Element)) return input;
  const fit = getComputedStyle(input).objectFit;
  return {
    source: input,
    rect: () => input.getBoundingClientRect(),
    fit: fit === 'cover' || fit === 'contain' ? fit : 'fill',
    live: !(input instanceof HTMLImageElement),
  };
}
