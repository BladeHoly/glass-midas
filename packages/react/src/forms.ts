import '@glass-midas/components/slider';
import '@glass-midas/components/select';
import '@glass-midas/components/otp';
import '@glass-midas/components/quantity';
import type {
  GmOtp,
  GmQuantity,
  GmSelect,
  GmSlider,
  SelectChangeDetail,
} from '@glass-midas/components';
import { forwardRef, useEffect, useImperativeHandle, useRef, createElement } from 'react';
import { synced, type Base } from './wrap.js';

// Forms: controls for inside glass, each around a native input. Fields, checkboxes and radios
// are CSS only (.gm-field, .gm-input, .gm-check): plain elements, no wrapper needed.

/** `<gm-slider>`: put an `<input type="range">` inside. */
export const GlassSlider = synced<GmSlider>('gm-slider');

/**
 * `<gm-select>`: put a `<select>` inside; it keeps working for forms, and React's `onChange` on
 * it fires when an option is picked from the glass list.
 */
export const GlassSelect = synced<GmSelect>('gm-select');

/** `<gm-otp>`: a one-time code, as boxes. Put an `<input maxLength={6}>` inside. */
export const GlassOtp = forwardRef<
  GmOtp,
  Base<GmOtp> & {
    /** Every box is filled: `detail.value` is the code. */
    onComplete?: (e: CustomEvent<{ value: string }>) => void;
  }
>(({ onComplete, ...props }, ref) => {
  const el = useRef<GmOtp>(null);
  useImperativeHandle(ref, () => el.current!);
  useEffect(() => el.current?.sync());
  const handler = useRef(onComplete);
  handler.current = onComplete;
  useEffect(() => {
    const node = el.current!;
    const listener = (e: Event) => handler.current?.(e as CustomEvent<{ value: string }>);
    node.addEventListener('gm-complete', listener);
    return () => node.removeEventListener('gm-complete', listener);
  }, []);
  return createElement('gm-otp', { ...props, ref: el });
});

/**
 * `<gm-quantity>`: put an `<input type="number">` inside; the buttons step it and fire its
 * `onChange`. It redraws after every render, for a controlled value.
 */
export const GlassQuantity = synced<GmQuantity>('gm-quantity');

export type { SelectChangeDetail };
