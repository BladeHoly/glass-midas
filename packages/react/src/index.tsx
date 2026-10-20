import { createGlass, type GlassHandle, type GlassOptions } from '@glass-midas/core';
import { useEffect, useRef, type ComponentPropsWithoutRef, type RefObject } from 'react';

/** Attaches a glass surface to the referenced element for the component's lifetime. */
export function useGlass<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: GlassOptions = {},
): void {
  const handle = useRef<GlassHandle | null>(null);
  const { tier, radius, bezel, thickness, ior, specular, curvature, magnify, blur } = options;

  useEffect(() => {
    if (!ref.current) return;
    handle.current = createGlass(ref.current, {
      tier,
      radius,
      bezel,
      thickness,
      ior,
      specular,
      blur,
    });
    return () => handle.current?.destroy();
    // Only the tier forces a new surface; other options go through update() below.
  }, [ref, tier]);

  useEffect(() => {
    handle.current?.update({ radius, bezel, thickness, ior, specular, curvature, magnify, blur });
  }, [radius, bezel, thickness, ior, specular, curvature, magnify, blur]);
}

export type GlassProps = ComponentPropsWithoutRef<'div'> & { glass?: GlassOptions };

/** Headless glass primitive: a div with the glass engine attached and no other styling. */
export function Glass({ glass, ...props }: GlassProps) {
  const ref = useRef<HTMLDivElement>(null);
  useGlass(ref, glass);
  return <div ref={ref} {...props} />;
}

export type { GlassOptions, GlassTier } from '@glass-midas/core';
