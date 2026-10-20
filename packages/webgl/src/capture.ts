import type { Backdrop } from './backdrop.js';

export interface CaptureOptions {
  /** Elements to leave out of the snapshot, usually the glass surfaces themselves. */
  exclude?: Element[];
  /** Snapshot resolution; defaults to the screen's, capped at 2. */
  pixelRatio?: number;
}

/**
 * Snapshots an element's rendered HTML into a backdrop, for glass over arbitrary DOM.
 * Needs the optional `html-to-image` package. It's a still image: call it again after the
 * content changes. Prefer passing an image, video or canvas directly when you have one.
 */
export async function captureBackdrop(
  node: HTMLElement,
  { exclude = [], pixelRatio = Math.min(devicePixelRatio || 1, 2) }: CaptureOptions = {},
): Promise<Backdrop> {
  let toCanvas: typeof import('html-to-image').toCanvas;
  try {
    ({ toCanvas } = await import('html-to-image'));
  } catch {
    throw new Error('captureBackdrop needs the html-to-image package: npm install html-to-image');
  }
  const canvas = await toCanvas(node, {
    pixelRatio,
    filter: (n) => !exclude.some((e) => e === n || e.contains(n)),
  });
  return { source: canvas, rect: () => node.getBoundingClientRect(), fit: 'fill' };
}
