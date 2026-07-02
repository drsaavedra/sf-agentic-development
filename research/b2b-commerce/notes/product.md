# Deep-read notes: product

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

Census slice `family==='product'`: 72 bundles (58 `os`, 14 `col`), matching
findings-api-census.md's "Structure per family" table row `os product 58` / `col product 14`.

**Read in full** (`.js`, `.html`, `.js-meta.xml`, and helper `.js` files): `productPricing` +
`productPricingUi` (+ `productPricingUiUtils.js`), `productAddToCartButton`, `productAddQuantity`
(+ `constants.js`), `productAddToCartUtils` (+ `errorMessageUtils.js`,
`productAddToCartErrorLabels.js`), `productPurchaseOptions` (+ `utils.js`), `productMediaGallery`
(+ `transformers.js`), `productGalleryImage`, `productBundle`, `productBundleItem`,
`productBundleItemUi` (+ `conditionalTextconfigs.js`, `textDeterminationUtil.js`),
`productFieldsTable` (+ `productFieldsTableUtils.js`), `productFieldsTableUi`,
`productFrequentlyBoughtTogether`, `productFrequentlyBoughtTogetherUi`, `topSellers`,
`topSellersUi`, `productCard` (+ `pricingService.js`), `productVariantSelector`,
`productSellingmodelSelector`, `productSet`.

**Skimmed** (census.json `apiProps`/`metaProps`/`imports` only, no source read):
`productAttachments`, `productAttachmentsUi`, `productBundleButtonViewAll`,
`productBundleDetailsModal`, `productDynamicAttrAccordion`, `productFbtItem`, `productHeading`,
`productHeadingUi`, `productListPurchased`, `productListPurchasedFilterange`,
`productMediaSlider`, `productPricingDetails`, `productPricingDetailsUi`, `productPricingTiers`,
`productPricingTiersUi`, `productSellingmodelSelectorUi`, `productSetItem`,
`productSetItemContainer`, `productSetUi`, `productStencil`, `productSubscriptionItem`,
`productSubscriptions`, `productSubscriptionSelector`, `productThumbnailGallery`, `productTitle`,
`productVariantAttributesDisplay`, `productVariantPill`, `productVariantPillcontainer`,
`productVariantSelectorUi`, `productVariantSwatchcontainer`, `productVariantSwatchitem`,
`productWishlist`, `productWishlistButtonAdd`, `productWishlistShortcut`,
`productWishlistShortcutUi`, `productWishlistUi`, `productWishlistUtil`, and all 13 remaining
`col` bundles (`builderProductAttachments`, `builderProductPurchaseOptions`,
`builderProductQuantitySelector`, `builderProductVariantSelector`, `productAttachments`,
`productGalleryUtils`, `productPricingTiers`, `productQuantityAdd`, `productQuantitySelector`,
`productQuantitySelectorPopover`, `productVariantSelector`).

**One `col`-repo source file read for divergence verification** (not part of the OS_ROOT the
brief scoped Step 2 to, but read to resolve an os-vs-col conflict; see Anomalies):
`col:builderProductPricing/builderProductPricing.js` at
`D:\Documents\Claude\Salesforce-B2B-Repos\commerce-on-lightning-components-release\commerce-on-lightning-components-release\force-app\main\default\lwc\builderProductPricing\builderProductPricing.js`
(the doubled `commerce-on-lightning-components-release` directory level is correct on disk — a
zip-extraction artifact of the col repo root, confirmed with a directory listing).
The other 13 `col` bundles were census-only — no `COL_ROOT` was supplied in this task's inputs.

`findings-api-census.md` has an "Open questions for deep reads" section (8 numbered chase-items).
This deep read closes out the items relevant to the product family:
- **#1 (Apex imports, 0 across both repos)** — confirmed at the source level for this family, not
  just import-statement absence: see Data access below, "Zero `@salesforce/apex*` imports anywhere
  in either repo."
- **#2 (`commerce/actionApi` action-name enumeration)** — substantively answered by this note: see
  "`commerce/actionApi` — the write path for the `{!Product.*}` page context" under Data access,
  which enumerates the actual dispatched action names (`createProductQuantityUpdateAction`,
  `createCartItemAddAction`, `createWishlistItemAddAction`, `createProductVariantUpdateAction`,
  `createProductSubscriptionUpdateAction`, `createWishlistItemDeleteAction`) and the
  `dispatchAction(target, action, { onSuccess, onError })` call shape.
- **#4 (meta-less bundles are genuinely internal, not a regex miss)** — partially confirmed for one
  product-family bundle: `productAddQuantity` has no `js-meta.xml` `<property>` elements and no
  `<targets>`, verified as a genuine internal child component rather than a parser miss (see
  Anomalies & divergences below).
- Items #3, #5–#8 are not product-family-specific (rare `site/*` modules generally, test coverage,
  col label namespace, col shared adapters, and the `other` family) and are left open for their
  respective deep reads.

## Data access — how this family gets data without Apex

