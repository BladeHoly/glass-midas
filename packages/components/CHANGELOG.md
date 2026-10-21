# @glass-midas/components

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
