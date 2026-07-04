# Data Access — the no-Apex ladder, expression bindings, module surface, and mutations

> Part of `generating-b2b-lwc` — see SKILL.md for the always-on Quick Reference and routing. This
> file owns **where a storefront component's data comes from and how it writes back**. Bundle
> anatomy and the container/`*Ui` mechanics live in `references/component-structure.md`; the
> undefined-guard idioms, processing flags, and error normalization live in
> `references/events-state-errors.md`; a11y and styling in `references/accessibility-and-styling.md`.

## The one rule above all others: never reach Apex

A storefront LWC gets **every** server need — reads and writes — from the platform
`commerce/*` / `experience/*` module surface or from Experience-Builder expression binding. **Do not
import `@salesforce/apex/*`.** Not for a read that "looks like" it wants an `@AuraEnabled` controller,
not for a mutation, not for a custom BFF query. Every server data path a storefront needs already
exists behind a `commerce/*` module or an expression root.

If a data need seems to require Apex, that is a signal the need is either already served by an
existing module you haven't found yet, or genuinely belongs server-side *behind* one — not in a
generated controller. The only server-registration reach in practice is fully wrapped behind
`commerce/selfRegistrationApi` (its `selfRegister` export is imported aliased as `selfRegisterApex`,
but it is still not a `@salesforce/apex/*` import). Treat Apex as the rung you never actually reach.

## The data-access ladder — climb in order, stop at the first rung that fits

Choosing the wrong rung is the most common data-access defect. When a component needs data, work down
this ladder and stop at the first rung that fits:

| Rung | Mechanism | When |
|---|---|---|
| (a) | **Expression-bound `@api` property** (`default="{!...}"`) | The Experience-Builder page/record context already owns the data. The default and dominant channel for page-placed components. |
| (b) | **`@wire` a `commerce/*` / `experience/*` adapter** | The page context does *not* own the data — the component runs outside the provider tree, needs live/interactive data, or fetches supplementary records. |
| (c) | **Imperative `commerce/*` call** (`actionApi` dispatch or a direct module function) | A write, or a read a component must fetch itself outside a page context. |
| (d) | **Apex** | Never. See above. |

### Rung (a) — expression-bound `@api` properties (the default)

A builder-placeable component declares an `@api` property whose `js-meta.xml` `default` is a `{!...}`
expression; the page/record context resolves it at runtime and pushes JSON in through the property
setter. Prefer this over `@wire` **wherever the platform's page context already owns the data**:

- A checkout leaf binds `checkoutDetails={!Checkout.Details}` rather than wiring an adapter.
- A product-detail component binds `product={!Product.Details}` rather than wiring `ProductAdapter`.
- A search results component binds `searchResults={!Search.Results}` rather than wiring a search adapter.

The bound property re-derives local state **synchronously in its setter** (an `onSetProperties()` /
`computeErrorLabels()` pattern), not in a wire callback. See the roots table and worked
`js-meta.xml` below.

### Rung (b) — `@wire` a `commerce/*` / `experience/*` adapter

Wire an adapter only when the page context does not own the data: the component runs outside the
relevant provider tree, needs live/interactive data (search suggestions), or pulls supplementary
records (recommendations, inventory). Domain-data adapters are used **thinly and specifically** —
every `commerce/productApi` adapter is used by only one to three bundles. The broadly-wired adapters
are cross-cutting *context*, not primary domain data (`AppContextAdapter`, `SessionContextAdapter`,
`NavigationContext`). Two guard idioms:

- **Gate a reactive-param wire to `null` to suppress the call** until real input exists. A `null`-param
  wire does not fire — search suggestions return a `null` term until the box is focused, so the wire
  stays quiet.
- **Fold a wire's own `loading` flag into the component's processing getter** rather than trusting it
  alone.

### Rung (c) — imperative `commerce/*` calls (mutations, and self-fetched reads)

Writes never go through a wire — they take one of the four mutation shapes below. A read a component
must own itself (outside any page context) also lives here.

### Rung (d) — Apex: never. See the top of this file.

## The undefined-on-first-render contract

