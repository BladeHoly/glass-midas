import { GmButton } from './button.js';
import { GmCallout } from './callout.js';
import { GmCode } from './code.js';
import { GmDialog } from './dialog.js';
import { GmMenu } from './menu.js';
import { GmNav } from './nav.js';
import { GmPopover } from './popover.js';
import { GmScrollbar } from './scrollbar.js';
import { GmSearch } from './search.js';
import { GmSegmented } from './segmented.js';
import { GmSlider } from './slider.js';
import { GmSurface } from './surface.js';
import { GmTabs } from './tabs.js';
import { GmTip } from './tip.js';
import { GmToast } from './toast.js';

// The whole library: importing it registers every element. Each one is also its own entry
// (@glass-midas/components/menu), which registers that element alone; pair either with its
// stylesheet: @glass-midas/components/styles.css, or css/base.css plus css/<name>.css.

export { define, glassOptions, GlassElement } from './base.js';
export { Droplet, boxOf, type Box } from './droplet.js';
export {
  GmSurface,
  GmButton,
  GmCallout,
  GmCode,
  GmTabs,
  GmNav,
  GmSearch,
  GmScrollbar,
  GmTip,
  GmSegmented,
  GmPopover,
  GmMenu,
  GmDialog,
  GmToast,
  GmSlider,
};
export { toast, type ToastOptions } from './toast.js';
export type { CalloutType } from './callout.js';
export type { NavigateDetail } from './nav.js';
export type { SearchResult, SearchSource } from './search.js';
export type { TabsChangeDetail } from './tabs.js';
export type { SegmentedChangeDetail } from './segmented.js';
export type { MenuSelectDetail } from './menu.js';
