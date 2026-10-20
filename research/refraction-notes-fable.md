# Liquid Glass refraction: reference study and a proposed model for glass-midas

Author: research pass (Claude Fable), 2026-10-20. Scope: read-only study of six cloned reference repos and one web page. No reference code was run.

Paths below use `refs/` as short for
`C:\Users\ren\AppData\Local\Temp\claude\C--Users-ren-Desktop-The-Man-Who-Stole-The-World\42727ef7-a9d9-4e87-8927-bc1f6b0fea22\scratchpad\refs`.
`file:line` points into those clones. Numbers marked "computed" come from a small script I wrote myself (not reference code). It evaluates the formulas quoted here.

---

## 0. Baseline: what glass-midas does today

`packages/core/src/displacement.ts:20-45`:

- The distance to the rounded-rect edge comes from an exact SDF (`:23-28`).
- The normal is axis-aligned on the sides and radial only where `outside > 0`, i.e. in the corner arc band (`:30-36`).
- Magnitude: `t = max(0, 1 - dist/bezel)`, `strength = t*t*127` (`:37-38`).
- Encoding: `R = 128 - strength*nx*sign(x-cx)` (`:40`). Displacement points inward (it samples toward the centre), which is the correct direction for a convex rim.
- `glass.ts:64` uses `feImage` + `feDisplacementMap scale=refraction(28)` with `userSpaceOnUse`. `glass.ts:65` sets `backdrop-filter: url(#id) blur() saturate()`.

Issues I found while comparing against the references:

1. **The default parameters make the image fold over itself.** The peak offset is `scale·127.5/255 ≈ 14 px` at the rim (computed). Write the sample position along the inward normal as `U(d) = d + D(d)`, with `d` the inset from the rim. Then `dU/dd = 1 − 2·14·t/16 = −0.74` at the rim. That is negative, so the backdrop folds back (a mirrored sliver) over the outer ~7 px. With `bezel: 8` it reaches −2.5. liquefy-ui hit this artifact and built a structural guard against it (§1.6).
2. **Diagonal seam in the corners when `radius < bezel`.** Inside the corner square but deeper than `r`, both `qx, qy < 0`. The branch `qx > qy ? nx=1 : ny=1` (`:35-36`) then flips the displacement direction 90° across the diagonal. The magnitude is continuous there; the direction is not.
3. **The t² ramp is not physical.** Displacement is largest at the rim and quadratic inward. It has no notion of thickness or index.
4. **Regeneration cost.** Every ResizeObserver tick re-runs the full-size per-pixel loop, a sync `toDataURL` PNG encode, and an `svg.innerHTML` rebuild (`glass.ts:46-65`). Nothing is coalesced to rAF and nothing is cached.
5. Minor: neutral 128 encodes `+scale/510` px, not 0 (0.055 px at scale 28). This is harmless. With `C = 128 + 127·v` the exact scale for a peak `Dmax` is `scale = 2·Dmax`.

Budget headroom: the last measurement is core 2116 B gz of 4096 (`node_modules/.cache/glass-midas`), so about 1.9 KB is free.

---

## 1. Per-reference notes

### 1.1 sohumsuthar/liquid-glass — the most physically argued SVG path

- **Technique.** SVG `feImage` + `feDisplacementMap`. Since 2.x the displacement is **not** inside `backdrop-filter`. It rides as a plain `filter: var(--lg-refract)` on an inner layer `.liquid-glass-effect`, and that layer carries `backdrop-filter: blur() saturate() brightness() contrast()` (`css/liquid-glass-core.css:125-159`). The comment there lists the reasons:
  - a minifier collapsing `-webkit-`/unprefixed pairs with different values killed the lensing;
  - the filter applies to the backdrop-filtered result;
  - "Gecko … applies SVG filters to elements fine — so Firefox now gets the refraction".

  I have not verified that claim. It is the single most interesting claim in the study (see open questions).
  - The backdrop pixels come from the browser compositor.
  - There are two filters. The shared one stretches a pre-generated 512² PNG with `objectBoundingBox` units (`components/LiquidGlassFilter.jsx:120-142`). The per-element `useLiquidLens` builds the map at real CSS-px size with `userSpaceOnUse` (`hooks/useLiquidLens.jsx:59-77, 142-160`).

- **Model** (`lib/glass-optics.mjs`, derivation in `PHYSICS.md:46-81`):
  - Profile: convex squircle `f(x) = (1-(1-x)^4)^(1/4)`, with x = 0 at the outer edge (`glass-optics.mjs:53-56`).
  - Slope by finite difference (`:58-62`). The normal is the 2D SDF gradient by central difference (`:130-135`).
  - Snell with BK7 `n = 1.5168` (`:36`):
    `θs = atan f'(x)`, `θr = asin(sin θs / n)`, `t = baseT + f(x)` (baseT = 0.35·B), `d = t·tan(θs − θr)` (`:88-92`).
  - Then **`d *= 1 − R_fresnel(θs)`** (`:93`).
  - LUT of 256 entries normalised to peak 1 (`:100-110`). Encoding `128 − n·mag·127` (`:160`). Scale = `2.008·peak·bezel` px (`useLiquidLens.jsx:134`).
  - My computed peak is 0.515·B at x ≈ 0.05, which matches `PHYSICS.md:89` (0.524). The header comment at `glass-optics.mjs:22` ("peak ≈ 0.76·B … monotonically decreasing from the rim") contradicts this. The Fresnel fade forces d → 0 at the rim.
  - **Critique.** Fresnel reflectance changes how much light is transmitted, not where the ray goes. Multiplying the displacement by it is not physics. As a side effect it creates a strongly compressing band at the extreme rim (D drops from 0.5·B to 0 within about 1 px), which happens to read as the bright compressed edge. Even with the fade, the computed `dU/dd` reaches −0.91 at d ≈ 1.75 px for B = 16, so it still folds slightly.
