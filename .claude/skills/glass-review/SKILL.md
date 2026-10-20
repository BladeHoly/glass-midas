---
name: glass-review
description: Visual and performance review of glass-midas surfaces in a real browser via the Playwright MCP — screenshots per tier, frame rate while animating, bundle size against budgets. Use before merging visual changes, or when the user asks to review, check, screenshot or benchmark the glass effect.
---

# Glass review

Report findings; don't fix anything unless the user asks.

## 1. Budgets

Run `pnpm build && pnpm size`. Record each package's gzipped size against its `sizeBudget`. Any FAIL is a blocker.

## 2. Render

Start the playground in the background: `pnpm --filter @glass-midas/playground dev` (Vite prints the URL, usually http://localhost:5173).

With the Playwright MCP tools:

1. Open the playground at 1280×800 and take a screenshot.
2. Read `data-glass-tier` on every glass element (`browser_evaluate`). Chromium should report `refract`.
3. Screenshot the fallbacks by opening `?tier=blur` and `?tier=solid`. Automatic fallback to `solid` under `prefers-reduced-transparency` is covered by the unit tests; the MCP can't emulate that media query. Real Safari/Firefox rendering can't be checked here either; say so in the report.
4. Check legibility on each screenshot: text over glass has to stay readable on both a light and a dark background.

## 3. Frame rate

In the page, while dragging the main slider or resizing the surface, sample frames for 3 seconds:

```js
await new Promise((done) => {
  const t = [];
  const tick = (now) => (t.push(now), now - t[0] < 3000 ? requestAnimationFrame(tick) : done(t));
  requestAnimationFrame(tick);
}).then((t) => ({
  fps: (t.length / 3).toFixed(1),
  worstFrameMs: Math.max(...t.slice(1).map((v, i) => v - t[i])).toFixed(1),
}));
```

Targets: ≥ 55 fps on average and no frame over 50 ms. Below that is a blocker for anything in `packages/core`.

## 4. Report

A short table: check, result, pass/fail, then the screenshot paths (saved under `.playwright-mcp/`). Stop the dev server when done.
