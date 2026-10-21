import '@glass-midas/components/table';
import type { GmTable, TableSelectionDetail, TableSortDetail } from '@glass-midas/components';
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Base } from './wrap.js';

// Data: tables, and what goes in them. Badges, avatars, skeletons and pagination are CSS only
// (.gm-badge, .gm-avatar, .gm-skeleton, .gm-pagination): plain elements, no wrapper needed.

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

export type { TableSelectionDetail, TableSortDetail };
