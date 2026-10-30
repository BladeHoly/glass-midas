# @glass-midas/react

## 0.6.1

### Patch Changes

- Updated dependencies [04453fc]
- Updated dependencies [04453fc]
  - @glass-midas/components@0.7.0
  - @glass-midas/core@0.3.0

## 0.6.0

### Minor Changes

- 8507947: `gm-table` filters by column: `data-filter` on a header adds a button with the column's values (with counts) to check one or several; `gm-filter` is cancelable for server-side data, with `data-filter-options` to list the values, and `filter()`, `clearFilters()` and `filters` drive it from code. React: `onFilter` on `GlassTable`.

### Patch Changes

- Updated dependencies [8507947]
  - @glass-midas/components@0.6.0

## 0.5.0

### Minor Changes

- 0f8cbce: Commerce pieces: `gm-gallery` (pictures on a snapping track, thumbnails, keys and a large view) and `gm-upload` (drop or choose files, with previews and limits); swatches, choices and options (`.gm-swatch`, `.gm-choice`, `.gm-option`), prices and totals, ratings, steps and timelines, accordions, breadcrumbs and empty states, CSS only; `gm-slider` takes two inputs for a range; `gm-dialog` opens as a drawer with `placement="end"` or `"start"`. React: `GlassGallery` in `/data`, `GlassUpload` in `/forms`.

### Patch Changes

- Updated dependencies [0f8cbce]
- Updated dependencies [9f0e6f4]
  - @glass-midas/components@0.5.0

## 0.4.0

### Minor Changes

- 4b3c954: `gm-quantity`: a number with a button either side to take one off or add one, on the native number input, stopping at its limits. React: `GlassQuantity` in `/forms`.
- 0449d81: `@glass-midas/react/data`, with `GlassTable`: `onSort` leaves the rows to React, `onSelectionChange` reports the checked rows.

### Patch Changes

- Updated dependencies [4b3c954]
- Updated dependencies [0b245f0]
- Updated dependencies [0449d81]
- Updated dependencies [2a3d517]
  - @glass-midas/components@0.4.0

## 0.3.0

### Minor Changes

- 16244ea: One entry per kind of component, each loading only its elements: `/surfaces`, `/navigation`, `/overlays` and `/forms`; `/components` still has them all. New: `GlassSelect` and `GlassOtp`.

### Patch Changes

- Updated dependencies [e14a352]
- Updated dependencies [16244ea]
- Updated dependencies [16244ea]
  - @glass-midas/components@0.3.0
  - @glass-midas/core@0.2.0

## 0.2.0

### Minor Changes

- 837186a: New `gm-dialog`: a modal of frosted glass on the browser's `<dialog>` (top layer, dimmed backdrop, focus trapping, Escape), centered or, with `placement="bottom"`, a sheet that rises from the bottom edge. It rises in as it opens. `show()` and `close(value)`; buttons in a `<form method="dialog">` close it with their `value`, Escape as `"cancel"` and a click on the backdrop as `"dismiss"`, all reported by `gm-close`. In React, `GlassDialog` with `onClose`.
- 3cdd832: New `gm-popover` and `gm-menu`, on the browser's popover API: frosted glass in the top layer that a button opens with `popovertarget`, no script needed, and that closes on Escape and on a click outside. It floats next to its button (or `anchor`), on the side `placement` prefers, flipped when there's no room, and returns focus to the button when it closes. `gm-menu` adds a menu's roles, focus on its first item, arrow keys, Home and End, a droplet under the focused item, separators (`<hr>`), and a cancelable `gm-select` with `{ value, label }`. `gm-tip` now flips too, its arrow following the side it lands on. In React, `GlassPopover` and `GlassMenu` (`onSelect`).
- 30e12c3: New `gm-segmented`: one choice among a few on a glass bar, with a droplet under the chosen option. Any child with a `value` is an option (icons welcome); it's a radio group with arrow-key, Home and End navigation. `value` (attribute and property) reads and sets the choice; a choice by the user fires `gm-change` with `{ value, index }`. In React, `GlassSegmented` with `onChange`.
- 7e5afae: `gm-tabs` fires `gm-change` (`{ index, label }`) when the selected tab changes, by the user or a synced group, and not when the same tab is selected again. In React, `GlassTabs` takes it as `onChange`.
- 8088228: New `gm-tip`: a tip that teaches one thing, on frosted glass, with an optional icon (`slot="icon"`), a heading, actions (`.gm-tip-actions`) and a close button. Inline by default; with `anchor`, it floats next to that element (`placement` bottom or top) with an arrow, following it as the page scrolls. Closing fires a cancelable `gm-dismiss`; with `remember`, a closed tip stays closed. `dismiss()` and `show()`. In React, `GlassTip` with `onDismiss`.
- f2611f9: New `toast(message, { action, duration })` and `gm-toast`: a short message on frosted glass at the bottom center that goes away on its own (4 s by default), waits while the pointer or focus is on it, stacks up to three, and is announced politely to screen readers. An action shows as a chip and closes the toast. Dismissing fires `gm-dismiss`. `@glass-midas/react/components` re-exports `toast`.
- 7d10585: New controls for inside glass. `.gm-toggle` makes a native checkbox a switch, with no script: a light track, the accent when on (`--gm-toggle-on`), a white knob (`--gm-knob`) that stretches while held. `gm-slider` wraps a native range input and paints its fill (`--gm-slider-fill`) up to the value; `sync()` repaints after a value set from code. In React, `GlassSlider` repaints after every render.

### Patch Changes

- Updated dependencies [30e12c3]
- Updated dependencies [837186a]
- Updated dependencies [61e6faa]
- Updated dependencies [3cdd832]
- Updated dependencies [30e12c3]
- Updated dependencies [7e5afae]
- Updated dependencies [8088228]
- Updated dependencies [f2611f9]
- Updated dependencies [7d10585]
  - @glass-midas/components@0.2.0

## 0.1.0

Initial release: React bindings for glass-midas, for React 18 and 19.

- **`useGlass(ref, options)`** attaches glass to any element you render; option changes update the live surface.
- **`<Glass glass={options}>`**: a div with glass and no other styling.
- **`@glass-midas/react/components`**: every glass component as a React component (`GlassSurface`, `GlassButton`, `GlassCallout`, `GlassCode`, `GlassTabs`, `GlassTab`, `GlassNav`, `GlassSearch`, `GlassScrollbar`). Glass options are camelCase props, properties like `source` are assigned on the element, events are `onSelect` and `onNavigate`, and `ref` is the element. Needs `@glass-midas/components`.
