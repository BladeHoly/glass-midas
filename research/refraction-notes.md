# Refraction research notes

Claude's read of the seven references in `references/His Inspiration.txt`, done 2026-10-20 to
bring glass-midas closer to real glass optics. Fable's independent read is in
`refraction-notes-fable.md`. Source lines cite shallow clones of each repo's default branch on
that date.

## TL;DR

1. **Our profile is backwards.** We push hardest at the very rim (`t²`, max at the edge). Real
   optics, and every serious reference, gives **zero displacement at the edge, a peak just inside
   it, and zero again where the surface turns flat.**
2. **The physical model the field converged on** (ptu14, gentpan, and both credit kube.io's "Liquid
   glass with CSS and SVG"): a vertical ray hits a convex bezel, refracts by Snell's law with
   n = 1.5, and travels down to a flat back face. Lateral shift = `height × tan(θ₁ − θ₂)`.
3. **Firefox can get refraction too.** Gecko won't run an SVG graph _inside_ `backdrop-filter`,
   but it applies one via plain `filter` to an element whose own `backdrop-filter` is a blur
   (sohumsuthar). Safari reportedly paints nothing for `url()` in `backdrop-filter` (batch-ly
   cites WebKit bug 245510); gentpan makes WebKit work only for the element's _own_ content.
4. **Cheap extras worth taking:** a rim highlight stored in the map's blue channel, chromatic
   aberration as three displacement passes, a symmetric-quadrant map build, an LRU map cache, and
   building the map at `min(dpr, 2)`.

## Per reference

### gentpan/liquidglass (MIT): closest to us, best engineered

`lib/liquid-glass.js`

- **Technique:** SVG `feImage` + `feDisplacementMap`. The default mode bends the element's **own**
  pixels via `filter: url()`, which works in Blink, WebKit and Gecko. `mode: 'backdrop'` uses
  `backdrop-filter: url()` in Blink only, with a plain blur fallback elsewhere (l.346-374).
- **Profile** (l.65-89): surface height `h(s) = (1 − (1 − s)^k)^(1/k)`, with s = distance from the rim
  divided by the bezel width, and k = `curvature` (2 = circle, 4 = squircle, the default).
  Slope = `dh/ds`; `θ = atan(slope)`; `θr = asin(sin θ / ior)`; `bend = tan(θ − θr)`.
  Tabulated in 512 steps per (k, ior) and **normalized to max 1**, so `refraction` (px) is the peak
  displacement. Note: the normalization drops the `× height` factor (see the model section below).
- **Map encoding** (l.159-175): R/G = 128 ± 127·m·n (outward normal n); convex = samples inward.
  **B = rim highlight**, A = antialiased lens coverage. Only one quadrant is computed and then
  mirrored, which takes 4× less work.
- **Rim light** (l.162-185): a crisp line (`specularWidth`) plus a glow 5× wider, shaded by `n·L` with
  `lightAngle` −120°; the far side reflects at −0.4×.
- **Filter graph** (l.256-311): flood 128 → lens PNG over neutral → displace (×3 when chroma > 0:
  per-channel `feColorMatrix` isolate, scales `k, k(1+c/2), k(1+c)`, summed with arithmetic
  composites) → add rim (`feColorMatrix` B→white offset) → `in` lens shape, `over` the
  untouched outside.
- **Engine quirks** (l.313-328): with `primitiveUnits="objectBoundingBox"` (the only units WebKit
  renders), `scale` is converted differently: Blink uses width for both axes, WebKit width/height,
  Gecko `√((w²+h²)/2)`. WebKit caches filter output per id, so they re-issue a fresh id on every
  update (l.490-492) and re-flush after 60/250 ms (l.408-413). The PNG is `img.decode()`d before
  use (l.201-223).
- **Movement** (l.42-44, 506): moving the lens never regenerates the map; only geometry or optics
  keys do. Updates are rAF-batched. Lens rects are snapped to device pixels to stop shimmer
  (l.454-459). There's a spring for squish animations that honors reduced motion (l.551+).

### ptu14/liquid-glass (MIT): the cleanest physics statement

`packages/core/src/shaders.ts` (WebGL 1, a full-screen pass over a captured background)

- l.132-146: convex-squircle bezel `y = (1 − (1 − x)⁴)^(1/4)` with height = bezel width; vertical
  ray; `θ1 = atan(slope)`, `θ2 = asin(sin θ1 / 1.5)`, **`disp = hgt · tan(θ1 − θ2)`**; samples
  toward the center. Flat interior → no shift.
- Chromatic aberration: R and B are sampled ± along the normal, weighted toward the edge (l.154-160).
- Rim specular, credited to Chris Feijoo's notebook: `(n·L)² · (6 / distFromRim) · (1 − distFromRim
/ bezel)`, composited with **overlay blend** (l.173-192), so it brightens light backdrops and
  deepens dark ones instead of just adding white.
- Metaball merging of several shapes via smooth-min of SDFs (l.84-109); a nice later feature.

### ybouane/liquidglass (no license file: ideas only, don't copy code)

`src/shaders.ts` (WebGL; captures HTML to a texture in `HtmlCapture.ts`)

- Height: quarter circle `h = √(d(2zR − d))` (l.133-137). The normal comes from central differences
  of h over ±2 px (l.168-182).
- Two refraction models: "biconvex" (entry + exit faces, `(1 − 1/ior)·grad` per face, plus an
  eyeballed ×30 gain and a center pull) and "dome" (uniform contraction toward the center, which
  magnifies). Not true Snell; tuned by eye.
- Extras: per-channel CA along N; Fresnel `(1 − |Nz|)⁴`; four-light Blinn-Phong; top-biased
  inner stroke; mixing sharp at the rim with blurred in the middle (l.228-232).

### moekoelueker/open-glass-ui (MIT)

`packages/core/src/displacement.ts`, `geometry.ts`

- Shapes: circle, capsule, rounded-rect, **superellipse** (`(|x|^e + |y|^e)^(1/e)`, the true
  "squircle"), each as an SDF.
- Height: `sin(π/2 · d/dmax)` across the **whole** interior (a dome, not a bezel). Normal via finite
  differences. Displacement = `normal.xy · (ior − 1)/ior · thickness · 2.2`, a linearized
  approximation, not Snell.
- B = specular `(edge·0.24 + (1 − Nz)²·5.5)`, A = smoothstep AA mask. Cache key includes every
  optic parameter. Has unit tests for optics (`optics.test.ts`).

### sohumsuthar/liquid-glass (MIT): mostly CSS

`css/liquid-glass-core.css`

- l.129-161: the displacement rides on `filter: var(--lg-refract)` of a layer whose
  `backdrop-filter` is a plain blur, **not** as a term inside `backdrop-filter`. Reasons given:
  minifiers (lightningcss) treat `-webkit-backdrop-filter`/`backdrop-filter` with _different_
  values as a prefix pair and drop one, losing the refraction; and **Gecko applies an
  feImage/feDisplacementMap graph to elements but not to backdrops, so Firefox gets refraction
  this way.** A dangling `url()` degrades to a no-op.
- Grain from an `feTurbulence` data URI (l.382); `html.lg-blur-only` as a performance switch.

### liquefy-ui/liquefy-ui (MIT)

`packages/core/src/renderer.ts`

- WebGL2 draws **highlights only** (no backdrop refraction): rim with an RGB split (three exp
  profiles offset 0.4/1.0/1.7 px), pointer glow, ripple rings, an SDF "wobble" for jelly motion.
- One shared hidden WebGL canvas for every surface, because browsers cap live contexts at ~16
  (l.142-147). Decorative, not physical.

### batch-ly.com/glass ("Liquid Glass for the Web" v1.2.0, MIT)

Read through a fetch: only the first ~39 KB of `liquid-glass.js` and `.css` came back verbatim.

- Refraction only on Blink ≥ 120 with `CSS.supports('backdrop-filter', 'url(#a)')`. The `url()`
  is **injected from JS after detection**, never written in CSS, because Safari and Firefox drop
  the whole declaration (WebKit 245510).
- The rim preset uses `M(x) = (1 − x)^p` (p = 3) with reach `D = kReach · bezel`, and bezel =
  `clamp(6, 0.25·min(w,h), 24)`. That's the same eyeballed family as our `t²`. The "thick" preset
  uses a quarter-circle height with a simplified n = 1.5 gain.
- **8-bit headroom:** `255 · (0.5 + 0.25 · v)`, so only ±25% of the range is used, to avoid
  clipping.
- CA: R × (1 − k), B × (1 + k). Highlights are a **9-slice image on `::after` via
  `border-image`**, so they scale with the element without regenerating anything.
- Tiers: A refraction, B frosted plus clone magnify, C opaque (reduced transparency,
  forced-colors, no backdrop-filter). Honors `prefers-contrast: more` and `forced-colors`.

## Comparison

| Ref           | Backdrop source           | Profile                        | Snell           | CA             | Highlight             | Engines with refraction         |
| ------------- | ------------------------- | ------------------------------ | --------------- | -------------- | --------------------- | ------------------------------- |
| glass-midas   | backdrop-filter url()     | t² at the rim (eyeballed)      | no              | no             | none                  | Blink                           |
| gentpan       | element filter / backdrop | squircle k=4 bezel             | yes, normalized | 3 passes       | map B channel         | all (content), Blink (backdrop) |
| ptu14         | WebGL capture             | squircle bezel                 | yes, × height   | R/B along N    | overlay rim spec      | WebGL                           |
| ybouane       | WebGL HTML capture        | quarter circle                 | approx          | R/B along N    | Blinn-Phong + Fresnel | WebGL                           |
| open-glass-ui | SVG                       | sine dome                      | linearized      | via dispersion | Fresnel in B          | Blink                           |
| sohumsuthar   | blur + element filter     | static map                     | no              | no             | CSS                   | Blink + Gecko                   |
| liquefy       | none (highlights only)    | n/a                            | n/a             | rim RGB split  | WebGL                 | n/a                             |
| batch-ly      | backdrop-filter url()     | (1 − x)³ rim; circle for thick | approx          | R/B scale      | 9-slice border-image  | Blink ≥ 120                     |

## Model for glass-midas

Plano-convex lens: a flat back face sits on the page, the front face is a bezel of width `b` that
rises from the rim to a flat top of height `H`. View and light rays are vertical.

1. **Height profile:** `h(s) = H · (1 − (1 − s)^k)^(1/k)`, s = inset / b ∈ [0, 1], k = 4 (squircle).
   H defaults to b (ptu14), which gives a vertical tangent at the rim like a drop of liquid.
2. **Slope:** `h'(s) = (1 − s)^(k−1) · (1 − (1 − s)^k)^(1/k − 1)` (dimensionless when H = b).
3. **Snell:** `θ1 = atan(h')`, `θ2 = asin(sin θ1 / n)`, n = 1.5 (crown glass; water 1.33).
4. **Displacement:** the refracted ray deviates by `θ1 − θ2` and travels down through the glass at
   that point, thickness `h(s)` → lateral shift `δ(s) = h(s) · tan(θ1 − θ2)`, pointing **inward**
   (convex lens). δ = 0 at the rim (h = 0) and in the flat (θ = 0); the peak is just inside the
   rim. This keeps the `× height` factor that gentpan's normalization drops.
