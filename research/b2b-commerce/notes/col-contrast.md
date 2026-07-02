# Deep-read notes: col-contrast (commerce-on-lightning)

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently. This note reads the **commerce-on-lightning (col)** repo as a
> *contrast/customization* source: os is authoritative for pattern extraction, col contributes the
> testing infrastructure, the builder-wrapper customization pattern, and the `jsconfig`/namespace
> conventions that os lacks. Repo-root files (jest.config.js, jest-sa11y-setup.js, package.json,
> README.md) sit outside the citation checker's roots and are cited in prose as `col repo: <file>:<line>`.

## Bundles covered

col census slice = **37 bundles** (all `repo:"col"`), families: 6 product-presentational, 4 common,
16 search, 10 `builder*` wrappers, 1 util (`productGalleryUtils`).

**Read in full (source):**
- `productPricing` (internal, presentational) — js/html/meta/utils/labels
  [col:productPricing/productPricing.js:1] and its os twin [os:productPricing/productPricing.js:1]
- `builderProductPricing` (exposed wrapper) — js/html/meta [col:builderProductPricing/builderProductPricing.js:1]
- `productQuantitySelector` + `constants.js` [col:productQuantitySelector/productQuantitySelector.js:1]
- `searchFilters` — js/html/meta [col:searchFilters/searchFilters.js:1]
- `commonModal` — js/html [col:commonModal/commonModal.js:1] and os twin [os:commonModal/commonModal.js:1]
- `commonButton` — js/html/meta [col:commonButton/commonButton.js:1] and os twin [os:commonButton/commonButton.js:1]
- `commonNumberInput` (handed off from notes/common.md) [col:commonNumberInput/commonNumberInput.js:1]
- `commonLink` (handed off from notes/common.md; **col-only**, no os counterpart) [col:commonLink/commonLink.js:1]
- Repo infra: `jest.config.js`, `jest-sa11y-setup.js`, `jsconfig.json` [col:jsconfig.json:1], `package.json`, `README.md`

**Skimmed / census-only** (imports + meta from census slice, not opened line-by-line): the other 9
`builder*` wrappers, the remaining search bundles (`searchFacet`, `searchFiltersModalPanel`,
`searchProductCard`, etc. — already deep-read in notes/search.md), `productPricingTiers`,
`productVariantSelector`, `productAttachments`, `productQuantityAdd`,
`productQuantitySelectorPopover`, `productGalleryUtils`.

**Already covered by sibling os-family notes (not re-derived here):** notes/product.md documented the
`col:builderProductPricing` vs `os:productPricing` displayPricing/CSS-var divergence; notes/search.md
closed census open-questions 6 (label namespace) and 7 (shared adapter contracts) for the search
family and documented `col:searchFilters` form-factor branching and `col:searchFiltersModalPanel`
adapter use. This note verifies those conclusions hold repo-wide (see Anomalies) and adds the
testing/wrapper/common-component material no sibling note owns.

## Data access — how this family gets data without Apex

col uses a **two-layer** data-access model that os does not:

1. **Internal presentational components take primitive `@api` props only** — no wire, no `commerce/*`,
   no `experience/*` data imports. `productPricing` imports only `lwc`, `./labels`, `./productPricingUtils`
   [col:productPricing/productPricing.js:8-10]; it receives `negotiatedPrice`/`originalPrice`/`currencyCode`
   as already-resolved strings [col:productPricing/productPricing.js:49-64]. Same for
   `productQuantitySelector` (only `lwc`, `c/commonNumberInput`, local files)
   [col:productQuantitySelector/productQuantitySelector.js:8-11] and the four `common*` building blocks.

2. **`builder*` wrappers do the data access.** `builderProductPricing` is the exposed component; it
   `@wire`s `AppContextAdapter` from `commerce/contextApi` to read `taxType`
   [col:builderProductPricing/builderProductPricing.js:10], [col:builderProductPricing/builderProductPricing.js:179-184],
   derives primitives (`currencyCode`, `negotiatedPrice`, `originalPrice`, `taxRatePercentage`) from
   JSON props [col:builderProductPricing/builderProductPricing.js:149-177], and passes them to
   `<c-product-pricing>` [col:builderProductPricing/builderProductPricing.html:2-17].