An expression-bound property is **`undefined` on the first render pass**, before the page provider
resolves it; the resolved value arrives on a later render. **Every consumer must treat `undefined`
as "not loaded yet" — never as "empty" or "error."** This is a data-access fact intrinsic to how
rung (a) reads work; the full guard idioms (optional chaining, the three-state loader/empty/results
gate, `Array.isArray` checks) are in `references/events-state-errors.md`. The load-bearing points
for *reading* the data:

- Optional-chain every access into a bound property (`checkoutDetails?.deliveryGroups?.items`) — the
  property starts `undefined`.
- Distinguish "still loading" (`undefined`/`null`) from "loaded and empty" (a real, empty array):
  the empty-state UI flips on only via `Array.isArray(this.items) && !this.items.length`, never on a
  falsy check that also catches the pre-resolve frame.
- Prefer a **truthiness** (`!!value`) or explicit `undefined` guard over an `=== null` guard: a
  provider that emits `undefined` before it emits data will fall straight through a `=== null` check
  into the display branch. (Sibling components in the order family diverge here — one guards
  `orderSummaryDetails === null`, another uses `!!` — and the `!!` form is the safer default.)

## Expression-binding reference

Every expression **root**, the data tree it exposes, and a sample of attested paths. Roots are **not
interchangeable** — bind the root matching *where the component is meant to be dropped* (a
promotion-scoped leaf binds `{!Promotion.*}`, not `{!Cart.*}`). All expression-bound properties are
typed `String`/`string`: the platform serializes the resolved object to a JSON string that the setter
parses.

| Expression root | Data tree it exposes | Attested paths (sample) |
|---|---|---|
| `{!Cart.*}` | Live cart on the cart page | `Cart.Items`, `Cart.Pagination.hasNextPage`, `Cart.Details.currencyIsoCode`, `Cart.Details.cartId`, `Cart.Messages`, `Cart.Promotions`, `Cart.DiscountsApproaching` |
| `{!Promotion.*}` | One promotion, inside a per-promotion repeater | `Promotion.name`, `Promotion.couponId`, `Promotion.couponCode`, `Promotion.termsAndConditions` |
| `{!SplitShipment.*}` | Split-shipment page — items, delivery groups, addresses | `SplitShipment.Cart.items`, `SplitShipment.Cart.pagination`, `SplitShipment.DeliveryGroupCartProps`, `SplitShipment.DeliveryGroups.items`, `SplitShipment.Addresses.items` |
| `{!Checkout.*}` | Checkout-engine snapshot for a checkout leaf | `Checkout.Details`, `Checkout.CartDetails`, `Checkout.CartTotals`, `Checkout.Addresses`, `Checkout.GiftWraps`, `Checkout.SessionError`, `Checkout.PaymentLink` |
| `{!Product.*}` | Product-detail-page context | `Product.Details`, `Product.Pricing`, `Product.Tax`, `Product.SelectedVariant`, `Product.Inventory`, `Product.SelectedProductSellingModel`, `Product.PromotionalPricing`, `Product.errors` |
| `{!Item...}` | One item in a search/listing repeater (NOT PDP context) | `Item`, `Item.data`, `Item.purchaseQuantityRule.minimum`/`.maximum`/`.increment` |
| `{!Search.*}` | Search results / filters / sort / paging state | `Search.Results`, `Search.Results.total`, `Search.Results.pageSize`, `Search.Name`, `Search.ClientState.loading`, `Search.ClientState.showFilters`, `Search.Pagination.currentPage`, `Search.SortRules.currentSortRuleId` |
| `{!Route...}` | Standard route context (not commerce-specific) | `Route.recordId`, `Route.term` |
| `{!Wishlists}` | Wishlist collection | `Wishlists` (whole) |
| `{!Order.*}` | Order-summary page context | `Order.Details`, `Order.Details.status`, `Order.Adjustments`, `Order.Owner`, `Order.ClientState`, `Order.Errors`, `Order.DeliveryGroups` |
| `{!DeliveryGroup...}` | One order delivery group (below the page-level Order root) | `DeliveryGroup`, `DeliveryGroup.lineItems`, `DeliveryGroup.currencyIsoCode`, `DeliveryGroup.id` |
| `{!OrderDeliveryGroup}` | A single delivery group as a sibling root | `OrderDeliveryGroup` (whole) |
| `{!BillingDetails}` | Order billing block | `BillingDetails` (whole) |
| `{!QuoteDetail.*}` | Quote-detail page context | `QuoteDetail.id`, `QuoteDetail.status`, `QuoteDetail.orderId`, `QuoteDetail.hasLineItems`, `QuoteDetail.LineItems`, `QuoteDetail.Notes`, `QuoteDetail.ClientState`, `QuoteDetail.fields.*` |
| `{!Subscription}` | One subscription (the only subscription-family root) | `Subscription` (whole) |
| `{!MyProfile.*}` | My-account profile context | `MyProfile.Details`, `MyProfile.ClientState`, `MyProfile.errors` |
| `{!MyAccountAddress}` | One saved address | `MyAccountAddress` (whole) |
| `{!Marketing.Subscriptions...}` | Marketing / communication consent | `Marketing.Subscriptions`, `Marketing.Subscriptions.communications` |
| `{!recordId}` | Standard record-page id (only non-commerce root) | `recordId` |

