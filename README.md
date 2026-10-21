# glass-midas

A Liquid Glass style system for the web: design tokens, a refraction engine, glass Web Components, and bindings for React.

- **Real optics.** Snell's law over a squircle bezel, caustics at the rim, a lit hairline edge and optional dispersion, where the browser can render it (Chromium).
- **Works everywhere.** Frosted `backdrop-filter` in Safari and Firefox, a solid surface when neither works or the user prefers reduced transparency.
- **Framework-agnostic.** The core works on any `HTMLElement`; the components are Web Components; React gets thin wrappers.
- **Small.** Bundle budgets are enforced in CI: the core is under 4 KB gzipped.

Docs: **<https://bladeholy.github.io/glass-midas/>**

## Packages

| Package                   | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| `@glass-midas/core`       | Tokens, tier detection and the glass engine                              |
| `@glass-midas/components` | Glass Web Components: surface, button, nav, search, tabs, callout, code… |
| `@glass-midas/react`      | `useGlass`, `<Glass>`, and the components for React                      |
| `@glass-midas/webgl`      | A WebGL renderer: the same optics in floating point, with dispersion     |
| `@glass-midas/cli`        | The docs from the terminal, for people and coding agents                 |

## Usage

```sh
npm install @glass-midas/core @glass-midas/components
```

```ts
import '@glass-midas/components';
import '@glass-midas/components/styles.css';
import { tokensToCss } from '@glass-midas/core';

document.head.insertAdjacentHTML('beforeend', `<style>${tokensToCss()}</style>`);
```

```html
<gm-search hotkey="k" material="frost"></gm-search>
<gm-callout type="tip" heading="Glass">It works.</gm-callout>
```

Any element, without the components:

```ts
import { createGlass } from '@glass-midas/core';

const glass = createGlass(document.querySelector('.panel')!, { radius: 28 });
// glass.tier → 'refract' | 'blur' | 'solid'
```

Without a bundler:

```html
<script type="module">
  import { createGlass } from 'https://cdn.jsdelivr.net/npm/@glass-midas/core@0.1.0/+esm';
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

## Credits

glass-midas stands on the work of others, and owes them its look:

- **[Liquid Glass in CSS and SVG](https://kube.io/blog/liquid-glass-css-svg/)** on kube.io, whose search box set the bar for the rim: the convex squircle bezel under Snell's law, and the hairline lit with a saturated copy of the backdrop. The default glass follows that recipe.
- **[ybouane/liquidglass](https://github.com/ybouane/liquidglass)** (MIT), whose thick, rounded glass showed what makes Liquid Glass read as a solid object: the whole surface acting as a lens, and the folded band at the rim that becomes its side wall.
- **[Astryx](https://astryx.atmeta.com/)**, whose documentation shaped ours: component pages with an overview, a live demo and the API, and docs made for agents too.

We also studied [gentpan/liquidglass](https://github.com/gentpan/liquidglass), [ptu14/liquid-glass](https://github.com/ptu14/liquid-glass), [sohumsuthar/liquid-glass](https://github.com/sohumsuthar/liquid-glass), [liquefy-ui](https://github.com/liquefy-ui/liquefy-ui), [moekoelueker/open-glass-ui](https://github.com/moekoelueker/open-glass-ui) and [batch-ly's glass](https://batch-ly.com/glass/). How each one models the glass, and how glass-midas compares, is in [`research/`](research/). The code and docs speak only of the glass itself; this section is where the credit lives.

## License

MIT