3. **JSON data arrives by expression binding, not `@wire`.** The wrapper's `product`/`productPricing`/
   `productTax`/`productVariant` `@api` props default to Experience-Builder expressions
   `{!Product.Details}`, `{!Product.Pricing}`, `{!Product.Tax}`, `{!Product.SelectedVariant}`
   [col:builderProductPricing/builderProductPricing.js-meta.xml:67-80]. The col README states this
   design explicitly: builder components "do not retrieve their data through the customary channel of
   one or more `@wire` adapters… data seamlessly 'flows' into components through the utilization of
   expressions and data binding, serving as input for `@api` properties" (col repo: README.md:103-105).

**`commerce/actionApi` dispatch is confined to `builder*` wrappers** (7 of 10 `builder*` bundles;
matches census col actionApi count of 7). Enumerated dispatched action creators:
- `builderProductPurchaseOptions`: `createCartItemAddAction`, `createProductQuantityUpdateAction`,
  `createWishlistItemAddAction`, `dispatchAction` [col:builderProductPurchaseOptions/builderProductPurchaseOptions.js:19]
- `builderProductQuantitySelector`: `createCommonQuantityUpdateAction`, `dispatchAction` [col:builderProductQuantitySelector/builderProductQuantitySelector.js:9]
- `builderProductVariantSelector`: `createProductVariantUpdateAction`, `dispatchAction` [col:builderProductVariantSelector/builderProductVariantSelector.js:10]
- `builderSearchFilters`: `createSearchFiltersClearAction`, `createSearchFiltersUpdateAction`, `dispatchAction` [col:builderSearchFilters/builderSearchFilters.js:10]
- `builderSearchPagingControl`: `createSearchFiltersUpdateAction`, `dispatchAction` [col:builderSearchPagingControl/builderSearchPagingControl.js:9]
- `builderSearchResults`: `createCartItemAddAction`, `createSearchFiltersUpdateAction`, `dispatchAction` [col:builderSearchResults/builderSearchResults.js:10]
- `builderSearchSortMenu`: `createSearchSortUpdateAction`, `dispatchAction` [col:builderSearchSortMenu/builderSearchSortMenu.js:9]

Other direct data-surface imports: `searchFilters` reads `getFormFactor` from `experience/clientApi`
[col:searchFilters/searchFilters.js:9]; `searchFiltersModalPanel` wires `ProductSearchAdapter` +
`ProductCategoryPathAdapter` from `commerce/productApi` (per notes/search.md). **No Apex imports
anywhere in the col slice** — upholds the census "no Apex" finding at source level.

## Composition & structure

- **The headline structural pattern: exposed `builder*` wrapper around an internal presentational
  component.** os collapses builder concerns and presentation into a **single exposed** component
  (`os:productPricing` is `isExposed=true` with targets and does its own data access)
  [os:productPricing/productPricing.js-meta.xml:1]; col **splits** the concern into
  `builderProductPricing` (`isExposed=true`, 2 targets) [col:builderProductPricing/builderProductPricing.js-meta.xml:3-9]
  wrapping `productPricing` (`isExposed=false`) [col:productPricing/productPricing.js-meta.xml:3]. The
  wrapper's template is a single `<c-product-pricing>` fed derived primitives
  [col:builderProductPricing/builderProductPricing.html:2-17]. **os has zero `builder*` bundles; col
  has ten**, one per exposed surface.
- **Internal building blocks are slot-based and generic.** `commonButton` renders `<button>` with a
  `<slot>` for content and a `focus()` API [col:commonButton/commonButton.html:1-8],
  [col:commonButton/commonButton.js:55-58]. `commonModal` composes two `<c-common-button>` children
  for its primary/secondary actions [col:commonModal/commonModal.html:10-29].
- **Child-component composition tree is documented in the README** (e.g. `productQuantitySelector` →
  `commonNumberInput` + `productQuantitySelectorPopover`; `searchResults` → `commonButton` +
  `commonLink` + `productPricing` + …) (col repo: README.md:119-124).