Also attested as single-bundle roots with the same `String`-typed JSON-binding shape: `{!QuoteSummary}`,
`{!OrderSummary}`, `{!OrderLineItem}`, `{!Markets.*}` (country picker), `{!NavMenu.MenuItems}` (links
list), `{!I18n.Countries}` (address card), `{!ShopperAgentContext.Details}` (side-panel manager).

### Worked `js-meta.xml` examples

These are real property blocks — copy the exact `{!...}` default strings; **a typo silently leaves
the property `undefined`.** (The `designLayoutProperty`/`cbVisibleIf` builder-hiding convention that
pairs with each is covered in `references/component-structure.md`.)

**Cart** — binds four cart-context properties:

```xml
<property name="items" type="String" default="{!Cart.Items}" translatable="true"></property>
<property name="pagination" type="String" default="{!Cart.Pagination}" translatable="true"></property>
<property name="hasNextPageItems" type="String" default="{!Cart.Pagination.hasNextPage}"></property>
<property name="currencyIsoCode" type="String" default="{!Cart.Details.currencyIsoCode}" translatable="true"></property>
```

**Checkout** — a single `checkoutDetails` property; the shipped description literally warns not to
edit the fixed string, because the platform resolves this exact text:

```xml
<property name="checkoutDetails" type="String" default="{!Checkout.Details}" label="Checkout Expression" description="Access checkout data. {!Checkout.Details} is the fixed text for this expression. Do not change or delete."></property>
```

**Product** — the four core PDP roots bound as a cluster:

```xml
<property label="Product Data Binding" name="product" type="String" default="{!Product.Details}"></property>
<property label="Product Pricing Data Binding" name="productPricing" type="String" default="{!Product.Pricing}"></property>
<property label="Product Tax Data Binding" name="productTax" type="String" default="{!Product.Tax}"></property>
<property label="Product Variant Data Binding" name="productVariant" type="String" default="{!Product.SelectedVariant}"></property>
```

**Search** — live results plus loading/paging client-state:

```xml
<property name="searchResults" type="String" default="{!Search.Results}" label="Results Data Binding"></property>
<property name="searchResultsFields" type="String" default="{!Search.Name}"></property>
<property name="searchResultsLoading" type="String" default="{!Search.ClientState.loading}" label="Search Loading State Expression"></property>
<property name="currentPage" type="String" default="{!Search.Pagination.currentPage}" label="Current Page"></property>
```

**Order** — the order summary plus its adjustments:

```xml
<property name="orderSummaryDetails" type="String" default="{!Order.Details}" label="Order Summary"></property>
<property name="orderDiscounts" type="String" default="{!Order.Adjustments}" label="Order Promotions"></property>
```

**SplitShipment** — five distinct `SplitShipment.*` sub-trees:

```xml
<property name="products" label="Products Binding Expression" type="string" default="{!SplitShipment.Cart.items}"></property>
<property name="deliveryGroupCartProps" label="Delivery Group Cart Properties Binding Expression" type="string" default="{!SplitShipment.DeliveryGroupCartProps}"></property>
<property name="splitShipPagination" label="Pagination Binding Expression" type="String" default="{!SplitShipment.Cart.pagination}" translatable="true"></property>
<property name="deliveryGroups" label="Delivery Groups Binding Expression" type="string" default="{!SplitShipment.DeliveryGroups.items}"></property>
<property name="addresses" label="Addresses Binding Expression" type="string" default="{!SplitShipment.Addresses.items}"></property>
```

**Quote** — four scalar fields off the `QuoteDetail` provider that drive button visibility/enablement:

```xml
<property name="quoteId" label="Quote ID" type="String" default="{!QuoteDetail.id}" description="The ID of the quote, bound to QuoteDetail data provider."></property>
<property name="quoteStatus" label="Quote Status" type="String" default="{!QuoteDetail.status}" description="The current status of the quote, bound to QuoteDetail data provider."></property>
<property name="orderId" label="Order ID" type="String" default="{!QuoteDetail.orderId}" description="Order ID associated with the quote."></property>
<property name="hasLineItems" label="Has Line Items" type="String" default="{!QuoteDetail.hasLineItems}" description="Whether the quote has line items from QuoteDetail."></property>
```

## Module surface — the `commerce/*` and `experience/*` APIs

Nineteen distinct `commerce/*` modules and nine `experience/*` modules cover the whole storefront
data surface. Two naming traps to hold throughout:

1. **`commerce/checkoutApi` and `commerce/checkoutCartApi` are different modules** with different
   contracts. `checkoutApi` is the **in-container** checkout-engine module (base classes, enums,
   payment/shipping helpers a leaf uses while embedded in the engine tree). `checkoutCartApi` is the
   **container-less** cart/checkout API for components that own their own data outside a live tree.
2. **`CartStatusAdapter` is exported by *both* `commerce/checkoutCartApi` and `commerce/cartApi`** —
   same adapter name, different owning module and different export. Import it from the module whose
   surface you actually intend.

### `commerce/*` modules