Zero `@salesforce/apex*` imports anywhere in either repo (findings-api-census.md "Apex imports" section: "NONE
— zero Apex imports across both repos"). The product family is 100% CMS-expression-bound `@api`
props plus `commerce/productApi` wire adapters plus `commerce/actionApi` dispatch — no Apex
controller anywhere in this family.

**Expression-bound `@api` props** (`js-meta.xml` `default="{!...}"`). The dominant root is
`{!Product.*}`, resolved by the Experience Builder product-detail-page context:
- `product` = `{!Product.Details}` — near-universal across the family, e.g.
  [os:productPricing/productPricing.js-meta.xml:29], [os:productFieldsTable/productFieldsTable.js-meta.xml:20],
  [os:productBundle/productBundle.js-meta.xml] (note: `productBundle` itself does NOT bind
  `product` — see Composition & structure).
- `productPricing` = `{!Product.Pricing}` [os:productPricing/productPricing.js-meta.xml:30]
- `productTax` = `{!Product.Tax}` [os:productPricing/productPricing.js-meta.xml:31]
- `productVariant` = `{!Product.SelectedVariant}` [os:productPricing/productPricing.js-meta.xml:32]
- `productInventory` = `{!Product.Inventory}` [os:productPurchaseOptions/productPurchaseOptions.js-meta.xml:18]
- `selectedProductSellingModel` = `{!Product.SelectedProductSellingModel}` on `productPricingDetails`
  [os:productPricingDetails/productPricingDetails.js-meta.xml:42], on `productPurchaseOptions`
  [os:productPurchaseOptions/productPurchaseOptions.js-meta.xml:19], and on
  `productSellingmodelSelector` [os:productSellingmodelSelector/productSellingmodelSelector.js-meta.xml:21].
- `promotionalPricing` = `{!Product.PromotionalPricing}` on `productPricingDetails`
  [os:productPricingDetails/productPricingDetails.js-meta.xml:41].
- `errors` = `{!Product.errors}` on `productPurchaseOptions`, consumed via a `parsedErrors` getter
  that JSON-parses a string or passes through an array [os:productPurchaseOptions/productPurchaseOptions.js:57-70]
- `productId` = `{!Route.recordId}` on `productFrequentlyBoughtTogether`
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js-meta.xml:16] and on
  `productSet` [os:productSet/productSet.js-meta.xml:16] — the PDP route, not the Product.*
  context, seeds these.
- `wishlistsData` = `{!Wishlists}` on `productWishlist` [os:productWishlist/productWishlist.js-meta.xml:16]
  — the only non-`Product`/`Route` root in this family.
- Item/child-row context uses a **different** root: `item` = `{!Item.data}` on `productBundleItem`
  [os:productBundleItem/productBundleItem.js-meta.xml:22] and quantity-rule sub-fields
  `{!Item.purchaseQuantityRule.minimum|maximum|increment}` on `productCard` (per
  findings-api-census.md's expression-bindings table) — `productCard` is search/listing-context
  (`Item`), not PDP-context
  (`Product`).

**Wire adapters from `commerce/productApi`** (data-fetch path, read-only):
`ProductAdapter` (product detail) [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:172-180], [os:productVariantSelector/productVariantSelector.js:44-49], `ProductPricingAdapter`
[os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:181-194],
`ProductChildrenAdapter` [os:productSet/productSet.js:18-24], `ProductInventoryLevelsAdapter`
[os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:215-229], [os:productSet/productSet.js:25-35], `ProductRecommendationsAdapter`
[os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:195-214],
`ProductSearchAdapter` and `ProductPricingCollectionAdapter`
[os:topSellers/topSellers.js:52-90], `ProductTaxAdapter` (productSetItemContainer — census.json
wires). `commerce/promotionApi`'s `PromotionApplicableAdapter` is wired reactively off a
computed cart-preview payload to fetch would-be promotional pricing before anything is actually
added to cart [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:119-138].
`commerce/contextApi`'s `AppContextAdapter`/`SessionContextAdapter` are used for **gating**, not
primary product data — tax locale type [os:productPricing/productPricing.js:18-23], guest vs.
logged-in [os:productPurchaseOptions/productPurchaseOptions.js:21-24], subscription
feature flags [os:productCard/productCard.js:277-286].

**`commerce/actionApi` — the write path for the `{!Product.*}` page context.** This is the
central action-dispatch archetype named in the brief. Components bound into the PDP `Product.*`
expression context do **not** call cart/product REST APIs themselves for state that the page
context owns (selected variant, selected quantity, selected selling model); they dispatch a typed
action and let the page context re-resolve `{!Product.*}` for every sibling component:
- `dispatchAction(target, action, { onSuccess, onError })` is the call shape
  [os:productPurchaseOptions/productPurchaseOptions.js:11].
- `createProductQuantityUpdateAction(productId, quantity, isValid)` — fired on quantity-selector
  change [os:productPurchaseOptions/productPurchaseOptions.js:131-135].
- `createCartItemAddAction(productId, quantity)` — fired on Add to Cart, sets
  `isAddToCartInProgress` before dispatch and clears it in both `onSuccess` and `onError`
  [os:productPurchaseOptions/productPurchaseOptions.js:162-183].
- `createWishlistItemAddAction(productId)` — fired on Add to List
  [os:productPurchaseOptions/productPurchaseOptions.js:184-198].
- `createProductVariantUpdateAction(options, isValid)` — fired on variant-pill/swatch selection,
  paired with an **independent** imperative navigation once the newly-wired `ProductAdapter`
  result confirms the new product loaded [os:productVariantSelector/productVariantSelector.js:71-85].
- `createProductSubscriptionUpdateAction(productSellingModelId, subscriptionTerm)` — fired on
  selling-model change [os:productSellingmodelSelector/productSellingmodelSelector.js:2].
- `createWishlistItemDeleteAction` — census-confirmed import on `productWishlist`.

**`commerce/checkoutCartApi` / `commerce/cartApi` — a second, parallel write path used by
components that are NOT bound into the PDP `{!Product.*}` context** (search/listing cards,
cross-sell rails, product-set "add all"). These call the cart API directly as a promise and manage
their own local `isAddToCartInProgress`/processing flag instead of dispatching through
`commerce/actionApi`:
- `productCard` calls singular `cartItemAdd(productId, quantity)` from `commerce/checkoutCartApi`
  [os:productCard/productCard.js:5].
- `productFrequentlyBoughtTogether` and `productSet` call plural `cartItemsAdd(cartPayload)`
  (object keyed by productId→quantity, or array of `{productId, quantity, productSellingModelId,
  subscriptionTerm}`) [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:8], [os:productSet/productSet.js:6].
- `productSetItemContainer` uses `commerce/cartApi`'s `addItemToCart` (census.json imports) — a
  **third** distinct cart-mutation import for the same "add to cart" concept in this one family.
- All three normalize errors the same way: `toCommerceError(error).code` compared against the
  string literal `'GUEST_INSUFFICIENT_ACCESS'` to redirect to the `Login` named page instead of
  showing a toast [os:productPurchaseOptions/productPurchaseOptions.js:12], [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:13], [os:productSet/productSet.js:10], [os:productCard/productCard.js:18].

**`commerce/dataEventApi`** dispatches analytics/telemetry events alongside both write paths —
`createCartItemAddDataEvent`, `createProductRecommendationDataEvent`,
`createWishlistItemAddDataEvent`/`createWishlistItemRemoveDataEvent`,
`createClickOnProductDataEvent`, `dispatchDataEvent`, plus search-correlation-id plumbing
(`getAndRemoveSearchCorrelationId`/`updateSearchCorrelationId`)
[os:productCard/productCard.js:8], [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:9], [os:productSet/productSet.js:7].

**Image handling** — the canonical pair is `experience/resourceResolver`'s `resolve()` (turns a
CMS-relative media URL into an absolute one) feeding `experience/picture`'s
`createImageDataMap(url, sizes)` (builds a responsive `<experience-picture>` `images` map from a
fixed `{mobile, tablet, desktop}` breakpoint object):
[os:productGalleryImage/productGalleryImage.js:2-3],
[os:productBundleItemUi/productBundleItemUi.js:2-3]. `productThumbnailGallery` and
`productMediaSlider` also import both modules (census.json imports) plus
`resolveVideoUrl` for mixed image/video galleries.

