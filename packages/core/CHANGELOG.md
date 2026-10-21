# @glass-midas/core

## 0.2.0

### Minor Changes

- 16244ea: New tokens: a spacing scale (`--gm-space-*`), a type scale (`--gm-text-*`) and status colors (`--gm-status-info`, `-success`, `-warning`, `-danger`).

## 0.1.1

### Patch Changes

- faa6441: Code comments describe the glass on their own terms instead of naming the projects that inspired it; those are credited in the repository's README.

## 0.1.0

Initial release: the engine of glass-midas, a Liquid Glass style system for the web.

- **`createGlass(el, options)`** turns any element into glass at the best tier the browser supports: `refract` (an SVG displacement map in `backdrop-filter`, Chromium), `blur` (frosted `backdrop-filter`) or `solid` (no support, or `prefers-reduced-transparency`). It returns `{ tier, update, destroy }` and marks the element with `data-glass-tier`.
- **Physically based refraction**: a glass slab with a convex squircle bezel and Snell's law. Options `thickness`, `bezel`, `ior`, `radius`, `curvature`, `magnify` (the whole surface as a lens) and `caustics` (the rim folds into a mirrored band, the side wall of thick glass).
- **Rim light**: a hairline inside the edge, as bright as `(n·L)²` for `lightAngle`, showing a saturated copy of the bent backdrop (`specularSaturation`) and a white line (`specular`).
- **Dispersion**: `chroma` splits the rim into color, as thick glass does. Off by default.
- **Smooth resizing** and a shared cache of displacement maps, so animated and repeated surfaces stay cheap.
- **Tokens** as CSS custom properties: `tokens`, `tokensToCss()`, `tokenVar()`.
- `detectTier()`, and the pure `displacementMap()` and `lensProfile()` for custom renderers.
- SSR-safe, no dependencies, under 4 KB gzipped.
