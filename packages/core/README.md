# @glass-midas/core

The engine of [glass-midas](https://bladeholy.github.io/glass-midas/), a Liquid Glass style system for the web: design tokens, tier detection and `createGlass`, which turns any element into glass. Real refraction (Snell's law over a squircle bezel, caustics, rim light, optional dispersion) where the browser can draw it, frosted blur or a solid surface everywhere else. No dependencies, under 4 KB gzipped.

```sh
npm install @glass-midas/core
```

```ts
import { createGlass, tokensToCss } from '@glass-midas/core';

document.head.insertAdjacentHTML('beforeend', `<style>${tokensToCss()}</style>`);
const glass = createGlass(document.querySelector('.panel'), { radius: 28 });
```

Docs: <https://bladeholy.github.io/glass-midas/> · MIT