## Composition & structure

**Container/`*Ui` split is the dominant pattern**, not universal. Container components hold
`@wire`s and the `{!Product.*}` expression-bound `@api` props, compute a render-gate boolean, and
pass already-derived primitives (numbers/strings, not raw wire payloads) down to a presentational
`*Ui` sibling with no wires of its own:
- `productPricing` (wires `AppContextAdapter` for tax locale, computes `negotiatedPrice`/
  `originalPrice`/`taxRatePercentage` from the raw `productPricing`/`productTax` payload) →
  `productPricingUi` (pure formatting: `lightning-formatted-number`, strikethrough rule)
  [os:productPricing/productPricing.js:1-90], [os:productPricing/productPricing.html:1-18], [os:productPricingUi/productPricingUi.js:1-59].
- `productFieldsTable` (transforms `product.fields` via a content-mapping config) →
  `productFieldsTableUi` (renders a two-column table via `site-common-field`)
  [os:productFieldsTable/productFieldsTable.js:1-15], [os:productFieldsTableUi/productFieldsTableUi.html:1-28].
- `productFrequentlyBoughtTogether` (5 wires, cart mutation, promotion preview) →
  `productFrequentlyBoughtTogetherUi` (checkbox selection state, ResizeObserver-driven card
  width, emits `additemstocart`) [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js], [os:productFrequentlyBoughtTogetherUi/productFrequentlyBoughtTogetherUi.js].
- `topSellers` (2 product wires) → `topSellersUi` (maps raw product records into a card-shaped DTO
  in `productToCard()`, emits `navigatetopage`) [os:topSellers/topSellers.js], [os:topSellersUi/topSellersUi.js:63-97].
- `productBundleItem` (navigation, field-mapping transform) → `productBundleItemUi` (image sizing,
  conditional-text rule engine for pricing/child-relationship copy)
  [os:productBundleItem/productBundleItem.js], [os:productBundleItemUi/productBundleItemUi.js].
- **Exception**: `productSet` (5 `@wire`s, cart mutation, GUEST_INSUFFICIENT_ACCESS handling — as
  complex as `productFrequentlyBoughtTogether`) has `hasUiPair: false` in the census — no `*Ui`
  sibling exists for it, unlike its structural peers. Worth flagging as an inconsistency, not a
  rule to imitate.
- **Exception**: `productCard` is a single ~700-line component with no `*Ui` split at all
  (`hasUiPair: false`), combining wiring, cart mutation, wishlist mutation, and all presentational
  logic in one file [os:productCard/productCard.js] — the family's largest and most monolithic
  component, in contrast to the split pattern used elsewhere.

