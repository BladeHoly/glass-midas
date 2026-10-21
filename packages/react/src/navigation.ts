import '@glass-midas/components/tabs';
import '@glass-midas/components/nav';
import '@glass-midas/components/search';
import '@glass-midas/components/segmented';
import '@glass-midas/components/scrollbar';
import type {
  GmScrollbar,
  GmSearch,
  GmSegmented,
  NavigateDetail,
  SearchResult,
  SearchSource,
  SegmentedChangeDetail,
  TabsChangeDetail,
} from '@glass-midas/components';
import { wrap } from './wrap.js';

// Navigation: moving around a page and between pages.

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

/** `<gm-scrollbar>`: a quiet glass thumb for the page's scroll. */
export const GlassScrollbar = wrap<{ scroller?: (y: number) => void }, GmScrollbar>(
  'gm-scrollbar',
  ['scroller'],
);

export type { NavigateDetail, SearchResult, SearchSource, SegmentedChangeDetail, TabsChangeDetail };
