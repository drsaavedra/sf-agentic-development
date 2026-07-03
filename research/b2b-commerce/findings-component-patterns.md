# B2B Commerce LWC — component structure & convention findings

> Cross-family synthesis of the storefront-LWC deep reads (spec:
> `docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md`). This is the structural /
> convention half of the findings set: bundle layout, container/`*Ui` composition, Experience-Builder
> exposure, labels, events, error/loading/guard idioms, accessibility, styling, and testing. Data
> access, mutation, and refresh mechanics live in the sibling `findings-data-access.md` — this doc
> references that surface but does not re-derive it. Anti-patterns live in `findings-anti-patterns.md`
> (pointer only). Every factual claim carries an `[os:bundle/file:line]` or `[col:bundle/file:line]`
> citation; where a fact was already evidence-verified in a family deep read, the owning
> `notes/<family>.md` is named so the chain is traceable. **os** (`b2b-commerce-open-source-components`,
> 372 bundles) is authoritative for pattern extraction; **col** (`commerce-on-lightning-components`,
> 37 bundles) is the contrast/customization source and wins nothing by the project's os-wins rule
> except where explicitly noted (testing infra, the builder-wrapper split).

## 1. Bundle anatomy

The two repos ship LWC in **two physically different container formats**, and this is the first thing
a generator or reviewer must key off of.

**os — CMS-workspace (`sfdc_cms__lwc`) format.** Every os bundle lives under
`force-app/main/default/sfdc_cms__lwc/<bundle>/` and carries, in addition to the ordinary LWC files
(`<name>.js`, `<name>.html`, `<name>.js-meta.xml`), **two CMS-workspace wrapper files that a classic
LWC bundle never has**: `content.json` and `_meta.json`. `_meta.json` records the content's
`apiName`, a fixed `"type": "sfdc_cms__lwc"`, and a `path` [os:cartItems/_meta.json]
[os:commonBreadcrumbs/_meta.json]; `content.json` records the same `type`, a `title` (the bundle
name), an empty `contentBody` object, and a lowercased `urlName` [os:cartItems/content.json]
[os:commonBreadcrumbs/content.json]. These two files are present on **all 372** os bundles without
exception — they are how the open-source components are packaged as managed CMS content in a
DigitalExperienceBundle, not an optional extra. Styled os bundles additionally ship a `.scoped.css`
(scoped-style) file [os:commonBreadcrumbs/commonBreadcrumbs.scoped.css] and, where the component
needs a bundled icon sprite, a `.svg` [os:commonBreadcrumbs/commonBreadcrumbs.svg].

**col — classic LWC format.** Every col bundle lives under `force-app/main/default/lwc/<bundle>/` and
contains **only** the ordinary LWC files (`<name>.js`, `<name>.html`, `<name>.js-meta.xml`, optional
helper `.js`, `labels.js`, `.scoped.css`) — **no `content.json`, no `_meta.json`** on any of the 37
bundles [col:productPricing/productPricing.js-meta.xml:2] [col:builderProductPricing/builderProductPricing.js-meta.xml:2].
col is a conventional unmanaged-package LWC source tree; its namespace/packaging story is carried by
a repo-root `jsconfig.json` (mapping `c/*` -> `*`) and `package.json`, not by per-bundle CMS metadata
(see `notes/col-contrast.md` Testing and Labels) [col:jsconfig.json:9-12].

**Implication for authoring.** Generated os-style bundles must include the `content.json`/`_meta.json`
pair or they will not register as CMS content; generated col-style bundles must not. The `.js`/`.html`/
`.js-meta.xml` core is identical between the two, so the split is purely a packaging/deployment
concern layered on top of otherwise-standard LWC — the internals documented in the rest of this doc
apply to both formats.

## 2. Container / `*Ui` split

The dominant composition shape in os is a **two-part container/presentation split**: a builder-facing
**container** owns all data access (wires, imperative calls, expression-bound `@api` defaults) plus
the `js-meta.xml` design surface, and renders exactly one **`*Ui` leaf** that owns markup, DOM refs,
and presentation logic and takes everything through plain `@api` props. This is stated as a hard
convention in every family that has it:

- **cart** — `cartItems` (container: `@api` props + meta + actionApi dispatch) renders one
  `<site-cart-items-ui>`; the leaf carries markup and DOM logic only
  [os:cartItems/cartItems.html:1-39] [os:cartItemsUi/cartItemsUi.js-meta.xml:1-7]. Same shape for
  `cartBadge`->`cartBadgeUi` [os:cartBadge/cartBadge.html:2-17], `cartSummary`->`cartSummaryUi`
  (near-pure pass-through, 3 `@api` props, no logic) [os:cartSummaryUi/cartSummaryUi.js:1-9], and a
  three-tier chain `cartApplyCoupon`->`cartApplyCouponUi`->`cartApplyCouponButtonUi`
  [os:cartApplyCoupon/cartApplyCoupon.html:1-19] [os:cartApplyCouponUi/cartApplyCouponUi.html:27-35]
  (see `notes/cart.md` Composition).
- **common** — the family's own generation rule states it explicitly: put all data access in the
  container and zero in the `*Ui`, which carries no `<targetConfigs>` so it cannot be builder-placed
  independently [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js-meta.xml:1-4]. Confirmed pairs:
  `commonBreadcrumbs`->`commonBreadcrumbsUi` (10 `@api` props, pure render)
  [os:commonBreadcrumbs/commonBreadcrumbs.html:2], and a three-level chain
  `commonDrilldownNavigation`->`commonDrilldownNavigationUi`->(`BarUi`|`ListUi`)
  [os:commonDrilldownNavigation/commonDrilldownNavigation.html:2]
  [os:commonDrilldownNavigationUi/commonDrilldownNavigationUi.html:29-40].
