# @glass-midas/webgl

## 0.1.0

Initial release: the core's optics rendered with WebGL, in every browser with WebGL.

- **`createWebGLGlass(el, options)`** over an explicit backdrop: an image, video or canvas (aligned with its `object-fit`), a custom source, or a capture of HTML with `captureBackdrop()` from `@glass-midas/webgl/capture` (optional `html-to-image` peer).
- The same refraction and rim light as the core, computed per pixel in floating point, plus **dispersion** (`chroma`) and `tint`.
- Redraws only when something changes; `update()` re-reads a still backdrop.
- Falls back to the core's surface when WebGL, the backdrop's pixels or the user's preferences don't allow it.