| Module | What it is / key exports | Note |
|---|---|---|
| `commerce/contextApi` | Cross-cutting app/session context — `AppContextAdapter`, `SessionContextAdapter` (both `@wire`). Guest-vs-logged-in, feature flags, currency/shipping-country config, effective-account id. | The most broadly used commerce module. Context that **gates behavior**, not primary domain data. |
| `commerce/actionApi` | The imperative **page-context mutation** surface — `dispatchAction`, `dispatchActionAsync`, and a family of `create<X>Action` factories (`createCartItemAddAction`, `createCartItemDeleteAction`, `createProductQuantityUpdateAction`, `createWishlistItemAddAction`, `createCartEditAction`, …). | **Not** imported anywhere in the order, quote, or subscription families — those use direct imperative calls. |
| `commerce/dataEventApi` | Decoupled analytics/telemetry — `dispatchDataEvent` + `create<X>DataEvent` factories, search-correlation helpers. | Fired **alongside**, never instead of, a read or mutation. Never a data-fetch path. |
| `commerce/checkoutCartApi` | Container-less cart/checkout — adapters `CartStatusAdapter`, `CartContentsAdapter`, `CartAdapter`, `CheckoutAdapter`; imperative `cartItemAdd`/`cartItemsAdd`, `cartItemUpdate`, `cartItemDelete`, `cartCreate`, `cartDelete`, `getCarts`, `cartStatusUpdate`, `checkoutLoadAsyncPoll`, `checkoutUpdate`, `checkoutReload`, `checkoutPlaceOrder`, `toCommerceError`. | Cart **creation** has no `create…Action` factory — call `cartCreate()` imperatively. |
| `commerce/checkoutApi` | In-container checkout-engine module — `CheckoutComponentBase`, `CheckoutContainerBase`, `CheckoutError`, `CheckoutStage`, `CheckoutStatus`, `checkoutStatusIsReady`, `applyProcessShippingResult`, `postAuthorizePayment`, `isSameAvailableDeliveryMethods`. | Distinct from `checkoutCartApi` (trap 1). Base classes a leaf extends inside the engine tree. |
| `commerce/productApi` | **Read-only** product-data adapters — `ProductAdapter`, `ProductPricingAdapter`, `ProductInventoryLevelsAdapter`, `ProductChildrenAdapter`, `ProductRecommendationsAdapter`, `ProductTaxAdapter`, `ProductSearchAdapter`, `ProductSearchSuggestionAdapter`, `ProductPricingCollectionAdapter`, `ProductCategoryPathAdapter`. | Spread thin — each adapter serves only one to three bundles. PDP data usually arrives via `{!Product.*}` binding instead. |
| `commerce/cartApi` | A second, distinct cart module — `CartStatusAdapter` (a different export from the `checkoutCartApi` one — trap 2), `addItemToCart`, `refreshCartSummary`, `CheckoutDeliveryGroupCartItemsAdapter`. | `refreshCartSummary()` is the explicit cart-refresh call after an out-of-context mutation. |
| `commerce/subscriptionApi` | Subscription lifecycle — `amendSubscription`, `renewSubscription`, `unsubscribeItem`, `updateSavedPaymentMethod`, `getARCToastMsg` (shared Amend/Renew/Cancel error normalizer), `ChildSubscriptionsAdapter`, `SubscriptionActionHistoryAdapter`. | |
| `commerce/quoteApi` | Quote-to-cart conversion — `createCartFromQuote({ quoteId, operationType })`, `refreshQuoteDetail({ quoteId })`. | |
| `commerce/myAccountApi` | Saved-address / profile — `MyAccountAddressDetailAdapter`, `MyAccountProfileAdapter`, `MyAccountAddressesAdapter` (`@wire`); imperative `createMyAccountAddress`, `updateMyAccountAddress`, `deleteMyAccountAddress`. | |
| `commerce/effectiveAccountApi` | B2B account-switching — `ManagedAccountsAdapter` (`@wire`), imperative `loadEffectiveAccounts(options)`, and an `effectiveAccount` singleton exposing `.accountId` and a `.update(id, name)` setter. | See effective-account rule below. |
| `commerce/wishlistApi` | `WishlistsAdapter`, `addItemToWishlist`, `deleteItemFromWishlist`. | 1–2 bundles. |
| `commerce/promotionApi` | `PromotionApplicableAdapter` — wired off a computed cart-preview payload to fetch would-be promo pricing before add-to-cart. | 1–2 bundles. Pricing comes from the server, not the client. |
| `commerce/loginApi` | `getSiteKey`, `initUser`, `registerBuyer`, `verifyUser` (passwordless-login / reCAPTCHA). | 1–2 bundles. |
| `commerce/orderApi` | `startReOrder({ orderSummaryId, … })`. Order **reads** are `{!Order.*}` expression-bound, not adapter-fetched. | 1–2 bundles. |
| `commerce/activitiesApi` | Search-activity tracking — `trackViewSearchSuggestion`, `trackClickCategory`, `trackClickSearch`. | 1–2 bundles. |
| `commerce/breadcrumbsApi` | `BreadcrumbsAdapter`. | 1 bundle. |
| `commerce/consentApi` | `hasBlanketConsent` / `needsBlanketConsent` / `setBlanketConsent` (cookie-consent banner). | 1 bundle. |
| `commerce/selfRegistrationApi` | `selfRegister` (imported aliased `selfRegisterApex`) — the one indirect server-registration reach; still not a `@salesforce/apex/*` import. | 1 bundle. |

### `experience/*` modules

| Module | What it is / key exports |
|---|---|
| `experience/styling` | `generateStyleProperties` — converts builder design tokens into inline style properties. (Styling detail is `references/accessibility-and-styling.md`.) The single most-imported `experience/*` module. |
| `experience/clientApi` | Form-factor / builder-preview detection — `getFormFactor` (`@wire`), `isDesignMode`. Use `isDesignMode` to short-circuit loading state on the builder canvas and to guard mutations in preview. |
| `experience/resourceResolver` | `resolve()` — turns a CMS-relative media URL into an absolute one. |
| `experience/internationalizationApi` | `getI18nCountries` (`@wire`) — country/state option data for address forms. |
| `experience/picture` | `createImageDataMap(url, sizes)` — builds a responsive `<experience-picture>` image map (paired with `resourceResolver`). |
| `experience/utils` | Small helpers — `debounce` / `clearDebounceTimeout`. |
| `experience/navigationMenuApi` | `getNavigationMenu` (`@wire`) — menu data, with a `menuItemTypesToSkip` config. |
| `experience/iconUtils` | `getIconPath` — resolves an SLDS icon sprite path. |
| `experience/paymentApi` | Saved-payment-method CRUD + adapters — `getPaymentMethodSet`, `getSavedPaymentMethods`, `getSavedPaymentMethodDependents`, `clearSavedPaymentMethods`, `deleteSavedPaymentMethod`, `defaultSavedPaymentMethod`, `shareSavedPaymentMethod`. |

