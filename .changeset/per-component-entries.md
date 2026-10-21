---
'@glass-midas/components': minor
---

Every component is its own entry: `import '@glass-midas/components/menu'` registers that element alone (with what it needs, here the popover), so a page only loads what it uses. Styles come the same way: `css/base.css` plus `css/<name>.css`, or everything in `styles.css` as before. The sheets sit in cascade layers (`gm-base`, `gm-components`, `gm-overrides`), so they work in any order, and any CSS of yours outside a layer wins over them; reduced motion now also covers toasts, toggles and sliders.

`@glass-midas/components/styles.css` still imports the whole stylesheet. On a CDN, its file moved from `src/styles.css` to `dist/styles.css`.
