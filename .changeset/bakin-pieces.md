---
'@glass-midas/components': minor
---

`gm-menu` picks up items added, removed or hidden after it's on the page (and has `refresh()`), and a `.gm-menu-label` names a group. `toast()` takes a `key`: a toast whose key is on screen is updated instead of stacking another, and `gm-toast` has `update(message)`. `gm-dialog` is lite glass by default (refraction over a big surface costs frames whenever something changes behind or inside it); `variant="full"` brings refraction back. New CSS-only `.gm-actionbar`: what can be done with the items chosen in a list, in the place of its filters.
