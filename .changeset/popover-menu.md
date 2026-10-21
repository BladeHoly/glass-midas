---
'@glass-midas/components': minor
'@glass-midas/react': minor
---

New `gm-popover` and `gm-menu`, on the browser's popover API: frosted glass in the top layer that a button opens with `popovertarget`, no script needed, and that closes on Escape and on a click outside. It floats next to its button (or `anchor`), on the side `placement` prefers, flipped when there's no room, and returns focus to the button when it closes. `gm-menu` adds a menu's roles, focus on its first item, arrow keys, Home and End, a droplet under the focused item, separators (`<hr>`), and a cancelable `gm-select` with `{ value, label }`. `gm-tip` now flips too, its arrow following the side it lands on. In React, `GlassPopover` and `GlassMenu` (`onSelect`).
