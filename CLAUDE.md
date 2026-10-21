# glass-midas

Open-source (MIT) Liquid Glass **style system** — tokens plus headless primitives, in the spirit of Radix Primitives — with a component library built on top of it. Published to npm as `@glass-midas/*` and served over CDN (jsDelivr `+esm`). The user directs and reviews; Claude implements.

## Layout

- `packages/core`: framework-agnostic engine. `tokens.ts` (design tokens → `--gm-<group>-<name>` custom properties), `support.ts` (tier detection), `glass.ts` (`createGlass(el, options)` → `{ tier, update, destroy }`), `displacement.ts` (refraction map). Zero runtime dependencies.
- `packages/webgl`: opt-in WebGL renderer (`createWebGLGlass`) over an explicit backdrop; same optics via the core's `lensProfile`, per-pixel in floating point, plus dispersion. `./capture` subpath uses the optional `html-to-image` peer.
- `packages/react`: thin bindings only (`useGlass`, `<Glass>`; `./components` wraps every `gm-*` element as `Glass*` for React 18 and 19: camelCase props → kebab attributes, non-string properties assigned on the element, `on*` props → `gm-*` events). One entry per kind (`/surfaces`, `/navigation`, `/overlays`, `/forms`, `/data`) on the shared `wrap()`/`synced()` in `wrap.ts`; a new component goes in its kind's entry. No logic that belongs in core.
- `packages/components`: glass Web Components (light DOM `gm-*`: surface, button, callout, code, tabs, segmented, nav, search, scrollbar, tip, popover, menu, dialog, toast and `toast()`, slider, select, otp, table; plus the CSS-only `.gm-chip`, `.gm-toggle`, `.gm-field`/`.gm-input`, `.gm-check`, and `.gm-badge`/`.gm-avatar`/`.gm-skeleton`/`.gm-pagination`; floating pieces share `anchor.ts`, and popover/menu/dialog sit on the native popover API and `<dialog>`) on `GlassElement` (`base.ts`); glass options are attributes, plus `material="clear"|"frost"`; a rim marks what deserves attention (the one that's on, primary surfaces), so quiet pieces like the scrollbar have none; styles are `src/css/base.css` plus one sheet per component, in cascade layers (`gm-base`, `gm-components`, `gm-overrides`), only `--gm-*` inside `:where()`; `scripts/css.mjs` builds `dist/css/*` and the whole `dist/styles.css`. Each module defines its own element, so a new component needs its entry in `package.json` (exports, sizeBudget) and its sheet in `css.mjs`. Never nest glass in glass: a `backdrop-filter` ancestor hides the page from the glass inside it.
- `packages/cli`: `glass-midas` bin (`list`, `docs`, `find`, `setup`) over the published docs (`docs.json`, `docs-full.json`, the `.md` twins); `GLASS_MIDAS_DOCS` points it elsewhere. Commands are pure functions over a fetcher, in `commands.ts`.
- `templates`: private workspace package (not published) of whole screens, built on the components for an imaginary audio brand, Ondine. Each template is `src/<name>/` with `<name>.html` + `<name>.js` (plain, loads the components from jsDelivr) and a React twin `<Name>.tsx`, both doing the same. Shared kit in `src/shared/` (`ondine.css` brand, `auth.css`/`auth.js`/`AuthKit.tsx`); `src/templates.json` lists templates and the shared files each needs. `scripts/art.mjs` draws the seeded procedural art (warped fBm, Chladni sigil, flow field + harmonograph) with sharp; `scripts/build.mjs` writes `dist/` (sources as users get them, `preview.html` wired to the local components, `manifest.json`). The docs copy it to `/t/`. Never name reference projects there; plan in `research/templates-plan.md`.
- `apps/docs`: documentation site, custom Astro + MDX built with `@glass-midas/components` (no Starlight). Pages in `src/content/docs` (templates pages use `<Template name>`; frontmatter `order`, `label`; component pages add `element`, `attributes`, `properties`, `events`, `methods` for the API tab). MDX gets `Callout`, `Tabs`/`Tab`, `Card`/`CardGrid`, `Demo` without imports. Search is Pagefind (built after `astro build`); every page has a Markdown twin at `<path>.md`, plus `llms.txt` and `llms-full.txt`. `DOCS_BASE=/glass-midas/` builds for a subpath (in Git Bash, set `MSYS_NO_PATHCONV=1`). Uses TypeScript 6 locally because `astro check` doesn't support TS 7 yet. Published to https://bladeholy.github.io/glass-midas/ by `.github/workflows/docs.yml` on every push to main.
- `apps/playground`: Vite + React demo for manual and Playwright review. `?tier=blur|solid|refract` forces a tier.
- `references/`: the user's inspiration links. Read-only.
- `scripts/size.mjs`: gzipped bundle-size check against each package's `sizeBudget`.

## Rules

- **Hybrid rendering, always with a fallback.** Tiers: `refract` (SVG displacement in `backdrop-filter`, Chromium only) → `blur` (plain `backdrop-filter`) → `solid` (no support, or `prefers-reduced-transparency`). Every feature must work, and stay legible, in all three.
- **Framework-agnostic first.** New behavior goes into core against plain DOM; bindings wrap it.
- **SSR-safe.** Guard every `window`/`document` access; `detectTier(null)` means "no browser".
- **Tokens, not literals.** Components style only through `tokenVar()` / `--gm-*`.
- **Budgets are hard limits.** Core 4 KB gz, react 1 KB gz per entry (each kind of component is its own entry), webgl 4 KB gz; components 4.5 KB gz per entry (each component is its own entry, `@glass-midas/components/<name>`; the whole package has no hard limit). Don't raise one without asking.
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
