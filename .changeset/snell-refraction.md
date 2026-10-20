---
'@glass-midas/core': minor
'@glass-midas/react': minor
---

Physically based refraction. The `refract` tier now models a plano-convex glass slab with a convex-squircle bezel and Snell's law: zero shift at the rim and in the flat center, peaking just inside the edge.

- New options `thickness` (glass height in px) and `ior` (index of refraction) replace `refraction`.
- New `specular` option: a rim highlight lit from the top left, carried in the map's blue channel.
- `bezel` now defaults to `20`.
- The map is drawn at up to 2× density on high-DPI screens and is only rebuilt when size or optics change, so moving glass is free.
- `displacementMap(width, height, optics, density?)` is now a pure function returning `{ data, width, height, density, scale }`.
- New `tint.solid` token, opaque enough for text at the `solid` tier.
- The `refraction` token group is replaced by `thickness` (`thin`, `md`, `thick`).
