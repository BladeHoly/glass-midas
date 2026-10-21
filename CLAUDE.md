# glass-midas

Open-source (MIT) Liquid Glass **style system** — tokens plus headless primitives, in the spirit of Radix Primitives — with a component library built on top of it. Published to npm as `@glass-midas/*` and served over CDN (jsDelivr `+esm`). The user directs and reviews; Claude implements.

## Layout

- `packages/core`: framework-agnostic engine. `tokens.ts` (design tokens → `--gm-<group>-<name>` custom properties), `support.ts` (tier detection), `glass.ts` (`createGlass(el, options)` → `{ tier, update, destroy }`), `displacement.ts` (refraction map). Zero runtime dependencies.
- `packages/webgl`: opt-in WebGL renderer (`createWebGLGlass`) over an explicit backdrop; same optics via the core's `lensProfile`, per-pixel in floating point, plus dispersion. `./capture` subpath uses the optional `html-to-image` peer.
- `packages/react`: thin bindings only (`useGlass`, `<Glass>`). No logic that belongs in core.
- `packages/components`: glass Web Components (light DOM `gm-*`: surface, button, callout, code, tabs, nav, search, scrollbar; plus the CSS-only `.gm-chip` for controls inside glass) on `GlassElement` (`base.ts`); glass options are attributes, plus `material="clear"|"frost"`; a rim marks what deserves attention (the one that's on, primary surfaces), so quiet pieces like the scrollbar have none; `styles.css` uses only `--gm-*` inside `:where()`. Never nest glass in glass: a `backdrop-filter` ancestor hides the page from the glass inside it.
- `apps/docs`: documentation site, custom Astro + MDX built with `@glass-midas/components` (no Starlight). Pages in `src/content/docs` (frontmatter `order`, `label`; component pages add `element`, `attributes`, `properties`, `events`, `methods` for the API tab). MDX gets `Callout`, `Tabs`/`Tab`, `Card`/`CardGrid`, `Demo` without imports. Search is Pagefind (built after `astro build`); every page has a Markdown twin at `<path>.md`, plus `llms.txt` and `llms-full.txt`. `DOCS_BASE=/glass-midas/` builds for a subpath (in Git Bash, set `MSYS_NO_PATHCONV=1`). Uses TypeScript 6 locally because `astro check` doesn't support TS 7 yet. Published to https://bladeholy.github.io/glass-midas/ by `.github/workflows/docs.yml` on every push to main.
- `apps/playground`: Vite + React demo for manual and Playwright review. `?tier=blur|solid|refract` forces a tier.
- `references/`: the user's inspiration links. Read-only.
- `scripts/size.mjs`: gzipped bundle-size check against each package's `sizeBudget`.

## Rules

- **Hybrid rendering, always with a fallback.** Tiers: `refract` (SVG displacement in `backdrop-filter`, Chromium only) → `blur` (plain `backdrop-filter`) → `solid` (no support, or `prefers-reduced-transparency`). Every feature must work, and stay legible, in all three.
- **Framework-agnostic first.** New behavior goes into core against plain DOM; bindings wrap it.
- **SSR-safe.** Guard every `window`/`document` access; `detectTier(null)` means "no browser".
- **Tokens, not literals.** Components style only through `tokenVar()` / `--gm-*`.
- **Budgets are hard limits.** Core 4 KB gz, react 1 KB gz, webgl 4 KB gz, components 8 KB gz. Don't raise one without asking.
- **Every public change gets a changeset** (`.changeset/*.md`).

## Commands

`pnpm build` · `pnpm test` · `pnpm typecheck` · `pnpm size` · `pnpm dev` · `pnpm format` · docs: `pnpm --filter @glass-midas/docs dev`

TypeScript is 7.x (native compiler); packages build with plain `tsc`, so avoid tools that need the TS JS API.

## Claude Code setup

- Hooks: Prettier runs after every edit; on stop, typecheck + tests run for the packages that changed and failures come back to fix.
- Skills: `new-component`, `glass-review` (Playwright: screenshots per tier, FPS, budgets), `release` (manual only: `/release`).
- MCP: Playwright for the browser (project `.mcp.json`). Context7 for current library docs (use it for Vite, Turborepo, Changesets, React, Vitest APIs instead of memory) is configured per user with their own API key: `npx ctx7 setup --claude`. Don't add it to `.mcp.json`; a keyless project entry would override the user's.
- Plugins: `frontend-design`, `typescript-lsp`.

## Git

Remote: `https://github.com/BladeHoly/glass-midas`. Work on branches and merge through PRs; CI must pass.
