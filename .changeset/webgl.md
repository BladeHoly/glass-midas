---
'@glass-midas/webgl': minor
'@glass-midas/core': minor
---

New package `@glass-midas/webgl`: the core's optics and rim light rendered with WebGL over an explicit backdrop (image, video, canvas, or a DOM capture via the optional `@glass-midas/webgl/capture`). It works in every browser with WebGL, computes the bend in floating point (no 8-bit banding on thick glass), adds `chroma` dispersion, and falls back to the core's SVG surface when WebGL or the backdrop's pixels aren't available.

Core: `lensProfile()` is exported so both renderers share one Snell profile.
