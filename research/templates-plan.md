# Templates: research and plan

Research notes, October 2026. Like the rest of `research/`, this file names its sources; the
templates themselves, their docs and their code describe looks and name no project.

## What we studied

### A design system's template gallery (structure only, nothing copied)

- 51 templates in 10 categories: 7 dashboards, 7 tables, 5 wizards, 4 settings, 3 login, 4
  galleries, 3 docs pages, 2 AI chat, 3 shells, 4 editors.
- Delivery: a card per template with "Preview" and "Open in Playground". The index has no
  copy-code button, install command or download; it points to a CLI elsewhere.
- Where it falls short (from the index alone; we didn't open every template):
  - **Quantity over finish.** Many templates differ only in layout detail (7 dashboards, 7 tables).
  - **Missing states.** Only two templates mention an empty state. None mention loading, errors
    or skeletons.
  - **Mobile.** Dense multi-pane templates (editors, tree table, file explorer) say nothing
    about small screens.
  - **Accessibility.** Only one template mentions keyboard support; none cover focus in modals
    or text alternatives for charts.
  - **Copy.** Descriptions are keyword lists ("compare, comparison, matrix, spec sheet…"), and
    slugs don't match names (`library` for "Card Grid", `payment-form` for "Checkout Form").
  - **Sample data.** The data doesn't tell one story: a watch and a backpack in one demo,
    croissants and waffles in the shop, a linen throw in the order, "Free shipping" twice.

### Apple, Liquid Glass (HIG, WWDC25 session 284)

- Glass is the **navigation layer** floating over content: tab bars, sidebars, toolbars. Content
  itself isn't glass.
- Sidebars look best over vibrant content; content can extend under them.
- On phones, the tab bar floats and can shrink while scrolling.
- Our own rules already say the same: glass on chrome and hero pieces, chips inside glass, never
  glass in glass.

### Sign in (Authgear, Cieden and Chrome's I/O 2026 guides on login and passkeys)

- **Identifier first:** ask for the email, then route to SSO, a passkey or a password.
- **Passkeys as a peer option,** surfaced in the email field's autocomplete (conditional UI);
  then an email link or code; the password stays as a fallback.
- **Remove friction:** no harsh password rules; correct `autocomplete` attributes so password
  managers work; an email link has to arrive fast and say "check spam".

### Tables (setproduct, LogRocket, saasui.design and UX Planet guides)

- Sorting, filtering, selection and bulk actions are **one system**, designed together.
- Show which filters are active; once a filter is applied, don't offer it again.
- Selection includes select-all. A bulk bar says how many rows it affects; destructive actions
  ask for confirmation and offer undo.
- Density matches the task: 40 / 48 / 56 px rows (compact, regular, relaxed).

### Dashboards (muz.li, adminlte, 925studios and saasframe roundups)

- Lead with one or a few key numbers; push detail down through progressive disclosure.
- Color carries meaning (red is status, not decoration); the palette stays monochrome otherwise.
- Charts: lines for trends, bars for comparing, a donut only for a simple part of a whole.
- If you have to hover to get the gist, the chart failed.

### Commerce (Baymard's checkout research; Blueport and Aureate Labs on product pages)

- About 70% of carts are abandoned. Forced account creation causes 24% of checkout drop-offs;
  the average checkout has 11.3 fields.
- **Checkout:** linear, so people always know where they are; guest checkout by default;
  express payment first; full cost (shipping, tax, discounts) shown before checkout.
- **Product page:**
  - 3–5 images, which can be enlarged (galleries often hide the image people want);
  - swatches rather than dropdowns, and the photo and price follow the chosen variant;
  - one add-to-cart button that's clearly the main action;
  - a size guide.

Sources: developer.apple.com/design/human-interface-guidelines/sidebars,
developer.apple.com/videos/play/wwdc2025/284, baymard.com/blog/current-state-of-checkout-ux,
baymard.com/blog/checkout-flow-ux-optimization, baymard.com/product-page,
blueport.com/blog/five-ux-design-tips-for-your-product-detail-page,
aureatelabs.com/guide/ecommerce-ux-audit-checklist/product-detail-page-best-practices,
authgear.com/post/login-signup-ux-guide, cieden.com/book/pages-and-flows/login/login-page-design,
developer.chrome.com/blog/io26-web-identity, setproduct.com/blog/data-table-ui-design,
blog.logrocket.com/ux-design/data-table-design-best-practices,
saasui.design/blog/saas-data-table-ux-patterns, muz.li/blog/best-dashboard-design-examples-inspirations-for-2026,
saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns,
astryx.atmeta.com/templates.

## Our approach: fewer templates, each one finished

**One story.** Every template uses the same fictional company and dataset:

- a small brand that sells physical goods, with one catalogue;
- its customers and orders;
- its admin team.

So the store, the cart, the checkout, the order email, the admin tables and the dashboards all
show the same products, prices and people.

**Two shells, reused everywhere.**

- **App shell:** a glass sidebar that turns into a floating tab bar on phones, a glass top bar
  with search, and plain content.
- **Store shell:** a glass header with search, cart and account; a plain footer.

Every page fits into one of the two, so navigation looks and behaves the same everywhere.

**Glass only where it belongs:**

- glass for the navigation layer, dialogs, sheets, popovers, and one hero piece per page;
- frost behind text over images;
- content cards are a plain translucent fill, never glass in glass;
- controls inside glass are chips.

**Definition of done.** Every template passes the same checklist before it ships:

1. **States:**
   - empty, loading (skeletons), error with a retry, success;
   - long names and long numbers;
   - zero and many items.
2. **Widths:** 360, 768 and 1280 px, with no horizontal page scroll. Tables turn into cards or
   pin a column, chosen per table.
3. **Tiers:** refract, blur and solid, all legible; `prefers-reduced-transparency` and
   `prefers-reduced-motion` respected.
4. **Themes:** light and dark.
5. **Keyboard and screen readers:**
   - focus order, a skip link;
   - focus kept inside dialogs and sheets;
   - labelled fields with errors tied to them;
   - every chart has a table or a sentence of text next to it.
6. **Forms:** real `autocomplete`, `inputmode` and `type` values, so password managers, autofill
   and mobile keyboards work.
7. **Copy:** real text in English; no lorem ipsum, no placeholder data that contradicts itself.
8. **Names:** each template has one name, used as its slug (`sign-in` ↔ "Sign in"), its file name
   and its description; descriptions are sentences.
9. **Budgets:** the components a template uses stay under their per-entry budgets.

## What the templates need first (new primitives)

These go into `@glass-midas/components` like the others, each with a docs page, an entry of its
own (≤ 4.5 KB gz) and a React wrapper.

| Piece                         | Kind          | Used by                                  |
| ----------------------------- | ------------- | ---------------------------------------- |
| Field: input, textarea        | CSS           | every form                               |
| Checkbox, radio               | CSS           | forms, table selection, checkout         |
| `gm-select`                   | element       | filters, forms (no native select popup)  |
| Code input (one-time code)    | element       | verify step                              |
| Quantity stepper              | element       | product page, cart                       |
| `gm-table`                    | CSS + element | sort, select-all, bulk bar, density      |
| Pagination                    | CSS (chips)   | tables, product grid                     |
| Badge, avatar                 | CSS           | tables, orders, account                  |
| Skeleton                      | CSS           | every loading state                      |
| Stat (number + delta + spark) | CSS + SVG     | dashboards                               |
| Charts (line, bar)            | template code | dashboards (small SVG, no chart library) |

Tokens: add a spacing scale, a type scale and status colors (success, warning, danger) to the core
tokens, so templates never hard-code them. Check core's 4 KB budget when we do.

## The templates

**Auth (4)**

- Sign in: identifier first, passkey, email link, password fallback.
- Create account.
- Verify / reset: a one-time code, then a new password.
- Sign in with media: the form beside a photo, which shows frost at its best.

**Tables (3)**

- Data table: search, filters as chips, sort, selection with a bulk bar, density, pagination,
  every state, cards on phones.
- Expandable table: groups with counts, rows that open into detail.
- Comparison table: plans or products side by side, with the first column pinned.

**Dashboards (3)**

- Overview: key numbers, a trend, a top list, recent activity.
- Store analytics: revenue, orders, conversion funnel, best sellers (from the same store data).
- Status: health tiles, an incidents list, a timeline.

**Commerce, storefront (6)**

- Home: hero with glass over the photo, collections, featured products.
- Product grid: filters in a sheet on phones, sort, empty results.
- Product page: gallery that enlarges, swatches that switch the photo and price, size guide,
  quantity, one main button, details.
- Cart: a sheet from the side or bottom, plus the full cart page. Totals with shipping and tax
  come before checkout.
- Checkout:
  - one page, guest by default, express payment first;
  - contact, delivery, payment;
  - an order summary that folds up on phones.
- Order confirmation.

**Commerce, account and admin (4)**

- Account: orders, addresses, profile.
- Order detail: status timeline, items, totals.
- Admin products: the data table, applied to the catalogue.
- Admin order: what the store sees for one order.

That makes 20 templates over the 2 shells.

**Added later (October 2026), to cover the whole purchase flow:**

- **Commerce primitives** in the components: gallery, upload, swatches and options, price and
  totals, rating, steps and timeline, accordion, breadcrumbs, empty state, a two-knob range and a
  drawer.
- **Saved** (a wishlist, shared as a link), reviews on the product page, filters in a drawer on
  the collection, and save for later in the cart.
- **Returns**: the account side gets three templates (account, order, returns) instead of two.
- **Admin**: a product editor and one order.

## Format

- **Docs:**
  - a new section, `/templates/`, with a gallery of real screenshots per theme;
  - per template, a live full-page preview in an iframe, with width buttons (phone, tablet,
    desktop) and theme and tier switches;
  - the code in HTML and React tabs.
- **Files:** each template is a self-contained HTML page and its React version (both from the start), published with
  the site (`/templates/<name>.html`, `.tsx`), so the `.md` twins and `llms.txt` list them too.
- **CLI:** `glass-midas template <name> [--react] [--out dir]` fetches a template's files into the
  project. It's a pure function over the fetcher, like the other commands, with no new package.
- Templates aren't an npm package: they're starting points people own once copied.

## Order of work (one PR per step, visual QA sweep each time)

1. Tokens (spacing, type, status) and the form primitives: field, checkbox and radio, select,
   code input.
2. The templates section in the docs, the 2 shells and the 4 auth templates. This proves the
   format end to end.
3. Table, pagination, badge, avatar, skeleton, then the 3 tables.
4. Stat and charts, then the 3 dashboards.
5. Quantity stepper, then the storefront.
6. Account and admin; then the CLI `template` command.
7. Release.

## Decisions (user, October 2026)

- **Images:** our own generated art, procedural and a little esoteric. No photos.
- **Brand:** audio. Working name **Ondine** (a water spirit; _onde_ is a wave), easy to change.
- **React:** every template ships in HTML and React from the start.

## The art

All of it comes from one seeded generator, `apps/docs/scripts/art.mjs`, run at build time, with
no runtime cost and the same pictures on every build. Glass gets a still, vivid backdrop, and the
tiers never depend on a canvas.

Techniques, each with a reason to fit a sound brand:

- **Domain-warped fBm.** Noise fed into its own coordinates (`f(p + h(p))`), giving smoke and
  liquid marble. This is the backdrop behind the shells and the auth screens: vivid enough for
  refraction to show. Rendered to raster.
- **Chladni figures.** The lines where a plate vibrating at a frequency stays still:
  `cos(nπx)·cos(mπy) − cos(mπx)·cos(nπy) = 0`. This is sound made visible, so it's the brand's
  sigil: each product has its own `(n, m)`. Drawn as sand dots in SVG.
- **Harmonographs.** Damped pendulums tracing curves:
  `x = Σ Aᵢ·sin(fᵢt + pᵢ)·e^(−dᵢt)`. Thin SVG lines for packaging, order emails and empty
  states.
- **Flow fields.** Particles following a field of angles, drawn as long strokes. These are hero
  banners and collection covers.
- **Sacred geometry.** Rings, a vesica, a flower of life, drawn as fine strokes under the
  product renders, like a plinth.

Products are **procedural renders**, not photos:

- each product is an SVG model built from shapes and gradients (headphones, earbuds, speakers,
  a turntable, an amplifier);
- each finish is a palette, so the swatches really change the picture.

Catalogue (8):

- over-ear headphones;
- earbuds;
- a pair of bookshelf speakers;
- a portable speaker;
- a turntable;
- a headphone amplifier;
- a cable;
- a record cleaning kit.

Reading: Tyler Hobbs on flow fields (tylerxhobbs.com/words/flow-fields); Inigo Quilez on
domain warping (iquilezles.org/articles/warp); The Book of Shaders on fBm
(thebookofshaders.com/13); the Chladni patterns paper (generativeart.com/GA2017/Yucel_Yildan.pdf);
Generative Artistry; Coding Train flow fields.

The art lands with step 2, next to the shells.