**Pure utility bundles (no template, no `LightningElement`)** ship as importable modules under the
`site/` namespace rather than as visual components: `productAddToCartUtils` (error-toast helpers +
error-code→label map) [os:productAddToCartUtils/productAddToCartUtils.js], `productWishlistUtil`
(wishlist toast helpers — census.json has zero `apiProps`), and `productVariantSelectorUi`, which
despite its `*Ui` name is imported by **both** `productSetItem` and `productVariantSelector` purely
for its exported `isVariantSupportedProductClass()` guard function, not as a rendered component
[os:productVariantSelector/productVariantSelector.js:4] (usage at
[os:productVariantSelector/productVariantSelector.js:68-70]; `productSetItem`'s import of the same
module is confirmed via census.json's import list, not a directly-read source file).
Similarly `productPricingDetails` is imported by `productSetItem` purely for its exported
`getOneTimeProductSellingModelPrice()` (census.json import list for `productSetItem`; not a
directly-read source file).

**Slot-based extension points**: `productBundle` exposes an `itemsBody` slot and is a pure
visibility wrapper with no data fetching of its own — it does not even bind `product`; it only
takes `productClass`/`total` as plain (non-expression) `@api` props and decides whether to render
its slotted children based on `productClass === 'Bundle' && total` (or design mode)
[os:productBundle/productBundle.js:9-15], [os:productBundle/productBundle.js-meta.xml:19-20]. Each
`productBundleItem` row consumes its own `{!Item.data}` expression individually — the parent does
not fetch a collection. `productPurchaseOptions` exposes a `combinedPurchaseQuantityRuleInfo` slot
[os:productPurchaseOptions/productPurchaseOptions.js:14-16], [os:productPurchaseOptions/productPurchaseOptions.html:6-10]. `productSellingmodelSelector` exposes
six slots for fully custom copy per pricing/label region
[os:productSellingmodelSelector/productSellingmodelSelector.js:5-12]. `productSet` exposes
`lifeTimeLabel`/`subscriptionLabel` slots [os:productSet/productSet.js:12-15].

**Every component in this family sets `static renderMode = 'light'`** (light DOM), e.g.
[os:productPricing/productPricing.js:9]. Most (but not all — see Anomalies) also declare
`<capability>lightning__ServerRenderableWithHydration</capability>` in `js-meta.xml`, e.g.
[os:productBundle/productBundle.js-meta.xml:7-9].

## Events & communication

- `ADD_PRODUCT_TO_CART_EVT` = `'addproducttocart'` — bubbles+composed `CustomEvent` with
  `detail: { quantity }`, dispatched by `productAddQuantity` on its internal Add-to-Cart button
  click and consumed by `productPurchaseOptions` via `onaddproducttocart`
  [os:productAddQuantity/constants.js:1], [os:productAddQuantity/productAddQuantity.js:74-83], [os:productPurchaseOptions/productPurchaseOptions.html:19].
- `ADD_ITEMS_TO_CART_EVENT_NAME` = `'additemstocart'` — dispatched by
  `productFrequentlyBoughtTogetherUi` with `detail: { products: [{ productId, quantity, price }] }`
  built from checked+valid items only, consumed by `productFrequentlyBoughtTogether` via
  `onadditemstocart` [os:productFrequentlyBoughtTogetherUi/productFrequentlyBoughtTogetherUi.js:5], [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.html:17].
- `NAVIGATE_TO_PAGE_EVENT` = `'navigatetopage'` — dispatched by `topSellersUi` with
  `detail: { menuItemId, pageReference }`, consumed by `topSellers` which calls `navigate()`
  directly with the passed-through `pageReference`
  [os:topSellersUi/topSellersUi.js:2], [os:topSellers/topSellers.html:8].
- `'imageclicked'` — bubbles+composed, no `detail`, dispatched by `productBundleItemUi` on image
  click; the parent `productBundleItem` handles navigation itself rather than the child
  [os:productBundleItemUi/productBundleItemUi.js:105-112].
- `'selected'`— plain (non-bubbling by default) `CustomEvent`, no `detail`, dispatched by
  `productGalleryImage` on image click [os:productGalleryImage/productGalleryImage.js:36-38].
- `productFrequentlyBoughtTogetherUi` also emits `viewproduct` and `selectitem` (consumed via
  `onviewproduct`/`onselectitem` in the parent template)
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.html:16].
- **Naming collision to be aware of**: `productCard` defines its own local instance method
  `dispatchAction(eventName)` that just dispatches a bubbling (not composed) telemetry-style
  `CustomEvent` with that name (`'addtocartclicked'`, `'addtocartsuccess'`, `'addtocarterror'`,
  `'addtowishlistclicked'`, `'addtowishlistsuccess'`, `'addtowishlisterror'`,
  `'deletefromwishlistclicked'`, `'deletefromwishlistsuccess'`, `'deletefromwishlisterror'`)
  [os:productCard/productCard.js:503-507]. This is unrelated to
  `commerce/actionApi`'s exported `dispatchAction(target, action, callbacks)` function used
  elsewhere in the family — same name, completely different signature and purpose.

## Errors, loading, and processing state

- `isAddToCartInProgress` (or equivalent `_wishlistProcessing`) boolean flag flips `true` before
  dispatch/call and `false` in both success and error paths — via `onSuccess`/`onError` callbacks
  when using `commerce/actionApi` [os:productPurchaseOptions/productPurchaseOptions.js:114-117],
  or via `.finally()` when using the promise-based cart APIs
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:291-309].
- Buttons disable on this flag: `isAddToCartButtonDisabled` combines `isCartProcessing` with
  missing/empty pricing, invalid variant selection, `productClass === 'VariationParent'`, and
  "has selling models but none selected" [os:productPurchaseOptions/productPurchaseOptions.js:156-161].
- Errors from either write path are normalized through `toCommerceError(error)` (imported from
  `commerce/checkoutCartApi` even when the action itself went through `commerce/actionApi`) before
  inspecting `.code` [os:productPurchaseOptions/productPurchaseOptions.js:7].
- `GUEST_INSUFFICIENT_ACCESS` is a **locally redefined string literal constant** (not an imported
  enum) in every component that needs it, checked against `toCommerceError(error).code` to divert
  guests to the `Login` named page instead of surfacing a toast — repeated verbatim in
  `productPurchaseOptions`, `productFrequentlyBoughtTogether`, `productSet`, and `productCard`
  [os:productPurchaseOptions/productPurchaseOptions.js:12], [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:13], [os:productSet/productSet.js:10], [os:productCard/productCard.js:18].
- Toast-based error surfacing goes through `site/commonToast`'s `CommonToast.show`/`Toast.show`
  with `variant: 'error'`/`'success'`, called with `this` (the dispatching component) as the toast
  target [os:productAddToCartUtils/productAddToCartUtils.js:3-8], [os:productCard/productCard.js:554-564].
