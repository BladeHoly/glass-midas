---
'@glass-midas/core': minor
'@glass-midas/react': minor
---

Rim light and defaults from the search box in kube.io's liquid glass article.

- The rim light is now a hairline about 1.5 px wide, 1.25 px inside the edge, as bright as `(n·L)²` for the light direction. It shows a saturated copy of the bent backdrop (`specularSaturation`, default `4`) plus a white line at `specular` opacity (default `0.2`). The Fresnel-shaped rim is gone.
- New `lightAngle` option (default `-60`).
- New defaults for the `refract` tier: `thickness: 40`, `caustics: true`, `magnify: 0`, `blur: '1px'`, and no base saturation.
- `LensOptics.specular` is removed; the map's blue channel is the hairline mask, and opacity and saturation are applied by the renderer.
- React: `useGlass` now passes every option on mount and on change.