- **Label bundles pair only with components that render text.** `productPricing` has `./labels.js`
  [col:productPricing/productPricing.js:9]; `productQuantitySelector` has `./labels` + `./constants`
  [col:productQuantitySelector/productQuantitySelector.js:10-11]; `commonNumberInput` has
  `./labels`/`./locale`/`./utils` [col:commonNumberInput/commonNumberInput.js:9-11]. `commonButton`/
  `commonLink` (pure controls) have no label bundle [col:commonButton/commonButton.js:8].
- **Utils files are default-exported single functions or const maps** — `productPricingUtils.js`
  default-exports `displayOriginalPrice(...)` [col:productPricing/productPricingUtils.js:16];
  `constants.js` exports rule/event constants and an `errorLabels` map
  [col:productQuantitySelector/constants.js:10-23].
- **`static renderMode = 'light'`** on every col component read [col:productPricing/productPricing.js:13],
  [col:commonButton/commonButton.js:16], [col:searchFilters/searchFilters.js:33]; templates declare
  `<template lwc:render-mode="light">` [col:productPricing/productPricing.html:1].

## Events & communication

- **Barrel-style event-name constants re-exported for consumers.** `commonNumberInput` exports
  `VALUE_CHANGED_EVT`/`VALIDITY_CHANGED_EVT` and error-reason constants
  [col:commonNumberInput/commonNumberInput.js:12-18]; `productQuantitySelector` re-exports a subset
  plus `OUT_OF_STOCK_EVT` so parents import names, not string literals
  [col:productQuantitySelector/productQuantitySelector.js:12].
- **Bubbling + composed `CustomEvent`s across the presentational boundary.** `productQuantitySelector`
  re-emits `valuechanged`/`validitychanged` with `{ bubbles: true, composed: true }`
  [col:productQuantitySelector/productQuantitySelector.js:262-271],
  [col:productQuantitySelector/productQuantitySelector.js:281-290]; `commonNumberInput` dispatches the
  same way [col:commonNumberInput/commonNumberInput.js:400-408]. `outofstock` is emitted **non-bubbling**
  (component-local) [col:productQuantitySelector/productQuantitySelector.js:250-256].
- **Child events are stopped then re-shaped by the parent.** `productQuantitySelector.handleQuantityChanged`
  calls `e.stopPropagation()` then re-dispatches an enriched detail
  [col:productQuantitySelector/productQuantitySelector.js:258-273]; `handleValidityChanged` folds a
  human-readable `description` into the re-dispatched detail
  [col:productQuantitySelector/productQuantitySelector.js:274-291].
- **`searchFilters` emits `openmodal`** (`bubbles`/`composed`/`cancelable`) to ask an ancestor to open
  the mobile filters modal [col:searchFilters/searchFilters.js:69-78].
- **`commonModal` cancelable-action contract.** `primaryactionclick`/`secondaryactionclick` are
  dispatched `cancelable`; the modal auto-closes unless the consumer calls `preventDefault()`, and the
  detail carries a `close(result)` escape hatch for manual/async close
  [col:commonModal/commonModal.js:130-144]. Consumer usage is documented inline
  [col:commonModal/commonModal.js:17-43].

## Errors, loading, and processing state

- **Validation is delegated to a hidden native `input[type=number]`.** `commonNumberInput` keeps a
  visible text input for locale-formatted display and a hidden numeric input whose native
  `validity`/`stepUp`/`stepDown` drive validation [col:commonNumberInput/commonNumberInput.js:178-196],
  [col:commonNumberInput/commonNumberInput.js:313-325], [col:commonNumberInput/commonNumberInput.js:417-428].
- **Error reason → localized message mapping.** `errorLabels` maps native validity reasons
  (`rangeOverflow`/`rangeUnderflow`/`stepMismatch`/`patternMismatch`) to labels
  [col:productQuantitySelector/constants.js:13-18]; `notificationText` interpolates `{min}`/`{max}`/`{step}`
  into the chosen label [col:productQuantitySelector/productQuantitySelector.js:231-234].
- **Priority-ordered error surfacing.** `hasError` OR-combines custom error / out-of-stock / validation
  error [col:productQuantitySelector/productQuantitySelector.js:208-210]; `notificationText` resolves in
  priority custom → out-of-stock → validation [col:productQuantitySelector/productQuantitySelector.js:221-235].
