---
'@glass-midas/webgl': patch
---

`update()` re-reads a still backdrop, so a canvas redrawn once in a while doesn't need `live: true` and a texture upload every frame.
