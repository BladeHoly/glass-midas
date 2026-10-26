# @glass-midas/components

## 0.6.1

### Patch Changes

- f442b0f: `gm-table`: a column's filter button is at least 24 by 24 pixels, so it meets the WCAG 2.2 target size even beside a short header.

## 0.6.0

### Minor Changes

- 8507947: `gm-table` filters by column: `data-filter` on a header adds a button with the column's values (with counts) to check one or several; `gm-filter` is cancelable for server-side data, with `data-filter-options` to list the values, and `filter()`, `clearFilters()` and `filters` drive it from code. React: `onFilter` on `GlassTable`.

## 0.5.0

### Minor Changes

- 0f8cbce: Commerce pieces: `gm-gallery` (pictures on a snapping track, thumbnails, keys and a large view) and `gm-upload` (drop or choose files, with previews and limits); swatches, choices and options (`.gm-swatch`, `.gm-choice`, `.gm-option`), prices and totals, ratings, steps and timelines, accordions, breadcrumbs and empty states, CSS only; `gm-slider` takes two inputs for a range; `gm-dialog` opens as a drawer with `placement="end"` or `"start"`. React: `GlassGallery` in `/data`, `GlassUpload` in `/forms`.

### Patch Changes

- 9f0e6f4: `gm-table` keeps visually hidden text in its cells inside its own scroll, so a wide table on a phone no longer widens the page.

## 0.4.0

### Minor Changes

- 4b3c954: `gm-quantity`: a number with a button either side to take one off or add one, on the native number input, stopping at its limits. React: `GlassQuantity` in `/forms`.
- 0b245f0: Stats and meters, CSS only: `.gm-stat` (a number, how it moved with an arrow and a good or bad color, and an optional sparkline) and `.gm-meter` (a share on a track of the same color, with status tones).
- 0449d81: Data pieces: `gm-table` (a native table that sorts, selects rows with a select-all, comes in three densities, pins its first column and becomes cards on a phone), and the CSS-only badges (`.gm-badge`), avatars (`.gm-avatar`), skeletons (`.gm-skeleton`) and pagination (`.gm-pagination`).

### Patch Changes

- 2a3d517: Tabs: a row of tabs wider than its box scrolls sideways instead of widening the page.

## 0.3.0

### Minor Changes

- e14a352: Chips: `.gm-chip-primary` for the one action a surface is for, `aria-busy="true"` for a spinner while it runs, and a dimmed disabled state. An invalid field and an invalid code box keep the focus ring while they're being fixed.
- 16244ea: Form controls for inside glass: fields (`.gm-field`, `.gm-input`, `.gm-input-group`), checkboxes and radios (`.gm-check`), `gm-select` (a native select with its list on frosted glass) and `gm-otp` (a one-time code as boxes, on one real input). Callout colors now follow the status tokens, and `--gm-ink-inverse` sets what reads on a fill of the ink.

### Patch Changes

- Updated dependencies [16244ea]
  - @glass-midas/core@0.2.0

## 0.2.0

### Minor Changes

- 837186a: New `gm-dialog`: a modal of frosted glass on the browser's `<dialog>` (top layer, dimmed backdrop, focus trapping, Escape), centered or, with `placement="bottom"`, a sheet that rises from the bottom edge. It rises in as it opens. `show()` and `close(value)`; buttons in a `<form method="dialog">` close it with their `value`, Escape as `"cancel"` and a click on the backdrop as `"dismiss"`, all reported by `gm-close`. In React, `GlassDialog` with `onClose`.
- 61e6faa: Every component is its own entry: `import '@glass-midas/components/menu'` registers that element alone (with what it needs, here the popover), so a page only loads what it uses. Styles come the same way: `css/base.css` plus `css/<name>.css`, or everything in `styles.css` as before. The sheets sit in cascade layers (`gm-base`, `gm-components`, `gm-overrides`), so they work in any order, and any CSS of yours outside a layer wins over them; reduced motion now also covers toasts, toggles and sliders.

  `@glass-midas/components/styles.css` still imports the whole stylesheet. On a CDN, its file moved from `src/styles.css` to `dist/styles.css`.

