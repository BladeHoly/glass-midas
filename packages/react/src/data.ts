import '@glass-midas/components/table';
import '@glass-midas/components/gallery';
import type {
  GmGallery,
  GmTable,
  TableSelectionDetail,
  TableSortDetail,
} from '@glass-midas/components';
import { Children, createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { wrap, type Base } from './wrap.js';

// Data: tables, pictures, and what goes in them. Badges, avatars, skeletons, pagination, prices,
// totals, ratings, steps, timelines and empty states are CSS only (.gm-badge, .gm-price,
// .gm-rating, .gm-steps…): plain elements, no wrapper needed.

/**
 * `<gm-table>`: put a `<table>` inside. With `onSort`, the table leaves its rows to React: sort
 * your data there (the header still shows the order). `onSelectionChange` reports the values of
 * the checked rows.
 */
export const GlassTable = forwardRef<
  GmTable,
  Omit<Base<GmTable>, 'onSelect'> & {
    density?: 'compact' | 'regular' | 'relaxed';
    stack?: boolean;
    pin?: boolean;
    onSort?: (detail: TableSortDetail) => void;
    onSelectionChange?: (detail: TableSelectionDetail) => void;
  }
>(({ onSort, onSelectionChange, stack, pin, ...props }, ref) => {
  const el = useRef<GmTable>(null);
  useImperativeHandle(ref, () => el.current!);
  const handlers = useRef({ onSort, onSelectionChange });
  handlers.current = { onSort, onSelectionChange };
  useEffect(() => {
    const node = el.current!;
    const sort = (e: Event) => {
      const { onSort } = handlers.current;
      if (!onSort) return;
      e.preventDefault();
      onSort((e as CustomEvent<TableSortDetail>).detail);
    };
    const selection = (e: Event) =>
      handlers.current.onSelectionChange?.((e as CustomEvent<TableSelectionDetail>).detail);
    node.addEventListener('gm-sort', sort);
    node.addEventListener('gm-selection', selection);
    return () => {
      node.removeEventListener('gm-sort', sort);
      node.removeEventListener('gm-selection', selection);
    };
  }, []);
  return createElement('gm-table', {
    ...props,
    stack: stack ? '' : undefined,
    pin: pin ? '' : undefined,
    ref: el,
  });
});

const Gallery = wrap<
  {
    zoom?: boolean;
    labelPrevious?: string;
    labelNext?: string;
    labelThumbs?: string;
    labelZoom?: string;
    labelClose?: string;
    /** Another picture is showing: `detail.index`. */
    onChange?: (e: CustomEvent<{ index: number }>) => void;
  },
  GmGallery
>('gm-gallery', [], { onChange: 'gm-change' }, [
  'labelPrevious',
  'labelNext',
  'labelThumbs',
  'labelZoom',
  'labelClose',
]);

/**
 * `<gm-gallery>`: put the `<img>`s inside. The element moves them onto its track, so when the
 * number of pictures changes it starts over (a new `src` on the same pictures is fine). Show one
 * from code with `ref.current.show(i)`.
 */
export const GlassGallery: typeof Gallery = forwardRef((props, ref) =>
  createElement(Gallery, {
    ...props,
    zoom: props.zoom ? '' : undefined,
    key: Children.count(props.children),
    ref,
  } as never),
) as typeof Gallery;

export type { TableSelectionDetail, TableSortDetail };