- `productAddToCartUtils` centralizes error-code→label mapping (`AddToCartErrorType` enum:
  `INSUFFICIENT_ACCESS`, `MAX_LIMIT_EXCEEDED`, `LIMIT_EXCEEDED`, `MISSING_RECORD`,
  `INVALID_BATCH_SIZE`, `EXTERNAL_SERVICE_EXCEPTION`) rather than displaying raw server error text
  — unmapped codes fall back to a generic message, not the raw error
  [os:productAddToCartUtils/errorMessageUtils.js:2-14].
- `isOutOfStock` on `productPurchaseOptions` is derived by filtering the `{!Product.errors}`
  expression-bound array for `ProductErrors.OUT_OF_STOCK.code` (from `site/commerceErrors`) rather
  than being a separate boolean the page context provides directly
  [os:productPurchaseOptions/productPurchaseOptions.js:213-217].
- `productCard`'s wishlist toggle implements optimistic UI with a click-during-inflight-request
  debounce: `_wishlistClicks` counter and `_isOnWishlistOverride` track a UI state ahead of the
  server round-trip, and a queued second click during processing is replayed once the first
  request's wire refresh lands [os:productCard/productCard.js:634-664].

## Guards

- **Undefined-on-first-render**: `productPricing` gates its entire render on
  `product !== undefined && product !== null` and `productPricing !== undefined && ... !== null`
  before showing any price, and additionally will not render pricing at all when the product has
  `productSellingModels` (subscription products route to `productSellingmodelSelector`/
  `productPricingDetails` instead) [os:productPricing/productPricing.js:78-86].
- **Design-mode guard**: `experience/clientApi`'s `isDesignMode` short-circuits both
  out-of-stock-disabling logic (`productAddQuantity` always shows the configured button text/never
  disables in design mode) [os:productAddQuantity/productAddQuantity.js:41-46] and the
  bundle-visibility check (`productBundle` renders in design mode even with `total` unset)
  [os:productBundle/productBundle.js:13-15]; `productVariantSelector` similarly guards its
  post-swap navigation with `!isDesignMode` [os:productVariantSelector/productVariantSelector.js:80].
- **Guest vs. authenticated**: see the `GUEST_INSUFFICIENT_ACCESS` pattern under Errors above; also
  `productCard`'s wishlist icon visibility itself is gated on `sessionContext?.data?.isLoggedIn`
  in addition to product-class checks [os:productCard/productCard.js:352-360].
- **Product-class guards** recur across the pricing/selection sub-family: pricing, selling-model
  selection, and variant selection all independently re-derive "is this a `VariationParent`/`Set`
  product, and is the currently-selected variant valid" before rendering
  [os:productPricing/productPricing.js:78-80], [os:productSellingmodelSelector/productSellingmodelSelector.js:29-31], [os:productPurchaseOptions/productPurchaseOptions.js:156-161]. Each component re-implements this
  check locally rather than sharing one guard utility.
- **SSR-safety**: `static renderMode = 'light'` on every component keeps the DOM light for SSR
  hydration; none of the read components use `window`/`document` directly. Visibility is
  consistently enforced via `renderedCallback() { this.classList.toggle('slds-hide', !gate) }`
  rather than a root `<template if:true>` — e.g.
  [os:productPricing/productPricing.js:87-89], [os:productSellingmodelSelector/productSellingmodelSelector.js:46-48], [os:productSet/productSet.js:180-182], [os:productPurchaseOptions/productPurchaseOptions.js:239-241], [os:productVariantSelector/productVariantSelector.js:121-123]. This is deliberate: an SSR-rendered
  light-DOM node is present but hidden via class, not omitted, avoiding a hydration mismatch.

## Labels & i18n

- Currency formatting for the primary/negotiated/original price pair goes through
  `lightning-formatted-number format-style="currency" currency-code={currencyCode}
  maximum-fraction-digits="20"` [os:productPricingUi/productPricingUi.html:21-26].
  `productBundleItemUi` instead calls `site/commonFormatterCurrency`'s `currencyFormatter()`
  imperatively when composing a sentence-style price string
  [os:productBundleItemUi/productBundleItemUi.js:4].
- Placeholder interpolation uses a literal `'{0}'` token replaced via `String.replace`, not a
  formatting library — e.g. quantity guide text (`minimumValueGuideText`, `maximumValueGuideText`,
  `incrementValueGuideText`, default `"Minimum quantity is {0}"` etc.)
  [os:productPurchaseOptions/utils.js:29], [os:productPurchaseOptions/productPurchaseOptions.js-meta.xml], and `dynamicAttributesAvailableText` (default `"{0} Configurable Attributes"`)
  [os:productBundleItem/productBundleItem.js:126-131].
- A separate interpolation convention, `'{attributeName}'`, is used for the bundle-item
  attribute-name-with-colon label, applied via the same `.replace()` pattern
  [os:productBundleItem/productBundleItem.js:54-55].
- Every labeled component re-exports its `@salesforce/label/site.<component>.<label>` imports
  through a local `./labels.js` barrel rather than importing the raw label paths directly in the
  component — e.g. `productAddToCartUtils` maps 7 labels through
  `productAddToCartErrorLabels.js` into the `errorMessageUtils.js` lookup map
  [os:productAddToCartUtils/productAddToCartErrorLabels.js:1-8], [os:productAddToCartUtils/errorMessageUtils.js:1].
- `strikethroughAssistiveText` label backs the "was $X now $Y" assistive text pattern, reused
  identically in `productPricingUi` (assistive-only when both prices show) and `productFbtItem`
  (census.json label import) — the same concept named `strikethroughAssistiveText` in two
  independent label bundles.

## Accessibility

- Price rows use `aria-live="assertive" aria-atomic="true"` on the wrapping `<span>` so a price
  change (e.g. after a variant swap) is announced [os:productPricingUi/productPricingUi.html:7-8].
