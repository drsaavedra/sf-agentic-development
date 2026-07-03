# Findings: no-Apex data access in B2B Commerce storefront LWC

> Spec: `docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md`. This is the synthesis of
> **how a B2B Commerce storefront LWC gets its data without ever importing Apex** — the primary
> input for the future `generating-b2b-lwc` skill's data-access reference. It distills the
> data-access evidence from the eight deep-read notes (`notes/*.md`) and the exhaustive
> `findings-api-census.md`; every claim carries a forward-verified `[os:<bundle>/<file>:<line>]` /
> `[col:<bundle>/<file>:<line>]` code citation, and points back to the owning note (e.g.
> "see `notes/checkout.md` §Data access") for the fuller evidence chain. Component **structure,
> composition, labels/i18n, accessibility, and testing** are the sibling doc
> `findings-component-patterns.md`'s job; this doc owns **data access, mutation, and refresh**.
> "What the repos never do" (section 5) is a pointer to `findings-anti-patterns.md`, not a re-listing.

The single hardest architectural rule this doc teaches: **there is zero generated Apex in either
repo.** The census confirmed **0 `@salesforce/apex*` imports** across all 409 bundles
(`findings-api-census.md` §"Apex imports"), re-verified with `rg -l "@salesforce/apex"` over both
roots (0 matches). Every server data need — reads that "look like" they want a custom
`@AuraEnabled` controller, and every mutation — flows through the `commerce/*` / `experience/*`
platform module surface or through CMS/Experience-Builder expression binding. The one indirect
reach is `commerce/selfRegistrationApi`'s `selfRegister` export, imported aliased as
`selfRegisterApex` — the name signals it wraps a server-side Apex self-registration handler, but no
`@salesforce/apex/*` import exists [os:selfRegister/selfRegister.js:4] (see `notes/account-promotion.md`
§Anomalies #3). Treat Apex as the last-resort rung that these repos never actually reach.

---

## 1. The data-access ladder

When a storefront component needs data, the repos climb this ladder in order and stop at the first
rung that fits. Choosing the wrong rung is the most common data-access defect a generator can make.

### Rung (a) — expression-bound `@api` properties (the default, and dominant, mechanism)

A builder-placeable component declares an `@api` property whose `js-meta.xml` `default` is a
`{!...}` expression; the Experience Builder page/record context resolves it at runtime and pushes
JSON in through the property. This is the **primary** data channel for page-placed components — 196
expression-bound properties across 26 roots, all os-side (`findings-api-census.md` §"Expression
bindings"). It is preferred over `@wire` wherever the platform's page context already owns the data:
checkout leaves bind `checkoutDetails={!Checkout.Details}` rather than wiring it
[os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16]; product-detail components bind
`product={!Product.Details}` rather than wiring `ProductAdapter`
[os:productPricing/productPricing.js-meta.xml:29]; search results bind
`searchResults={!Search.Results}` [os:searchResults/searchResults.js-meta.xml:16]. The col README
states the intent explicitly: builder components "do not retrieve their data through the customary
channel of one or more `@wire` adapters… data seamlessly 'flows' into components through the
utilization of expressions and data binding, serving as input for `@api` properties" (see
`notes/col-contrast.md` §Data access).

**The undefined-on-first-render contract.** An expression-bound property is **`undefined` on the
first render pass**, before the page provider resolves it; the resolved value arrives on a later
render. Every consumer must treat `undefined` as "not loaded yet," never as "empty" or "error":

- Checkout reads pervasively optional-chain every access
  (`checkoutDetails?.deliveryGroups?.items…`) because the property starts `undefined`
  [os:checkoutDeliverymethod/checkoutDeliverymethod.js:31] (see `notes/checkout.md` §Guards).
- Cart's processing getter folds `!this.items` (still `undefined`) into "still processing," so the
  spinner shows until the array resolves [os:cartContents/cartContents.js:51]; the empty-state UI
  only flips on once `items` is a real, empty array via `Array.isArray(this.items) && !this.items.length`
  [os:cartContents/cartContents.js:60] (see `notes/cart.md` §Guards).
- Search's `searchResultsLayoutEmpty` is the canonical three-state gate from two expression props:
  loader while total is `undefined`/`null`/loading; "no results" only when total is exactly `0`
  and not loading; results when total is defined and `> 0`
  [os:searchResultsLayoutEmpty/searchResultsLayoutEmpty.js:14] (see `notes/search.md` §Errors).
- Promotion/account display components gate on `Array.isArray(x) && x.length > 0` before mapping
  [os:promotionDiscountsApproachingUi/promotionDiscountsApproachingUi.js:7], and read through
  `this.item?.` optional chaining so a null item renders empty, not an error
  [os:myAccountAddressCard/myAccountAddressCard.js:16] (see `notes/account-promotion.md` §Guards).
- A subtle divergence to know: the order family guards `{!Order.Details}` against **`null`**
  (`orderSummaryDetails === null`) rather than `undefined`, so the pre-resolve `undefined` frame
  falls through to the display branch; `orderConfirmationTotalsSummary` uses a truthy `!!` check
  instead — an inconsistency between siblings [os:orderDetailsUi/orderDetailsUi.js:22]
  [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:146] (see
  `notes/order-quote-subscription.md` §Guards). Truthiness (`!!value`) is the safer default when the
  provider may emit `undefined`.

### Rung (b) — wire adapters (`commerce/*` / `experience/*` LDS-style adapters)

When the page context does **not** own the data — because the component runs outside the relevant
provider tree, needs live/interactive data (search suggestions), or fetches supplementary records
(recommendations, inventory) — it `@wire`s a `commerce/*` or `experience/*` adapter. 243 total
`@wire` usages across 36 adapter+module pairs (`findings-api-census.md` §"Wire adapters"). The three
dominant adapters are cross-cutting context, not primary domain data: `NavigationContext`
(`lightning/navigation`, 70 uses), `AppContextAdapter` (42) and `SessionContextAdapter` (39), both
`commerce/contextApi`. Domain-data adapters are used thinly and specifically — every
`commerce/productApi` adapter is used by only 1–3 bundles
[os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:172]
[os:productSet/productSet.js:18] (see `notes/product.md` §Data access). Two guard idioms matter at
this rung: reactive params gate a wire to `null` to **suppress** the call until real input exists
(search suggestions return `null` term until the box is focused, and a `null`-param wire does not
fire) [os:searchInputContainer/searchInputContainer.js:131] (see `notes/search.md` §Guards); and a
wire's own `loading` flag is combined into the component's processing getter rather than trusted
alone [os:myAccountSwitcherList/myAccountSwitcherList.js:40].

### Rung (c) — imperative `commerce/*` calls + `commerce/actionApi` dispatch (mutations)

Writes never go through a wire. They take one of two imperative shapes (detailed in section 4):
**`commerce/actionApi` dispatch** — `dispatchAction(this, createXxxAction(...), {onSuccess, onError})`
— for components bound into a page-context they must keep in sync (the page re-resolves every
`{!...}` expression for all siblings after the action)
[os:productPurchaseOptions/productPurchaseOptions.js:11]
[os:cartItems/cartItems.js:203]; or **direct imperative module functions** (`cartItemAdd`,
`checkoutUpdate`, `amendSubscription`, `createMyAccountAddress`, …) for components that own their
own data outside a page context and manage their own local processing flag
[os:productCard/productCard.js:5] [os:subscriptionAmendModal/subscriptionAmendModal.js:161]. The
checkout engine adds a third, engine-specific mutation contract
(`dispatchUpdateAsync`→`dispatchCommit`) on top of this (section 4).

### Rung (d) — Apex (the never-reached last resort)

**Zero.** No `@salesforce/apex*` import exists anywhere (`findings-api-census.md` §"Apex imports";
confirmed for every family in every note's §Data access — e.g. `notes/order-quote-subscription.md`,
`notes/product.md`, `notes/common.md`). The implied generation bar: **a new storefront component
should not import Apex.** If a data need cannot be met by rungs (a)–(c), that is a strong signal the
need is either already served by an existing `commerce/*`/`experience/*` module or genuinely
belongs server-side behind one — not in a generated `@AuraEnabled` controller. The only Apex reach
observed is fully wrapped behind `commerce/selfRegistrationApi` [os:selfRegister/selfRegister.js:4].

---

## 2. Expression-binding reference

Every expression **root** found across both repos, the data tree it exposes, the property type that
carries it, and where it is attested. All expression-bound properties are typed `String`/`string`
(the platform serializes the resolved object to a JSON string the setter parses); all 196 are
os-side — col puts the same `{!Product.*}`/`{!Search.*}` bindings on its `builder*` wrappers instead
(see `notes/col-contrast.md` §Data access). Roots are **not interchangeable**: a component is bound
to the root matching where it is meant to be dropped (a promotion-scoped leaf binds `{!Promotion.*}`,
not `{!Cart.*}`).

| Expression root | Data tree it exposes | Attested paths (sample) | Attested at |
|---|---|---|---|
| `{!Cart.*}` | Live cart on the cart page — items, totals, promotions, currency | `Cart.Items`, `Cart.Pagination`, `Cart.Pagination.hasNextPage`, `Cart.Details`, `Cart.Details.currencyIsoCode`, `Cart.Details.cartId`, `Cart.Messages`, `Cart.Promotions`, `Cart.DiscountsApproaching` | [os:cartItems/cartItems.js-meta.xml:16] |
| `{!Promotion.*}` | One promotion, inside a per-promotion repeater | `Promotion.name`, `Promotion.couponId`, `Promotion.termsAndConditions`, `Promotion.couponCode` | [os:cartPromotionApplied/cartPromotionApplied.js-meta.xml:22] |
| `{!SplitShipment.*}` | Split-shipment page — cart items, delivery groups, addresses | `SplitShipment.Cart.items`, `SplitShipment.Cart.pagination`, `SplitShipment.DeliveryGroupCartProps`, `SplitShipment.DeliveryGroups.items`, `SplitShipment.Addresses.items` | [os:cartSplitshipmentContents/cartSplitshipmentContents.js-meta.xml:16] |
| `{!Checkout.*}` | Checkout-engine snapshot for a checkout leaf | `Checkout.Details`, `Checkout.CartDetails`, `Checkout.CartTotals`, `Checkout.Addresses`, `Checkout.GiftWraps`, `Checkout.SessionError`, `Checkout.PaymentLink` | [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16] |
| `{!Product.*}` | Product-detail-page context | `Product.Details`, `Product.Pricing`, `Product.Tax`, `Product.SelectedVariant`, `Product.Inventory`, `Product.SelectedProductSellingModel`, `Product.PromotionalPricing`, `Product.errors`, `Product.Details.mediaGroups`, `Product.Pricing.currencyIsoCode` | [os:productPricing/productPricing.js-meta.xml:29] |
| `{!Item...}` | One item in a search/listing repeater (NOT PDP context) | `Item`, `Item.data`, `Item.purchaseQuantityRule.minimum`/`.maximum`/`.increment` | [os:productBundleItem/productBundleItem.js-meta.xml:22] |
| `{!Search.*}` | Search results/filters/sort/paging state | `Search.Results`, `Search.Results.total`, `Search.Results.pageSize`, `Search.Results.productLoadedCount`, `Search.Name`, `Search.ClientState.loading`, `Search.ClientState.showFilters`, `Search.Pagination.currentPage`, `Search.SortRules.rules`, `Search.SortRules.currentSortRuleId` | [os:searchResults/searchResults.js-meta.xml:16] |
| `{!Route...}` | Standard route context (not commerce-specific) | `Route.recordId`, `Route.term` | [os:searchFilters/searchFilters.js-meta.xml:21] |
| `{!Wishlists}` | Wishlist collection | `Wishlists` (whole) | [os:productWishlist/productWishlist.js-meta.xml:16] |
| `{!Order.*}` | Order-summary page context | `Order.Details`, `Order.Details.status`, `Order.Adjustments`, `Order.Owner`, `Order.ClientState`, `Order.Errors`, `Order.DeliveryGroups` | [os:orderAmount/orderAmount.js-meta.xml:16] |
| `{!DeliveryGroup...}` | One order delivery group (below the page-level Order root) | `DeliveryGroup`, `DeliveryGroup.lineItems`, `DeliveryGroup.currencyIsoCode`, `DeliveryGroup.id` | [os:orderConfirmationItems/orderConfirmationItems.js-meta.xml:16] |
| `{!OrderDeliveryGroup}` | A single delivery group as a sibling root | `OrderDeliveryGroup` (whole) | [os:orderDeliveryGroup/orderDeliveryGroup.js-meta.xml:16] |
| `{!BillingDetails}` | Order billing block | `BillingDetails` (whole) | [os:orderConfirmationDetailsBilling/orderConfirmationDetailsBilling.js-meta.xml:20] |
| `{!QuoteDetail.*}` | Quote-detail page context | `QuoteDetail.id`, `QuoteDetail.status`, `QuoteDetail.orderId`, `QuoteDetail.hasLineItems`, `QuoteDetail.LineItems`, `QuoteDetail.Notes`, `QuoteDetail.ClientState`, `QuoteDetail.fields.*`, `QuoteDetail` (whole) | [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js-meta.xml:16] |
| `{!Subscription}` | One subscription (the only subscription-family root) | `Subscription` (whole) | [os:subscriptionCardBuilder/subscriptionCardBuilder.js-meta.xml:16] |
| `{!MyProfile.*}` | My-account profile context | `MyProfile.Details`, `MyProfile.ClientState`, `MyProfile.errors` | [os:myAccountProfile/myAccountProfile.js-meta.xml:17] |
| `{!MyAccountAddress}` | One saved address | `MyAccountAddress` (whole) | [os:myAccountAddressCard/myAccountAddressCard.js-meta.xml:20] |
| `{!Marketing.Subscriptions...}` | Marketing/communication consent | `Marketing.Subscriptions`, `Marketing.Subscriptions.communications` | [os:marketingEmailsignup/marketingEmailsignup.js-meta.xml:23] |
| `{!recordId}` | Standard record-page id (only non-commerce root) | `recordId` | [os:reorderButton/reorderButton.js-meta.xml:16] |

Also attested in the census's expression table (single-bundle roots, same `String`-typed
JSON-binding shape): `{!QuoteSummary}` → `quoteSummary`, `{!OrderSummary}` → `orderSummary`,
`{!OrderLineItem}` → `orderLineitem`, `{!Markets.*}` → `commonCountryPicker`,
`{!NavMenu.MenuItems}` → `commonLinksList`, `{!I18n.Countries}` → `myAccountAddressCard`,
`{!ShopperAgentContext.Details}` → `commonSidePanelManager` (`findings-api-census.md`
§"Expression bindings" and §"All expression-bound properties").