5. **Units:** δ is in px when H is in px, so `refraction` becomes a physical knob: glass height.
   Precompute `δ(s)/H` in a small table (64–128 entries is plenty; we interpolate).
6. **Corners:** same 1-D profile along the SDF distance to the rounded rect, direction = SDF
   gradient (radial in the corners). Upgrade path: superellipse SDF for real squircle corners.
7. **8-bit encoding:** `scale = 2 · δmax` px, `R = 128 + 127 · δx/δmax`. The peak lands at ±127
   with no clipping; precision is δmax/127 px per step (< 0.3 px for δmax ≤ 32).
8. **Chromatic aberration:** the index varies with wavelength (Cauchy). For BK7 glass,
   n_red ≈ 1.514 and n_blue ≈ 1.522. Physically that's < 1 px; the look needs exaggeration, so
   expose `dispersion` and render 3 passes only when it's > 0 (it costs 3× the filter work).
9. **Specular:** the rim light uses Fresnel and `n·L`; the Fresnel term for n = 1.5 at grazing
   angles is `R(θ) ≈ R0 + (1 − R0)(1 − cos θ)^5` with R0 = 0.04. Stored in B, then added (or
   overlay-blended) after displacement.

## What to change in glass-midas, in order

1. Replace the `t²` profile with the Snell model above (same map pipeline, ~same bytes).
2. Map perf: build at `min(dpr, 2)`, compute one quadrant and mirror it, and cache by (w, h, r,
   b, H, n). Dragging stays free: the map only depends on size.
3. Move the refraction from `backdrop-filter: url()` to `filter: url()` on a backdrop-blurred
   layer, if it holds up in Firefox. That could promote Gecko from `blur` to `refract`. Needs
   verification in real Firefox before we trust it.
4. Rim highlight in the B channel; then optional `dispersion`.
5. Later: superellipse corners, metaball merging (ptu14), springs for drag (gentpan).

## Open questions

- Does `filter: url()` on a `backdrop-filter` element really refract the backdrop in Firefox?
  (sohumsuthar says yes.) In Safari? (Probably not: WebKit only renders objectBoundingBox
  primitives, and the backdrop is excluded.)
- The feImage data URL decodes asynchronously. On first paint, does Chromium show unbent glass for
  a frame? gentpan pre-decodes through `<img>.decode()`.
- Core budget: the Snell table, quadrant mirroring and the B channel should fit in ~1 KB more.
  Three-pass CA adds filter nodes, not much code.