- When both original and negotiated price show together, a `slds-assistive-text` span
  ("was X now Y"-style) is inserted before the visual strikethrough price so the relationship is
  read out, not just visually implied by the strikethrough style
  [os:productPricingUi/productPricingUi.html:17-20].
- `productAddToCartButton` exposes an imperative `@api focus()` method that forwards to a
  `lwc:ref="button"` template ref, letting a parent programmatically return focus to the button
  after an async action (e.g. post add-to-cart) [os:productAddToCartButton/productAddToCartButton.js:21-24].
- `productGalleryImage` exposes `@api setAriaLabelledByOnFigureElement(idValue)` and
  `@api setRoleOnFigureElement(roleValue)` as imperative APIs so a parent gallery can wire ARIA
  relationships onto the `<figure>` element without the child needing to know its own labelling
  context up front [os:productGalleryImage/productGalleryImage.js:20-26].
- Image alt text always falls back from a specific alternate-text field to the media item's title:
  `item.alternateText || item.title` [os:productMediaGallery/transformers.js:7].

## Styling

- CSS custom properties are the styling surface, generated via `experience/styling`'s
  `generateStyleProperties({...})` (object → CSS custom property string) and bound to the host
  element's inline `style` attribute. Property names follow a `--com-c-<component>-<region>-<role>`
  convention, e.g. `--com-c-product-pricing-tax-info-label-color`
  [os:productPricing/productPricing.js:68-77]. `productCard` composes ~25 such properties in one
  getter [os:productCard/productCard.js:402-499].
- `generateThemeTextSizeProperty`/`generateTextFontSize`/`generateTextFontSizeV2` map a
  small/medium/large `String` design property to a `var(--dxp-s-text-heading-<size>-font-size)`
  reference rather than a literal px value, keeping text size themeable
  [os:productPricing/productPricing.js:4-7].
- `js-meta.xml` design properties reuse shared Java datasources for consistent Builder pickers:
  `java://siteforce.customComponent.datasource.SLDSFontSizeDataSource` for text-size properties
  and `java://siteforce.customComponent.datasource.ButtonStyleDataSource`/`ButtonSizeDataSource`
  for button variant/size [os:productPricing/productPricing.js-meta.xml:18].
- `experience-responsive size="m-"` / `size="s"` wraps mutually-exclusive desktop/tablet vs. mobile
  child components (`productThumbnailGallery` vs. `productMediaSlider`) rather than one component
  branching internally on viewport [os:productMediaGallery/productMediaGallery.html:2-24].

## Candidate generation rules

1. When a component participates in the PDP product-detail expression context, bind data via
   `{!Product.Details}` / `{!Product.Pricing}` / `{!Product.Tax}` / `{!Product.SelectedVariant}` /
   `{!Product.SelectedProductSellingModel}` / `{!Product.Inventory}` / `{!Product.errors}` default
   expressions on the corresponding `@api` property in `js-meta.xml` — never fetch the same data
   with a `commerce/productApi` wire adapter in a component that is meant to live inside that
   context [os:productPricing/productPricing.js-meta.xml:29-32].
2. To **mutate** state owned by the PDP page context (quantity, selected variant, selected selling
   model, add-to-cart, add-to-wishlist) from a component bound into `{!Product.*}`, dispatch a
   `commerce/actionApi` action — `createProductQuantityUpdateAction`, `createCartItemAddAction`,
   `createProductVariantUpdateAction`, `createProductSubscriptionUpdateAction`,
   `createWishlistItemAddAction`/`createWishlistItemDeleteAction` — via
   `dispatchAction(target, action, { onSuccess, onError })`. Do not call
   `commerce/checkoutCartApi`/`commerce/cartApi` directly from a `{!Product.*}`-bound component;
   that path is reserved for components that own their own product data outside the PDP context
   (search cards, cross-sell rails, product sets) [os:productPurchaseOptions/productPurchaseOptions.js:11].
3. For a standalone product-collection component (search card, recommendation rail, kit/set) that
   is **not** bound into `{!Product.*}`, call `commerce/checkoutCartApi`'s `cartItemAdd`
   (single item) or `cartItemsAdd` (multiple items, object or array payload) directly as a promise,
   track a local `isAddToCartInProgress` boolean around the call, and normalize the rejection with
   `toCommerceError(error)` before branching on `.code`
   [os:productCard/productCard.js:565-577], [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:276-310].
4. Always special-case the error code `'GUEST_INSUFFICIENT_ACCESS'` on any add-to-cart or
   add-to-wishlist failure: redirect via `navigate(navContext, { type: 'comm__namedPage',
   attributes: { name: 'Login' } })` instead of showing an error toast — every product-family
   mutation path implements this identically
   [os:productPurchaseOptions/productPurchaseOptions.js:176-181].
5. Quantity selectors take `minimum`/`maximum`/`increment` (not `min`/`max`/`step`) from a single
   `quantityRule` object (`{ minimum, maximum, increment }`), and render guide text per rule only
   when both the rule value AND the corresponding guide-text template are present — build the
   combined guide text with `computePurchaseRuleSet(quantityRule, quantityGuides)`, substituting
   `'{0}'` in each `*ValueGuideText` default string, and join present segments with `' • '`
   [os:productPurchaseOptions/utils.js:2-35], [os:productAddQuantity/productAddQuantity.js:47-55].
6. Gate an Add to Cart / Add to List button on the composite condition: currently processing OR
   pricing missing/empty OR selected variant invalid OR `productClass === 'VariationParent'` OR
   (`product.productSellingModels.length > 0` AND no selling model selected yet) — do not gate on
   a single "loading" flag alone [os:productPurchaseOptions/productPurchaseOptions.js:156-161].
