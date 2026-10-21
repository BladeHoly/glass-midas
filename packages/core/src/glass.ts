import { displacementMap, type LensOptics } from './displacement.js';
import { detectTier, type GlassTier } from './support.js';

export interface GlassOptions {
  /** Corner radius in px; should match the element's border-radius. */
  radius?: number;
  /** Width of the curved rim in px. */
  bezel?: number;
  /** Total height of the glass in px; more thickness bends more. */
  thickness?: number;
  /** Index of refraction: 1.33 water, 1.5 glass. */
  ior?: number;
  /** Opacity of the white rim hairline, 0 to 1. */
  specular?: number;
  /** Saturation of the backdrop seen through the rim hairline; 1 leaves it as is. */
  specularSaturation?: number;
  /** Direction the rim light comes from, in degrees: 0 from the right, −90 from the top. */
  lightAngle?: number;
  /** Rim profile exponent: 2 is a circle, 4 a squircle with a flatter top. */
  curvature?: number;
  /** Magnification of the whole surface, 0 to 0.5. */
  magnify?: number;
  /** Let the rim fold the image into a mirrored band, as thick glass does. */
  caustics?: boolean;
  /** Frost as a CSS length. Defaults to 1px for refraction, the blur-md token otherwise. */
  blur?: string;
  /** Force a tier instead of detecting it. */
  tier?: GlassTier;
}

export interface GlassHandle {
  readonly tier: GlassTier;
  update(options?: GlassOptions): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
let filterCount = 0;

// Maps already drawn, shared by every surface: a size or shape seen before (a nav that
// expands and collapses, identical cards) costs nothing the second time.
const CACHE_SIZE = 32;
const maps = new Map<string, { url: string; scale: number }>();

// While a surface keeps changing size (an animation, a window drag), its last map is
// stretched to fit and the exact one is drawn once the size holds this long.
const SETTLE_MS = 140;

function mapFor(width: number, height: number, optics: LensOptics) {
  const density = Math.min(devicePixelRatio || 1, 2);
  const key = JSON.stringify([width, height, optics, density]);
  let entry = maps.get(key);
  if (entry) {
    maps.delete(key); // refresh its place in the LRU order
  } else {
    const map = displacementMap(width, height, optics, density);
    const canvas = document.createElement('canvas');
    const ctx = map && canvas.getContext('2d');
    if (!map || !ctx) return undefined;
    canvas.width = map.width;
    canvas.height = map.height;
    const image = ctx.createImageData(map.width, map.height);
    image.data.set(map.data);
    ctx.putImageData(image, 0, 0);
    entry = { url: canvas.toDataURL(), scale: map.scale };
    if (maps.size >= CACHE_SIZE) maps.delete(maps.keys().next().value!);
  }
  maps.set(key, entry);
  return entry;
}

function setBackdrop(el: HTMLElement, value: string) {
  el.style.setProperty('backdrop-filter', value);
  el.style.setProperty('-webkit-backdrop-filter', value);
}

/** Turns an element into a glass surface, picking the best tier the browser can render. */
export function createGlass(el: HTMLElement, initial: GlassOptions = {}): GlassHandle {
  let options = initial;
  const tier = options.tier ?? detectTier();
  const id = `gm-glass-${++filterCount}`;
  let svg: SVGSVGElement | undefined;
  let observer: ResizeObserver | undefined;
  let drawn = ''; // optics and size of the map in the filter
  let shape = ''; // the same without the size
  let settle: ReturnType<typeof setTimeout> | undefined;

  el.dataset.glassTier = tier;

  const render = (resizing = false) => {
    if (tier === 'solid') return setBackdrop(el, 'none');
    if (tier === 'blur') {
      const blur = options.blur ?? 'var(--gm-blur-md, 16px)';
      return setBackdrop(el, `blur(${blur}) saturate(var(--gm-saturation-md, 160%))`);
    }
    // Refraction carries the look, so the frost stays light, as in kube.io's search box.
    const tail = `blur(${options.blur ?? '1px'})`;

    const width = el.offsetWidth;
    const height = el.offsetHeight;
    // Defaults reproduce the search box from kube.io's liquid glass article.
    const optics: LensOptics = {
      radius: options.radius ?? 18,
      bezel: options.bezel ?? 20,
      thickness: options.thickness ?? 40,
      ior: options.ior ?? 1.5,
      curvature: options.curvature ?? 4,
      magnify: options.magnify ?? 0,
      caustics: options.caustics ?? true,
      lightAngle: options.lightAngle ?? -60,
    };
    const specular = options.specular ?? 0.2;
    const saturation = options.specularSaturation ?? 4;
    const nextShape = JSON.stringify([optics, specular, saturation]);
    const next = JSON.stringify([width, height, nextShape]);
    if (next === drawn) return setBackdrop(el, `${tail} url(#${id})`);

    clearTimeout(settle);
    if (resizing && svg && nextShape === shape) {
      // Only the size moved: stretch the current map now, draw the exact one when it settles.
      for (const node of svg.querySelectorAll('filter, feImage')) {
        node.setAttribute('width', `${width}`);
        node.setAttribute('height', `${height}`);
      }
      settle = setTimeout(() => render(), SETTLE_MS);
      return;
    }

    const map = mapFor(width, height, optics);
    if (!map) return setBackdrop(el, tail);
    if (!svg) {
      svg = document.body.appendChild(document.createElementNS(SVG_NS, 'svg'));
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    }
    // Bend the backdrop (smoothing magnified pixels unless the rim folds on purpose), then
    // light the rim: a saturated copy of the bent backdrop masked by the hairline in the blue
    // channel, plus the hairline itself in white at the specular opacity.
    const bend = `<feDisplacementMap in="SourceGraphic" in2="map" scale="${map.scale}" xChannelSelector="R" yChannelSelector="G" result="bent"/>`;
    const smooth = optics.caustics
      ? ''
      : '<feGaussianBlur in="bent" stdDeviation="0.6" result="bent"/>';
    svg.innerHTML =
      `<filter id="${id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
      `<feImage href="${map.url}" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>` +
      bend +
      smooth +
      `<feColorMatrix in="map" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 1 0 0" result="rim"/>` +
      `<feColorMatrix in="bent" type="saturate" values="${saturation}" result="vivid"/>` +
      `<feComposite in="vivid" in2="rim" operator="in" result="vividRim"/>` +
      `<feComposite in="vividRim" in2="bent" result="lit"/>` +
      `<feComponentTransfer in="rim" result="line"><feFuncA type="linear" slope="${specular}"/></feComponentTransfer>` +
      `<feComposite in="line" in2="lit"/>` +
      `</filter>`;
    drawn = next;
    shape = nextShape;
    // Frost first, then bend: the rim light added by the filter stays crisp.
    setBackdrop(el, `${tail} url(#${id})`);
  };

  render();
  if (tier === 'refract' && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => render(true));
    observer.observe(el);
  }

  return {
    tier,
    update(next = {}) {
      options = { ...options, ...next };
      render();
    },
    destroy() {
      clearTimeout(settle);
      observer?.disconnect();
      svg?.remove();
      setBackdrop(el, '');
      delete el.dataset.glassTier;
    },
  };
}