### Worked `js-meta.xml` examples (copied verbatim from real bundles)

**Cart — `cartItems`** binds four cart-context properties and pairs each with a
`designLayoutProperty cbVisibleIf="items=false"` so Experience Builder only surfaces the binding as
editable when it is left unbound [os:cartItems/cartItems.js-meta.xml:16]:

```xml
<property name="items" type="String" default="{!Cart.Items}" translatable="true"></property>
<property name="pagination" type="String" default="{!Cart.Pagination}" translatable="true"></property>
<property name="hasNextPageItems" type="String" default="{!Cart.Pagination.hasNextPage}"></property>
<property name="currencyIsoCode" type="String" default="{!Cart.Details.currencyIsoCode}" translatable="true"></property>
...
<designLayoutProperty name="items" cbVisibleIf="items=false"></designLayoutProperty>
<designLayoutProperty name="pagination" cbVisibleIf="items=false"></designLayoutProperty>
```

**Checkout — `checkoutDeliverymethod`** binds the single `checkoutDetails` property, and the shipped
description literally instructs "Do not change or delete" — the platform resolves this exact fixed
string, so a typo silently leaves the property `undefined`
[os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16]:

```xml
<property name="checkoutDetails" type="String" default="{!Checkout.Details}" label="Checkout Expression" description="Access checkout data. {!Checkout.Details} is the fixed text for this expression. Do not change or delete."></property>
```