- **Extras.**
  - Dispersion: three `feDisplacementMap` passes at `scale·{r,1,b}` with BK7 ratios `(n_C−1)/(n_d−1) = 0.99516`, `(n_F−1)/(n_d−1) = 1.01084`, exaggerated by a strength factor (`glass-optics.mjs:42-50`). Channels are isolated by `feColorMatrix` and recombined with `feBlend mode=screen` (`LiquidGlassFilter.jsx:62-69`; screen equals add for disjoint channels).
  - The physical spread is about 1%, which is invisible at UI scale, so they default to an exaggeration factor of 8.
  - Rim light is CSS, not optics: two masked gradients forming a 1 px ring. Bright on top and bottom, dark on the left and right, "measured" from macOS Control Center (`css/liquid-glass-core.css:286-340`). A conic gradient that follows the cursor is used only for interactive surfaces.
  - Material transfer: `L_glass = 0.58·L_backdrop + 34`, implemented as tint alpha 0.134, brightness 0.67 and saturate ≈ 1.72 (`PHYSICS.md:10-37`).
- **Interaction.** Map regeneration happens only on size change, coalesced to rAF, with a shared LUT (`useLiquidLens.jsx:52-57, 99-120`). The cursor only writes CSS vars (`hooks/useLiquidGlassEffects.jsx:235-265`). Touch devices run blur-only (`useLiquidLens.jsx:94`).
- **Support and performance.** Chrome only. Safari falls back through the `-webkit-` alias. Firefox gets an `@supports (-moz-appearance:none)` block (README:240). They measured on Chrome/Windows that five chromatic-aberration elements stalled the compositor while one was fine (README:257; `LiquidGlassFilter.jsx` docs). `maxTexture` is capped at 1024 and the map is stretched back.
- **Also a warning worth copying:** anything that creates a Backdrop Root on an ancestor kills the effect silently: `isolation`, `contain: paint/layout`, `content-visibility: auto`, `opacity < 1`, transforms, `will-change` (`css/liquid-glass-core.css:38-56`).
- **License:** MIT.
- **Verdict.** It has the best written derivation and is the closest to our architecture. Adopt: the Snell + thickness profile, the LUT, the per-element CSS-px map, and the constant-width bezel. Reject: using Fresnel as a displacement weight. Investigate: the `filter:` on a backdrop-filtered layer, which might give Firefox a refract tier.

### 1.2 gentpan/liquidglass — the best engineering for SVG maps

- **Technique.** The default is `filter: url()` on the element's **own** content ("mode: content"), so it works in Blink, WebKit and Gecko. `mode: 'backdrop'` (`backdrop-filter: url()`) is opt-in and Chromium only (`lib/liquid-glass.js:1-14, 346-374, 494-495`). WebGL is used for video, which WebKit never feeds to SVG filters (`lib/glass-webgl.js:1-15`).
- **Model** (`lib/liquid-glass.js:68-89`):
  - Profile `h(s) = (1-(1-s)^k)^(1/k)`, with `k = curvature` (default 4) and an analytic slope:
    `slope = (1-s)^(k-1) · (1-(1-s)^k)^(1/k - 1)` (`:78`).
  - `θ = atan(slope)`, `refracted = asin(sin θ / ior)` (ior 1.5), `bend = tan(θ − refracted)` (`:79-81`).
  - **No thickness term**: the bend is taken as proportional to the angular deviation only. It is normalised to max 1, and `refraction` (px) sets the peak (`:83-85`).
  - Bezel = `0.6 · min(w,h)/2` by default (`:112`). The normal is analytic from the SDF and radial only in the corner arc (`:141-153`). It therefore has the same diagonal-seam issue as ours when the bezel exceeds the radius, although the large default bezel makes it less likely to be noticed.
- **Encoding tricks.**
  - Only the top-left quadrant is computed, then mirrored with `256 − R` across the vertical axis (`:122-176`).
  - **Blue = rim highlight**, alpha = coverage with one map pixel of anti-aliasing (`:138, 162-175`).
  - Highlight `rim = specular·(crisp² + 0.3·glow²)`, with crisp and glow falling linearly over `specularWidth` and 5× that. It is multiplied by `shade = 0.12 + 0.88·(n·L > 0 ? n·L : 0.4·(−n·L))` (`:164-185`).
  - In the filter: `feColorMatrix` turns B into white with `A = 2B − 256/255`, and it is added with an arithmetic composite (`:300-305`). The map is composited over an `feFlood` of neutral grey, so transparent pixels mean "no bend" (`:272-274`).