- **`customValidity` setter proxies straight to the native input** via `setCustomValidity` +
  `reportValidity` [col:commonNumberInput/commonNumberInput.js:100-107].
- **"Render, don't hide, on missing data."** `builderProductPricing` deliberately still renders the
  presentational child (which owns a price-unavailable state) rather than hiding on absent data
  [col:builderProductPricing/builderProductPricing.js:201-220]; the child renders `unavailablePriceLabel`
  when `isPriceAvailable` is false [col:productPricing/productPricing.html:54-58].

## Guards

- **Wrapper gates render with `renderedCallback` + `slds-hide` toggle** rather than a top-level
  `lwc:if`, so the child stays instantiated: `this.classList.toggle('slds-hide', !this.displayPricing)`
  [col:builderProductPricing/builderProductPricing.js:241-243].
- **Nullish-safe derived getters** for expression-bound JSON that is undefined on first render —
  optional chaining throughout: `this.productPricing?.negotiatedPrice`
  [col:builderProductPricing/builderProductPricing.js:167-169], `this.productTax?.taxPolicies?.[0]?.taxRatePercentage`
  [col:builderProductPricing/builderProductPricing.js:149-153], `product != null` availability checks
  [col:builderProductPricing/builderProductPricing.js:230-236].
- **Form-factor guard for responsive branching.** `searchFilters` wires `getFormFactor` and renders an
  inline panel on `Large` vs a modal-trigger button otherwise
  [col:searchFilters/searchFilters.js:34-38], [col:searchFilters/searchFilters.html:2-13].
- **`crypto?.randomUUID?.()` with incrementing fallback** for unique ARIA ids — SSR/older-runtime safe
  [col:commonNumberInput/commonNumberInput.js:19-22], [col:productQuantitySelector/productQuantitySelector.js:13-16].
- **String-to-number coercion guard.** `stringOnlyHasNumbers` gates numeric rule normalization before
  `+value` coercion [col:productQuantitySelector/productQuantitySelector.js:157-163].

## Labels & i18n

- **col label namespace is `c.*`, not `site.*`.** `productPricing` imports
  `@salesforce/label/c.Product_Pricing_strikethroughAssistiveText` [col:productPricing/productPricing.js:8],
  re-exported through a `Labels` object [col:productPricing/labels.js:8-15]. The namespace is a
  deliberate packaging choice: `jsconfig.json` maps `c/*` → `*` [col:jsconfig.json:9-12], i.e. col ships
  as an unmanaged package under the default `c` namespace. This **closes census open-question 6
  repo-wide** — consistent with notes/search.md's per-family conclusion; every col label is `c.*`.
- **Placeholder interpolation via `String.prototype.replace`.** Quantity guide text replaces `{0}`
  [col:productQuantitySelector/productQuantitySelector.js:170-183]; error messages replace
  `{min}`/`{max}`/`{step}` [col:productQuantitySelector/productQuantitySelector.js:231-234].
- **Locale-aware number formatting.** `commonNumberInput` derives decimal/grouping separators and uses
  `toLocaleString(getLocale(), …)` for display [col:commonNumberInput/commonNumberInput.js:454-460]; its
  input-validation regex pattern is built from the locale separators
  [col:commonNumberInput/commonNumberInput.js:221-224].
- **Currency via base component.** `productPricing` uses `<lightning-formatted-number
  format-style="currency">` with `currency-code` [col:productPricing/productPricing.html:16-21].
- **`@api` label props for builder-configurable strings** (e.g. `negotiatedPriceLabel`,
  `unavailablePriceLabel`), defaulted + `translatable="true"` in the wrapper meta
  [col:builderProductPricing/builderProductPricing.js-meta.xml:22-27].

## Accessibility

- **col is the only repo wired for automated a11y testing** (sa11y — see Testing). Component-level a11y
  patterns worth teaching:
- **Assistive text for strikethrough pricing** — screen readers do not announce strike styling, so a
  visually-hidden `slds-assistive-text` span reads "(crossed out)"
  [col:productPricing/productPricing.html:35-39], sourced from a label
  [col:productPricing/productPricing.js:116-118].
- **`aria-live="assertive"` + `aria-atomic="true"`** on price regions that update
  [col:productPricing/productPricing.html:5-9].