- **product** — dominant but not universal: `productPricing` (wires `AppContextAdapter`, derives
  primitives) -> `productPricingUi` (pure formatting) [os:productPricing/productPricing.js:1-90]
  [os:productPricingUi/productPricingUi.js:1-59]; `productFieldsTable`->`productFieldsTableUi`
  [os:productFieldsTable/productFieldsTable.js:1-15] [os:productFieldsTableUi/productFieldsTableUi.html:1-28].
  Two documented exceptions live in this family: `productSet` has **no** `*Ui` pair despite being as
  complex as its peers [os:productSet/productSet.js:180-182], and `productCard` is a single
  ~700-line monolith with wiring, mutation, and presentation in one file
  [os:productCard/productCard.js:503-507] (see `notes/product.md` Composition).
- **order / quote / subscription** — the split is `*Ui` **or** `*Display`: the page-facing wrapper is
  a thin pass-through and the child carries all derivation with no `<targets>`, e.g.
  `orderDetails`->`site-order-details-ui` [os:orderDetails/orderDetails.html:2-9]
  [os:orderDetailsUi/orderDetailsUi.js:22-27] and
  `orderDeliveryGroupContainer` (itself meta-less) -> `site-order-delivery-group-display`
  [os:orderDeliveryGroupContainer/orderDeliveryGroupContainer.js-meta.xml:1-4].
- **checkout / search** — the same split appears for builder-configurable responsive components:
  `checkoutButton` (wires + expression data) composes `<site-checkout-button-ui>` (click ->
  navigate only) [os:checkoutButton/checkoutButton.html:1-33] [os:checkoutButtonUi/checkoutButtonUi.js:1-81];
  in search, the outer page-facing component does style-token/property normalization and the `*Ui`
  does render + event re-dispatch [os:searchFiltersPanel/searchFiltersPanel.html:20-33].

**What each half owns, precisely.** The container owns: the `{!...}` expression-bound `@api` defaults
(Section 4), `@wire`/imperative data access, the `commerce/actionApi` dispatch, the `js-meta.xml`
`<targets>`/`<targetConfigs>` design surface, and CSS-custom-property computation from builder props.
The `*Ui` leaf owns: markup, `lwc:ref` DOM handles, keyboard/focus logic, and re-dispatching child
events upward — and it declares **no `<targets>`** (it is `isExposed=true` but non-placeable, or
`isExposed=false`) [os:cartItemsUi/cartItemsUi.js-meta.xml:1-7]
[os:promotionSummaryUi/promotionSummaryUi.js-meta.xml:4]. A `*Ui` component that mutates data or holds
its own `@wire` is treated as a defect in every family (pointer: `findings-anti-patterns.md`).

**Census `*Ui`-pair stats.** The census "Structure per family" table (`findings-api-census.md`) counts
`*Ui` pairs per family in os: product 14, order 9, common 8, cart 6, quote 5, account 4, checkout 4,
search 4, promotion 1, subscription 0 — heaviest exactly in the largest, most presentational families.
**col ships zero `*Ui` pairs in every family** — col does not use the os-style container/presentation
split at all.