**Product — `productPricing`** binds the four core PDP roots as a cluster
[os:productPricing/productPricing.js-meta.xml:29]:

```xml
<property label="Product Data Binding" name="product" type="String" default="{!Product.Details}"></property>
<property label="Product Pricing Data Binding" name="productPricing" type="String" default="{!Product.Pricing}"></property>
<property label="Product Tax Data Binding" name="productTax" type="String" default="{!Product.Tax}"></property>
<property label="Product Variant Data Binding" name="productVariant" type="String" default="{!Product.SelectedVariant}"></property>
```

**Search — `searchResults`** binds live results plus loading/paging client-state
[os:searchResults/searchResults.js-meta.xml:16]:

```xml
<property name="searchResults" type="String" default="{!Search.Results}" label="Results Data Binding"></property>
<property name="searchResultsFields" type="String" default="{!Search.Name}"></property>
<property name="searchResultsLoading" type="String" default="{!Search.ClientState.loading}" label="Search Loading State Expression"></property>
<property name="currentPage" type="String" default="{!Search.Pagination.currentPage}" label="Current Page"></property>
```

**Order — `orderAmount`** binds the order summary plus its adjustments
[os:orderAmount/orderAmount.js-meta.xml:16]:

```xml
<property name="orderSummaryDetails" type="String" default="{!Order.Details}" label="Order Summary"></property>
<property name="orderDiscounts" type="String" default="{!Order.Adjustments}" label="Order Promotions"></property>
```