- **Chromatic aberration.** Three displacement passes at `k, k(1+c/2), k(1+c)`, isolated, then summed with `feComposite arithmetic k2=k3=1` (`:285-297, 479`). Their notes say this sum is exact only over opaque content (premultiplied).
- **Units** (measured; `skill/liquid-glass-web/references/browser-quirks.md`, "Units and scale"):
  - With `objectBoundingBox`, `feDisplacementMap.scale` is multiplied by the width on both axes in Blink, by width and height respectively in WebKit, and by `sqrt((w²+h²)/2)` in Gecko.
  - WebKit renders nothing with `userSpaceOnUse`.
  - Our refract tier is Blink-only and uses `userSpaceOnUse`, which is fine. If we ever target WebKit, this table is essential.
- **Interaction and performance.**
  - Moving the lens changes only sub-region fractions and never regenerates the map (`:42-44, 477`).
  - LRU cache of 48 maps keyed by shape and optics (`:195-223`).
  - Map scale = `min(dpr, 2)` (`:452-453`); lens coordinates are snapped to device pixels to stop shimmer (`:454-459`).
  - Maps are decoded with `new Image().decode()` before swapping the `href`. While continuous animation requests new maps, the newest decoded map is shown (`:204-223, 461-470`).
  - A spring with fixed 1/120 s sub-steps (`:558-615`).
  - WebKit-only workarounds: a new filter id per update, plus a re-issue at 60 and 250 ms (`:408-413, 490-495`).
- **License:** MIT.
- **Verdict.**
  - Adopt: quadrant mirroring (four times fewer pixels), the LRU map cache, decode-before-swap, rAF coalescing, a rim highlight packed into the free B channel, and DPR capping.
  - The optics are a simplified Snell (angle only, no thickness), which is still more principled than our t².
  - "Content mode" is a different product (it refracts children, not the backdrop) but a useful pattern for a `<Lens>` primitive.

### 1.3 ptu14/liquid-glass — WebGL overlay with a kube.io-style Snell bezel

- **Technique.** One full-screen WebGL canvas sits between the background and the components (`CONCEPT.md` "Layer Stack"). The background is captured with `@zumer/snapdom` (SVG foreignObject), which is a runtime dependency (`packages/core/package.json:33-35`, `src/background.ts:1, 198-220`). It is re-captured on scroll, resize, mutations and fonts, at `bgCaptureInterval` (`LiquidGlassRenderer.ts:683-697`). Shapes are re-read with `getBoundingClientRect()` every frame (`LiquidGlass.ts:118-135`).
- **Model** (`src/shaders.ts:132-146`, credited to kube.io/blog/liquid-glass-css-svg):
  - `xb = clamp(-field/bezelW)`, `a = 1-xb`;
  - `hgt = bezelW·(1-a⁴)^(1/4)`;
  - `slope = a³·(1-a⁴)^(-3/4)`;
  - `th1 = atan(slope)`, `th2 = asin(sin th1 / 1.5)`;
  - `dispPx = hgt·tan(th1-th2)·(u_refr/3.5) + edge·u_dispStr·100`.
  - The thickness is the local surface height with **no base slab**, so D → 0 at the rim (the comment says "peaking just inside the rim and falling to 0 at the very edge"). Computed for B = 16: peak 0.44·B at d ≈ 0.4 px. It folds (min `dU/dd` −0.64).
  - The normal is the central-difference gradient of a **metaball union** SDF (smooth-min `smin`, `:56-59, 88-109, 123-130`).
- **Extras.**
  - Chromatic aberration: two extra taps, `R` at `+n·aberr·edge` and `B` at `−n·aberr·edge` (`:155-160`).
  - Rim specular: `coef = (n·L)²·(6/distFromRim)·(1 − distFromRim/bezelW)`, applied as an overlay blend (`:173-192`; port of a Chris Feijoo Observable notebook).
  - Frost noise jitter, rim blur, a 15-tap Gaussian, and analytic AA via `fwidth` (`:148-171, 194-198`).
- **Support.** WebGL1 + `OES_standard_derivatives`. Up to 16 shapes (`types.ts:100`). It needs a DOM snapshot, so live backdrops (video, CSS animation) are approximate.
- **License:** MIT.
- **Verdict.** Metaball merging is the only feature here that SVG maps cannot do cheaply. The optics are the same profile as 1.1 without the slab and without Fresnel. A snapshot plus a dependency is out of the question for our budget.

### 1.4 ybouane/liquidglass — full WebGL with html-to-image capture

- **Technique.** The non-glass children of a root are rasterised with `html-to-image` (patched) into a canvas, while `<img>`, `<canvas>` and `<video>` are drawn directly (README "How It Works"; `src/HtmlCapture.ts:12`). Each glass gets a child canvas. Glass elements are composited in order, so upper glass refracts lower glass. The render loop skips elements that have not changed (`src/LiquidGlass.ts:1020-1060`).
- **Model** (`src/shaders.ts:121-206`):
  - Height `bevelHeight = sqrt(d·(2zR − d))` (a quarter circle of radius zR, default 40) (`:133-137`).
  - Normal from finite differences of the height with `e = 2 px` (`:169-182`), which accidentally regularises the infinite slope at the rim.
  - "Biconvex" refraction is **not Snell**: `refrPx = (exit + entry + through)·u_refract·30`, with `exit = entry = hGrad·(1 − 1/ior)`, plus a whole-panel pull toward the centre, `centerDir·u_refract·4·depth` (`:188-200`). "Dome" mode just contracts UVs toward the centre (`:204`).
  - Constants like 30 and 4 are eyeballed.
