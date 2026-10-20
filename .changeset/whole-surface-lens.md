---
'@glass-midas/core': minor
'@glass-midas/react': minor
---

The whole surface can now act as a lens, so glass reads as glass across the component and not only at its edges.

- New `magnify` option (default `0.1`, up to `0.5`): samples the whole surface toward its center, magnifying what's behind it. The fold guard accounts for it.
- New `curvature` option: the rim profile exponent, `2` for a circle (a pillow of glass) or `4` for the default squircle. Combined with a bezel of half the smaller side, it curves the entire surface.
