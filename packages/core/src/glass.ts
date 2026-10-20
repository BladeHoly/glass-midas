import { displacementMap, type LensOptics } from './displacement.js';
import { detectTier, type GlassTier } from './support.js';

export interface GlassOptions {
  /** Corner radius in px; should match the element's border-radius. */
  radius?: number;
  /** Width of the curved rim in px. */
  bezel?: number;
  /** Height of the glass in px; more thickness bends more. */
  thickness?: number;
  /** Index of refraction: 1.33 water, 1.5 glass. */
  ior?: number;
  /** Rim highlight strength, 0 to 1. */
  specular?: number;
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
  let drawn = '';

  el.dataset.glassTier = tier;

  const render = () => {
    const blur = options.blur ?? 'var(--gm-blur-md, 16px)';
    const tail = `blur(${blur}) saturate(var(--gm-saturation-md, 160%))`;
    if (tier === 'solid') return setBackdrop(el, 'none');
    if (tier === 'blur') return setBackdrop(el, tail);

    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const optics: LensOptics = {
      radius: options.radius ?? 18,
      bezel: options.bezel ?? 20,
      thickness: options.thickness ?? 24,
      ior: options.ior ?? 1.5,
      specular: options.specular ?? 0.6,
    };
    // The map depends only on size and optics, so moving the element never redraws it.
    const key = JSON.stringify([width, height, optics]);
    if (key !== drawn && !drawMap(width, height, optics)) return setBackdrop(el, tail);
    drawn = key;
    setBackdrop(el, `url(#${id}) ${tail}`);
  };

  const drawMap = (width: number, height: number, optics: LensOptics) => {
    const map = displacementMap(width, height, optics, Math.min(devicePixelRatio || 1, 2));
    if (!map) return false;
    const canvas = document.createElement('canvas');
    canvas.width = map.width;
    canvas.height = map.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const image = ctx.createImageData(map.width, map.height);
    image.data.set(map.data);
    ctx.putImageData(image, 0, 0);

    if (!svg) {
      svg = document.body.appendChild(document.createElementNS(SVG_NS, 'svg'));
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    }
    // Bend the backdrop, then lay the rim highlight (blue channel) over it as white.
    svg.innerHTML = `<filter id="${id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${canvas.toDataURL()}" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="${map.scale}" xChannelSelector="R" yChannelSelector="G" result="bent"/><feColorMatrix in="map" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 1 0 0" result="rim"/><feComposite in="rim" in2="bent"/></filter>`;
    return true;
  };

  render();
  if (tier === 'refract' && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(render);
    observer.observe(el);
  }

  return {
    tier,
    update(next = {}) {
      options = { ...options, ...next };
      render();
    },
    destroy() {
      observer?.disconnect();
      svg?.remove();
      setBackdrop(el, '');
      delete el.dataset.glassTier;
    },
  };
}