- **Extras.**
  - Chromatic aberration as per-channel taps along N, scaled by `edge`: `caS = chroma·18·(0.7·edge + 0.3)·2` (`:213-227`).
  - Edge-weighted mix of a sharp and a blurred texture (`:228-232`).
  - Saturation, brightness and a cool tint (`:234-243`).
  - Fresnel `pow(1−|N.z|, 4)` (`:246`).
  - **Four** Blinn-Phong lights (`:249-261`), an inner 1.5 px stroke biased to the top (`:264-268`), a fake environment reflection, hash noise and a drop shadow (`:148-159`).
- **Interaction.** Pointer-capture drag of `floating` elements. A full re-render when an element moves more than 0.5 px; DOM is captured only when it changes.
- **License:** MIT per `package.json` (there is no LICENSE file in the clone).
- **Verdict.** Visually rich, but the optics are mostly arbitrary constants, and DOM rasterisation is heavy and fragile. Nothing optical is worth porting. The multi-light specular is a gimmick at UI scale.

### 1.5 moekoelueker/open-glass-ui — CSS-first, with an SDF/SVG path on the element's own content

- **Technique.** `renderer="auto"` deliberately picks layered CSS (`docs/RENDERERS.md` decision table). The SDF/SVG path applies `filter: url(#…)` to the element itself (`packages/react/src/glass.tsx:119`), so it refracts its own content, not the backdrop. There is also an opt-in WebGL2 path for image, canvas and video (`packages/renderers/src/webgl.ts`).
- **Model** (`packages/core/src/geometry.ts:89-115`, `displacement.ts:67-117`):
  - The height is a sine dome over the **whole interior**: `sin(π/2·d/dmax)·minDim·0.18·thickness`. There is no flat centre.
  - Normal from height differences. Displacement is linearised and not Snell: `normal.xy · ((ior−1)/ior)·thickness·2.2` (`displacement.ts:78, 100-101`).
  - **Sign:** with a positive `scale` (`renderers/src/svg.ts:79-97`), R > 128 on the right edge, so it samples **outward**, which is the opposite of a convex lens.
  - Its dispersion gives red the larger scale `(1+d)`, which is also inverted relative to physics (`svg.ts:91-95`).
  - Specular goes into B: `edgeProximity·0.24 + (1−n.z)²·5.5` (`displacement.ts:105-110`). Coverage goes into alpha.
  - Scale = `max(w,h)·maxDisplacement·0.42`, which is hand-tuned (`svg.ts:83`).
- **Extras.** Organic mode: `feTurbulence` → blur → displacement, animated with SMIL and gated by the motion policy (`react/src/filters.tsx:233-305`). Quality presets cap the map at 96, 192 or 384 px (`core/src/quality.ts:19-33`). Stable filter ids come from an FNV hash of the optics key (`svg.ts:36-57`).
- **License:** MIT.
- **Verdict.**
  - Good product hygiene: map dimension caps, a hash-keyed cache, and reduced transparency or forced colours forcing CSS.
  - Optically the weakest of the six: it samples in the wrong direction, has inverted dispersion and uses a full-surface dome.
  - Its map dimension caps of 96 to 384 px show that small maps stretched up are acceptable for smooth fields.

### 1.6 liquefy-ui/liquefy-ui — `backdrop-filter: url()` like ours, plus the fold guard

- **Technique.**
  - The map is generated by a shared WebGL2 fragment shader into a canvas, then `toDataURL` (`packages/core/src/lens.ts:50-90, 179-228`).
  - The filter has `userSpaceOnUse`, `feImage` → `feDisplacementMap`, then **`feGaussianBlur σ 0.6`** and `feColorMatrix saturate` (`lens-filter.ts:304-371`).
  - It is published as `--lq-lens: url(#id)` and appended at the **end** of the stylesheet's own chain: `backdrop-filter: blur() saturate() brightness() var(--lq-lens, )` (`packages/react/src/styles.css:222-223`).
  - Gating: `CSS.supports('backdrop-filter','url(#…)') && ('userAgentData' in navigator || 'chrome' in window)`, which returns null under reduced transparency (`lens-filter.ts:242-253, 293-296`).
- **Model** (`lens.ts:66-90`):
  - Profile `t^curve` with `t = 1 + d/bezel` (1 at the rim), curve default 2. It is chosen explicitly over a spherical cap because of the cap's infinite rim slope (comment `:42-49`).
  - Normal = normalised central-difference SDF gradient with ε = 1 (`:81-86`), which is smoother in corners than the branchy analytic normal.
  - **Fold guard** (`:191-203`): sample position derivative `1 − Dmax·profile'(t)/bezel > 0`. Since `max profile' = curve`, `Dmax = bezel·compression/curve` with `compression = strength·0.88`. Strength 0..1 can therefore never fold.
- **Extras.** A separate WebGL overlay draws ornaments: an RGB-split rim (`rimR/G/B` with offsets 0.4, 1.0, 1.7 px), top bias, pointer glow, ripple, sheen, sparkle and iridescence (`renderer.ts:62-123`). One shared WebGL context is blitted into 2D canvases to avoid the ~16-context limit (`renderer.ts:139-145`).
- **Dispersion:** three passes with a spread of `dispersion·0.08` (`lens-filter.ts:321-349, 405-409`).
- **License:** MIT.
- **Verdict.** This is the reference closest to our exact pipeline. Adopt: the **fold guard**, the gradient-based normal, the small post-displacement blur that hides nearest-pixel sampling, and the `var(--lens, )` composition. The profile itself is an artistic power curve, not Snell. The ornament shader is a gimmick for us.