7. Show a strikethrough original price next to a negotiated price only when **all** of: showing
   both is enabled, original price exists and is `>= 0`, negotiated price exists and is `>= 0`,
   AND original is strictly greater than negotiated — implement this as one pure predicate
   function (not inline template logic) so the same rule is reused everywhere prices render
   [os:productPricingUi/productPricingUiUtils.js:1-7].
8. Resolve a media/product image URL through `experience/resourceResolver`'s `resolve(url)` before
   passing it to `experience/picture`'s `createImageDataMap(resolvedUrl, { mobile, tablet, desktop })`;
   never bind a raw CMS/API-returned URL straight into an `<experience-picture>` `images` attribute
   [os:productGalleryImage/productGalleryImage.js:30-35].
9. When transforming a product's `mediaGroups` for display, filter to `usageType === 'Standard'`
   (product detail gallery) or `usageType === 'Listing'` (card/row thumbnail) explicitly — the two
   usage types are not interchangeable and picking the wrong one silently returns an empty gallery
   [os:productMediaGallery/transformers.js:1-16], [os:productBundleItem/productBundleItem.js:21-23].
10. Gate a component's visibility on product shape (variant parent, set, bundle, has selling
    models) inside `renderedCallback()` via `this.classList.toggle('slds-hide', !gate)`, not a
    root `<template if:true>` — this keeps the light-DOM SSR-hydrated node present so a subsequent
    client-side re-evaluation doesn't cause a hydration mismatch
    [os:productPricing/productPricing.js:87-89], [os:productSet/productSet.js:180-182].