- **`aria-label` from `assistiveText`** on the slot-only `commonButton` (no visible affordance beyond
  the slotted content) [col:commonButton/commonButton.html:2-5].
- **Unique `aria-describedby` ids** generated per instance for the quantity selector notification
  [col:productQuantitySelector/productQuantitySelector.js:218-220].
- **Explicit `focus()` public methods** so parents can manage focus after actions —
  `commonButton.focus()` targets the inner `<button>` [col:commonButton/commonButton.js:55-58];
  `commonLink.focus()` targets the inner `<a>` [col:commonLink/commonLink.js:63-66].
- **`commonLink` blocks default nav when `href` is blank/undefined** via `handleClick` →
  `event.preventDefault()` [col:commonLink/commonLink.js:82-86].

## Styling

- **Utility-class generators for structural styling** (col-internal controls): `commonButton`/`commonLink`
  build class lists from `generateButtonStyleClass`/`generateButtonSizeClass`/`generateButtonStretchClass`/
  `generateElementAlignmentClass` (`experience/styling`)
  [col:commonButton/commonButton.js:9-14], [col:commonButton/commonButton.js:59-67],
  [col:commonLink/commonLink.js:67-75].
- **CSS-custom-property generation for merchant-themable styling** (builder wrappers):
  `builderProductPricing.priceStyles` emits `--ref-c-product-pricing-*` properties via
  `generateStyleProperties` [col:builderProductPricing/builderProductPricing.js:190-198].
- **Text-size resolved through a static `--dxp-s-text-heading-*` map** in the col wrapper
  [col:builderProductPricing/builderProductPricing.js:12-16], whereas os resolves it through the dynamic
  `generateThemeTextSizeProperty` theme API [os:productPricing/productPricing.js:4-7].
- **Scoped CSS files** (`*.scoped.css`) accompany styled components — `productPricing`,
  `commonButton`, `commonNumberInput`, `commonLink`, `productQuantitySelector` (per file listing);
  os equivalents use plain `.css`.
- **Builder-exposed style props** — Color/font-size `@api` props surfaced in the wrapper meta with
  SLDS font-size datasources [col:builderProductPricing/builderProductPricing.js-meta.xml:17-18].

## Candidate generation rules

1. **Split an Experience-Builder-exposed commerce component into an internal presentational component
   (`isExposed=false`, primitive `@api` props, no data imports) plus an exposed `builder*` wrapper that
   binds data and dispatches actions** — the col reference pattern
   [col:productPricing/productPricing.js-meta.xml:3], [col:builderProductPricing/builderProductPricing.js-meta.xml:3].
   (os teaches the flat single-component alternative — see Divergences; prefer os for greenfield.)
2. **Bind JSON data through Experience-Builder expressions on `@api` props (`{!Product.Details}` etc.),
   not `@wire`, for LWR data-provider surfaces** [col:builderProductPricing/builderProductPricing.js-meta.xml:67-80].
3. **Dispatch mutations with `commerce/actionApi` action creators + `dispatchAction`, only from the
   exposed wrapper layer** [col:builderSearchResults/builderSearchResults.js:10].
4. **Re-export event-name constants from the component module so parents bind by symbol, not string
   literal** [col:commonNumberInput/commonNumberInput.js:12-18].
5. **Stop child events and re-dispatch enriched, bubbling+composed events at the container boundary**
   [col:productQuantitySelector/productQuantitySelector.js:258-273].
6. **Make modal actions cancelable and provide a `close(result)` escape hatch in the event detail** for
   async consumer flows [col:commonModal/commonModal.js:130-144].
7. **Delegate numeric validation to a hidden native `input[type=number]` and read `validity`/`stepUp`/
   `stepDown`** rather than hand-rolling range logic [col:commonNumberInput/commonNumberInput.js:178-196].
8. **Add assistive text for purely visual cues** (strikethrough, icon-only buttons) via
   `slds-assistive-text` or `aria-label` [col:productPricing/productPricing.html:35-39],
   [col:commonButton/commonButton.html:2-5].
9. **Generate unique ARIA ids with `crypto?.randomUUID?.()` and a counter fallback** for SSR/runtime
   safety [col:commonNumberInput/commonNumberInput.js:19-22].