### 1.7 batch-ly.com/glass — read via WebFetch, partial

I read the page and two of the four slices of `liquid-glass.js` (410 KB, MIT, "Liquid Glass for the Web contributors"). I did not see all of the source, so the following comes from the fetch tool's summaries and quoted fragments.

- **Technique.**
  - `backdrop-filter` with an SVG filter in Chromium 120+ (`minChromium`). Other browsers get a frosted tier.
  - Tiers: A = refraction, with a budget of 8 refracting surfaces (4 on coarse pointers); B = frost; C = forced colours, reduced transparency or increased contrast.
  - Detection notes that `CSS.supports('backdrop-filter','url(#a)')` is true everywhere, so it is necessary but not sufficient.
  - The filter is `userSpaceOnUse` + sRGB: optional frost `feGaussianBlur edgeMode=duplicate`, then `feImage` → `feDisplacementMap`, then a tone `feColorMatrix`, then an optional vivid-rim mask.
- **Model.**
  - Not Snell: `m = (1 − x)^p`, p = 3; `dx = sign·D·m·ox`.
  - `sign = +1` ("rim" mode) samples **outward**, which pulls content from beyond the border into the rim (their "reach" is 0.7·bezel). To feed that, they overscan the layer (`bleed`) and clip it back with `clip-path: inset(... round r)`.
  - "Thick glass" mode uses `h = sqrt(d(2zR − d))` with constants hand-tuned at ior 1.5.
- **Encoding.**
  - The "ag" encoding stores x in alpha and y in grey, `round(255·(0.5 + 0.25·v))`, with `scale = 4·Dmax`. That costs one bit of precision in exchange for headroom; I could not find the rationale in the slices I read.
  - Smoothing σ = 0.6 device px after displacement, "because feDisplacementMap samples the nearest pixel".
  - Map scale is `min(dpr, 2)` for areas up to 160 000 px², else 1.
  - LRU caches of 48 maps and 48 overlays, blob URLs revoked on eviction, builds in idle slices, an optional worker.
- **Extras.** Dispersion uses three scales `S(1−k), S, S(1+k)`, with k at rest = 0.3. The overlay highlight is `I = intensity·lobe·(line·exp(−(d/lineW)²) + soft·exp(−d/softW))`, with `lobe = max(floor, facing^1.5 or back·(−facing)^1.5)`. Thick glass adds a Fresnel term `(1 − 1/len)^4`.
- **Interaction.** Only visible glass is rewritten during a slider drag. A resize animates one private filter in place. Press and lift are composed through CSS `scale` and `translate`.
- **Verdict.**
  - Outward "reach" is an aesthetic that matches Apple's look, but a single refraction of a vertical ray through a convex surface cannot produce it (§3.1).
  - Worth adopting: the device-px post-blur, blob URLs over data URLs, and a refraction budget per page.

---

## 2. Comparison table

|                         | glass-midas (now)                  | sohumsuthar                                           | gentpan                                     | ptu14                    | ybouane                 | open-glass-ui                           | liquefy-ui                         | batch-ly                           |
| ----------------------- | ---------------------------------- | ----------------------------------------------------- | ------------------------------------------- | ------------------------ | ----------------------- | --------------------------------------- | ---------------------------------- | ---------------------------------- |
| Backdrop source         | compositor (`backdrop-filter:url`) | compositor; `filter:url` on a backdrop-filtered layer | own content (`filter:url`); backdrop opt-in | SnapDOM snapshot → WebGL | html-to-image → WebGL   | own content (`filter:url`); CSS default | compositor (`backdrop-filter:url`) | compositor (`backdrop-filter:url`) |
| Engines with refraction | Blink                              | Blink (+Gecko claimed)                                | Blink, WebKit, Gecko                        | any WebGL                | any WebGL               | Blink, WebKit, Gecko (own content)      | Blink                              | Blink ≥120                         |
| Height profile          | none (t² ramp)                     | squircle k=4 + slab 0.35B                             | squircle, k param                           | squircle, no slab        | quarter circle          | sine dome, whole surface                | power tᶜ, c=2                      | power (1−x)³ / quarter circle      |
| Snell? (n)              | no                                 | yes, 1.5168                                           | angle only, 1.5                             | yes, 1.5                 | no (linear (1−1/n))     | no (linear (n−1)/n)                     | no                                 | no                                 |
| Thickness term          | no                                 | yes (T0 + h)                                          | no                                          | yes (h only)             | ad hoc                  | ad hoc                                  | no                                 | no                                 |
| Sample direction        | inward ✓                           | inward ✓                                              | inward ✓                                    | inward ✓                 | inward ✓                | **outward**                             | inward ✓                           | outward ("reach")                  |
| Fold-free               | **no** (−0.74)                     | no (−0.91)                                            | not guarded                                 | no (−0.64)               | n/a                     | n/a                                     | **yes, by construction**           | unknown                            |
| Corner normal           | analytic, seam if r<B              | SDF gradient                                          | analytic                                    | SDF gradient             | height gradient         | height gradient                         | SDF gradient                       | analytic                           |
| Chromatic aberration    | none                               | 3 passes, BK7 ratios ×8                               | 3 passes                                    | 2 taps                   | 2 taps                  | 3 passes (inverted)                     | 3 passes                           | 3 passes                           |
| Specular                | none in filter                     | CSS ring (measured)                                   | B channel, n·L lobe                         | (n·L)²/d, overlay        | 4 Blinn-Phong + Fresnel | B channel                               | WebGL overlay                      | overlay image, n·L lobe            |
| Map size / DPR          | CSS px, full                       | CSS px, cap 1024                                      | min(dpr,2), quadrant                        | per-frame shader         | per-frame shader        | cap 96–384                              | cap 640                            | min(dpr,2), quadrant               |
| Move cost               | none (backdrop)                    | none                                                  | sub-region attrs                            | per-frame                | per-frame re-render     | none                                    | none                               | none                               |
| Resize cost             | full regen + innerHTML             | regen on rAF                                          | LRU + regen quadrant                        | per-frame                | per-frame               | cached by key                           | regen on rAF (GPU)                 | LRU, idle builds                   |
| Dependencies            | 0                                  | React                                                 | 0                                           | snapdom                  | html-to-image           | React                                   | React                              | 0                                  |
| License                 | MIT                                | MIT                                                   | MIT                                         | MIT                      | MIT (package.json)      | MIT                                     | MIT                                | MIT                                |