**SplitShipment — `cartSplitshipmentContents`** binds five distinct `SplitShipment.*` sub-trees,
each `cbVisibleIf="<prop>=false"` [os:cartSplitshipmentContents/cartSplitshipmentContents.js-meta.xml:16]:

```xml
<property name="products" label="Products Binding Expression" type="string" default="{!SplitShipment.Cart.items}"></property>
<property name="deliveryGroupCartProps" label="Delivery Group Cart Properties Binding Expression" type="string" default="{!SplitShipment.DeliveryGroupCartProps}"></property>
<property name="splitShipPagination" label="Pagination Binding Expression" type="String" default="{!SplitShipment.Cart.pagination}" translatable="true"></property>
<property name="deliveryGroups" label="Delivery Groups Binding Expression" type="string" default="{!SplitShipment.DeliveryGroups.items}"></property>
<property name="addresses" label="Addresses Binding Expression" type="string" default="{!SplitShipment.Addresses.items}"></property>
```

**Quote — `quoteAcceptandbuyButton`** binds four scalar fields off the `QuoteDetail` provider that
drive button visibility/enablement [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js-meta.xml:16]:

```xml
<property name="quoteId" label="Quote ID" type="String" default="{!QuoteDetail.id}" description="The ID of the quote, bound to QuoteDetail data provider."></property>
<property name="quoteStatus" label="Quote Status" type="String" default="{!QuoteDetail.status}" description="The current status of the quote, bound to QuoteDetail data provider."></property>
<property name="orderId" label="Order ID" type="String" default="{!QuoteDetail.orderId}" description="Order ID associated with the quote."></property>
<property name="hasLineItems" label="Has Line Items" type="String" default="{!QuoteDetail.hasLineItems}" description="Whether the quote has line items from QuoteDetail."></property>
```