10. **Gate a wrapper's visibility with `renderedCallback` + `slds-hide` when the child owns an
    empty/unavailable state** you want to keep mounted [col:builderProductPricing/builderProductPricing.js:241-243].
11. **Interpolate label placeholders (`{0}`, `{min}`) with `String.replace` and format numbers with
    `toLocaleString(getLocale())`** [col:productQuantitySelector/productQuantitySelector.js:170-183],
    [col:commonNumberInput/commonNumberInput.js:454-460].

## Candidate review rules / anti-patterns

1. **Flag a presentational component that imports `commerce/*` / `experience/*` data adapters** — in
   the col model those belong in the `builder*` wrapper; the internal component should take resolved
   primitives [col:productPricing/productPricing.js:8-10].
2. **Flag `@wire` used to fetch record data inside an LWR commerce builder component** — expected
   channel is expression/data-provider binding [col:builderProductPricing/builderProductPricing.js-meta.xml:67-80]
   (col repo: README.md:103-105).
3. **Flag `commerce/actionApi` dispatch from an internal/presentational component** — dispatch belongs
   in the exposed wrapper [col:builderSearchResults/builderSearchResults.js:10].
4. **Flag price/strikethrough or icon-only controls lacking assistive text**
   [col:productPricing/productPricing.html:35-39].
5. **Flag re-dispatched child events that don't `stopPropagation()` the original** (double-firing risk)
   [col:productQuantitySelector/productQuantitySelector.js:258-260].
6. **Flag `<a href>` controls that don't guard blank/undefined `href` with `preventDefault()`**
   [col:commonLink/commonLink.js:82-86].
7. **Flag a modal action contract that isn't `cancelable` / gives consumers no manual-close hook**
   [col:commonModal/commonModal.js:130-144].
8. **Flag the malformed `xmlns` in internal-component meta** (`xmlns="xmlns=http://…"`) — a real
   copy-paste defect present across col `isExposed=false` bundles
   [col:productPricing/productPricing.js-meta.xml:2], [col:searchFilters/searchFilters.js-meta.xml:2],
   [col:commonButton/commonButton.js-meta.xml:2]; the exposed wrappers have the correct namespace
   [col:builderProductPricing/builderProductPricing.js-meta.xml:2].
9. **Flag divergent CSS-custom-property namespaces / hardcoded theme maps** — prefer the os dynamic
   theme API over col's static `--dxp-s-*` map [col:builderProductPricing/builderProductPricing.js:12-16],
   [os:productPricing/productPricing.js:4-7].

## Testing

**col is the only repo of the two with any Jest/a11y testing wiring** — but the wiring ships **without
a single test file**. Capture both facts.

- **Jest config** extends the sfdx-lwc-jest preset, appends the sa11y setup file, and sets
  `passWithNoTests: true` (col repo: jest.config.js:1-12). The `passWithNoTests` flag is itself evidence
  the release ships **zero specs**.
- **sa11y setup** registers the accessibility matcher globally:
  `registerSa11yMatcher()` from `@sa11y/jest` (col repo: jest-sa11y-setup.js:1-3), pushed into
  `setupFilesAfterEnv` by the jest config (col repo: jest.config.js:3-5).
- **npm scripts** expose the full test surface — `test`/`test:unit` (`sfdx-lwc-jest
  --skipApiVersionCheck`), `test:unit:watch`, `test:unit:debug`, `test:unit:coverage`, and a `ready`
  gate that runs lint + format + test (col repo: package.json:15-21). Dev deps pin `@sa11y/jest@5.2.0`
  and `@salesforce/sfdx-lwc-jest@1.3.0` (col repo: package.json:32-35).
- **Pre-commit enforcement.** `lint-staged` runs prettier + eslint on staged files and
  `sfdx-lwc-jest --skipApiVersionCheck -- --bail --findRelatedTests` on staged `lwc/**` (col repo:
  package.json:55-64) — a "run only related tests, bail on first failure" gate wired through husky
  (`postinstall: husky install`, col repo: package.json:13).
- **`jsconfig.json` enables the test-authoring environment** — `experimentalDecorators`, the
  `c/*` → `*` path map, and `typeAcquisition.include: ["jest"]` for Jest globals typing
  [col:jsconfig.json:2-18].
