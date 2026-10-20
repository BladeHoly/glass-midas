---
name: new-component
description: Scaffold a new glass-midas primitive or component (core logic, framework binding, test, playground demo, changeset). Use when the user asks to add, create or scaffold a component, primitive or hook in this repo, e.g. "add a GlassButton", "new Lens primitive".
---

# New component

glass-midas has two layers. Decide which one the request belongs to before writing code, and say which in one line:

- **Primitive** (`packages/core`): framework-agnostic behavior on a plain `HTMLElement`, the way `createGlass` works. Returns a handle with `update()` and `destroy()`. No styling beyond what the effect needs.
- **Component** (built on primitives): an opinionated, styled piece such as Button, Card or Dock. Styling only through tokens (`tokenVar(...)` / `--gm-*` custom properties), never hard-coded colors, blurs or radii. If a needed value has no token, add the token to `packages/core/src/tokens.ts` first.

## Steps

1. **Core**: add `packages/core/src/<name>.ts` and export it from `src/index.ts` with its types.
   - Guard every DOM access for SSR (`typeof document === 'undefined'`).
   - Respect the tier from `detectTier()`. `solid` must stay readable: opaque tint, no backdrop.
   - Respect `prefers-reduced-motion` for any animation.
2. **Binding**: add the React wrapper to `packages/react/src/` following `useGlass` / `Glass`: a `use<Name>` hook plus a thin component that spreads native props. Bindings hold no logic beyond lifecycle.
3. **Test**: add `<name>.test.ts` beside the source (Vitest + happy-dom). Cover each tier and `destroy()` cleanup. Inject a `SupportEnv` instead of mocking globals.
4. **Demo**: add the component to `apps/playground/src/main.tsx` (or a new section there) with controls for its main options.
5. **Budget**: run `pnpm build && pnpm size`. If the package goes over budget, report it and stop. Don't raise the budget without the user's OK.
6. **Changeset**: create `.changeset/<kebab-name>.md` with a `minor` bump for each touched public package and a one-line summary.

Finish with `pnpm typecheck && pnpm test`, then run the `glass-review` skill when the component is visual.
