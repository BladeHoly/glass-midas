# @glass-midas/webgl

A WebGL renderer for [glass-midas](https://bladeholy.github.io/glass-midas/): the same optics as the core, computed per pixel in floating point, with dispersion, in every browser. You tell it what's behind the glass (an image, a video, a canvas, or a capture of HTML); it falls back to the core when WebGL isn't available.

```sh
npm install @glass-midas/core @glass-midas/webgl
```

```ts
import { createWebGLGlass } from '@glass-midas/webgl';

createWebGLGlass(document.querySelector('.search'), {
  backdrop: document.querySelector('.hero-image'),
  radius: 28,
  chroma: 0.01,
});
```

Docs: <https://bladeholy.github.io/glass-midas/concepts/webgl/> · MIT