**Convention notes for generation.** (1) The bound `@api` property re-derives local state
**synchronously in its setter** — `onSetProperties()` / `computeErrorLabels()` — not in a wire
callback [os:checkoutNotification/checkoutNotification.js:41] (see `notes/checkout.md` §Data access).
(2) Each expression-bound property is typically paired with a `designLayoutProperty
cbVisibleIf="<prop>=false"` (or `cbVisibleIf="false"`) so the binding is hidden from the builder UI
while still resolving its default [os:cartItems/cartItems.js-meta.xml:59]
[os:selfRegister/selfRegister.js-meta.xml:51] (see `notes/account-promotion.md` §Anomalies #7).
(3) A `*Ui`/inner child receiving the same data as a **plain** (non-expression) `@api` prop from its
container carries no expression default and no `<targets>` — expression binding lives on the
outer container only (see `findings-component-patterns.md` for the container/`*Ui` split).

---

## 3. Per-module API usage

The census counts **19 distinct `commerce/*` modules** and **9 distinct `experience/*` modules**
across both repos (`findings-api-census.md` §"Module imports, grouped"). This section documents what
the repos actually use each for, the key exports observed in source, and one cited usage example per
module. Modules are ordered by census usage (bundle count) descending within each group; the eleven
`commerce/*` modules with ≥3 total uses lead. Two naming traps to hold throughout: **(1)**
`commerce/checkoutApi` and `commerce/checkoutCartApi` are *different modules* with different
contracts (below); **(2)** `CartStatusAdapter` is exported by *both* `commerce/checkoutCartApi` and
`commerce/cartApi` — same adapter name, different owning module
(`findings-api-census.md` §"Wire adapters").

### `commerce/*` modules

- **`commerce/contextApi`** (56 os / 5 col — the most broadly used commerce module). Cross-cutting
  app/session context, **not** primary domain data — it gates behavior. Exports observed:
  `AppContextAdapter`, `SessionContextAdapter` (both `@wire`). Used for guest-vs-logged-in, feature
  flags, currency/shipping-country config, effective-account id. `cartBadge` wires both
  [os:cartBadge/cartBadge.js:2]; `productPricing` reads tax locale off `AppContextAdapter`
  [os:productPricing/productPricing.js:18]; `myAccountUserProfileMenu` reads `isLoggedIn`/
  `effectiveAccountId` off `SessionContextAdapter` [os:myAccountUserProfileMenu/myAccountUserProfileMenu.js:91].
- **`commerce/actionApi`** (27 os / 7 col). The imperative **page-context mutation** surface — the
  write path for components bound into a `{!...}` expression tree (section 4). Exports observed:
  `dispatchAction`, `dispatchActionAsync`, and a large family of `create<X>Action` factories.
  `productPurchaseOptions` imports `createCartItemAddAction`/`createProductQuantityUpdateAction`/
  `createWishlistItemAddAction`/`dispatchAction` [os:productPurchaseOptions/productPurchaseOptions.js:11];
  `cartItems` dispatches `dispatchAction(this, createCartItemDeleteAction(event.detail))`
  [os:cartItems/cartItems.js:203]. Note: **not imported anywhere** in the order, quote, or
  subscription families — those use direct imperative calls instead
  (`notes/order-quote-subscription.md` §Data access).
- **`commerce/dataEventApi`** (25 os / 0 col). A **decoupled analytics/telemetry side channel** —
  fired alongside, never instead of, a data read or mutation, and never a data-fetch path itself.
  Exports observed: `dispatchDataEvent` plus `create<X>DataEvent` factories
  (`createCartItemAddDataEvent`, `createProductRecommendationDataEvent`,
  `createInteractionDataEvent`, `createSearchDataEvent`, `createUserRegistrationInfoAddDataEvent`, …)
  and search-correlation helpers (`getAndRemoveSearchCorrelationId`/`updateSearchCorrelationId`).
  `productCard` imports the cluster [os:productCard/productCard.js:8].
- **`commerce/checkoutCartApi`** (24 os / 0 col) — **container-less** cart/checkout API for
  components that own their own data outside a live page/engine tree. Exports observed: adapters
  `CartStatusAdapter`, `CartContentsAdapter`, `CartAdapter`, `CheckoutAdapter`; imperative
  `cartItemAdd`/`cartItemsAdd`, `cartItemUpdate`, `cartItemDelete`, `cartCreate`, `cartDelete`,
  `getCarts`, `cartStatusUpdate`, `checkoutLoadAsyncPoll`, `checkoutUpdate`, `checkoutReload`,
  `checkoutPlaceOrder`, `toCommerceError`. `cartSummary` wires `CartStatusAdapter`/
  `CartContentsAdapter` directly [os:cartSummary/cartSummary.js:2]; `cartCreateModal` calls
  `cartCreate()` imperatively (no `create…Action` factory exists for the create path)
  [os:cartCreateModal/cartCreateModal.js:4].
- **`commerce/checkoutApi`** (17 os / 0 col) — **in-container** checkout-engine module (distinct
  from `checkoutCartApi`). Supplies the base classes, enums, and imperative payment/shipping helpers
  a leaf uses while embedded in the `CheckoutComponentBase`/`CheckoutContainerBase` tree. Exports
  observed: `CheckoutComponentBase`, `CheckoutContainerBase`, `CheckoutError`, `CheckoutStage`,
  `CheckoutStatus`, `checkoutStatusIsReady`, `applyProcessShippingResult`, `postAuthorizePayment`,
  `ekgElapsedTime`/`ekgPublishLogs`, `isSameAvailableDeliveryMethods`. `checkoutDeliverymethodOptions`
  imports the base/enum set [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:3].
- **`commerce/productApi`** (10 os / 1 col). **Read-only** product-data adapters, spread thin — every
  adapter is used by only 1–3 bundles (`findings-api-census.md` §"Wire adapters"). Exports observed:
  `ProductAdapter`, `ProductPricingAdapter`, `ProductInventoryLevelsAdapter`, `ProductChildrenAdapter`,
  `ProductRecommendationsAdapter`, `ProductTaxAdapter`, `ProductSearchAdapter`,
  `ProductSearchSuggestionAdapter`, `ProductPricingCollectionAdapter`, `ProductCategoryPathAdapter`.
  `productFrequentlyBoughtTogether` imports and `@wire`s `ProductAdapter`
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:2]
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:172].
- **`commerce/cartApi`** (4 os / 2 col) — a **second, distinct** cart module (its `CartStatusAdapter`
  is a different export from the same-named `checkoutCartApi` one). Exports observed: `CartStatusAdapter`,
  `addItemToCart`, `refreshCartSummary`, `CheckoutDeliveryGroupCartItemsAdapter`. `reorderModal` calls
  `refreshCartSummary()` after reorder [os:reorderModal/reorderModal.js:51]. It is the only
  `commerce/*` module col imports beyond `contextApi`/`actionApi`/`productApi`
  (`findings-api-census.md` §"Observations").
