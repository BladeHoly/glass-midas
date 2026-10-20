import { displacementMap } from './displacement.js';
import { detectTier, type GlassTier } from './support.js';

export interface GlassOptions {
  /** Corner radius in px; should match the element's border-radius. */
  radius?: number;
  /** Width of the refracting rim in px. */
  bezel?: number;
  /** feDisplacementMap scale; higher bends more. */
  refraction?: number;
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

  el.dataset.glassTier = tier;

  const render = () => {
    const blur = options.blur ?? 'var(--gm-blur-md, 16px)';
    const tail = `blur(${blur}) saturate(var(--gm-saturation-md, 160%))`;
    if (tier === 'solid') return setBackdrop(el, 'none');
    if (tier === 'blur') return setBackdrop(el, tail);

    const { width, height } = el.getBoundingClientRect();
    const map = displacementMap(
      Math.round(width),
      Math.round(height),
      options.radius ?? 18,
      options.bezel ?? 16,
    );
    if (!map) return setBackdrop(el, tail);
    const canvas = document.createElement('canvas');
    canvas.width = map.width;
    canvas.height = map.height;
    canvas.getContext('2d')?.putImageData(map, 0, 0);

    if (!svg) {
      svg = document.body.appendChild(document.createElementNS(SVG_NS, 'svg'));
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    }
    svg.innerHTML = `<filter id="${id}" x="0" y="0" width="${map.width}" height="${map.height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${canvas.toDataURL()}" width="${map.width}" height="${map.height}" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="${options.refraction ?? 28}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
    setBackdrop(el, `url(#${id}) ${tail}`);
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
