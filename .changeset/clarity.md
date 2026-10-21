---
'@glass-midas/components': minor
---

Materials, buttons and chips, for glass that stays legible.

- `material="frost"` on any component frosts the backdrop heavily under a smoke tint (`--gm-frost-tint`), keeping the rim crisp. The default, clear glass, is unchanged.
- `gm-button`: a glass pill around a native button or link, for actions floating on their own; `shape="round"` for icons.
- `.gm-chip`: controls inside glass, as a light fill instead of nested glass. The one that's on (`aria-pressed`, `aria-selected`, `aria-current`) gets the rim; `gm-chip-round` and `gm-chip-plain` variants; `--gm-chip-fill`, `-hover`, `-on`.
- `gm-scrollbar` goes nearly unnoticed: no rim, shadow or rim light, faint at rest and clear while scrolling or hovered, and hidden on touch screens.
- Code blocks get a thin, quiet scrollbar.
