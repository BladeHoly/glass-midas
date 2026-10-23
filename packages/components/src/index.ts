import { GmButton } from './button.js';
import { GmCallout } from './callout.js';
import { GmCode } from './code.js';
import { GmDialog } from './dialog.js';
import { GmGallery } from './gallery.js';
import { GmMenu } from './menu.js';
import { GmNav } from './nav.js';
import { GmPopover } from './popover.js';
import { GmOtp } from './otp.js';
import { GmQuantity } from './quantity.js';
import { GmScrollbar } from './scrollbar.js';
import { GmSearch } from './search.js';
import { GmSelect } from './select.js';
import { GmSegmented } from './segmented.js';
import { GmSlider } from './slider.js';
import { GmSurface } from './surface.js';
import { GmTable } from './table.js';
import { GmTabs } from './tabs.js';
import { GmTip } from './tip.js';
import { GmUpload } from './upload.js';
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
  GmSelect,
  GmOtp,
  GmTable,
  GmQuantity,
  GmGallery,
  GmUpload,
};
export { toast, type ToastOptions } from './toast.js';
export type { CalloutType } from './callout.js';
export type { NavigateDetail } from './nav.js';
export type { SearchResult, SearchSource } from './search.js';
export type { TabsChangeDetail } from './tabs.js';
export type { SegmentedChangeDetail } from './segmented.js';
export type { MenuSelectDetail } from './menu.js';
export type { SelectChangeDetail } from './select.js';
export type { TableFilterDetail, TableSelectionDetail, TableSortDetail } from './table.js';
export type { UploadRejectDetail, UploadRejectReason } from './upload.js';