- **`commerce/subscriptionApi`** (6 os / 0 col). Subscription lifecycle mutations plus two adapters.
  Exports observed: `amendSubscription`, `renewSubscription`, `unsubscribeItem`,
  `updateSavedPaymentMethod`, `getARCToastMsg` (shared Amend/Renew/Cancel error normalizer),
  `ChildSubscriptionsAdapter`, `SubscriptionActionHistoryAdapter`. `subscriptionAmendModal` imports
  `amendSubscription`/`getARCToastMsg` [os:subscriptionAmendModal/subscriptionAmendModal.js:8].
- **`commerce/quoteApi`** (5 os / 0 col). Quote-to-cart conversion. Exports observed:
  `createCartFromQuote({ quoteId, operationType })`, `refreshQuoteDetail({ quoteId })`.
  `quoteTocartModal` imports both [os:quoteTocartModal/quoteTocartModal.js:3] and awaits
  `createCartFromQuote(...)` [os:quoteTocartModal/quoteTocartModal.js:96].
- **`commerce/myAccountApi`** (4 os / 0 col). Saved-address / profile reads + CRUD. Exports observed:
  `MyAccountAddressDetailAdapter`, `MyAccountProfileAdapter`, `MyAccountAddressesAdapter` (`@wire`),
  imperative `createMyAccountAddress`, `updateMyAccountAddress`, `deleteMyAccountAddress`.
  `myAccountInputAddress` awaits `createMyAccountAddress(...)` [os:myAccountInputAddress/myAccountInputAddress.js:373].
- **`commerce/effectiveAccountApi`** (4 os / 0 col). B2B effective-account (account-switching) surface.
  Exports observed: `ManagedAccountsAdapter` (`@wire`), imperative `loadEffectiveAccounts(options)`,
  and an `effectiveAccount` singleton exposing `.accountId` and a `.update(id, name)` setter.
  `myAccountSwitcherList` imports all three [os:myAccountSwitcherList/myAccountSwitcherList.js:2] and
  calls `loadEffectiveAccounts(...)` to force a reload [os:myAccountSwitcherList/myAccountSwitcherList.js:25].

The remaining eight `commerce/*` modules appear in 1–2 bundles each (below the ≥3 bar) but are still
part of the surface a generator may reach for:

- **`commerce/wishlistApi`** (2 os) — `WishlistsAdapter`, `addItemToWishlist`, `deleteItemFromWishlist`;
  `cartMinicartpanel` imports the set [os:cartMinicartpanel/cartMinicartpanel.js:11].
- **`commerce/promotionApi`** (2 os) — `PromotionApplicableAdapter`, wired off a computed cart-preview
  payload to fetch would-be promo pricing before add-to-cart
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:6]
  [os:productFrequentlyBoughtTogether/productFrequentlyBoughtTogether.js:230].
- **`commerce/loginApi`** (2 os) — `getSiteKey`, `initUser`, `registerBuyer`, `verifyUser` for
  passwordless-login/reCAPTCHA [os:commonLoginHandler/loginUtils.js:1].
- **`commerce/orderApi`** (2 os) — `startReOrder({ orderSummaryId, … })`; `reorderModal` awaits it
  then calls `refreshCartSummary()` from `cartApi` [os:reorderModal/reorderModal.js:45].
- **`commerce/activitiesApi`** (2 os) — search-activity tracking (`trackViewSearchSuggestion`,
  `trackClickCategory`, `trackClickSearch`) [os:searchInputContainer/searchInputContainer.js:5].
- **`commerce/breadcrumbsApi`** (1 os) — `BreadcrumbsAdapter`; `commonBreadcrumbs` wires it and maps
  each crumb through `generateUrl` [os:commonBreadcrumbs/commonBreadcrumbs.js:40].
- **`commerce/consentApi`** (1 os) — `hasBlanketConsent`/`needsBlanketConsent`/`setBlanketConsent`
  for the site-wide cookie-consent banner [os:legalConsentBlanket/legalConsentBlanket.js:2].
- **`commerce/selfRegistrationApi`** (1 os) — `selfRegister`, imported aliased `selfRegisterApex`
  (the one indirect server-registration reach; still not a `@salesforce/apex/*` import)
  [os:selfRegister/selfRegister.js:4].

### `experience/*` modules

