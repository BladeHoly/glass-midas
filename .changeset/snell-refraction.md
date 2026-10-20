---
'@glass-midas/core': minor
'@glass-midas/react': minor
---

Physically based refraction. The `refract` tier now models a glass slab with a convex-squircle bezel and Snell's law, with a fold guard that caps magnification at 5× so the image never folds over itself at the rim.

- New options `thickness` (total glass height in px) and `ior` (index of refraction) replace `refraction`.
- New `specular` option: a Fresnel-shaped rim highlight lit from the top left, carried in the map's blue channel.
- The backdrop chain is now `blur() saturate() url()`, so the highlight stays crisp; a 0.6 px smoothing hides blocky magnified pixels.
- Bend directions turn smoothly through corners sharper than the bezel.
- `bezel` now defaults to `20`.
- The map is drawn at up to 2× density on high-DPI screens and is only rebuilt when size or optics change, so moving glass is free.
- `displacementMap(width, height, optics, density?)` is now a pure function returning `{ data, width, height, density, scale }`.
- New `tint.solid` token, opaque enough for text at the `solid` tier.
- The `refraction` token group is replaced by `thickness` (`thin`, `md`, `thick`).