**col's alternative: the `builder*` wrapper.** Instead of a container/`*Ui` split, col splits the
concern the other way — an **exposed `builder*` wrapper** (`isExposed=true`, does the data binding and
`commerce/actionApi` dispatch) around an **internal presentational component** (`isExposed=false`,
primitive `@api` props, no data imports). `os:productPricing` is a single exposed component that does
both data access and presentation [os:productPricing/productPricing.js-meta.xml:1]; col splits it into
`builderProductPricing` (exposed, 2 targets) [col:builderProductPricing/builderProductPricing.js-meta.xml:3-9]
wrapping `productPricing` (`isExposed=false`) [col:productPricing/productPricing.js-meta.xml:3], whose
template is a single `<c-product-pricing>` fed derived primitives
[col:builderProductPricing/builderProductPricing.html:2-17]. **os has 0 `builder*` bundles; col has 10**,
one per exposed surface — a col-only pattern (see `notes/col-contrast.md` Divergences #1). Per the
os-wins rule, teach the os flat/container-`*Ui` shape as the default and col's builder-wrapper as the
advanced/customization path (the internal component is independently reusable and testable).

## 3. Experience-Builder exposure conventions

Builder-placeable os components share a tight, repeated `js-meta.xml` shape. A generator should treat
it as a template, not reinvent per component.

**Targets.** A page-placeable component declares both `<target>lightningCommunity__Page</target>` and
`<target>lightningCommunity__Default</target>` [os:commonBreadcrumbs/commonBreadcrumbs.js-meta.xml:7-10]
[os:cartItems/cartItems.js-meta.xml:7-10]. Theme-layout components instead declare the single
`<target>lightningCommunity__Theme_Layout</target>` and carry no palette section
[os:themelayoutSite/themelayoutSite.js-meta.xml:8]. Internal/leaf components (`*Ui`, evaluators,
utility modules) ship a `js-meta.xml` with **no `<targets>` block at all** — they are `isExposed=true`
(or `false`) but not builder-placeable [os:cartItemsUi/cartItemsUi.js-meta.xml:1-7]
[os:promotionSummaryUi/promotionSummaryUi.js-meta.xml:4]. The census counts 271 such meta-less bundles
(os 244 / col 27); every one confirmed genuinely internal on deep read, not a parser miss
(`notes/order-quote-subscription.md` open-question #4; `notes/product.md` on `productAddQuantity`)
[os:productAddQuantity/productAddQuantity.js-meta.xml:1-8].

**`paletteSection`.** The open-source components are grouped in the Builder component palette under a
dedicated `<paletteSection>Open Code</paletteSection>`, declared on the
`lightningCommunity__Page` targetConfig [os:cartItems/cartItems.js-meta.xml:13]
[os:commonBreadcrumbs/commonBreadcrumbs.js-meta.xml:13]. This is the marker that separates these
storefront components from standard Lightning components in the palette.

**`designLayout` sections and expression-prop hiding.** Expression-bound data props (the `{!...}`
defaults of Section 4) are hidden from the Builder property panel so a merchant cannot accidentally
overwrite the page-provider binding. The mechanism is a `<designLayout>`/`<designSection>` block whose
`<designLayoutProperty>` entries carry `cbVisibleIf="<prop>=false"` (show only when the prop is
unbound) — e.g. `cartItems`' `items`/`pagination`/`hasNextPageItems`/`currencyIsoCode` are each gated
`cbVisibleIf="items=false"` [os:cartItems/cartItems.js-meta.xml:59]. The simpler variant
`cbVisibleIf="false"` hides an expression-only prop unconditionally, as on
`promotionDiscountsApproaching`'s `discountsApproaching`
[os:promotionDiscountsApproaching/promotionDiscountsApproaching.js-meta.xml:23] and self-register's
`rawInternationalizationData`/`consentData` [os:selfRegister/selfRegister.js-meta.xml:51]
(see `notes/cart.md` and `notes/account-promotion.md` anomaly #7). Every expression-bound prop pairs
with such a design-layout entry.

**Style-type / configurable properties.** Merchant-configurable design properties follow consistent
conventions:
- Color and size are exposed as typed `<property>` entries that map to CSS custom properties at render
  (Section 9) — e.g. paired color props `linkColor`/`linkHoverColor`/`textColor`/`dividerColor` on
  `commonBreadcrumbs` [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js:61-68], and
  `headerIconsColor`/`headerIconsHoverColor` on `layoutHeaderOne`
  [os:layoutHeaderOne/layoutHeaderOne.js:64-72].
- Picklist-style properties reuse shared Java **datasources** rather than inline enumerations, for a
  consistent Builder dropdown: `java://siteforce.customComponent.datasource.SLDSFontSizeDataSource`
  for text size [os:cartItems/cartItems.js-meta.xml:34] [os:productPricing/productPricing.js-meta.xml:18],
  plus `DxpImageSizeDataSource`, `ButtonSizeDataSource`, `B2BCartCountDataSource`,
  `CartItemsPaginationOptionsDataSource` reused across the cart family
  [os:cartBadge/cartBadge.js-meta.xml:17] [os:cartBadge/cartBadge.js-meta.xml:22]
  [os:cartBadge/cartBadge.js-meta.xml:25] (see `notes/cart.md` Styling).
- Text properties a merchant can translate are marked `translatable="true"`
  [os:cartItems/cartItems.js-meta.xml:55] [os:myAccountProfile/myAccountProfile.js-meta.xml:22]; col's
  builder wrapper does the same on its label props [col:builderProductPricing/builderProductPricing.js-meta.xml:22-27].

**Deprecated-but-exposed and boilerplate anomalies.** Two exposure anomalies recur and matter for
generation defaults: `layoutHeader` remains fully builder-exposed (`isExposed=true`, full
`targetConfigs`) while its own `<description>` says "Deprecated - use layoutHeaderOne instead"
[os:layoutHeader/layoutHeader.js-meta.xml:6-8] — scaffold from `layoutHeaderOne`. And non-visual
utility bundles (no `.html`) still declare `isExposed="true"` plus a `lightning__ServerRenderable*`
capability as apparent boilerplate: `productAddToCartUtils`
[os:productAddToCartUtils/productAddToCartUtils.js-meta.xml:1-8], `checkoutAddresses` and
`checkoutErrorHandler` [os:checkoutErrorHandler/checkoutErrorHandler.js-meta.xml:1-8] — these exist to
be imported by a `site/...` specifier, not rendered. col additionally ships a real meta defect: its
`isExposed=false` internal bundles carry a malformed `xmlns="xmlns=http://..."`
[col:productPricing/productPricing.js-meta.xml:2] [col:searchFilters/searchFilters.js-meta.xml:2] while
its exposed wrappers have the correct namespace [col:builderProductPricing/builderProductPricing.js-meta.xml:2]
(details in `findings-anti-patterns.md`).

## 4. Label bundle pairing and i18n

**Per-bundle label barrels.** The near-universal convention: a component with user-facing text keeps a
sibling `labels.js` (or `labels`/`LABELS` object) that re-exports its `@salesforce/label/...` imports
under short names, and the component imports from `./labels` rather than referencing raw label modules
inline. Confirmed across every family read: cart [os:cartApplyCoupon/labels.js:1-22], order
[os:orderDetails/labels.js:1-5], search [os:searchFiltersPanel/searchFiltersPanel.js:2], account
[os:myAccountProfile/myAccountProfile.js:8], common [os:commonNumberInput/commonNumberInput.js:3]. A
minority skip the barrel and import `@salesforce/label/...` directly — both patterns coexist even
within one family (`commonBreadcrumbs`/`commonBreadcrumbsUi`)
[os:commonBreadcrumbs/commonBreadcrumbs.js:3] [os:commonBreadcrumbsUi/commonBreadcrumbsUi.js:3]. Labels
are strictly **per-bundle**; no shared/family-wide label module was found in os
(`notes/common.md` Labels).

**Namespace differs by repo, deliberately.** os labels are site-scoped `sfdc_cms__label`
(DigitalExperienceBundle) content whose fixed reserved prefix is `site.` — e.g.
`os:searchFiltersPanel` sources `site.searchFiltersPanel.*` [os:searchFiltersPanel/searchFiltersPanel.js:2].
col labels are org-wide `CustomLabels` under the default unnamespaced `c.` scope — `col:productPricing`
sources `@salesforce/label/c.Product_Pricing_strikethroughAssistiveText`
[col:productPricing/productPricing.js:8] re-exported through a `Labels` object
[col:productPricing/labels.js:8-15], driven by the `jsconfig` `c/*` -> `*` map
[col:jsconfig.json:9-12]. This is a **packaging choice, not a style choice** (os ships as an Experience
Cloud site bundle, col as an unnamespaced unmanaged package) — generated skills must not hardcode one
namespace over the other (`notes/search.md` open-question #6; `notes/col-contrast.md` Divergences #9).

**Interpolation is `String.prototype.replace`, never a formatting library.** Every family interpolates
label placeholders by chained `.replace()` on literal tokens. The token vocabulary is **not**
standardized — different components use different tokens in the same repo:
- `{0}` positional is the most common — `commonDrilldownNavigationUi`'s new-tab aria label
  [os:commonDrilldownNavigationUi/transformation.js:36], `cartItem.itemNameQuantityText`
  [os:cartItem/cartItem.js:279-283], product quantity guide text
  [os:productPurchaseOptions/utils.js:29], checkout summary item count
  [os:checkoutSummary/checkoutSummary.js:19-24], search `see all results`
  [os:searchInputContainer/searchInputContainer.js:118-130].
- Named tokens appear per feature — `{min}`/`{max}`/`{step}` in quantity error text
  [os:commonQuantitySelector/commonQuantitySelector.js:148]
  [col:productQuantitySelector/productQuantitySelector.js:231-234] (col), `{amount}`/`{code}`/
  `{cartName}`/`{maxLength}` across cart [os:cartItems/cartItems.js-meta.xml:49]
  [os:cartApplyCoupon/cartApplyCoupon.js:125] [os:cartCreateModal/cartCreateModal.js:168-169],
  `{nextBillingDate}` on subscription cancel [os:subscriptionCancelModal/subscriptionCancelModal.js:34-37],
  `{editLabel}`/`{addressName}` on account [os:myAccountAddressFooter/myAccountAddressFooter.js:48],
  `{count}` in search filter headers [os:searchFiltersPanel/searchFiltersPanel.js:105].
A more elaborate variant splits a label on `{0}` into a prefix/term/suffix array so the middle segment
can be styled independently [os:searchInputContainer/searchInputContainer.js:118-130].

**Locale/currency/date formatting** goes through platform primitives, never a hand-rolled formatter.
Currency is centralized in `site/commonFormatterCurrency` (an `Intl.NumberFormat` built from
`@salesforce/i18n/locale`, module-cached per `${currency}-${currencyDisplay}` key), imported by cart,
checkout, search, order, quote, account [os:buyerCurrencyFormatter/buyerCurrencyFormatter.js:1-16]
[os:cartItem/cartItem.js:5] [os:searchPriceRangeFacet/searchPriceRangeFacet.js:2]; components fall back
to `@salesforce/i18n/currency` when the payload carries no `currencyIsoCode`
[os:cartItems/cartItems.js:24-26]. Dates format through `Intl.DateTimeFormat(locale, {dateStyle,
timeZone})` fed by `@salesforce/i18n/locale`/`@salesforce/i18n/timeZone`
[os:subscriptionCard/dateUtil.js:4-11]. col uses base components for currency instead
(`<lightning-formatted-number format-style="currency">`) [col:productPricing/productPricing.html:16-21].
(Currency-formatter internals and the byte-identical `buyerCurrencyFormatter`/`commonFormatterCurrency`
duplication are covered in `findings-data-access.md` and `findings-anti-patterns.md`.)

## 5. Event / communication contracts

**Naming.** Custom events are flat, all-lowercase, no dashes, custom-namespaced verbs
(`deletecartitem`, `changequantity`, `facetvaluetoggle`, `saveprofile`, `accountselect`), and the
name string is centralized in a bundle-local `constants.js` that both the dispatcher and the listening
container import — never inlined as a literal in two places [os:cartItem/constants.js:1-6]
[os:cartItemsUi/constants.js:1] [os:searchFiltersPanel/searchFiltersPanel.js:240-251].

**`bubbles`/`composed` is applied deliberately, not blanket.** Most cross-boundary mutation events set
both `bubbles: true, composed: true` — but this is **not** uniform, and the inconsistency is real
source, not noise. Within a single cart bundle, `cartDeliverygroupItem.changequantity` sets both while
its sibling `deletecartitem`/`splitcartitem`/`changedeliverygroup` set `bubbles` only
[os:cartDeliverygroupItem/cartDeliverygroupItem.js:52-98]. col's `productQuantitySelector` re-emits
`valuechanged`/`validitychanged` bubbling+composed but emits `outofstock` non-bubbling (component-local)
[col:productQuantitySelector/productQuantitySelector.js:262-271]
[col:productQuantitySelector/productQuantitySelector.js:250-256]. Do **not** assert a blanket
composed/bubbles rule; verify per event (`notes/cart.md` review rule #4).

**Container re-shaping of child events.** A recurring contract: a leaf fires a local event, a container
`stopPropagation()`s it and re-dispatches an **enriched** detail under the **same** event name to
preserve the child's public contract. `commonQuantitySelector` re-dispatches the `commonNumberInput`
`valuechanged`/`validitychanged` it receives, adding a computed localized `description`
[os:commonQuantitySelector/commonQuantitySelector.js:162-192]; col's `productQuantitySelector` does the
identical stop-then-reshape [col:productQuantitySelector/productQuantitySelector.js:258-273].

**Aggregate-then-debounce chains.** Search is the reference multi-hop contract: leaf inputs fire
`facetvaluetoggle`/`facetvaluepricefilter` [os:searchFacetItem/searchFacetItem.js:48-59]; a single
aggregator (`searchFiltersPanel`) maintains a facet map, updates it optimistically, **debounces 300ms**,
and re-dispatches one `facetvalueupdate` carrying `{mruFacet, refinements, minPrice, maxPrice}`
[os:searchFiltersPanel/searchFiltersPanel.js:224-252]; intermediate `*Ui` layers let it bubble through
untouched; and exactly **one** ancestor converts the DOM event into a `commerce/actionApi` dispatch
[os:searchFilters/searchFilters.js:185-203]. Price-range applies bypass the debounce
[os:searchFiltersPanel/searchFiltersPanel.js:260-273] (mutation-dispatch mechanics: `findings-data-access.md`).

**Modal contracts.** Two idioms coexist. (1) **`lightning/modal` static `.open()`** — a component
imports a modal bundle's default export and calls `Modal.open({...})`, passing initial state as plain
config keys and completion callbacks as `on<event>` keys in the **same** config object, and resolving
via `this.close(result)` with a short string sentinel the caller branches on
[os:cartCreateButton/cartCreateButton.js:42-50] [os:reorderButton/reorderButton.js:49-58]
[os:reorderModal/reorderModal.js:59-63] [os:myAccountSwitcherModal/myAccountSwitcherModal.js:12]. (2) A
**cancelable action contract** on the modal itself: `commonModal`/`col:commonModal` fire a cancelable
`<type>actionclick` (`primaryactionclick`/`secondaryactionclick`) with a `detail.close(result)` escape
hatch; if the listener does not `preventDefault()`, the modal self-closes with the button type as result
[os:commonModal/commonModal.js:27-40] [col:commonModal/commonModal.js:130-144]. Modals ship no
`<targets>` — they are only ever opened imperatively, never dropped from the builder
[os:cartClearCartModal/cartClearCartModal.js-meta.xml:1-5].

**`@api` methods are part of the public contract.** Beyond properties, components expose `@api`
**methods** for parent-driven control: imperative `focus()` handoffs
[os:productAddToCartButton/productAddToCartButton.js:21-24] [os:commonButton/commonButton.js:55-58]
(col), `@api setAriaLabelledByOnFigureElement`/`setRoleOnFigureElement` on gallery images
[os:productGalleryImage/productGalleryImage.js:20-26], and action methods
`handleAmendClick`/`handleCancelClick`/`handleViewHistoryClick` on `subscriptionCardV2` so a parent
"more actions" menu can trigger them [os:subscriptionCardV2/subscriptionCardV2.js:338-354]. (Note: a
regex `@api` census miscounts these methods as data properties — `notes/order-quote-subscription.md`.)

**Two escape hatches worth flagging.** Some components dispatch on `document`/`window` rather than
`this`, bypassing normal bubbling: `cartCreateModal` fires `cartupdated`/`reloadCartList` on
`document` [os:cartCreateModal/cartCreateModal.js:171-176], and `searchResultsGrid`/`searchResultsList`
**listen** for `filterchanged`/`morepagesavailable` on `window` whose dispatcher is platform code
outside these repos [os:searchResultsGrid/searchResultsGrid.js:7-8]. Composition via markup tags is
also invisible to an import census — `subscriptionCardV2` composes `subscriptionStatus` five times by
`<site-subscription-status>` tag with no JS import [os:subscriptionCardV2/subscriptionCardV2.html:9-12].

## 6. Error, loading, and guard idioms

**Undefined-on-first-render is the pervasive guard.** Because the primary data channel is
expression-bound `@api` props that start `undefined` before the page provider resolves them (Section 3;
mechanics in `findings-data-access.md`), every family guards reads with optional chaining plus nullish
defaults, and treats "not loaded yet" as distinct from "empty". `cartContents` treats `!this.items`
(unresolved) as still-processing, flipping to empty only once `items` is a real array
[os:cartContents/cartContents.js:50-52]; search's `searchResultsLayoutEmpty` is an explicit three-state
gate (loader when `undefined`/loading, no-results only when exactly `0`, results when `> 0`)
[os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:14-22]; promotion components gate on
`Array.isArray(x) && x.length > 0` before mapping [os:promotionDiscountsApproachingUi/promotionDiscountsApproachingUi.js:7].
A watch-out: order/quote siblings are inconsistent — `orderDetailsUi`/`orderAmountUi` guard strictly on
`=== null` (so `undefined` falls through to the success branch) while `orderConfirmationTotalsSummary`
uses `!!` [os:orderDetailsUi/orderDetailsUi.js:22-27]
[os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:146-148] (`findings-anti-patterns.md`).

**`@api` value setters reject bad input rather than propagate it.** Numeric/value setters validate
type and silently no-op on `undefined`/non-numeric writes: `commonNumberInput.value` accepts only
`typeof value === 'number' && !isNaN(value)` [os:commonNumberInput/commonNumberInput.js:100-108];
`myAccountInputAddress`'s `country`/`province` setters guard `if (value)` so an undefined write does not
blow away a default [os:myAccountInputAddress/myAccountInputAddress.js:161].

**Processing/loading is a locally-managed boolean, cleared on both paths.** The universal shape is a
component-owned flag (`isAddToCartInProgress`, `_showPageSpinner`, `_isLoading`, `_applyingChanges`)
set before an async call and cleared in **both** success and error branches — via `onSuccess`/`onError`
for `commerce/actionApi` dispatch [os:productPurchaseOptions/productPurchaseOptions.js:114-117]
[os:myAccountProfile/myAccountProfile.js:218], via `.finally()` or `try/finally` for promise-based
calls [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:291-309]
[os:myAccountInputAddress/myAccountInputAddress.js:372]. The triggering control disables for the
duration to prevent double-submit [os:cartApplyCoupon/cartApplyCoupon.js:43-45]. Where a wire supplies
its own `loading`, it is OR'd with the local flag rather than relied on alone
[os:cartContents/cartContents.js:46-52] [os:myAccountProfile/myAccountProfile.js:108]. Checkout is the
exception with its own engine readiness gate (`checkoutStatusIsReady`, `202 AsyncInProgress` means
still recalculating) — that is checkout-engine mechanics documented in `findings-data-access.md`
[os:checkoutNotification/utils.js:1-14].

**Error surfacing: code -> label maps and shared normalizers, never raw server text.** Two shapes
recur. (1) A small `getErrorInfo(code, labelMap)` / `_codeToMessageMap` that switches API error-type
strings to pre-imported labels with an explicit default: cart's coupon evaluator
[os:cartFailedActionEvaluator/cartErrorCodeEvaluator.js:1-39], product's `AddToCartErrorType` map
[os:productAddToCartUtils/errorMessageUtils.js:2-14], account's `getErrorInfo(exception, isPreviewMode)`
[os:myAccountAddressDeleteConfirmationModal/errorHandler.js:11], quote's `getQuoteToCartErrorMessage`
switch [os:quoteTocartModal/quoteTocartModal.js:50-75], and myAccountProfile's ~25-code map
[os:myAccountProfile/myAccountProfile.js:191]. (2) A single shared normalizer reused across sibling
modals — subscription's `getARCToastMsg(exception, fallbackLabel)` for amend/renew/cancel
[os:subscriptionAmendModal/subscriptionAmendModal.js:177]. Layered resolution is common (try LDS array
`error?.[0]?.message`, then commerce shape `error?.errors?.[0]?.message`, then the code map)
[os:cartApplyCoupon/cartApplyCoupon.js:111-136]. Note: `commerceErrors` is a **static error-code
registry** (`{code, message}` pairs), not a runtime normalizer — do not cite it as normalizer precedent
[os:commerceErrors/commerceErrors.js:1] [os:commerceErrors/product.js:1-34] (`findings-anti-patterns.md`).

**Display-layer error primitives** are separate purpose-specific components, not one catch-all:
inline field error `commonError` [os:commonError/commonError.js:14-35], full-page
`commonPageLevelErrorMessage` [os:commonPageLevelErrorMessage/commonPageLevelErrorMessage.html:3-30],
SLDS scoped `commonScopedNotification` (renders only when `type` + text present, `role="alert"`)
[os:commonScopedNotification/commonScopedNotification.js:31-33], and toast `commonToast` (extends
`LightningToast`, forces `mode: 'dismissible'`) [os:commonToast/commonToast.js:16-22]. Async failures
route through `site/commonToast`'s `Toast.show({label, variant:'error'}, this)`
[os:productAddToCartUtils/productAddToCartUtils.js:3-8].

**Guest vs authenticated** is read from `SessionContextAdapter.isLoggedIn`, checked at the point of
interaction, redirecting unauthenticated users to a `Login`/`comm__namedPage` rather than rendering the
feature disabled [os:cartCreateButton/cartCreateButton.js:36-51]
[os:orderConfirmationMessageError/orderConfirmationMessageError.js:22-48]. A widely-copied special
case: `toCommerceError(error).code === 'GUEST_INSUFFICIENT_ACCESS'` diverts guests to login instead of
a toast — redefined as a **local string literal** in every product-family mutation path (typo risk)
[os:productPurchaseOptions/productPurchaseOptions.js:12] [os:productSet/productSet.js:10].

**Preview/design-mode guards** short-circuit builder-canvas behavior via `experience/clientApi`'s
`isDesignMode`/`isPreviewMode`: `cartContents` never renders a spinner in design mode
[os:cartContents/cartContents.js:47-49], `quoteAcceptandbuyButton` is always shown/enabled in design
mode [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:69-84], and every `myAccountProfile`
mutation calls `_preventActionInPreview()` first so a preview never writes data
[os:myAccountProfile/myAccountProfile.js:241].

**SSR guards.** Components declaring `lightning__ServerRenderableWithHydration` gate all DOM-only work
(`IntersectionObserver`/`ResizeObserver`/`matchMedia`/sanitizers/`window` reads) behind
`!import.meta.env.SSR` and tear observers down in `disconnectedCallback`
[os:commonContainerSticky/commonContainerSticky.js:11-19] [os:cartItemsUi/cartItemsUi.js:77-85]. A
second idiom, `globalThis.document?.`/`globalThis.location?.` optional chaining, is used interchangeably
[os:layoutHeaderOne/layoutHeaderOne.js:79-83] [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:130];
a bare unguarded `document.addEventListener` is the only unacceptable form (`notes/common.md` review
rule #7). col generates SSR-safe unique ids with `crypto?.randomUUID?.()` plus a counter fallback
[col:commonNumberInput/commonNumberInput.js:19-22].

## 7. Accessibility idioms

Accessibility is authored at the custom-component level throughout os (not left to base components),
and the idioms are consistent across families.

**Light DOM is a hard requirement where a11y wiring reaches across components.** `static renderMode =
'light'` is set on every component in the product, search, account, and promotion families read
[os:productPricing/productPricing.js:9] [os:promotionSummaryUi/promotionSummaryUi.js:3]
[col:productPricing/productPricing.js:13] (col too). Search depends on it: the combobox/listbox a11y
relay pushes `aria-expanded`/`aria-controls`/`aria-activedescendant` down as imperative
`querySelector` property assignment, which cannot cross a shadow boundary — so any non-light
`renderMode` in that chain silently breaks [os:searchCombobox/searchCombobox.js:209-231]
[os:searchInputSuggestions/searchInputSuggestions.js:9-32].

**`aria-live` regions for async content and validation.** Loading/result-count changes announce
through a visually-hidden `role="status" aria-live="polite" aria-atomic="true"` region that mirrors the
same booleans driving the visible spinner — the canonical pattern for any async-swap component
[os:searchResultsUi/searchResultsUi.html:2-9] [os:checkoutNotification/checkoutNotification.html:3-31].
`commonScopedNotification` uses `role="alert" aria-live="assertive"`
[os:commonScopedNotification/commonScopedNotification.html:3-6]; `commonNumberInput` carries
`aria-live="polite"` + `aria-invalid` on its visible input [os:commonNumberInput/commonNumberInput.html:28-41];
`marketingEmailsignup` uses assertive for errors and polite for success
[os:marketingEmailsignup/marketingEmailsignup.html:25-32].

**Focus management via a shared focus-trap primitive, not hand-rolled.** `commonFocusTrapManager`
exposes `@api activateFocusTrap(...)`/`deactivateFocusTrap(...)`
[os:commonFocusTrapManager/commonFocusTrapManager.js:37-38] with Tab wraparound and
Escape-to-deactivate [os:commonFocusTrapManager/commonFocusTrapManager.js:98-106]; consumers wrap
content in `<site-common-focus-trap-manager>` — `layoutHeaderOne`'s search drawer
[os:layoutHeaderOne/layoutHeaderOne.html:2-6], `commonToast` [os:commonToast/commonToast.html:2-5],
checkout's fatal-error dialog (`role="dialog" aria-modal="true"`)
[os:checkoutNotification/checkoutNotification.html:33-95], and search's filters panel with
`focus-trap-active={showFilters}` [os:searchFiltersPanel/searchFiltersPanel.html:2-6]. Panels move focus
in **after** the CSS transition completes (`setTimeout(transitionDuration)`), not immediately on a
still-hidden element [os:searchFiltersPanel/searchFiltersPanel.js:274-284]. Checkout's `errorFocus`
aspect lets a container ask a field to focus its own first `.slds-has-error` element after failed
validation [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:367-378].

**Keyboard contracts** are implemented explicitly for menus, listboxes, and accordions: full
roving-focus (ArrowUp/Down/Home/End/Enter/Space/Escape/Tab) over `role="menuitem"`
[os:cartBadgeUi/cartBadgeUi.js:195-261] [os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:245];
combobox keydown owned entirely by the top-level component (leaves bind none), with option selection on
**`onmousedown` not `onclick`** so it fires before the input's blur-driven dismiss
[os:searchListBoxOption/searchListBoxOption.js:32-40] [os:searchCombobox/searchCombobox.js:111-130];
accordion headers toggle by both click and Enter/Space with `aria-controls`/`aria-expanded`
[os:searchFiltersPanelSection/searchFiltersPanelSection.html:4-10].

**Imperative `@api focus()` handoffs** let a parent return focus after an async action —
`productAddToCartButton.focus()` [os:productAddToCartButton/productAddToCartButton.js:21-24],
`myAccountProfileEditor.focus()`/`myAccountAddressFooter.focusCell()`
[os:myAccountProfileEditor/myAccountProfileEditor.js:27] [os:myAccountAddressFooter/myAccountAddressFooter.js:53],
`commonButton.focus()`/`commonLink.focus()` (col) [col:commonButton/commonButton.js:55-58].
First-error focus (find first `.slds-has-error`, `.focus()` before reporting validity) is standard on
forms [os:myAccountInputAddress/myAccountInputAddress.js:413] [os:selfRegisterUi/selfRegisterUi.js:204].

**Assistive text for purely visual cues.** Screen-reader-only spans back strikethrough pricing
("was X now Y") [os:productPricingUi/productPricingUi.html:17-20]
[col:productPricing/productPricing.html:35-39] (col), price regions announce with
`aria-live="assertive" aria-atomic="true"` [os:productPricingUi/productPricingUi.html:7-8], toggle
buttons expose `aria-expanded` [os:subscriptionCard/subscriptionCard.html:171-186], and decorative
icons carry `alternative-text=""`/`aria-hidden="true"`
[os:reorderModalContents/reorderModalContents.html:13-17]. Checkbox facets keep the native
`lightning-input` label for screen readers but visually hide it and render a separate truncatable
`aria-hidden` span for sighted users [os:searchFacetItem/searchFacetItem.html:2-27]. Checkout derives
an accordion section's accessible name at render time from the rendered heading text so visible and
accessible names never drift [os:checkoutSection/checkoutSection.js:66-77].

## 8. Styling

**`experience/styling` is the universal bridge from builder props to CSS.** It is the single most-
imported `experience/*` module (73 os / 9 col bundles per the census). Its `generateStyleProperties()`
turns a component's builder-exposed Color/size `@api` props into an inline CSS-custom-property string
applied to a wrapper element's `style` attribute — confirmed in cart
[os:cartItems/cartItems.js:136-196], checkout [os:checkoutButton/checkoutButton.js:93-114], product
[os:productPricing/productPricing.js:68-77], search [os:searchResultsUi/searchResultsUi.js:194-219],
order [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:95-141], and account
[os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:171]. Companion generators cover
typography and layout: `generateThemeTextSizeProperty`/`generateTextFontSize` map a small/medium/large
design token to a `var(--dxp-s-text-heading-<size>-font-size)` reference rather than a raw px value
[os:productPricing/productPricing.js:4-7], and `generateButtonVariantClass`/`generateButtonSizeClass`/
`generateElementAlignmentClass`/`generatePaddingClass` map builder datasource strings to SLDS utility
classes [os:commonActionButtons/commonActionButtons.js:2] [os:checkoutPlaceOrder/checkoutPlaceOrder.js:59-61]
[os:reorderButton/reorderButton.js:60-64]. Search threads a single `customStyles` bag through several
layers, each consuming only its prefixed slice via `generateMatchingStyles(styles, prefix)`
[os:searchCombobox/searchCombobox.js:57-63].

**Custom-property naming convention.** Shipped os components name their properties
`--com-c-<component>-<region>-<role>` — e.g. `--com-c-product-pricing-tax-info-label-color`
[os:productPricing/productPricing.js:68-77], `--com-c-cart-item-*` / `--com-c-cart-summary-*`
[os:cartItems/cartItems.js:136-196], `--com-c-search-input-*` / `--com-c-search-filters-*`
[os:searchInputContainer/searchInputContainer.js:375-394]
[os:searchFiltersPanel/searchFiltersPanel.js:154-164], `--com-c-my-profile-*`
[os:myAccountProfile/myAccountProfile.js:413]. These override standard SLDS/SDS hooks one layer up in
`.scoped.css` (e.g. `--sds-c-input-radius-border: var(--com-c-search-input-border-radius)`)
[os:searchInputContainer/searchInputContainer.scoped.css:35]. Global DXP fallbacks are used for
theme-level defaults: `var(--dxp-g-root-contrast, transparent)` [os:layoutFooterUi/layoutFooterUi.js:2],
`var(--dxp-g-root)` [os:myaccountNavigationMenu/myaccountNavigationMenu.js:11]. col's builder wrapper
diverges on both counts: it emits `--ref-c-product-pricing-*` (the `--ref-c-*` prefix marks
reference/sample code) and resolves text size through a static `--dxp-s-text-heading-*` `Map` rather
than the dynamic theme API [col:builderProductPricing/builderProductPricing.js:192-198]
[col:builderProductPricing/builderProductPricing.js:12-16] — os wins per the os-authoritative rule
(`notes/col-contrast.md` Divergences #3).

**Icons.** Standard states use `lightning-icon` with `utility:*` names, but brand-specific variants
substitute a `BasePath`-relative custom SVG sprite path
(`${BasePath}/assets/icons/<name>.svg#<name>`) — `commonToast` for success/error/processing
[os:commonToast/constants.js:2-8], `commonNumberInput` add/dash icons
[os:commonNumberInput/commonNumberInput.js:171-176], `myAccountUserProfileMenuUi` account icon
[os:myAccountUserProfileMenuUi/myAccountUserProfileMenuUi.js:111]. Most icon paths route through
`experience/iconUtils.getIconPath()`; `commonError`'s warning variant is a special case that loads the
sprite path directly [os:commonError/commonError.js:18-23].

**Responsive strategy.** os prefers CSS-driven responsiveness — `@media` queries in `.scoped.css`
toggling custom properties [os:searchInputContainer/searchInputContainer.scoped.css:1-14] and
`<experience-responsive size="m-">`/`size="s"` wrapping mutually-exclusive desktop/mobile children
[os:productMediaGallery/productMediaGallery.html:2-24]. Where JS form-factor branching is needed, os
uses `experience/clientApi`'s `getFormFactor` wire [os:layoutHeader/layoutHeader.js:32] (with one
sibling using raw `window.matchMedia` — an inconsistency, `notes/common.md` review rule #8), whereas
col branches on `getFormFactor` for its inline-vs-modal filter panel
[col:searchFilters/searchFilters.js:34-38]. col also ships `*.scoped.css` alongside styled components
where os equivalents use plain `.css` (`notes/col-contrast.md` Styling).

**Font-size indirection.** Builder font-size choices resolve to `var(--dxp-s-*-font-size)` custom
properties through a small/medium/large switch rather than raw pixels — implemented (redundantly, not
shared) in `cartPromotionApplied.getDxpButtonFontSize` and `cartSummary.dxpTextSize`
[os:cartPromotionApplied/cartPromotionApplied.js:58-69] [os:cartSummary/cartSummary.js:220-231], with
`SLDSFontSizeDataSource` supplying the matching builder picklist (Section 3)
[os:cartItems/cartItems.js-meta.xml:34].

## 9. Testing

**Both repos ship zero unit test files.** A repo-wide search for `__tests__` directories and
`*.test.js`/`*.spec.js` files returns nothing under either LWC root — the census "Structure per family"
table shows `with tests = 0` for all 11 os families and all 3 col families, verified independently on
disk. There is **no exemplary spec to dissect** in either repo; testing patterns cannot be learned from
authored tests here (census open-question #5; `notes/col-contrast.md` Testing;
`notes/search.md`, `notes/order-quote-subscription.md`, `notes/product.md` all uphold this per-family).

**os ships no test infrastructure at all** — no jest config, no test dependencies, no test scripts.

**col ships the full Jest + sa11y wiring but no tests to run it against.** This is the single biggest
thing os lacks, and the teachable artifact is the *infrastructure and enforcement wiring*, not any
authored test. The wiring (repo-root files sit outside the citation checker's LWC roots, so they are
cited in prose per `notes/col-contrast.md`):
- **Jest config** extends the `sfdx-lwc-jest` preset, appends the sa11y setup to `setupFilesAfterEnv`,
  and sets `passWithNoTests: true` — a flag that is itself evidence the release ships zero specs
  (col repo: `jest.config.js:1-12`).
- **sa11y setup** registers the accessibility matcher globally via `registerSa11yMatcher()` from
  `@sa11y/jest` (col repo: `jest-sa11y-setup.js:1-3`). col is the only one of the two repos wired for
  automated accessibility testing.
- **npm scripts** expose `test`/`test:unit`/`test:unit:watch`/`test:unit:debug`/`test:unit:coverage`
  and a `ready` gate (lint + format + test); dev deps pin `@sa11y/jest` and
  `@salesforce/sfdx-lwc-jest` (col repo: `package.json:15-21`, `package.json:32-35`).
- **Pre-commit enforcement** via husky + `lint-staged`: prettier + eslint on staged files and
  `sfdx-lwc-jest --skipApiVersionCheck -- --bail --findRelatedTests` on staged `lwc/**` — a
  "related tests only, bail on first failure" gate (col repo: `package.json:55-64`, `package.json:13`).
- **`jsconfig.json`** enables the test-authoring environment: `experimentalDecorators`, the `c/*` -> `*`
  path map, and `typeAcquisition.include: ["jest"]` for Jest-globals typing [col:jsconfig.json:2-18].

**Implication.** A skill teaching B2B Commerce LWC testing should extract col's config/enforcement
pattern (jest preset + sa11y matcher + pre-commit related-tests gate) as the recommended setup, and
must **not** claim either repo demonstrates how a storefront LWC unit test is written — none exists to
copy. Component authoring guidance stands on the structural/accessibility conventions in Sections 2-8,
which are directly observable in source, not on any test evidence.
