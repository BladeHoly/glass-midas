import '@glass-midas/components/popover';
import '@glass-midas/components/menu';
import '@glass-midas/components/dialog';
import '@glass-midas/components/tip';
import type { GmDialog, GmMenu, GmPopover, GmTip, MenuSelectDetail } from '@glass-midas/components';
import { wrap } from './wrap.js';

// Overlays: glass that floats over the page.

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

/** Shows a toast: a function, so it needs no component. */
export { toast, type ToastOptions } from '@glass-midas/components/toast';

export type { MenuSelectDetail };