- **No exemplary test file could be dissected because none exists.** A repo-wide search for
  `__tests__`, `*.test.*`, `*.spec.*` returned zero results; `passWithNoTests: true` confirms this is
  intentional in the shipped release (col repo: jest.config.js:6). **This corrects the task premise
  that an exemplary spec could be dissected** — the teachable artifact is the *infrastructure and
  enforcement wiring*, not any authored test. It also refines census open-question 5: the census
  finding "zero test coverage in either repo" is correct for *test files*, but col uniquely ships the
  *config, sa11y matcher, scripts, and pre-commit test gate*, which os lacks entirely.

## Divergences

os wins for pattern extraction in every conflict below; col's unique contributions (testing infra,
builder-wrapper customization pattern, jsconfig/namespace conventions) are called out as the exception
where col leads.

1. **Component structure — split wrapper (col) vs flat exposed component (os).**
   os `productPricing` is a single `isExposed=true` component that does data access *and* presentation
   [os:productPricing/productPricing.js-meta.xml:1], [os:productPricing/productPricing.js:1]. col splits
   into exposed `builderProductPricing` [col:builderProductPricing/builderProductPricing.js-meta.xml:3]
   wrapping internal `productPricing` (`isExposed=false`) [col:productPricing/productPricing.js-meta.xml:3].
   os has 0 `builder*` bundles; col has 10. **os wins for pattern extraction** (fewer moving parts, one
   component to teach). **col leads on the *customization* pattern** — the internal component is reusable
   and independently testable, and the wrapper isolates Experience-Builder concerns; teach col's
   builder-wrapper as the advanced/customization path.

2. **Business logic — `displayPricing` guard.** os `productPricing.displayPricing` additionally requires
   `!this.product?.productSellingModels?.length` [os:productPricing/productPricing.js:78-80]; col
   `builderProductPricing.displayPricing` omits that selling-models guard
   [col:builderProductPricing/builderProductPricing.js:213-220]. **os wins** (col would render pricing
   for subscription/selling-model products the os build suppresses). Consistent with notes/product.md's
   conclusion; verified here at source.

3. **Styling API — dynamic theme resolution (os) vs static map (col).** os uses
   `generateThemeTextSizeProperty` [os:productPricing/productPricing.js:4-7]; col hardcodes a
   `--dxp-s-text-heading-*` `Map` [col:builderProductPricing/builderProductPricing.js:12-16]. CSS-var
   namespace also differs: os `--com-c-product-pricing-*` [os:productPricing/productPricing.js:70-76] vs
   col `--ref-c-product-pricing-*` [col:builderProductPricing/builderProductPricing.js:192-197]. **os
   wins** (dynamic API tracks theme changes; `--com-c-*` is the shipped-product namespace, `--ref-c-*`
   marks reference/sample code).

4. **`commonButton` role — internal control (col) vs exposed merchant button (os).** os `commonButton`
   is `isExposed=true` ("Action Button", SSR-capable `lightning__ServerRenderableWithHydration`), with a
   `text` `@api` and merchant color/border style props emitting `--com-c-button-*`
   [os:commonButton/commonButton.js-meta.xml:4-9], [os:commonButton/commonButton.js:5-48]. col
   `commonButton` is `isExposed=false`, slot-based, no `text` prop, styled via utility-class generators,
   with a `focus()` method for internal composition [col:commonButton/commonButton.js-meta.xml:3],
   [col:commonButton/commonButton.js:55-67]. **They are different components sharing a name** — os's is a
   builder-facing widget, col's is a private building block. **os wins** for the merchant-facing button;
   col's is the internal-composition primitive.

5. **`commonModal` — near-identical logic, different code hygiene.** Behaviour matches (same
   cancelable-action + `close` escape hatch) [os:commonModal/commonModal.js:27-41],
   [col:commonModal/commonModal.js:130-144], but col adds Apache license headers, JSDoc, usage examples,
   and `message` guards [col:commonModal/commonModal.js:1-102] absent from the terse os source
   [os:commonModal/commonModal.js:1-3]. **Tie on logic; col leads on documentation.**

