import '@glass-midas/components';
import type {
  CalloutType,
  GmDialog,
  GmMenu,
  GmPopover,
  GmScrollbar,
  GmSearch,
  GmSegmented,
  GmSlider,
  GmTip,
  MenuSelectDetail,
  NavigateDetail,
  SearchResult,
  SearchSource,
  SegmentedChangeDetail,
  TabsChangeDetail,
} from '@glass-midas/components';
import type { GlassTier } from '@glass-midas/core';
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type RefAttributes,
} from 'react';

/** Glass options as props, in camelCase; they reach the element as attributes. */
export interface GlassAttributes {
  radius?: number;
  bezel?: number;
  thickness?: number;
  ior?: number;
  specular?: number;
  specularSaturation?: number;
  lightAngle?: number;
  curvature?: number;
  magnify?: number;
  chroma?: number;
  caustics?: boolean;
  /** A CSS length, or a number of px. */
  blur?: string | number;
  tier?: GlassTier;
  variant?: 'full' | 'lite';
  material?: 'clear' | 'frost';
}

// onSelect and onChange are the components' own events, not the DOM's.
type Base<E> = Omit<HTMLAttributes<E>, 'onSelect' | 'onChange'> & GlassAttributes;
type Wrapped<P, E> = ForwardRefExoticComponent<P & Base<E> & RefAttributes<E>>;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Wraps a gm-* element for React 18 and 19 alike: `properties` are assigned on the element,
 * `events` maps a prop to the DOM event it listens to, and everything else is an attribute
 * (camelCase names become kebab-case, booleans become "true" or "false").
 */
function wrap<P, E extends HTMLElement = HTMLElement>(
  tag: string,
  properties: string[] = [],
  events: Record<string, string> = {},
  attributes: string[] = [],
): Wrapped<P, E> {
  return forwardRef<E, P & Base<E>>((props, ref) => {
    const el = useRef<E>(null);
    useImperativeHandle(ref, () => el.current!);
    const attrs: Record<string, unknown> = { ref: el };
    const values: Record<string, unknown> = {};
    const handlers = useRef<Record<string, (e: Event) => void>>({});
    handlers.current = {};
    for (const [name, value] of Object.entries(props as Record<string, unknown>)) {
      if (properties.includes(name)) values[name] = value;
      else if (events[name]) handlers.current[events[name]!] = value as (e: Event) => void;
      else if (attributes.includes(name) || name in GLASS)
        attrs[kebab(name)] = typeof value === 'boolean' ? String(value) : value;
      // A false flag (spy={false}) means no attribute; React 18 would write "false".
      else if (value !== false) attrs[name] = value;
    }

    // Properties after every render, so a new `source` or `scroller` takes over.
    useEffect(() => {
      Object.assign(el.current!, values);
    });
    // One listener per event, calling whatever handler the latest render passed.
    useEffect(() => {
      const node = el.current!;
      const off = Object.values(events).map((type) => {
        const listener = (e: Event) => handlers.current[type]?.(e);
        node.addEventListener(type, listener);
        return () => node.removeEventListener(type, listener);
      });
      return () => off.forEach((f) => f());
    }, []);

    return createElement(tag, attrs);
  }) as Wrapped<P, E>;
}

const GLASS: Record<keyof GlassAttributes, 1> = {
  radius: 1,
  bezel: 1,
  thickness: 1,
  ior: 1,
  specular: 1,
  specularSaturation: 1,
  lightAngle: 1,
  curvature: 1,
  magnify: 1,
  chroma: 1,
  caustics: 1,
  blur: 1,
  tier: 1,
  variant: 1,
  material: 1,
};

/** `<gm-surface>`: any block as a glass panel. */
export const GlassSurface = wrap<{}>('gm-surface');

/** `<gm-button>`: a glass pill around a native button or link. */
export const GlassButton = wrap<{ shape?: 'pill' | 'round' }>('gm-button');

/** `<gm-callout>`: a note, tip, caution or danger aside. */
export const GlassCallout = wrap<{ type?: CalloutType; heading?: string }>('gm-callout');

/** `<gm-code>`: a code block with a copy button. Put a `<pre>` inside. */
export const GlassCode = wrap<{ labelCopy?: string; labelCopied?: string }>('gm-code', [], {}, [
  'labelCopy',
  'labelCopied',
]);