All seven references are MIT, so ideas and small adapted snippets are fine with attribution in a changeset or credits.

---

## 3. Proposed model for glass-midas (refract tier)

### 3.1 Physical setup and the direction of displacement

- **Geometry.** A slab of glass lies on the backdrop plane. Its flat bottom has thickness `T0` under the bezel, and its convex top surface has height `h(d)` over a rim band of width `B`. The interior is flat.
- **Viewing ray.** The viewer looks straight down; one ray per pixel is accurate enough for UI because the eye is far away. The ray hits the top surface where its tilt is θ₁ from horizontal, so θ₁ is also the incidence angle against the surface normal.
- **Refraction.** Snell gives `θ₂ = asin(sin θ₁ / n)`. The ray is now tilted `δ = θ₁ − θ₂` from vertical, **toward the centre**. It travels the remaining glass `t(d) = T0 + h(d)` and exits the flat bottom straight onto the backdrop (zero gap), so the exit adds no shift.
- **Displacement.** The ray lands `D(d) = t(d)·tan δ` inward of the pixel. The pixel therefore shows the backdrop sampled inward, which is what the current sign already does.
- **What this model cannot produce.** Apple-style content "pulled in from outside the border" (batch-ly) cannot come from a single refraction. It would need reflection off the side wall or a finite viewer distance. Keep it out of the physical model; if we ever want it, make it an explicit stylistic option.

### 3.2 Height profile

Use the convex squircle, the same profile as kube.io, sohumsuthar, ptu14 and gentpan, with a separate height:

```
s = d / B                       ∈ [0,1], 0 at the rim
f(s) = (1 − (1−s)^4)^(1/4)      superellipse n=4, C1-continuous into the flat top
h(d) = H · f(s)                 H = rim height (default H = B)
slope(d) = (H/B) · (1−s)^3 · (1 − (1−s)^4)^(−3/4)
θ₁ = atan(slope)
```

Why squircle over circle: it joins the flat top with continuous curvature, so there is no visible ring where the bezel ends. The circle (k = 2) is the gentler alternative and barely folds (computed min `dU/dd` = 0.54 with H = B, T0 = 0.5B). It could be a "soft" preset. Both have a vertical tangent at the rim (θ₁ → 90°). The resulting singularity is handled by the fold guard below, not by changing the shape.

### 3.3 Refraction and thickness

- **Index.** `n = 1.5`. That is typical crown glass and acrylic (BK7 is 1.5168, PMMA 1.49); the third decimal is invisible. Keep it a constant, not an option, to save bytes. Thickness and height carry the "strength".
- **Thickness.** `T0` maps naturally onto the existing, unused `--gm-thickness-*` tokens (12, 24, 40 px). Choose the ratio `T0/B` per token, or pass the px value directly.
- **Displacement:**

```
D_phys(d) = (T0 + h(d)) · tan(θ₁ − asin(sin θ₁ / n))
```

Computed, in units of B, with H = B and T0 = 0.5B: the raw peak is 0.89·B at the rim. The curve falls to 0.36·B at s = 0.1, 0.07·B at s = 0.5 and 0.01·B at s = 0.7, so the strong bending is concentrated near the rim, as on real glass.

### 3.4 Fold guard (keeps the mapping one-to-one)

- **Condition.** The sample coordinate along the inward normal is `U(d) = d + D(d)`. It must increase with `d`: `dU/dd ≥ J_min > 0`. Since `1/J` is the local magnification, `J_min = 0.15` caps it at about 6.7×.
- **How.** Run one sweep over the LUT from the flat interior outward:

```
// LUT over s = i/N, value in units of B; D[N] = 0
for i = N-1 .. 0:
  D[i] = min(D[i], D[i+1] + (1 − J_min)/N)
```

