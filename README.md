# glass-midas

A Liquid Glass style system for the web: design tokens, a refraction engine and headless primitives, plus a component library built on them.

- **Works everywhere.** Real refraction where the browser can render it (Chromium), frosted `backdrop-filter` in Safari and Firefox, a solid surface when neither works or the user prefers reduced transparency.
- **Framework-agnostic.** The core works on any `HTMLElement`; bindings for React (more to come).
- **Small.** Bundle budgets are enforced in CI.

> Early development — APIs will change.

## Packages

| Package              | Description                          |
| -------------------- | ------------------------------------ |
| `@glass-midas/core`  | Tokens, tier detection, glass engine |
| `@glass-midas/react` | `useGlass` hook and `<Glass>`        |

## Usage

```ts
import { createGlass, tokensToCss } from '@glass-midas/core';

document.head.insertAdjacentHTML('beforeend', `<style>${tokensToCss()}</style>`);
const glass = createGlass(document.querySelector('.panel')!, { radius: 28 });
// glass.tier → 'refract' | 'blur' | 'solid'
```

```tsx
import { Glass } from '@glass-midas/react';

<Glass glass={{ radius: 28, refraction: 32 }} className="panel">
  …
</Glass>;
```

Without a bundler:

```html
<script type="module">
  import { createGlass } from 'https://cdn.jsdelivr.net/npm/@glass-midas/core/+esm';
</script>
```

## Development

```sh
pnpm install
pnpm dev     # playground at http://localhost:5173, docs at http://localhost:4321
pnpm test
pnpm size    # bundle budgets
```

Working with Claude Code: the repo ships hooks, skills and a Playwright MCP server. For library docs, also set up Context7 with your own key: `npx ctx7 setup --claude`.

## License

MIT
