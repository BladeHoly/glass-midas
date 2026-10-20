/**
 * Rendering tiers, best to worst:
 * - `refract`: SVG displacement inside backdrop-filter (only Chromium renders it).
 * - `blur`: plain backdrop-filter (Safari, Firefox).
 * - `solid`: no backdrop support, or the user asked for less transparency.
 */
export type GlassTier = 'refract' | 'blur' | 'solid';

export interface SupportEnv {
  supports(property: string, value: string): boolean;
  matchMedia(query: string): { matches: boolean };
  isChromium: boolean;
}

type NavigatorUAData = Navigator & { userAgentData?: { brands: { brand: string }[] } };

function browserEnv(): SupportEnv | null {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') return null;
  const brands = (navigator as NavigatorUAData).userAgentData?.brands;
  return {
    supports: (p, v) => CSS.supports(p, v),
    matchMedia: (q) => window.matchMedia(q),
    isChromium: brands?.some((b) => b.brand === 'Chromium') ?? false,
  };
}

/** Pass `null` to describe a non-browser environment (SSR). */
export function detectTier(env: SupportEnv | null = browserEnv()): GlassTier {
  if (!env) return 'solid';
  if (env.matchMedia('(prefers-reduced-transparency: reduce)').matches) return 'solid';
  const backdrop =
    env.supports('backdrop-filter', 'blur(1px)') ||
    env.supports('-webkit-backdrop-filter', 'blur(1px)');
  if (!backdrop) return 'solid';
  return env.isChromium ? 'refract' : 'blur';
}