/** `<gm-tabs>`: tabs from its `GlassTab` children. Tabs sharing `sync` switch together. */
export const GlassTabs = wrap<{
  sync?: string;
  /** The selected tab changed, by the user or a synced group. */
  onChange?: (e: CustomEvent<TabsChangeDetail>) => void;
}>('gm-tabs', [], { onChange: 'gm-change' });

/** `<gm-tab>`: one tab of `GlassTabs`. */
export const GlassTab = wrap<{ label: string }>('gm-tab');

/** `<gm-nav>`: links with a droplet under the current one. */
export const GlassNav = wrap<{
  orientation?: 'horizontal' | 'vertical';
  spy?: boolean;
  /** An in-page link was clicked. Call `preventDefault()` to scroll your own way. */
  onNavigate?: (e: CustomEvent<NavigateDetail>) => void;
}>('gm-nav', [], { onNavigate: 'gm-navigate' });

/** `<gm-search>`: the glass search box, with results from `source`. */
export const GlassSearch = wrap<
  {
    source?: SearchSource;
    placeholder?: string;
    label?: string;
    hotkey?: string;
    empty?: string;
    /** A result was picked. Call `preventDefault()` to route your own way. */
    onSelect?: (e: CustomEvent<SearchResult>) => void;
  },
  GmSearch
>('gm-search', ['source'], { onSelect: 'gm-select' });

/** `<gm-segmented>`: one choice among a few. Put buttons with a `value` inside. */
export const GlassSegmented = wrap<
  {
    value?: string;
    label?: string;
    /** The user chose another option. */
    onChange?: (e: CustomEvent<SegmentedChangeDetail>) => void;
  },
  GmSegmented
>('gm-segmented', [], { onChange: 'gm-change' });

interface Floating {
  /** The id of the element to float next to, when no `popovertarget` names this one. */
  anchor?: string;
  placement?: 'bottom' | 'top';
}

/** `<gm-popover>`: frosted glass next to the button whose `popovertarget` is its `id`. */
export const GlassPopover = wrap<Floating, GmPopover>('gm-popover');

/** `<gm-menu>`: a popover of actions. Put buttons (with a `value`) or links inside. */
export const GlassMenu = wrap<
  Floating & {
    /** An item was picked. Call `preventDefault()` to keep the menu open. */
    onSelect?: (e: CustomEvent<MenuSelectDetail>) => void;
  },
  GmMenu
>('gm-menu', [], { onSelect: 'gm-select' });

/** `<gm-dialog>`: a modal of frosted glass; `placement="bottom"` for a sheet. Open it with `ref.current.show()`. */
export const GlassDialog = wrap<
  {
    heading?: string;
    placement?: 'center' | 'bottom';
    /** It closed: `detail.value` is the button's value, `"cancel"` (Escape) or `"dismiss"`. */
    onClose?: (e: CustomEvent<{ value: string }>) => void;
  },
  GmDialog
>('gm-dialog', [], { onClose: 'gm-close' });

/** `<gm-tip>`: a tip on frosted glass, inline or anchored to an element, with a close button. */
export const GlassTip = wrap<
  {
    heading?: string;
    /** The id of the element to float next to. */
    anchor?: string;
    placement?: 'bottom' | 'top';
    /** A key that keeps the tip closed on later visits once dismissed. */
    remember?: string;
    labelClose?: string;
    /** The tip is closing. Call `preventDefault()` to keep it open. */
    onDismiss?: (e: CustomEvent) => void;
  },
  GmTip
>('gm-tip', [], { onDismiss: 'gm-dismiss' }, ['labelClose']);

/** `<gm-scrollbar>`: a quiet glass thumb for the page's scroll. */
export const GlassScrollbar = wrap<{ scroller?: (y: number) => void }, GmScrollbar>(
  'gm-scrollbar',
  ['scroller'],
);

/**
 * `<gm-slider>`: put an `<input type="range">` inside. It repaints after every render, since a
 * controlled input's value changes without an `input` event.
 */
export const GlassSlider = forwardRef<GmSlider, HTMLAttributes<GmSlider>>((props, ref) => {
  const el = useRef<GmSlider>(null);
  useImperativeHandle(ref, () => el.current!);
  useEffect(() => el.current?.sync());
  return createElement('gm-slider', { ...props, ref: el });
});

/** Shows a toast: a function, so it needs no component. */
export { toast, type ToastOptions } from '@glass-midas/components';

export type {
  CalloutType,
  MenuSelectDetail,
  NavigateDetail,
  SearchResult,
  SearchSource,
  SegmentedChangeDetail,
  TabsChangeDetail,
};