- **Effect.** The physical curve is kept wherever it is valid. Only the caustic zone becomes a linear ramp at maximum allowed magnification.
- **Numbers** (computed; H = B, T0 = 0.5B, n = 1.5): the guarded peak is **0.45·B**. With B = 16 px that is Dmax = 7.2 px and scale ≈ 14.4. Today the peak is 14 px and folds.
- **Strength knob.** A user `refraction` multiplier `m` must be applied **before** the guard: build the LUT for `m·D_phys`, then guard. Otherwise strength can reintroduce folds.
- **Fresnel.** Do **not** multiply D by Fresnel transmittance (§1.1 critique). Fresnel belongs in the rim brightness (§3.7).

### 3.5 Normal, corners and the 2D field

- Signed distance `sd` to the true rounded rect (`r` = the element's border-radius), and `d = −sd`.
- Direction `n̂` = normalised SDF gradient of a rounded rect with radius **`r_n = max(r, B)`**. On the straight edges this equals the true normal. In the corners it stays continuous through the whole bezel, which removes the diagonal seam when `r < B`. The magnitude still uses the true `d`, so the rim follows the real silhouette.
- The gradient can be analytic (`ox/|o|` in the corner zone of the `r_n` rect) rather than finite-difference, which saves bytes.
- Per pixel: `disp = −n̂ · D(d)`, pointing inward. Compute one quadrant and mirror it (gentpan).

### 3.6 8-bit encoding and scale

```
Dmax = max_i D[i]·B                      (px; = D[0]·B after the guard)
v    = D(d)/Dmax ∈ [0,1]
R = round(128 − 127·v·n̂x)   G = round(128 − 127·v·n̂y)   (n̂ outward; y down)
scale = 2·Dmax                            (userSpaceOnUse, CSS px)
```

- **Range.** 0..255 is never exceeded because `|v·n̂x| ≤ 1`, so nothing clips.
- **Resolution.** `Dmax/127` px per step: 0.057 px for Dmax = 7.2. Banding in the offset is far below a pixel. The real visible artifact is nearest-pixel sampling in the magnified band, which the `blur()` after the url (§3.8) already hides.
- **Bias.** 128 → `+scale/510` px (0.03 px). Ignore it.
- **Resolution of the map.** Build it at CSS px (or ≤ 1 map px per CSS px), capped at about 512 on the long side and stretched with `preserveAspectRatio="none"`. The field is smooth, and open-glass-ui and liquefy-ui show that caps of 384 to 640 px are fine. Rule: the bezel must stay at least 6–8 map px wide.
- `color-interpolation-filters="sRGB"` is mandatory; we already set it.

### 3.7 Rim light (specular)

The physically shaped intensity at the rim is Fresnel reflectance of the environment at the same θ₁:

```
R(θ) = ½ (r_s² + r_p²),  r_s = (cos θ − n cos θt)/(cos θ + n cos θt),
                         r_p = (n cos θ − cos θt)/(n cos θ + cos θt),  sin θt = sin θ / n
```

R(θ) is 0.04 at 0°, 0.09 at 60°, 0.17 at 70°, 0.39 at 80°, 0.61 at 85° and 0.90 at 89° (computed). It is high only in the outermost pixels, which is exactly why real rims read as thin bright lines.

Two implementation options:

- **A (recommended).** CSS rim: an inset box-shadow, or sohumsuthar's masked 1 px gradient ring, styled from `--gm-highlight-edge` and `--gm-highlight-glow`. Advantages: it works in **all three tiers** (blur and solid need a rim too, for legibility), it costs no filter work, and it costs no core bytes beyond a style string. Apple's resting rim is vertical-axis lit: bright top and bottom, darker sides (sohumsuthar's measurement, `liquid-glass-core.css:286-310`). That maps onto two linear gradients.
- **B (refract tier only, optional).** Pack `I = R(θ₁)·lobe(n̂·L)` into the map's **blue** channel and add it inside the SVG filter (gentpan):

```
<feColorMatrix in="map" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 k 0 0" result="rim"/>
<feComposite in="rim" in2="bent" operator="arithmetic" k2="1" k3="1"/>
```

`lobe = 0.15 + 0.85·max(0, n̂·L)`, with L from a light angle (default −90°, from the top). Caveat: the following `blur()` in `backdrop-filter` would blur this highlight. That forces either a reorder to `blur() saturate() url()` (liquefy-ui order, plus a σ ≈ 0.6 px `feGaussianBlur` after the displacement), or keeping refraction first and doing the highlight in CSS. Option A avoids that problem.

### 3.8 Filter chain

Keep `backdrop-filter: url(#id) blur(var(--gm-blur-*)) saturate(...)`. Refraction comes first, so the token blur also smooths nearest-pixel sampling. Tier fallbacks are unchanged.

### 3.9 Chromatic aberration in SVG (optional, default off)

- **Physical size.** Deviation scales roughly with `n−1`. For BK7, `k_B = (n_F − n_d)/(n_d − 1) = +1.08%` and `k_R = −0.48%`. For Dmax = 7 px that is 0.08 px for blue: invisible. Any visible CA is therefore an exaggeration and should be labelled as such.
- **Feasible graph** (two displacement passes instead of three; red sits close to green physically):

```
<feDisplacementMap in="SourceGraphic" in2="map" scale="S"        result="g"/>   <!-- R,G -->
<feDisplacementMap in="SourceGraphic" in2="map" scale="S·(1+k)"  result="b"/>
<feColorMatrix in="g" values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rg"/>
<feColorMatrix in="b" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bb"/>
<feComposite in="rg" in2="bb" operator="arithmetic" k2="1" k3="1"/>
```

- **Cost.** Each `feDisplacementMap` is a full pass over the element's backdrop. sohumsuthar measured that five three-pass elements stalled Chrome's compositor. Gate it behind an option, cap it to one or two surfaces, and keep it off by default.
- **Alpha.** The arithmetic sum is exact only for opaque input (gentpan's note). A backdrop is opaque, so this is fine here.

### 3.10 Pseudocode (core, about 60–80 lines; my estimate is +500–800 B gz on top of the current 2.1 KB)

```ts
const N = 128,
  n = 1.5,
  J = 0.15;
function lut(Hr: number, T0r: number, m: number): Float32Array {
  // units of B
  const D = new Float32Array(N + 1);
  for (let i = 0; i < N; i++) {
    const a = 1 - i / N,
      q = 1 - a ** 4;
    const t1 = Math.atan(Hr * a ** 3 * Math.max(q, 1e-9) ** -0.75);
    D[i] = m * (T0r + Hr * q ** 0.25) * Math.tan(t1 - Math.asin(Math.sin(t1) / n));
  }
  for (let i = N - 1; i >= 0; i--) D[i] = Math.min(D[i], D[i + 1] + (1 - J) / N);
  return D; // D[0] is the peak
}
function map(w, h, r, B, D): { img: ImageData; scale: number } {
  const rn = Math.max(r, B),
    peak = D[0];
  // for each pixel of the top-left quadrant:
  //   d   = -sdRoundRect(p, w, h, r)          (true silhouette)
  //   n̂   = normal of rounded rect with radius rn (analytic)
  //   v   = d >= B || d < 0 ? 0 : lerp(D, d/B*N) / peak
  //   R = 128 - 127*v*n̂x ; G = 128 - 127*v*n̂y ; B = 128 ; A = 255
  //   mirror into the other three quadrants (R → 256-R across x, G → 256-G across y)
  return { img, scale: 2 * peak * B };
}
```

Plumbing changes in `glass.ts` (not physics, but they matter):

- Coalesce ResizeObserver callbacks to rAF and skip the work when `w`, `h`, `r` and the options are unchanged.
- Cache maps in a small LRU keyed by `w|h|r|B|T0|m`, and share the LUT across instances.
- Use `canvas.toBlob` + `URL.createObjectURL` (async; revoke on evict), or keep `toDataURL` but decode before swapping.
- Update only `feImage.href` and `feDisplacementMap.scale` rather than `innerHTML`.
- Read `r` from computed `border-radius` when it is not given.
- Clamp `B ≤ min(w, h)/2`.

---

## 4. Open questions and risks

1. **Firefox refraction via `filter:` on a backdrop-filtered layer** (sohumsuthar's claim, `liquid-glass-core.css:139-159`). If it holds, the refract tier could cover Gecko, and possibly WebKit with `objectBoundingBox` units and per-engine scale (gentpan's table). This needs a Playwright check per engine, ideally with the glass-review skill. Risk: the filter input is clipped to the element box, so inward sampling works and outward does not, which is fine for our model.
2. **Chromium-only `backdrop-filter: url()`.** WebKit reportedly has patches in flight (sohumsuthar README:240, unverified). Detection by UA brand is what everyone does. batch-ly additionally gates on Chromium ≥ 120.
3. **8-bit precision** is not the bottleneck (0.06 px steps). Nearest-pixel sampling in the magnified rim is the bottleneck. Keep blur after the url, or add σ 0.6 px. With the guard's `J_min = 0.15` (6.7× magnification), single backdrop pixels become about 7 px wide stripes at the very rim. Raise `J_min` to 0.25–0.35 if it looks blocky.
4. **Regeneration while resizing or squishing.** The full per-pixel loop plus PNG encode costs milliseconds per frame for big surfaces. Mitigations: quadrant mirroring (4×), a capped map size, the LRU, and for squish/press animations a CSS `transform: scale()` on the element (the filter scales with it) instead of regenerating. Moving and scrolling cost nothing with `backdrop-filter`.
5. **Backdrop Root traps.** `opacity < 1`, `transform`, `will-change`, `isolation`, `contain` or `content-visibility` on an ancestor, or on the element in some setups, silently turn the effect into a flat tint (sohumsuthar `liquid-glass-core.css:38-56`). Document this in the docs and the playground.
6. **Filter cost per surface.** Each refracting surface is an offscreen filter pass. batch-ly caps refracting surfaces at 8 (4 on coarse pointers) and sohumsuthar runs blur-only on touch devices. Consider a page-level budget in core, falling back to the blur tier past N.
7. **Corner normal with `r_n = max(r, B)`** slightly misaligns the direction from the true normal for very small radii. The alternative is a smoothed gradient. Validate visually at r = 0, 4 and 18 px with B = 16.
8. **Defaults to tune visually.** H/B (1.0), T0 per thickness token, J_min (0.15–0.3). The physical model fixes the shape; these three set the look. The budget question (+0.5–0.8 KB gz) should be confirmed with `pnpm size` once implemented.