### Effective-account (B2B account switching)

Read the effective-account id from its **provider channel** — the `effectiveAccount` singleton's
`.accountId` from `commerce/effectiveAccountApi`, or `effectiveAccountId` off `SessionContextAdapter`
(`commerce/contextApi`). **Never** derive it from a URL param, a label, or an ad-hoc wire. To force a
reload of the switchable-account set, call `loadEffectiveAccounts(...)`; to switch, call the
singleton's `.update(id, name)` setter.

## Mutation patterns

Writes never go through a `@wire`. There are **four** mutation shapes, and the choice is governed by
*where the component sits relative to a data provider*. All four share one discipline: a local
processing flag set before the async work and cleared on **both** success and failure, so a spinner
never hangs on error (flag mechanics are in `references/events-state-errors.md`).

### Shape 1 — `commerce/actionApi` dispatch (page-context mutations)

A component bound into a `{!...}` expression tree does **not** re-fetch after a write. It dispatches a
typed action and lets the platform re-resolve every sibling's expression:

```js
dispatchAction(this, create<X>Action(...), { onSuccess, onError });
```

Clear the processing flag in **both** `onSuccess` and `onError`. Use `dispatchActionAsync` instead
when the caller needs the resolved value back (e.g. an edit path that awaits
`dispatchActionAsync(createCartEditAction(...))`). The minimal form omits callbacks entirely —
`dispatchAction(this, createCartItemDeleteAction(event.detail))`. **The refresh is implicit:** on
success the page provider re-emits the updated `{!...}` payloads to all bound siblings. **No consumer
re-queries** — a manual re-fetch on a bound component is redundant.

### Shape 2 — direct imperative module calls (out-of-context components)

A component that owns its own data outside a page provider calls an imperative `commerce/*` function
as a promise and manages its own processing flag **and** its own refresh. `await amendSubscription({...})`,
`await createMyAccountAddress(this.addressInput)`, or a listing-card `cartItemAdd(...)` (from
`checkoutCartApi`) are all this shape. Here **refresh is explicit** — follow the mutation with a
targeted reload call:

- reorder: `await startReOrder(...)` then `refreshCartSummary()`;
- quote-to-cart: `await createCartFromQuote(...)` then `refreshQuoteDetail({ quoteId })`;
- cart-level edits: `cartReload()` after the edit.

A related refresh idiom is **event-subscription**: a cart badge subscribes to `actionApi` cart hooks
(`onAddItemToCart`, `onCartItemDelete`, …) to update its count optimistically without re-querying.

### Shape 3 — the checkout-engine contract (`dispatchUpdateAsync` → `dispatchCommit`)

Leaves inside the checkout container tree (extending `CheckoutComponentBase` from
`commerce/checkoutApi`) use a two-phase **stage-then-commit** mutation, **never** `actionApi`. A field
change follows a uniform *clear-error → await stage → commit → set-or-clear error* chain:

```js
await this.dispatchUpdateAsync({ ... });
this.dispatchCommit();
```

Errors are raised and cleared per-field through `dispatchUpdateErrorAsync({ groupId, type?, exception? })`,
scoped by a `groupId` (`DbbPayment`, `DbbDeliveryMethod`, …). Free-text fields **debounce the commit**
(wait ~3000ms after the last keystroke before `dispatchCommit()`). Order placement is a tree-wide
walk: `checkoutPlaceOrder` calls `this.dispatchFinalizeAsync()`, sections run their subscribers
through validation with `Promise.all`, roll everyone back on any failure, and only commit when all
pass. Here refresh is **engine-broadcast** — the container re-pushes updated `{!Checkout.*}` aspects
to subscribers after commit; leaves never re-fetch.