11. Build condition-driven copy (e.g. "Required" vs "Included" vs "Optional add-on", or "No extra
    cost" vs "+$X") as a small ordered rule table (`{ outputValue, conditions: [{ field,
    fieldValue, operationWithPreviousCondition, operationWithFieldValue }] }`) evaluated by one
    generic `getOutputValueFromTextConfig()` function, rather than a nested-ternary getter — this
    is the pattern `productBundleItemUi` uses for both child/parent relationship text and per-item
    pricing text [os:productBundleItemUi/conditionalTextconfigs.js:1-42], [os:productBundleItemUi/textDeterminationUtil.js:1-36].
12. When a component's `@api` prop name collides with a helper's exported name (e.g. a component
    method literally named `dispatchAction`), keep the collision local and never let it shadow or
    be confused with `commerce/actionApi`'s exported `dispatchAction` — name local
    event-dispatch helpers distinctly (e.g. `dispatchTelemetryEvent`) to avoid the ambiguity
    `productCard` currently has [os:productCard/productCard.js:503-507].

## Candidate review rules / anti-patterns

1. Flag any `{!Product.*}`-context component (one whose `js-meta.xml` binds `product` to
   `{!Product.Details}`) that calls `commerce/checkoutCartApi`/`commerce/cartApi` directly instead
   of dispatching through `commerce/actionApi` — it will desync from sibling components reading
   the same `{!Product.*}` context [os:productPurchaseOptions/productPurchaseOptions.js:11], [os:productCard/productCard.js:5].
2. Flag a `dispatchAction(...)` call (or `cartItemAdd`/`cartItemsAdd`) that is not paired with a
   local in-flight boolean (`isAddToCartInProgress`, `isCartProcessing`, or equivalent) toggled
   before the call and cleared in both success and error branches — every read component in this
   family does this; skipping it risks duplicate submissions on double-click
   [os:productPurchaseOptions/productPurchaseOptions.js:114-117].
3. Flag error handling on an add-to-cart/add-to-wishlist call that shows a generic toast without
   first checking `toCommerceError(error).code === 'GUEST_INSUFFICIENT_ACCESS'` — guests must be
   routed to login, not shown an "insufficient access" error toast
   [os:productPurchaseOptions/productPurchaseOptions.js:176-181].
4. Flag a quantity selector wired to `min`/`max`/`increment` props instead of a single
   `quantityRule` object with `minimum`/`maximum`/`increment` keys, or one that disables the Add
   to Cart button purely on `quantity <= 0` without also checking the parent's `isOutOfStock`/
   `isAddToCartButtonDisabled` composite condition
   [os:productAddQuantity/productAddQuantity.js:47-61].
5. Flag a price-display component that renders a strikethrough/original price without routing
   through a single shared "should I show the original price" predicate (requires both prices
   configured to show AND original numerically greater than negotiated) — inlining that boolean
   check ad hoc in a template risks showing "$10 was $10" or a negative-looking discount
   [os:productPricingUi/productPricingUiUtils.js:1-7].
6. Flag any image binding that skips `experience/resourceResolver.resolve()` before
   `experience/picture.createImageDataMap()`, or that hardcodes image breakpoint sizes differently
   from the family's established `{mobile, tablet, desktop}` shape without justification
   [os:productGalleryImage/productGalleryImage.js:6-10].
7. Flag a component that reads `productMediaGroups`/`mediaGroups` without filtering by
   `usageType` — an unfiltered `mediaItems.flatMap()` will mix product-detail-gallery images with
   card-thumbnail images [os:productMediaGallery/transformers.js:3].
8. Flag a locally-redefined `'GUEST_INSUFFICIENT_ACCESS'` (or any other commerce error code)
   string literal that doesn't exactly match the family's established spelling/casing — since it's
   redefined per-file rather than imported from a shared constant, a typo silently breaks the
   guest-redirect path with no compile-time or lint signal
   [os:productPurchaseOptions/productPurchaseOptions.js:12], [os:productSet/productSet.js:10].
9. Flag any new component named or behaving like a `*Ui` sibling that itself performs data
   mutation (cart/wishlist calls) or holds `@wire` adapters — in this family, `*Ui` components are
   consistently presentation-only; wiring and mutation belong in the container
   [os:productPricingUi/productPricingUi.js], [os:productPricing/productPricing.js:1-3].
10. Flag a component-local method literally named `dispatchAction`, even in a file that does not
    currently import `commerce/actionApi` — `dispatchAction` is a pervasive export across this
    component family's write path (e.g. imported by `productPurchaseOptions`
    [os:productPurchaseOptions/productPurchaseOptions.js:11]), so a later edit that adds that
    import to the same file silently shadows/collides with the local method, as already happens
    with `productCard`'s local `dispatchAction(eventName)`
    [os:productCard/productCard.js:503-507].

Cross-skill integration: any generated LWC in this family that renders `lightning-formatted-number`,
custom properties, or SLDS layout classes should also pass `reviewing-lwc`'s commerce-b2b review
pass before being considered done.

## Anomalies & divergences

- **`findings-api-census.md`'s "Open questions for deep reads" section is closed out for the
  product-family-relevant items in this note** — see "Bundles covered" above for the item-by-item
  disposition (#1, #2, #4 addressed; #3, #5–#8 not product-specific).
- **`productAddToCartUtils` is a non-visual utility bundle that still declares
  `isExposed="true"` and `<capability>lightning__ServerRenderableWithHydration</capability>`**,
  despite having no `.html` template and zero `@api` properties
  [os:productAddToCartUtils/productAddToCartUtils.js-meta.xml:1-8]. It exists purely so other
  bundles can `import ... from 'site/productAddToCartUtils'`; the `isExposed`/SSR capability
  flags appear to be boilerplate rather than meaningful for a template-less bundle. Confirmed
  against findings-api-census.md's "Bundles with no js-meta.xml properties" list, which includes
  it.
- **SSR-hydration capability does not correlate cleanly with `@wire` usage.** Most presentational,
  `@api`-only components declare `lightning__ServerRenderableWithHydration` (e.g.
  `productBundle`, `productFieldsTable`, `productAddToCartButton`), and most components with
  `commerce/productApi` wire adapters that fetch product-specific data omit it (`productPricing`,
  `productPurchaseOptions`, `productFrequentlyBoughtTogether`, `productSet`, `topSellers` all
  lack the `<capabilities>` block). But `productCard` is a counter-example: it wires
  `NavigationContext`, `SessionContextAdapter`, `AppContextAdapter`, and `WishlistsAdapter` yet
  still declares the SSR capability [os:productCard/productCard.js-meta.xml:6-9]. The likely
  distinguishing factor is that `productCard`'s wires are session/context wires that don't block
  first paint, while the omitting components wire product-specific adapters
  (`ProductAdapter`/`ProductPricingAdapter`/`ProductSearchAdapter`/`ProductChildrenAdapter`) whose
  data is essential to what's rendered — but `productPricing` itself only wires
  `AppContextAdapter` (a context wire, same category as `productCard`'s) and still omits the
  capability, which breaks that theory too. Recording as an open pattern for follow-up rather than
  asserting a firm rule.
- **`col:builderProductPricing` diverges from `os:productPricing` in two ways**, verified by
  reading the actual `col` source (not just census.json, since the two components share identical
  `apiProps`/`metaProps` in the census and looked like a pure rename at that level):
  1. CSS custom property prefix is `--ref-c-*` in `col` vs. `--com-c-*` in `os`
     [col:builderProductPricing/builderProductPricing.js:192-198], [os:productPricing/productPricing.js:70-76].
  2. **Business-logic divergence**: `col:builderProductPricing`'s `displayPricing` gate omits the
     `!this.product?.productSellingModels?.length` check that `os:productPricing` has — the `col`
     version will show negotiated/original pricing for a product that has selling models
     (subscription-eligible) attached, where `os` suppresses it in favor of the selling-model
     selector UI [col:builderProductPricing/builderProductPricing.js:213-220], [os:productPricing/productPricing.js:78-80]. Per the os-wins-conflicts rule, treat the `os`
     gate (including the selling-models check) as the reference behavior.
- **Three distinct "add to cart" import names for the same concept** inside this one family:
  `commerce/checkoutCartApi`'s `cartItemAdd`/`cartItemsAdd` (productCard, productFrequentlyBoughtTogether,
  productSet), `commerce/actionApi`'s `createCartItemAddAction` (productPurchaseOptions,
  productWishlist), and `commerce/cartApi`'s `addItemToCart` (productSetItemContainer — census.json
  import). Not a bug, but a real fragmentation a generation skill must model as "pick the API that
  matches whether the component lives inside the PDP `{!Product.*}` context," not as one universal
  cart-mutation call.
- **`productSet` has no `*Ui` pair** (`hasUiPair: false` in census.json) despite being as complex
  as `productFrequentlyBoughtTogether`, which does have one. Confirmed by directory listing
  (`productSet/` has no sibling `productSetUi` bundle wired to it the way `productFrequentlyBoughtTogetherUi`
  is — `productSetUi` exists as its own separate bundle in the family but is not `productSet`'s
  container/presentational pair based on the imports read).
- **`productWishlistButtonAdd` and `productWishlistShortcut` both have `hasUiPair: true`** while
  `productWishlist` also claims `hasUiPair: true` — but `productWishlist`'s only expression-bound
  prop root, `{!Wishlists}`, is the sole non-`Product`/`Route` root in the whole family (see Data
  access section); flagged for awareness, not treated as an error.
- **`productAddQuantity` has no `js-meta.xml` `<property>` elements and no `<targets>`** — it is a
  purely internal building block (confirmed: census.json `targets: []`), consistent with its role
  as `productPurchaseOptions`'s child, but its `js-meta.xml` still declares `isExposed="true"`
  with no capability block (no SSR hydration flag either) — a third combination distinct from both
  patterns above.