6. **`commonNumberInput` / `commonLink` presence.** `commonButton`, `commonModal`, `commonNumberInput`
   exist in both repos; **`commonLink` is col-only** (no os counterpart) [col:commonLink/commonLink.js:1].
   col's `commonNumberInput` ships the same helper layout (`labels`/`locale`/`utils`) as os. This closes
   the notes/common.md hand-off: the four col `common*` names that duplicate os names were read here —
   three duplicate os (with the `commonButton` role-divergence in #4), one (`commonLink`) is unique to col.

7. **Testing infrastructure — col only.** col ships jest.config.js (col repo: jest.config.js:1-12),
   jest-sa11y-setup.js (col repo: jest-sa11y-setup.js:1-3), test/coverage/watch npm scripts and a
   lint-staged pre-commit test gate (col repo: package.json:15-21, 55-64), and a Jest-typed
   `jsconfig.json` [col:jsconfig.json:14-17]. os ships none of this. **col leads — this is the single
   biggest thing os lacks.** Caveat: col ships the wiring but **no test files** (`passWithNoTests: true`,
   col repo: jest.config.js:6), so the extractable artifact is the config/enforcement pattern, not a spec.

8. **Meta hygiene — malformed `xmlns` in col internal components.** col `isExposed=false` metas carry
   `xmlns="xmlns=http://soap.sforce.com/2006/04/metadata"` [col:productPricing/productPricing.js-meta.xml:2],
   [col:searchFilters/searchFilters.js-meta.xml:2] vs the correct declaration in os
   [os:commonButton/commonButton.js-meta.xml:2] and col's own exposed wrappers
   [col:builderProductPricing/builderProductPricing.js-meta.xml:2]. **os wins.**

9. **Label namespace.** col labels are all `c.*` (unmanaged package under default namespace, per
   `jsconfig` path map) [col:productPricing/productPricing.js:8], [col:jsconfig.json:9-12]; os search
   family uses `site.*` (per notes/search.md). Closes census open-question 6 repo-wide. **Neither
   "wins" — packaging artifact**; note it so generated skills don't hardcode one namespace.

10. **API version / compilation form.** os sources are terse/compiled-looking (no license headers, no
    JSDoc, bare field decls) [os:productPricing/productPricing.js:1], [os:commonButton/commonButton.js:1];
    col sources are prettier-formatted, license-headed, JSDoc-rich [col:productPricing/productPricing.js:1].
    For *reading/learning*, col is more legible; for *authoritative pattern shape*, os wins per the
    project rule. col internal metas pin `apiVersion 58.0` [col:productPricing/productPricing.js-meta.xml:4]
    while the exposed builder meta uses `apiVersion 67` [col:builderProductPricing/builderProductPricing.js-meta.xml:3].

## Anomalies & divergences

- **Census `hasTests=false` for all 37 col bundles is correct** (no per-bundle `__tests__`), **but
  understates col's testing story** — the Jest/sa11y wiring lives at repo root, outside bundle
  granularity (see Testing). Reconciles with census open-question 5.
- **Census open-question 6 (label namespace) closed repo-wide** — every col label is `c.*`, driven by
  the `jsconfig` `c/*`→`*` map [col:jsconfig.json:9-12]; verifies notes/search.md's per-family finding.
- **Census open-question 7 (shared adapter contracts) — verified consistent.** The col bundles I read
  do not themselves share adapters with os beyond what notes/search.md documented
  (`CartStatusAdapter`, `ProductSearchAdapter`); `builderProductPricing` uses `AppContextAdapter` from
  `commerce/contextApi` [col:builderProductPricing/builderProductPricing.js:10], the same module surface
  os `productPricing` uses [os:productPricing/productPricing.js:3] — same contract, not coincidental
  name reuse.
- **`commerce/actionApi` is `builder*`-only in col** (7/7 census actionApi consumers are wrappers) —
  enumerated under Data access; confirms the census module count and localizes all mutation dispatch to
  the exposed layer.
- **`os:productPricing` is itself the "builder" (data-binding) edition** — it carries the same
  `{!Product.Details}` expression props [os:productPricing/productPricing.js-meta.xml:1] col puts on
  `builderProductPricing`. So os did not drop the wrapper's *responsibilities*; it **merged** them into
  one exposed component. The col split is an organizational choice, not a capability difference.