- 3cdd832: New `gm-popover` and `gm-menu`, on the browser's popover API: frosted glass in the top layer that a button opens with `popovertarget`, no script needed, and that closes on Escape and on a click outside. It floats next to its button (or `anchor`), on the side `placement` prefers, flipped when there's no room, and returns focus to the button when it closes. `gm-menu` adds a menu's roles, focus on its first item, arrow keys, Home and End, a droplet under the focused item, separators (`<hr>`), and a cancelable `gm-select` with `{ value, label }`. `gm-tip` now flips too, its arrow following the side it lands on. In React, `GlassPopover` and `GlassMenu` (`onSelect`).
- 30e12c3: New `gm-segmented`: one choice among a few on a glass bar, with a droplet under the chosen option. Any child with a `value` is an option (icons welcome); it's a radio group with arrow-key, Home and End navigation. `value` (attribute and property) reads and sets the choice; a choice by the user fires `gm-change` with `{ value, index }`. In React, `GlassSegmented` with `onChange`.
- 7e5afae: `gm-tabs` fires `gm-change` (`{ index, label }`) when the selected tab changes, by the user or a synced group, and not when the same tab is selected again. In React, `GlassTabs` takes it as `onChange`.
- 8088228: New `gm-tip`: a tip that teaches one thing, on frosted glass, with an optional icon (`slot="icon"`), a heading, actions (`.gm-tip-actions`) and a close button. Inline by default; with `anchor`, it floats next to that element (`placement` bottom or top) with an arrow, following it as the page scrolls. Closing fires a cancelable `gm-dismiss`; with `remember`, a closed tip stays closed. `dismiss()` and `show()`. In React, `GlassTip` with `onDismiss`.
- f2611f9: New `toast(message, { action, duration })` and `gm-toast`: a short message on frosted glass at the bottom center that goes away on its own (4 s by default), waits while the pointer or focus is on it, stacks up to three, and is announced politely to screen readers. An action shows as a chip and closes the toast. Dismissing fires `gm-dismiss`. `@glass-midas/react/components` re-exports `toast`.
- 7d10585: New controls for inside glass. `.gm-toggle` makes a native checkbox a switch, with no script: a light track, the accent when on (`--gm-toggle-on`), a white knob (`--gm-knob`) that stretches while held. `gm-slider` wraps a native range input and paints its fill (`--gm-slider-fill`) up to the value; `sync()` repaints after a value set from code. In React, `GlassSlider` repaints after every render.

### Patch Changes

- 30e12c3: `gm-code`'s copy button is an icon that turns into a check once copied, centered on the first line of code (exactly centered on one-line blocks). It has no rim at rest; the rim shows only while it confirms. `label-copy` and `label-copied` now name it for screen readers.

## 0.1.1

### Patch Changes

- faa6441: Code comments describe the glass on their own terms instead of naming the projects that inspired it; those are credited in the repository's README.
- Updated dependencies [faa6441]
  - @glass-midas/core@0.1.1

## 0.1.0

Initial release: glass Web Components, for any framework or none.

- **Elements**: `gm-surface`, `gm-button`, `gm-callout`, `gm-code` (copy button), `gm-tabs` / `gm-tab` (synced across the page and remembered), `gm-nav` (a liquid droplet under the current link, scroll spy, a cancelable `gm-navigate` event for smooth-scroll libraries), `gm-search` (a glass search box, results from any `source`, a cancelable `gm-select` event) and `gm-scrollbar` (a quiet glass thumb).
- **Chips** (`.gm-chip`): controls inside glass, as a light fill; the one that's on gets the rim.
- **Glass options are attributes**, plus `material="frost"` for glass that carries text over a busy background, and `variant="lite"` / `"full"`. Large still surfaces use the blur tier by default.
- **Styles** in `@glass-midas/components/styles.css`, only through custom properties inside `:where()`, so any class of yours wins.
- Light DOM and SSR-safe. Under 8 KB gzipped.