- **`experience/styling`** (73 os / 9 col — the single most-imported `experience/*` module).
  `generateStyleProperties` converts builder design tokens into inline style properties;
  `cartApplyCoupon` imports it [os:cartApplyCoupon/cartApplyCoupon.js:5]. (Styling detail is
  `findings-component-patterns.md`'s domain; noted here only as a used module.)
- **`experience/clientApi`** (32 os / 1 col). Form-factor and builder-preview detection. Exports
  observed: `getFormFactor` (`@wire`), `isDesignMode`. `cartContents` imports `isDesignMode` to
  short-circuit its loading state on the builder canvas [os:cartContents/cartContents.js:4];
  `layoutHeader` wires `getFormFactor` for responsive branching [os:layoutHeader/layoutHeader.js:32].
- **`experience/resourceResolver`** (19 os / 2 col). `resolve()` turns a CMS-relative media URL into
  an absolute one; `productGalleryImage` imports it [os:productGalleryImage/productGalleryImage.js:2].
- **`experience/internationalizationApi`** (13 os / 0 col). `getI18nCountries` (`@wire`) supplies
  country/state option data to address forms [os:myAccountInputAddress/myAccountInputAddress.js:94].
- **`experience/picture`** (12 os / 1 col). `createImageDataMap(url, sizes)` builds a responsive
  `<experience-picture>` image map (paired with `resourceResolver`); `cartItem` imports it
  [os:cartItem/cartItem.js:13].
- **`experience/utils`** (9 os / 1 col). Small helpers — `debounce`/`clearDebounceTimeout`;
  `cartItem` imports both [os:cartItem/cartItem.js:2].
- **`experience/navigationMenuApi`** (2 os). `getNavigationMenu` (`@wire`) drives menu data;
  `commonDrilldownNavigation` wires it with a `menuItemTypesToSkip` config
  [os:commonDrilldownNavigation/commonDrilldownNavigation.js:21].
- **`experience/iconUtils`** (2 os). `getIconPath` resolves an SLDS icon sprite path; `commonError`
  imports it [os:commonError/commonError.js:3].
- **`experience/paymentApi`** (2 os). Saved-payment-method CRUD + adapters. Exports observed:
  `getPaymentMethodSet`, `getSavedPaymentMethods`, `getSavedPaymentMethodDependents`,
  `clearSavedPaymentMethods`, `deleteSavedPaymentMethod`, `defaultSavedPaymentMethod`,
  `shareSavedPaymentMethod`; `paymentSavedMethodsGrid` imports the set
  [os:paymentSavedMethodsGrid/paymentSavedMethodsGrid.js:3].

---

## 4. Mutation patterns

Writes never go through a `@wire`. The repos use **four** mutation shapes, and the choice is
governed by *where the component sits relative to a data provider*. All four share one discipline: a
local processing flag set before the async work and cleared on **both** success and failure, so a
spinner never hangs on error.

### Shape 1 — `commerce/actionApi` dispatch (page-context mutations)

A component bound into a `{!...}` expression tree does **not** re-fetch after a write; it dispatches a
typed action and lets the platform re-resolve every sibling's expression. The call shape is uniform:

```js
dispatchAction(this, create<X>Action(...), { onSuccess, onError });
```

`productPurchaseOptions` sets `isAddToCartInProgress = true`, dispatches
`createCartItemAddAction(...)`, and clears the flag in **both** `onSuccess` and `onError`
[os:productPurchaseOptions/productPurchaseOptions.js:169]; its `onError` also branches on
`toCommerceError(error).code === 'GUEST_INSUFFICIENT_ACCESS'` to redirect to Login rather than toast
[os:productPurchaseOptions/productPurchaseOptions.js:176]. Use **`dispatchActionAsync`** instead when
the caller needs the resolved value back (e.g. `cartCreateModal`'s edit path awaits
`dispatchActionAsync(createCartEditAction(...))`) [os:cartCreateModal/cartCreateModal.js:163]. The
**refresh is implicit**: on success the page provider re-emits the updated `{!...}` payloads to all
bound siblings — no consumer re-queries. `cartItems`' delete is the minimal form,
`dispatchAction(this, createCartItemDeleteAction(event.detail))` with no callbacks
[os:cartItems/cartItems.js:203] (see `notes/cart.md` §Data access, `notes/product.md` §Data access).

### Shape 2 — direct imperative module calls (out-of-context components)

A component that owns its own data outside a page provider calls an imperative `commerce/*` function
as a promise and manages its own local processing flag and refresh. `subscriptionAmendModal` builds
an options object and `await`s `amendSubscription({...})` [os:subscriptionAmendModal/subscriptionAmendModal.js:161],
normalizing any error through the shared `getARCToastMsg(...)` [os:subscriptionAmendModal/subscriptionAmendModal.js:177];
`myAccountInputAddress` `await`s `createMyAccountAddress(this.addressInput)`
[os:myAccountInputAddress/myAccountInputAddress.js:373]; `productCard` (a search/listing card, not
PDP-bound) calls `cartItemAdd(...)` from `checkoutCartApi` directly [os:productCard/productCard.js:5].
Here **refresh is explicit** — the mutation is followed by a targeted reload call: `reorderModal`
`await`s `startReOrder(...)` then calls `refreshCartSummary()` [os:reorderModal/reorderModal.js:51];
`quoteTocartModal` awaits `createCartFromQuote(...)` then `refreshQuoteDetail({ quoteId })`
[os:quoteTocartModal/quoteTocartModal.js:96]; `cartOptions` calls `cartReload()` after cart-level
edits [os:cartOptions/cartOptions.js:117]. A related refresh idiom is **event-subscription**:
`cartBadge` subscribes to `actionApi` cart hooks (`onAddItemToCart`, `onCartItemDelete`, …) to update
its count optimistically without re-querying [os:cartBadge/cartBadge.js:129].

### Shape 3 — the checkout engine contract (`dispatchUpdateAsync` → `dispatchCommit`)

Leaves inside the checkout container tree (`CheckoutComponentBase`, from `commerce/checkoutApi`) use
a two-phase **stage-then-commit** mutation, never `actionApi`. A field change follows the family's
uniform *clear-error → await stage → commit → set-or-clear error* chain: `checkoutDeliverymethodOptions.handleShippingMethodChange`
does `await this.dispatchUpdateAsync({...}); this.dispatchCommit();`
[os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172]
[os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:185]. Errors are raised and
cleared per-field through `dispatchUpdateErrorAsync({ groupId, type?, exception? })`, scoped by a
`groupId` (`DbbPayment`, `DbbDeliveryMethod`, …) (see `notes/checkout.md` §Errors). Free-text fields
**debounce the commit** — `checkoutDeliveryAddress` waits 3000ms after the last keystroke before
`dispatchCommit()` [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:631]. Order placement is a
tree-wide walk: `checkoutPlaceOrder` calls `this.dispatchFinalizeAsync()`
[os:checkoutPlaceOrder/checkoutPlaceOrder.js:91], and a section runs its subscribers through
`REPORT_VALIDITY_SAVE` with `Promise.all`, rolling everyone back via `ABORT_PAYMENT_SESSION` on any
`false` and only calling `dispatchCommit()` when all pass
[os:checkoutSectionAccordion/checkoutSectionAccordion.js:122] (see `notes/checkout.md`
§"Checkout-engine child contract"). Here refresh is **engine-broadcast** — the container re-pushes
updated aspects/`{!Checkout.*}` to subscribers after commit; leaves never re-fetch.

### Shape 4 — poll-and-push (container-less refresh)

A widget with no live container that still needs a fresh checkout snapshot uses
`checkoutLoadAsyncPoll()` from `commerce/checkoutCartApi` and pushes the result directly onto a
child's `@api` setter. `checkoutPaymentByExpressWrapper.handleExpressButtonClick` `await`s the poll
and, on a `200`, assigns the parsed payload to `this.refs.checkoutPaymentByExpress.checkoutDetails`,
bypassing the engine channel entirely [os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:44]
[os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:46]. This is a deliberately
narrow shape reserved for components outside the `CheckoutComponentBase` tree (see `notes/checkout.md`
§Data access).

### Processing state, sequencing, and refresh — the cross-cutting rules

- **One processing flag, cleared on both paths.** Whether via `onSuccess`/`onError` callbacks
  (`actionApi`) or `try`/`finally` (imperative), the spinner-gating flag is always cleared on failure
  too — a flag set only in the `try` body hangs on error
  [os:productPurchaseOptions/productPurchaseOptions.js:169] (see `notes/account-promotion.md`
  §"Build checklist" #6).
- **Await, then act.** Mutations are `await`ed (or use `dispatchActionAsync`/callback pairs) before
  navigation, toast, or a follow-on call — never fire-and-forget for the mutation itself. The one
  fire-and-forget channel is `commerce/dataEventApi` analytics, dispatched *alongside* the mutation,
  not in place of it (section 3).
- **Refresh matches the read rung.** Expression-bound components rely on the provider re-resolving
  (Shape 1 / Shape 3); imperative/out-of-context components issue an explicit `refresh…()`/`…Reload()`
  call (Shape 2) or push a polled payload onto a child (Shape 4). A generator should pick the refresh
  strategy that matches how the component reads, not mix them.

---

## 5. What the repos never do

The data-access *negative space* — the things neither repo ever does, and which a generator must
therefore never emit — is owned in full by the sibling doc **`findings-anti-patterns.md`**. This
section is a pointer, not a re-listing, to avoid drift between the two.

The data-access-relevant entries to look for there (each cross-referenced back to this doc's ladder):

- **Never import Apex.** Zero `@salesforce/apex*` imports across all 409 bundles — rung (d) is never
  reached (section 1; `findings-api-census.md` §"Apex imports").
- **Never `@wire` a mutation, or write through a read adapter.** Writes take one of the four Shape-1–4
  mutation forms (section 4); adapters are read-only.
- **Never re-fetch after an `actionApi` dispatch.** The page provider re-resolves expressions; a
  manual re-query on a bound component is redundant (section 4, Shape 1).
- **Never confuse `commerce/checkoutApi` with `commerce/checkoutCartApi`**, and never assume a
  same-named adapter (`CartStatusAdapter`) comes from one specific module (section 3).
- **Never treat an expression-bound `@api` prop's first-render `undefined` as "empty" or "error"** —
  it means "not loaded yet" (section 1, the undefined-on-first-render contract).
- **Never hand-edit the fixed `{!...}` expression string** in a `js-meta.xml` default (e.g. checkout's
  "Do not change or delete") — a typo silently leaves the property `undefined` (section 2).

For the authoritative, exhaustive treatment — including the non-data-access anti-patterns (structure,
labels, accessibility, testing) — defer to `findings-anti-patterns.md`.
