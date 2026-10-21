import { define } from './base.js';
import { GmButton } from './button.js';
import { GmCallout } from './callout.js';
import { GmCode } from './code.js';
import { GmNav } from './nav.js';
import { GmScrollbar } from './scrollbar.js';
import { GmSearch } from './search.js';
import { GmSurface } from './surface.js';
import { GmTabs } from './tabs.js';
import { GmTip } from './tip.js';

// Importing the package registers every element. Pair it with the stylesheet:
// import '@glass-midas/components/styles.css'.
define('gm-surface', GmSurface);
define('gm-button', GmButton);
define('gm-callout', GmCallout);
define('gm-code', GmCode);
define('gm-tabs', GmTabs);
define('gm-nav', GmNav);
define('gm-search', GmSearch);
define('gm-scrollbar', GmScrollbar);
define('gm-tip', GmTip);

export { define, glassOptions, GlassElement } from './base.js';
export { Droplet, boxOf, type Box } from './droplet.js';
export { GmSurface, GmButton, GmCallout, GmCode, GmTabs, GmNav, GmSearch, GmScrollbar, GmTip };
export type { CalloutType } from './callout.js';
export type { NavigateDetail } from './nav.js';
export type { SearchResult, SearchSource } from './search.js';
export type { TabsChangeDetail } from './tabs.js';