### Shape 4 — poll-and-push (container-less refresh)

A widget with no live container that still needs a fresh checkout snapshot uses `checkoutLoadAsyncPoll()`
from `commerce/checkoutCartApi` and pushes the result directly onto a child's `@api` setter — e.g. an
express-payment wrapper awaits the poll and, on a `200`, assigns the parsed payload to
`this.refs.checkoutPaymentByExpress.checkoutDetails`, bypassing the engine channel. A deliberately
narrow shape, reserved for components outside the `CheckoutComponentBase` tree.

### Refresh matches the read rung

Pick the refresh strategy that matches **how the component reads** — never mix them:

- Expression-bound (rung a) → the provider re-resolves (Shape 1 / Shape 3). Do not re-fetch.
- Imperative / out-of-context (rung c) → issue an explicit `refresh…()` / `…Reload()` call (Shape 2)
  or push a polled payload onto a child (Shape 4).

### Never recompute pricing, promotions, or tax client-side

Pricing, tax, and promotion values arrive **pre-evaluated by the server** through the expression roots
(`Product.Pricing`, `Product.Tax`, `Product.PromotionalPricing`, `Cart.Details` totals,
`Cart.Promotions`, `Order.Adjustments`) and the read-only `productApi` / `promotionApi` adapters.
**Display those server-evaluated values verbatim** — never re-derive a price, sum a discount, or
recompute a promotion in the component. Even a would-be promo preview before add-to-cart is fetched
from the server (`PromotionApplicableAdapter` wired off a computed cart-preview payload), not
calculated locally.

## Worked skeleton — container binds an expression, renders one `*Ui`

An outer **container** owns the expression binding and passes the parsed value down to a
presentation-only `*Ui` child as a **plain** (non-expression) `@api` prop. The child carries no
expression default, no `<targets>`, and no `@wire` — expression binding lives on the container only.
(The full container/`*Ui` split, and the `*Ui`'s constraints, are in
`references/component-structure.md`.)

Container `js-meta.xml` (the binding):

```xml
<property name="product" type="String" default="{!Product.Details}"></property>
```

Container JS — parse in the setter, guard `undefined`, pass down:

```js
import { LightningElement, api } from 'lwc';

export default class ExampleProductContainer extends LightningElement {
    _product;

    @api
    get product() {
        return this._product;
    }
    set product(value) {
        // Expression-bound: `value` is a JSON string, and is `undefined` on first render.
        this._product = value ? JSON.parse(value) : undefined;
    }

    get hasProduct() {
        // "loaded" is a defined object, not merely truthy input — undefined means "not loaded yet".
        return !!this._product;
    }
}
```

Container template — render the `*Ui` only once data has resolved:

```html
<template>
    <template lwc:if={hasProduct}>
        <c-example-product-ui product={product}></c-example-product-ui>
    </template>
</template>
```

The `*Ui` receives `product` as a plain object and renders it — no data access of its own.

## What to never do (data-access negative space)

- **Never import Apex** (`@salesforce/apex/*`). Rung (d) is never reached.
- **Never `@wire` a mutation, or write through a read adapter.** Writes take one of Shapes 1–4;
  adapters are read-only.
- **Never re-fetch after an `actionApi` dispatch.** The page provider re-resolves expressions; a
  manual re-query on a bound component is redundant.
- **Never confuse `commerce/checkoutApi` with `commerce/checkoutCartApi`**, and never assume a
  same-named adapter (`CartStatusAdapter`) comes from one specific module.
- **Never treat an expression-bound prop's first-render `undefined` as "empty" or "error"** — it
  means "not loaded yet."
- **Never hand-edit the fixed `{!...}` expression string** in a `js-meta.xml` default — a typo
  silently leaves the property `undefined`.
- **Never recompute pricing, tax, or promotions client-side** — display server-evaluated values only.
- **Never source the effective-account id** from a URL param, a label, or an ad-hoc wire — read it
  from `effectiveAccount` / `SessionContextAdapter`.
