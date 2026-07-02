# Deep-read notes: cart

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

The `cart` family census slice (Step 1) returned 36 bundles, all `repo:"os"` — there is no `col:`
(Commerce on Lightning) counterpart for this family. All 36 were read in full (`.js` +
`.js-meta.xml`; `.html` also read wherever the component owns non-trivial markup or event wiring).

Read in full (js + js-meta.xml + html, plus helper/util/labels files where present):
`cartAddToSecondaryCart`, `cartApplyCoupon`, `cartApplyCouponButtonUi`, `cartApplyCouponUi`,
`cartB2bCartContents`, `cartBadge`, `cartBadgeUi`, `cartClearCartModal`, `cartContents`,
`cartCreateButton`, `cartCreateModal`, `cartDeliverygroupItem`, `cartDetailsCard`,
`cartEvaluatePriceOriginal`, `cartFailedActionEvaluator` (+ `cartErrorCodeEvaluator.js`),
`cartFooter`, `cartHeader`, `cartItem`, `cartItemDropdown`, `cartItems`, `cartItemsUi`,
`cartManagedContents`, `cartMinicartpanel`, `cartOptions`, `cartOptionsConfirmationModal`,
`cartPromotionApplied`, `cartPromotionAppliedUi`, `cartPromotions`, `cartSplitshipmentContents`,
`cartSplitshipmentHeader`, `cartSplitshipmentHeaderUi`, `cartSplitshipmentItemUi`,
`cartSplitshipmentItemsUi`, `cartSummary`, `cartSummaryUi`, `multiCartBadge`.

Not separately read (low-signal for this note; behavior already evident from the calling
bundle): `cartCreateModal`'s `createCartErrorHandler.js`/`createCartUtils.js`, `cartItem`'s
`labelGenerators.js`/`transformers.js`, `cartMinicartpanel`'s `util.js`/`.html`. `cartDetailsCard`'s
`cartDetailsCardUtils.js` was read for its pure transform functions.

Census anomalies chased: rare-module flag on `site/cartFailedActionEvaluator` (used by
`cartApplyCoupon` + one order-family bundle out of scope) — confirmed as the evaluator archetype
named in the brief. All other cart-family entries in the census "rare modules" / "no
js-meta.xml properties" lists were leaf (`*Ui`) or evaluator bundles, consistent with the
container/leaf pattern documented below (see Anomalies & divergences).

## Data access — how this family gets data without Apex

Two data-access shapes coexist in this family, and picking the right one per component matters:

1. **Expression-bound container props** — the dominant shape. A builder-facing container
   declares an `@api` property whose `js-meta.xml` `default` is a `{!...}` expression, resolved by
   the page/record context at render time:
   - `cartItems`: `items` = `{!Cart.Items}`, `pagination` = `{!Cart.Pagination}`, `hasNextPageItems`
     = `{!Cart.Pagination.hasNextPage}`, `currencyIsoCode` = `{!Cart.Details.currencyIsoCode}`
     [os:cartItems/cartItems.js-meta.xml:16-19].
   - `cartB2bCartContents`: `items` = `{!Cart.Items}`, `messages` = `{!Cart.Messages}`
     [os:cartB2bCartContents/cartB2bCartContents.js-meta.xml:16-17].
   - `cartPromotions`: `cartDetails` = `{!Cart.Details}`, `cartPromotions` = `{!Cart.Promotions}`
     [os:cartPromotions/cartPromotions.js-meta.xml:19-20].
   - `cartPromotionApplied` uses a **different** expression root — `name` = `{!Promotion.name}`,
     `couponId` = `{!Promotion.couponId}`, `termsAndConditions` = `{!Promotion.termsAndConditions}`,
     `couponCode` = `{!Promotion.couponCode}` — because it's designed to sit inside a per-promotion
     repeater, not a `Cart.*` context [os:cartPromotionApplied/cartPromotionApplied.js-meta.xml:22-25].
   - `cartSplitshipmentContents` uses a **third** root, `SplitShipment.*`: `products` =
     `{!SplitShipment.Cart.items}`, `deliveryGroupCartProps` = `{!SplitShipment.DeliveryGroupCartProps}`,
     `splitShipPagination` = `{!SplitShipment.Cart.pagination}`, `deliveryGroups` =
     `{!SplitShipment.DeliveryGroups.items}`, `addresses` = `{!SplitShipment.Addresses.items}`
     [os:cartSplitshipmentContents/cartSplitshipmentContents.js-meta.xml:16-20].
   - Every expression-bound property pairs with a `designLayoutProperty
     cbVisibleIf="<prop>=false"` so the builder only surfaces it when unbound, e.g.
     [os:cartItems/cartItems.js-meta.xml:59-62].

2. **Direct wire adapters / imperative calls** — leaves and a few builder-facing components skip
   expression binding entirely and wire `commerce/*` adapters or call imperative functions:
   - `cartContents` wires `CartStatusAdapter` from `commerce/checkoutCartApi`
     [os:cartContents/cartContents.js:3] [os:cartContents/cartContents.js:43-44], and reads
     `isDesignMode` from `experience/clientApi` to short-circuit the loading state in the builder
     canvas [os:cartContents/cartContents.js:4] [os:cartContents/cartContents.js:47-49].
   - `cartSummary` has **no** expression-bound props at all despite being builder-placeable
     (`<targets>` present); instead it wires `CartStatusAdapter` + `CartContentsAdapter` from
     `commerce/checkoutCartApi` and `AppContextAdapter` from `commerce/contextApi` directly
     [os:cartSummary/cartSummary.js:2-3] [os:cartSummary/cartSummary.js:181-219]
     [os:cartSummary/cartSummary.js-meta.xml:1-18].
   - `cartBadge` has zero js-meta.xml expression props; it wires `CartAdapter` (`commerce/checkoutCartApi`)
     [os:cartBadge/cartBadge.js:4] [os:cartBadge/cartBadge.js:82-88], `AppContextAdapter` /
     `SessionContextAdapter` (`commerce/contextApi`) [os:cartBadge/cartBadge.js:2]
     [os:cartBadge/cartBadge.js:68-71], and subscribes to actionApi event hooks
     (`onAddItemToCart`, `onAddItemsToCart`, `onAddConfigurationToCart`,
     `onUpdateConfigurationOnCart`, `onCartItemUpdate`, `onCartItemDelete`, `onCartDelete`) for
     optimistic count updates [os:cartBadge/cartBadge.js:4] [os:cartBadge/cartBadge.js:129-143]
     [os:cartBadge/cartBadge.js:203-211].
   - `cartBadgeUi` wires `CartStatusAdapter` and calls `getCarts()` / `cartStatusUpdate()`
     imperatively from `commerce/checkoutCartApi` for its carts-list dropdown
     [os:cartBadgeUi/cartBadgeUi.js:3] [os:cartBadgeUi/cartBadgeUi.js:69-83]
     [os:cartBadgeUi/cartBadgeUi.js:274-293].
   - `cartMinicartpanel` wires `CartContentsAdapter` with a **reactive** parameter
     (`{ pageSize: '$pageSize' }`), `CartStatusAdapter`, and calls `cartItemUpdate`,
     `cartItemDelete`, `cartItemsLoadSync`, `toCommerceError` imperatively from
     `commerce/checkoutCartApi`, plus `WishlistsAdapter` from `commerce/wishlistApi` and
     `dispatchDataEvent`/`createWishlistItemAddDataEvent` from `commerce/dataEventApi` for
     wishlist analytics [os:cartMinicartpanel/cartMinicartpanel.js:13]
     [os:cartMinicartpanel/cartMinicartpanel.js:137-167] [os:cartMinicartpanel/cartMinicartpanel.js:11]
     [os:cartMinicartpanel/cartMinicartpanel.js:330-347] [os:cartMinicartpanel/cartMinicartpanel.js:12]
     [os:cartMinicartpanel/cartMinicartpanel.js:381].

3. **Mutations go through `commerce/actionApi`**, not direct API calls, in almost every case:
   `dispatchAction(this, createXxxAction(...), { onSuccess, onError })` or `dispatchActionAsync`
   when the caller needs the resolved value. Factories seen: `createCartItemDeleteAction`,
   `createCartItemsLoadAction`, `createCartItemsLoadPageAction`, `createCartItemUpdateAction`
   [os:cartItems/cartItems.js:4]; `createCartClearAction`, `createCartSortUpdateAction`,
   `createCartStatusUpdateAction` [os:cartContents/cartContents.js:5]; `createCouponApplyAction`
   [os:cartApplyCoupon/cartApplyCoupon.js:4]; `createCouponDeleteAction`
   [os:cartPromotions/cartPromotions.js:2]; `createCartDeleteAction`,
   `createCartMakePrimaryAction`, `createCartClearAction` [os:cartOptions/cartOptions.js:3];
   `createCartEditAction` [os:cartCreateModal/cartCreateModal.js:5]; `createCartsGetAction`,
   `createCartItemAddAction` [os:cartAddToSecondaryCart/cartAddToSecondaryCart.js:3]; the
   `createSplitShipment*` family (7 factories) [os:cartSplitshipmentContents/cartSplitshipmentContents.js:9];
   `createSplitShipmentSaveAction`, `createSplitShipmentMergeSaveAction`
   [os:cartSplitshipmentHeader/cartSplitshipmentHeader.js:3]. The one documented exception is cart
   **creation**: `cartCreateModal` calls `cartCreate()` directly from `commerce/checkoutCartApi`
   for the create path (there is no `createCartCreateAction`), while still using
   `dispatchActionAsync(createCartEditAction(...))` for the edit path in the same component
   [os:cartCreateModal/cartCreateModal.js:4-6] [os:cartCreateModal/cartCreateModal.js:156-198].
   `cartOptions` also calls `getCarts()`/`cartReload()` imperatively (read-only / cache-refresh,
   not a mutation dispatch) [os:cartOptions/cartOptions.js:2] [os:cartOptions/cartOptions.js:117]
   [os:cartOptions/cartOptions.js:224].

## Composition & structure

- **Container/`*Ui`-leaf split** is the dominant shape: the container owns `@api` props,
  js-meta.xml (targets/expression bindings/design layout), and the actionApi dispatch; it renders
  exactly one `<site-x-ui>` child that owns markup, DOM refs, and presentation logic. Pairs
  confirmed by full read: `cartItems`→`cartItemsUi` [os:cartItems/cartItems.html:1-39]
  [os:cartItemsUi/cartItemsUi.js-meta.xml:1-7]; `cartBadge`→`cartBadgeUi`
  [os:cartBadge/cartBadge.html:2-17]; `cartApplyCoupon`→`cartApplyCouponUi`→`cartApplyCouponButtonUi`
  (a three-tier chain) [os:cartApplyCoupon/cartApplyCoupon.html:1-19]
  [os:cartApplyCouponUi/cartApplyCouponUi.html:27-35]; `cartPromotionApplied`→`cartPromotionAppliedUi`
  (same-shaped `@api` surface, `Ui` owns the remove/terms interactions)
  [os:cartPromotionAppliedUi/cartPromotionAppliedUi.js:6-52]; `cartSummary`→`cartSummaryUi`
  (`Ui` is a near-pure presentational pass-through with 3 `@api` props and no logic)
  [os:cartSummaryUi/cartSummaryUi.js:1-9]; `cartSplitshipmentHeader`→`cartSplitshipmentHeaderUi`
  (`Ui` has zero JS logic — only named slots) [os:cartSplitshipmentHeaderUi/cartSplitshipmentHeaderUi.js:1-4]
  [os:cartSplitshipmentHeaderUi/cartSplitshipmentHeaderUi.html:1-15].
- **`cartContents`/`cartManagedContents`/`cartHeader`/`cartFooter` shell**: `cartContents` renders
  `site-cart-managed-contents` in both its empty and items branches, forwarding 5 named slots
  (`headerLabel`, `headerCount`/`itemsHeaderCount`, `discountsApproaching`, `itemsBody`,
  `footerClearCart`) and listening for `cartclear`/`cartchangesortorder`/`cartupdatestatus` events
  bubbled up from inside [os:cartContents/cartContents.html:1-159]. `cartManagedContents` in turn
  composes `site-cart-header` and (conditionally) `site-cart-footer`, plus a
  `site-common-scoped-notification` for cart-level messages [os:cartManagedContents/cartManagedContents.html:1-36].
  `cartHeader` itself owns a modal invocation (`ClearCartModal.open(...)`) despite being a
  "header" component, translating the modal's `onsubmit` into a `cartclear` CustomEvent
  [os:cartHeader/cartHeader.js:5] [os:cartHeader/cartHeader.js:41-49].
- **Class-subclass composition (the one exception to container/leaf markup composition)**:
  `cartB2bCartContents extends CartContents` (the class imported from `site/cartContents`) rather
  than wrapping it via a template — it exists purely to give a builder-exposed js-meta.xml
  (`items`/`messages` expression defaults, `<targets>`) around the internal, non-builder
  `cartContents` bundle [os:cartB2bCartContents/cartB2bCartContents.js:1-19]
  [os:cartB2bCartContents/cartB2bCartContents.js-meta.xml:1-30].
- **Imperative modal composition**: several components hold no declarative `<c-modal>` markup and
  instead import a modal bundle's default export purely to call its static `.open({...})`:
  `cartCreateButton`/`cartOptions`/`cartHeader` all invoke `CreateCartModal.open(...)` /
  `CartOptionsConfirmationModal.open(...)` / `ClearCartModal.open(...)` this way
  [os:cartCreateButton/cartCreateButton.js:2] [os:cartCreateButton/cartCreateButton.js:42-50]
  [os:cartOptions/cartOptions.js:5] [os:cartOptions/cartOptions.js:85-93]. `cartSplitshipmentContents`
  composes three modal constructors this way (`site/checkoutNewshipmentModal`,
  `site/checkoutAddressModal`, `site/checkoutEmptyshipmentModal`), each opened in response to a
  child-dispatched event [os:cartSplitshipmentContents/cartSplitshipmentContents.js:5]
  [os:cartSplitshipmentContents/cartSplitshipmentContents.js:7]
  [os:cartSplitshipmentContents/cartSplitshipmentContents.js:14]
  [os:cartSplitshipmentContents/cartSplitshipmentContents.js:174-295].
- **Lazy constructor-as-flag composition**: `cartBadge` imports `MiniCartPanel` from
  `site/cartMinicartpanel` but on the happy path only assigns the imported class reference to
  `this.miniCartPanelConstructor` as a truthy sentinel the first time the mini-cart is opened; the
  actual `<site-cart-minicartpanel>` markup is still gated by `<template if:true={displayMiniCart}>`
  in the container's own template, so the child never mounts (and its wires never fire) until the
  user's first interaction [os:cartBadge/cartBadge.js:3] [os:cartBadge/cartBadge.js:164-198]
  [os:cartBadge/cartBadge.html:19-39].
- **Reuse of a sibling bundle's export without rendering its markup**: `cartSplitshipmentItemUi`
  imports the named export `getBundleChildProductCountLabel` directly from `site/cartItem` without
  rendering `<site-cart-item>` [os:cartSplitshipmentItemUi/cartSplitshipmentItemUi.js:5]
  [os:cartSplitshipmentItemUi/cartSplitshipmentItemUi.js:90-92]; `cartDeliverygroupItem` imports
  the `ITEM_TYPES` const enum from `site/cartItemDropdown`'s default module rather than
  duplicating it [os:cartDeliverygroupItem/cartDeliverygroupItem.js:4]
  [os:cartDeliverygroupItem/cartDeliverygroupItem.js:12].
- **Thin configuration-preset wrapper**: `multiCartBadge` renders a single `<site-cart-badge>`,
  forwarding ~20 passthrough props, forcing `is-b2b-store` to true, and deriving `show-carts-list`
  from `AppContextAdapter`/`SessionContextAdapter` (`commerceMultiCartEnabled` + `isLoggedIn`) —
  it adds no new markup of its own [os:multiCartBadge/multiCartBadge.js:51-57]
  [os:multiCartBadge/multiCartBadge.html:1-27].
- `cartItem` is the shared line-item leaf reused by two different repeaters: the main list
  (`cartItemsUi`, both the bonus and non-bonus `for:each` blocks) and — via its named export only,
  not its markup — `cartSplitshipmentItemUi` [os:cartItemsUi/cartItemsUi.html:29]
  [os:cartItemsUi/cartItemsUi.html:72].

## Events & communication

CustomEvent names (all custom-namespaced, lowercase, no dashes) and their source bundle:

| Event | Dispatcher | Payload | Bubbling |
|---|---|---|---|
| `deletecartitem` | cartItem | `detail: item.id` (string) | composed, bubbles [os:cartItem/constants.js:1] [os:cartItem/cartItem.js:205-215] |
| `modifycartitem` | cartItem | `detail.itemData` | composed, bubbles [os:cartItem/constants.js:2] [os:cartItem/cartItem.js:193-204] |
| `updatecartitem` | cartItem | `detail.cartItemId`, `detail.quantity` | composed, bubbles [os:cartItem/constants.js:3] [os:cartItem/cartItem.js:231-241] |
| `navigatetoproduct` | cartItem | `detail.productId`, `detail.urlName?` | composed, bubbles [os:cartItem/constants.js:4] [os:cartItem/cartItem.js:253-268] |
| `cartupdatestatus` | cartItem | `detail.isReadyForCheckout` | composed, bubbles [os:cartItem/constants.js:5] [os:cartItem/cartItem.js:242-252] |
| `seeconfiguration` | cartItem | `detail.cartItemId` | composed, bubbles [os:cartItem/constants.js:6] [os:cartItem/cartItem.js:465-473] |
| `cartshowmore` | cartItemsUi | none | composed, bubbles [os:cartItemsUi/constants.js:1] [os:cartItemsUi/cartItemsUi.js:141-145] |
| `cartgotopage` | cartItemsUi | `detail.pageNumber`, `detail.pageSize` | composed, bubbles [os:cartItemsUi/constants.js:2] [os:cartItemsUi/cartItemsUi.js:181-193] |
| `cartchangesortorder` | cartHeader | `detail`: sort value string | composed, bubbles [os:cartHeader/constants.js:14] [os:cartHeader/cartHeader.js:22-28] |
| `cartclear` | cartHeader | none | composed, bubbles [os:cartHeader/constants.js:15] [os:cartHeader/cartHeader.js:35-40] |
| `couponapply` | cartApplyCouponUi | none | composed, bubbles [os:cartApplyCouponUi/constants.js:1] [os:cartApplyCouponUi/cartApplyCouponUi.js:65-70] |
| `valuechanged` | cartApplyCouponUi | `detail.value` | bubbles, composed [os:cartApplyCouponUi/constants.js:2] [os:cartApplyCouponUi/cartApplyCouponUi.js:35-45] |
| `entercoupon` | cartApplyCouponUi | none | bubbles, composed [os:cartApplyCouponUi/constants.js:3] [os:cartApplyCouponUi/cartApplyCouponUi.js:71-79] |
| `removecoupon` | cartPromotionAppliedUi | `detail.couponId` | bubbles [os:cartPromotionAppliedUi/cartPromotionAppliedUi.js:44-52] |
| `changedeliverygroup` | cartDeliverygroupItem | `detail.cartItemId`, `detail.deliveryGroupId` | bubbles only (no composed) [os:cartDeliverygroupItem/constants.js:1] [os:cartDeliverygroupItem/cartDeliverygroupItem.js:79-88] |
| `changequantity` | cartDeliverygroupItem | `detail.cartItemId`, `detail.quantity` | composed, bubbles [os:cartDeliverygroupItem/constants.js:3] [os:cartDeliverygroupItem/cartDeliverygroupItem.js:66-78] |
| `deletecartitem` (2nd, `cartDeliverygroupItem`) | cartDeliverygroupItem | `detail.cartItemId` | bubbles only (no composed) [os:cartDeliverygroupItem/constants.js:2] [os:cartDeliverygroupItem/cartDeliverygroupItem.js:91-98] |
| `splitcartitem` | cartDeliverygroupItem | `detail.productId`, `detail.cartItemId`, `detail.deliveryGroupId` | bubbles only [os:cartDeliverygroupItem/constants.js:4] [os:cartDeliverygroupItem/cartDeliverygroupItem.js:52-62] |
| `opennewshipmentmodal` / `openaddressmodal` | cartItemDropdown | `detail.cartItemId` (first only) | composed, bubbles [os:cartItemDropdown/cartItemDropdown.js:220-233] |
| `cartupdated` / `cartdeleted` / `cartcleared` / `cartprimarychanged` | cartOptions, cartDetailsCard | `detail.cartId` (delete/clear only) | composed, bubbles [os:cartOptions/cartOptions.js:95-99] [os:cartOptions/cartOptions.js:118-125] [os:cartOptions/cartOptions.js:171-178] [os:cartOptions/cartOptions.js:225-237] [os:cartDetailsCard/cartDetailsCard.js:55-84] |
| `splitshipgotopage` | cartSplitshipmentItemsUi | `detail.pageNumber`, `detail.pageSize` | composed, bubbles [os:cartSplitshipmentItemsUi/cartSplitshipmentItemsUi.js:4] [os:cartSplitshipmentItemsUi/cartSplitshipmentItemsUi.js:37-48] |
| `cartupdated` / `reloadCartList` | cartCreateModal | none | dispatched on **`document`**, not `this` — see Anomalies [os:cartCreateModal/cartCreateModal.js:171-176] [os:cartCreateModal/cartCreateModal.js:190-195] |
| `open` / `close` | cartBadgeUi, cartBadge, cartMinicartpanel | none | plain dispatch, no composed/bubbles [os:cartBadgeUi/cartBadgeUi.js:350-352] [os:cartMinicartpanel/cartMinicartpanel.js:248-251] |

`cartDeliverygroupItem`'s `deletecartitem`, `splitcartitem`, and `changedeliverygroup` events all
omit `composed: true` (only `bubbles: true`); `changequantity` is the only one of the bundle's four
events that sets both — an inconsistency within the same bundle [os:cartDeliverygroupItem/cartDeliverygroupItem.js:52-98].

## Errors, loading, and processing state

- **"Is the cart busy" getters** follow the same shape across the family — `loading || data
  ?.isProcessing` from a wired status adapter, sometimes OR'd with a local flag:
  `cartContents.isCartProcessing` = `!!cartStatus?.data?.isProcessing || !!cartStatus?.loading ||
  (!this.items && !hasError)`, short-circuited to `false` in `isDesignMode`
  [os:cartContents/cartContents.js:46-52]; `cartSummary.isCartProcessing` adds a 2-second
  `setTimeout` debounce before flipping back to "not loading" to avoid a UI flicker right after
  the cart finishes processing [os:cartSummary/cartSummary.js:179-196];
  `cartMinicartpanel.isCartProcessing` combines `cartStatusHandler` with a separate
  `_cartItemsDataLoading` flag from its own wired `CartContentsAdapter`
  [os:cartMinicartpanel/cartMinicartpanel.js:225-227].
- **Layered error-message resolution** in `cartApplyCoupon.applyCartCoupon`'s `onError` callback:
  first tries an LDS-style array (`error?.[0]?.message`), then a commerce API error shape
  (`error?.errors?.[0]?.message`), and only then falls back to `getErrorInfo(code, labels)` from
  `site/cartFailedActionEvaluator`, which switches on API error-type strings (`WEBSTORE_NOT_FOUND`,
  `EFFECTIVE_ACCOUNT_NOT_FOUND`, `INSUFFICIENT_ACCESS`, `MAX_LIMIT_EXCEEDED`,
  `COUPON_REDEMPTION_LIMIT_EXCEEDED`, `CART_ITEM_LIMIT_EXCEEDED_FOR_COUPONS`, `ALREADY_APPLIED`,
  `BLOCKED_EXCLUSIVE`, `UNQUALIFIED_CART`, etc.) to pick a localized label, defaulting to
  `defaultErrorMessage` [os:cartApplyCoupon/cartApplyCoupon.js:111-136]
  [os:cartFailedActionEvaluator/cartErrorCodeEvaluator.js:1-39].
- `cartMinicartpanel` normalizes fetch failures through `toCommerceError(error).code` and
  suppresses the error toast entirely for an allowlist of benign codes (`MISSING_RECORD`,
  `INVALID_OPERATION`, `GUEST_INSUFFICIENT_ACCESS`) [os:cartMinicartpanel/cartMinicartpanel.js:159-166].
- `cartSplitshipmentContents.handleCreateDeliveryGroupError` distinguishes a `FetchError` carrying
  an `errors` array (uses the first error's message) from any other error (falls back to a generic
  toast) [os:cartSplitshipmentContents/cartSplitshipmentContents.js:166-173].
- Toast floods are debounced: `cartMinicartpanel.debounceToastMessage` wraps `Toast.show` in a
  2000ms `debounce()` [os:cartMinicartpanel/cartMinicartpanel.js:111-117].
- **Disable-during-mutation** is consistent across the family's async actions:
  `cartApplyCoupon.disableApplyCouponButton` is true while `_applyingChanges`
  [os:cartApplyCoupon/cartApplyCoupon.js:43-45] [os:cartApplyCoupon/cartApplyCoupon.js:111-136];
  `cartCreateModal` tracks `isCreateCartInProgress` for its save button/spinner
  [os:cartCreateModal/cartCreateModal.js:51-54] [os:cartCreateModal/cartCreateModal.js:156-206];
  `cartOptionsConfirmationModal` sets `_isLoading` for the duration of its injected
  `confirmAction()` [os:cartOptionsConfirmationModal/cartOptionsConfirmationModal.js:33-49].

## Guards

- **Undefined vs. empty on first render**: `cartContents.isCartProcessing` explicitly treats
  `!this.items` (i.e. still `undefined`, before the `{!Cart.Items}` expression resolves) as "still
  processing" rather than "empty" [os:cartContents/cartContents.js:50-52]; its
  `showEmptyState`/`showItemState` getters only flip once `items` is a real array
  [os:cartContents/cartContents.js:53-64]. `cartItemsUi`'s `_cartItems`/`_bonusCartItems` getters
  use `this.items?.filter(...)`, and `hasBonusCartItems` wraps the result in
  `Array.isArray(...)` before checking `.length` so an unresolved `items` doesn't throw
  [os:cartItemsUi/cartItemsUi.js:10-17].
- **SSR guards** (`!import.meta.env.SSR`) gate every DOM-only operation in components that declare
  `lightning__ServerRenderableWithHydration`: `cartItemsUi`'s `IntersectionObserver` setup in
  `connectedCallback` [os:cartItemsUi/cartItemsUi.js:77-85]
  [os:cartItemsUi/cartItemsUi.js-meta.xml:5-7]; its container-width small/large layout correction
  (`_containerWidth`, `ResizeObserver`, `window.innerWidth`)
  [os:cartItemsUi/cartItemsUi.js:239-266]; `cartItem`/`cartSplitshipmentItemUi`'s
  `sanitizeValue()` HTML-sanitizer call on the product name, gated behind
  `!import.meta.env.SSR && this.htmlProductNameGate` [os:cartItem/cartItem.js:349-355]
  [os:cartSplitshipmentItemUi/cartSplitshipmentItemUi.js:100-106]; `cartApplyCouponUi`'s
  `getThemeVersion()` lookup from `site/checkoutData` [os:cartApplyCouponUi/cartApplyCouponUi.js:87-93].
- **Guest vs. authenticated**: `cartCreateButton.handleOpenCreateCart` and
  `cartAddToSecondaryCart.handleSecondaryCartMenuOpen` both check
  `SessionContextAdapter`'s `isLoggedIn` at the point of interaction and redirect to a
  `comm__namedPage: Login` navigation instead of opening the feature when unauthenticated
  [os:cartCreateButton/cartCreateButton.js:36-51] [os:cartCreateButton/cartCreateButton.js:63-70]
  [os:cartAddToSecondaryCart/cartAddToSecondaryCart.js:106-115]
  [os:cartAddToSecondaryCart/cartAddToSecondaryCart.js:141-148].
- **Builder/design-mode guard**: `cartContents.isCartProcessing` returns `false` unconditionally
  when `isDesignMode` (from `experience/clientApi`) is true, so the Experience Builder canvas
  never gets stuck rendering a spinner [os:cartContents/cartContents.js:4]
  [os:cartContents/cartContents.js:47-49].
- **Feature/state-linked disabling**: `cartItem` disables the quantity selector, delete button,
  and modify button whenever the item is tied to a quote line (`item.quoteLineItemId != null`)
  [os:cartItem/cartItem.js:119-130].
- **Optimistic-count guard rails**: `cartBadge` only applies optimistic math when
  `isOptimisticCountEnabled(countType)` is true (Total count only, not Unique), and validates the
  computed delta isn't `null`/`0`/`NaN` before applying it [os:cartBadge/cartBadge.js:200-233]
  [os:cartBadge/utils.js:1-3] [os:cartBadge/utils.js:34-73]. `cartBadge.isSecondaryCartAction`
  compares an action's `cartId` against the badge's own primary-cart id before reacting to
  add/optimistic events, so mutations on a different (secondary) cart don't perturb the primary
  badge [os:cartBadge/cartBadge.js:145-156] [os:cartBadge/cartBadge.js:181-184]
  [os:cartBadge/cartBadge.js:216-218].

## Labels & i18n

- Every bundle read re-exports its `@salesforce/label/site.<Bundle>.<Key>` imports from a
  bundle-local `labels.js` (or a `labels`/`LABELS` object) rather than importing raw label modules
  inline in the component — confirmed on `cartItemsUi` [os:cartItemsUi/labels.js:1-6],
  `cartContents` [os:cartContents/labels.js:1-2], `cartApplyCoupon`
  [os:cartApplyCoupon/labels.js:1-22], and every other archetype read.
- Placeholder interpolation tokens are **not** standardized across the family — different
  components use different literal tokens inside the same label string: `{0}` (`cartItems`'
  `skuLabel`/`minimumValueGuideText`/etc. [os:cartItems/cartItems.js-meta.xml:24]
  [os:cartItems/cartItems.js-meta.xml:53-55]; `cartItem.itemNameQuantityText`
  [os:cartItem/cartItem.js:279-283]), `{amount}` (`cartItems.promotionsAppliedSavingsButtonText`
  [os:cartItems/cartItems.js-meta.xml:49]), `{code}` (`cartApplyCoupon`'s API-error messages
  [os:cartApplyCoupon/cartApplyCoupon.js:125] [os:cartApplyCoupon/cartApplyCoupon.js:128]),
  `{cartName}` (`cartOptions`/`cartCreateModal` success/error toasts
  [os:cartOptions/cartOptions.js:137-138] [os:cartCreateModal/cartCreateModal.js:168-169]),
  `{maxLength}` (`cartCreateModal`'s character-limit errors
  [os:cartCreateModal/cartCreateModal.js:207-209]), `{maximumCount}` (`cartBadge`'s
  `badgeLabelGenerator` [os:cartBadge/badgeLabelGenerator.js:7]).
- **Currency**: `cartItems`, `cartSummary`, and `cartMinicartpanel` each fall back to
  `@salesforce/i18n/currency` when no cart-provided `currencyIsoCode` is present
  [os:cartItems/cartItems.js:3] [os:cartItems/cartItems.js:24-26]
  [os:cartSummary/cartSummary.js:4] [os:cartSummary/cartSummary.js:133-135]
  [os:cartMinicartpanel/cartMinicartpanel.js:5] [os:cartMinicartpanel/cartMinicartpanel.js:179-181].
  `cartItem` and `cartSplitshipmentItemUi` format money through the shared
  `site/commonFormatterCurrency` helper rather than calling `Intl.NumberFormat` inline
  [os:cartItem/cartItem.js:5] [os:cartItem/cartItem.js:305] [os:cartItem/cartItem.js:320]
  [os:cartSplitshipmentItemUi/cartSplitshipmentItemUi.js:4]
  [os:cartSplitshipmentItemUi/cartSplitshipmentItemUi.js:81].
- `@salesforce/i18n/locale` drives an `Intl.NumberFormat` instance in `cartBadge`'s count
  formatter, and counts over a configured maximum are replaced by a dedicated `maximumCount`
  label rather than being silently truncated [os:cartBadge/constants.js:1]
  [os:cartBadge/constants.js:7-8] [os:cartBadge/badgeLabelGenerator.js:1-9].

## Accessibility

- `cartItemsUi`'s item list uses `role="feed"` with `aria-busy` toggled during fetch, each item
  wrapped in an `<article aria-label={item.name} aria-setsize="-1" tabindex="0">`, and two
  screen-reader-only skip links (`skipToBottom`/`skipToTop`) that both focus and
  `scrollIntoView({behavior:'smooth'})` their target [os:cartItemsUi/cartItemsUi.html:1-16]
  [os:cartItemsUi/cartItemsUi.html:58-111] [os:cartItemsUi/cartItemsUi.js:125-165].
- `cartBadgeUi`'s carts-list dropdown implements full roving-focus keyboard navigation
  (ArrowDown/ArrowUp/Home/End/Enter/Space/Escape/Tab) over `role="menuitem"` items inside a
  `lightning-button-menu` [os:cartBadgeUi/cartBadgeUi.js:195-261].
- `cartCreateModal.handleNameBlur`/`validateNameField`/`validateDescriptionField` drive native SLDS
  field validation via `input.setCustomValidity(...)` + `input.reportValidity()` instead of a
  hand-rolled error text node [os:cartCreateModal/cartCreateModal.js:74-87]
  [os:cartCreateModal/cartCreateModal.js:108-155].
- `cartMinicartpanel` moves focus into the panel on first non-stencil render by calling
  `this.refs.panelHeading.focus()` [os:cartMinicartpanel/cartMinicartpanel.js:104-110].
- `cartHeader`'s "clear cart" affordance is a `<div role="button" aria-label={confirmClearCartButtonText}>`
  rather than a native `<button>` [os:cartHeader/cartHeader.html:11-19].
- `cartApplyCouponUi` sets `aria-invalid={isInvalid}` on the `lightning-input` and supplies a
  distinct `aria-label` (`_labels.couponCodeInputPlaceHolderText`) separate from the visible
  `label` [os:cartApplyCouponUi/cartApplyCouponUi.html:12-25].
- `cartContents`' spinner uses `role="status"` with `slds-assistive-text` for its alternative text
  rather than an `aria-live` region [os:cartContents/cartContents.html:161-180].
- `cartAddToSecondaryCart` maintains parallel "assistive mirror" text
  (`_showAssistiveErrorMirror`/`_showAssistivePoliteMirror`) so screen-reader users get an
  announcement of loading/error/no-result states the first time they open the secondary-cart menu,
  independent of the visual dropdown state [os:cartAddToSecondaryCart/cartAddToSecondaryCart.js:59-75].

## Styling

- `experience/styling`'s `generateStyleProperties()` / `generateTextFontSize()` are the standard
  bridge from builder color/size `@api` props to inline CSS custom properties
  (`--com-c-cart-item-*`, `--com-c-cart-summary-*`, `--com-c-cart-applied-promotion-*`, etc.),
  applied via a wrapper `<div style={...}>` in the container. Confirmed on `cartItems`
  [os:cartItems/cartItems.js:5] [os:cartItems/cartItems.js:136-196], `cartApplyCoupon`
  [os:cartApplyCoupon/cartApplyCoupon.js:5] [os:cartApplyCoupon/cartApplyCoupon.js:58-90],
  `cartPromotionApplied` [os:cartPromotionApplied/cartPromotionApplied.js:2]
  [os:cartPromotionApplied/cartPromotionApplied.js:36-57], `cartSummary`
  [os:cartSummary/cartSummary.js:7] [os:cartSummary/cartSummary.js:74-129],
  `cartSplitshipmentContents` [os:cartSplitshipmentContents/cartSplitshipmentContents.js:4]
  [os:cartSplitshipmentContents/cartSplitshipmentContents.js:114-128], and `cartBadgeUi`
  [os:cartBadgeUi/cartBadgeUi.js:6] [os:cartBadgeUi/cartBadgeUi.js:58-66].
- Builder font-size choices are indirected through a fixed small/medium/large token set that
  resolves to `var(--dxp-s-*-font-size)` custom properties rather than raw pixel values —
  `cartPromotionApplied.getDxpButtonFontSize` [os:cartPromotionApplied/cartPromotionApplied.js:58-69]
  and `cartSummary.dxpTextSize` [os:cartSummary/cartSummary.js:220-231] both implement the same
  small/medium/large switch independently (duplicated, not shared, logic).
  `SLDSFontSizeDataSource` supplies the matching builder picklist in js-meta.xml
  [os:cartItems/cartItems.js-meta.xml:34].
- Shared design-time datasources reused across the family for consistent builder pickers:
  `SLDSFontSizeDataSource`, `DxpImageSizeDataSource`, `ButtonSizeDataSource`,
  `B2BCartCountDataSource`, `CartItemsPaginationOptionsDataSource`
  [os:cartItems/cartItems.js-meta.xml:22] [os:cartItems/cartItems.js-meta.xml:27]
  [os:cartItems/cartItems.js-meta.xml:34] [os:cartBadge/cartBadge.js-meta.xml:17]
  [os:cartBadge/cartBadge.js-meta.xml:22] [os:cartBadge/cartBadge.js-meta.xml:25].

## Candidate generation rules

1. Pair a builder-facing container with a non-builder leaf named `<X>Ui`: the container carries
   `@api` props plus js-meta.xml (`<targets>`/`<targetConfig>`/expression bindings) and renders
   exactly one child leaf that owns markup and DOM logic; the leaf is `isExposed=true` but ships
   **no** `<targets>` block. Model: `cartItems` → `cartItemsUi`
   [os:cartItems/cartItems.js-meta.xml:6-10] [os:cartItemsUi/cartItemsUi.js-meta.xml:1-7].
2. When a component needs cart data straight from page context (not passed by a parent), bind its
   `@api` property's js-meta.xml default to a `{!Cart.*}` expression (e.g. `{!Cart.Items}`,
   `{!Cart.Pagination}`, `{!Cart.Details.currencyIsoCode}`) and pair each bound property with a
   `designLayoutProperty cbVisibleIf="<prop>=false"` so builders only see it when unbound. Model:
   `cartItems` [os:cartItems/cartItems.js-meta.xml:16-19] [os:cartItems/cartItems.js-meta.xml:58-62].
3. Non-`Cart` page contexts get their own expression root, not a forced `Cart.*` path:
   promotion-scoped components bind `{!Promotion.*}` (`cartPromotionApplied`) and split-shipment
   components bind `{!SplitShipment.*}` (`cartSplitshipmentContents`) — choose the expression root
   that matches where the component is meant to be dropped, not always `Cart`. Model:
   [os:cartPromotionApplied/cartPromotionApplied.js-meta.xml:22-25]
   [os:cartSplitshipmentContents/cartSplitshipmentContents.js-meta.xml:16-20].
4. Route mutations through `commerce/actionApi`'s `createXxxAction()` +
   `dispatchAction(this, action, {onSuccess, onError})` (or `dispatchActionAsync` when the caller
   needs the resolved value, e.g. a new cart id) instead of calling `commerce/checkoutCartApi`
   mutation functions directly from a UI event handler. Model good: `cartItems.handleDeleteCartItem`
   → `createCartItemDeleteAction` [os:cartItems/cartItems.js:4] [os:cartItems/cartItems.js:203-205].
   Model of the one documented, justified exception: `cartCreateModal` calls `cartCreate()`
   directly because no `createCartCreateAction` factory exists
   [os:cartCreateModal/cartCreateModal.js:4-6] [os:cartCreateModal/cartCreateModal.js:184-186].
5. Give every list-mutating leaf event `composed: true, bubbles: true`, and centralize the
   event-name string in a bundle-local `constants.js` that the container also imports for its
   `on<eventname>` wiring — never inline the string literal in both places. Model: `cartItem`'s
   `constants.js` (`deletecartitem`, `modifycartitem`, `updatecartitem`, `navigatetoproduct`,
   `cartupdatestatus`, `seeconfiguration`), consumed by `cartItemsUi` and referenced by
   `cartSplitshipmentItemUi`'s repeater [os:cartItem/constants.js:1-6]
   [os:cartItemsUi/cartItemsUi.html:29] [os:cartItemsUi/cartItemsUi.html:72].
6. For a confirm/cancel dialog, extend `lightning/modal`'s `LightningModal`, ship no js-meta.xml
   `<targets>` (it is only ever opened via its default export's static `.open()`, never dropped
   from the builder), and resolve the returned Promise with a short string sentinel (`'confirm'`,
   `'close'`, `'error'`, or a created record's id) that the caller branches on. Model:
   `cartOptionsConfirmationModal` / `cartClearCartModal` / `cartCreateModal`
   [os:cartClearCartModal/cartClearCartModal.js-meta.xml:1-5]
   [os:cartOptionsConfirmationModal/cartOptionsConfirmationModal.js:37-53]
   [os:cartCreateModal/cartCreateModal.js:196-229].
7. Normalize backend error codes through a small `getErrorInfo(code, labelMap)` evaluator module
   (a `switch` over API error-type strings mapped to pre-imported `@salesforce/label` values, with
   an explicit default-message fallback branch) rather than inlining `if/else` string comparisons
   in the component. Model: `cartFailedActionEvaluator`/`cartErrorCodeEvaluator`, consumed by
   `cartApplyCoupon` [os:cartFailedActionEvaluator/cartErrorCodeEvaluator.js:1-39]
   [os:cartApplyCoupon/cartApplyCoupon.js:118-136].
8. Treat `undefined` cart data as "still loading," not "empty": gate empty-state rendering on an
   explicit `Array.isArray(items) && items.length === 0` check (with a builder-only override such
   as `forceEmptyState`/`forceItemsState`), and only render the real empty-state UI once the array
   has actually resolved. Model: `cartContents`'s `showEmptyState`/`showItemState`/
   `isCartProcessing` getters [os:cartContents/cartContents.js:46-64].
9. Gate DOM-only work (`ResizeObserver`/`IntersectionObserver` setup, DOM sanitizers, `window`
   reads) behind `!import.meta.env.SSR` in any component whose js-meta.xml declares
   `lightning__ServerRenderableWithHydration`. Model: `cartItemsUi`'s observer setup and
   `cartItem`'s `sanitizeValue()` gate [os:cartItemsUi/cartItemsUi.js:77-85]
   [os:cartItem/cartItem.js:349-355].
10. When a component both fetches its own async data and requires auth (e.g. secondary-cart list,
    new-cart creation), check `SessionContextAdapter`'s `isLoggedIn` at the point of interaction
    (menu-open, button-click) and redirect unauthenticated users to the `Login` `comm__namedPage`
    instead of rendering the feature disabled. Model:
    `cartAddToSecondaryCart.handleSecondaryCartMenuOpen`, `cartCreateButton.handleOpenCreateCart`
    [os:cartAddToSecondaryCart/cartAddToSecondaryCart.js:106-115]
    [os:cartCreateButton/cartCreateButton.js:36-51].
11. Reuse a sibling bundle's small, pure default export (a formatter, evaluator, or event-name
    constant) via `import x from 'site/otherBundle'` instead of duplicating logic —
    `canDisplayOriginalPrice` (`cartEvaluatePriceOriginal`), `currencyFormatter`
    (`commonFormatterCurrency`), and `getBundleChildProductCountLabel` (`cartItem`) are each
    imported this way by multiple unrelated cart bundles. Keep the evaluator/utility bundle's
    js-meta.xml free of `<targets>` since it is not meant to be builder-placed. Model:
    [os:cartItem/cartItem.js:4] [os:cartSummary/cartSummary.js:5]
    [os:cartSplitshipmentItemUi/cartSplitshipmentItemUi.js:5]
    [os:cartEvaluatePriceOriginal/cartEvaluatePriceOriginal.js-meta.xml:1-8].
12. Debounce noisy user input (quantity typing, repeated failure toasts) at a named, exported
    constant rather than a magic number inline. Model: `cartItem`'s quantity-change handler and
    `cartMinicartpanel`'s error toast both use `experience/utils`' `debounce()` with
    `UPDATE_QUANTITY_DEBOUNCE = 300` / a literal `2000` respectively
    [os:cartItem/constants.js:7] [os:cartItem/cartItem.js:231-241]
    [os:cartMinicartpanel/cartMinicartpanel.js:111-117].

## Candidate review rules / anti-patterns

1. Flag any cart-family `@api` property whose js-meta.xml default is a `{!...}` expression whose
   root doesn't match the component's intended page context (e.g. a `{!Cart.*}` binding on a
   component meant for a promotion or split-shipment placement, or vice versa) — cross-check
   against the two documented non-`Cart` precedents, `Promotion.*` (`cartPromotionApplied`) and
   `SplitShipment.*` (`cartSplitshipmentContents`) [os:cartPromotionApplied/cartPromotionApplied.js-meta.xml:22-25]
   [os:cartSplitshipmentContents/cartSplitshipmentContents.js-meta.xml:16-20].
2. Flag a cart mutation (add/remove/update/clear/apply-coupon/etc.) dispatched by calling a
   `commerce/checkoutCartApi` function directly from a click/change handler instead of
   `commerce/actionApi`'s `createXxxAction` + `dispatchAction`/`dispatchActionAsync` — the only
   accepted exception in this family is cart *creation* (`cartCreate()`), because no
   `actionApi` factory exists for it; any other direct call should be justified or routed through
   actionApi [os:cartItems/cartItems.js:4] [os:cartCreateModal/cartCreateModal.js:4]
   [os:cartCreateModal/cartCreateModal.js:184-186].
3. Flag a leaf component (`<X>Ui` suffix) whose js-meta.xml still ships `<targets>`/
   `<targetConfig>` — leaves in this family are internal implementation detail and should expose
   zero targets, matching `cartItemsUi`, `cartBadgeUi`, `cartApplyCouponUi`, `cartSummaryUi`
   [os:cartItemsUi/cartItemsUi.js-meta.xml:1-7] [os:cartBadgeUi/cartBadgeUi.js-meta.xml:1-7].
4. Flag a mutation-signaling CustomEvent that omits `bubbles: true` — every list-item/child
   mutation event in this family that crosses more than one component boundary
   (`deletecartitem`, `modifycartitem`, `updatecartitem`, `cartclear`, `cartchangesortorder`,
   `couponapply`, `changequantity`, `changedeliverygroup`, `splitcartitem`) is dispatched with at
   least `bubbles: true`; a same-family event missing `bubbles: true` is a functional bug, not a
   style choice. `composed: true` is applied inconsistently even within a single bundle —
   `cartDeliverygroupItem`'s `changequantity` sets both `composed` and `bubbles`, while its
   `deletecartitem`/`splitcartitem`/`changedeliverygroup` siblings set `bubbles` only — so do not
   treat a missing `composed: true` alone as a defect unless the event specifically needs to cross
   a shadow-DOM boundary; do flag the inconsistency itself as worth reconciling
   [os:cartItem/cartItem.js:197-215] [os:cartHeader/cartHeader.js:23-39]
   [os:cartDeliverygroupItem/cartDeliverygroupItem.js:52-98].
5. Flag empty/loading-state logic that treats `undefined` cart data the same as an empty array
   (`items.length === 0` without a preceding `Array.isArray`/definedness check) — this collapses
   "not loaded yet" and "cart is empty" into one UI state and flashes an incorrect empty-cart
   message on first render [os:cartContents/cartContents.js:53-64].
6. Flag direct DOM/browser API usage (`window.innerWidth`, `ResizeObserver`,
   `IntersectionObserver`, HTML-sanitizing calls) that is not guarded by
   `!import.meta.env.SSR` in a component whose js-meta.xml declares
   `lightning__ServerRenderableWithHydration` — this breaks SSR
   [os:cartItemsUi/cartItemsUi.js:77-85] [os:cartItemsUi/cartItemsUi.js:239-266]
   [os:cartItemsUi/cartItemsUi.js-meta.xml:5-7].
7. Flag a component that dispatches a **global** `document.dispatchEvent(...)` (rather than
   `this.dispatchEvent(...)`) to signal a state change to unrelated ancestor trees —
   `cartCreateModal`'s `reloadCartList`/`cartupdated` events are dispatched on `document`, which
   bypasses the CustomEvent-bubbling convention used everywhere else in the family and can't be
   scoped or torn down like a normal component listener; new instances of this pattern need
   explicit justification [os:cartCreateModal/cartCreateModal.js:171-176]
   [os:cartCreateModal/cartCreateModal.js:190-195].
8. Flag error-handling in a `commerce/actionApi` `onError` callback that shows only a generic
   error message when a per-code evaluator (`cartErrorCodeEvaluator`'s `getErrorInfo(code,
   labels)` or equivalent) is available and not used — silently regresses the localized-message
   UX pattern established by `cartApplyCoupon` [os:cartApplyCoupon/cartApplyCoupon.js:118-136]
   [os:cartFailedActionEvaluator/cartErrorCodeEvaluator.js:1-39].
9. Flag a mutating async action (delete, clear, set-default, apply-coupon, create/edit cart) whose
   triggering control is not disabled or marked processing for the duration of the call — every
   archetype read disables the control or shows a spinner (`_applyingChanges`,
   `isCreateCartInProgress`, `_isLoading`) during its async window; a missing disabled-state
   binding allows double-submission [os:cartApplyCoupon/cartApplyCoupon.js:43-45]
   [os:cartCreateModal/cartCreateModal.js:51-54]
   [os:cartOptionsConfirmationModal/cartOptionsConfirmationModal.js:33-49].
10. Flag hardcoded currency formatting (manual `Intl.NumberFormat` construction or string
    concatenation of a currency symbol) instead of `site/commonFormatterCurrency`, and flag a
    missing `@salesforce/i18n/currency` fallback when no cart-scoped `currencyIsoCode` is supplied
    — every archetype in this family does one or both [os:cartItem/cartItem.js:5]
    [os:cartItem/cartItem.js:305] [os:cartItems/cartItems.js:3] [os:cartItems/cartItems.js:24-26].

## Anomalies & divergences

- Census flagged `cartApplyCouponButtonUi`, `cartApplyCouponUi`, and `cartBadgeUi` among "bundles
  with no js-meta.xml properties." Confirmed on direct read: all three are `isExposed=true` leaves
  with zero `<targets>`/`<targetConfig>` blocks (not builder-placeable), consistent with review
  rule #3 above — not an authoring error [os:cartApplyCouponButtonUi/cartApplyCouponButtonUi.js-meta.xml:1-8]
  [os:cartApplyCouponUi/cartApplyCouponUi.js-meta.xml:1-8] [os:cartBadgeUi/cartBadgeUi.js-meta.xml:1-8].
- No `os`-vs-`col` divergence to record for this family: the Step 1 census slice returned 36/36
  `repo:"os"` entries and 0 `col:` entries — `cart` is entirely open-source-only, unlike
  `product`/`search` families that have `col:` (Commerce on Lightning) counterparts.
- `cartB2bCartContents extends CartContents` (the class imported from `site/cartContents`) rather
  than composing it via markup — the only class-subclassing (as opposed to container/leaf
  composition) observed in the family. It exists purely to give a differently-shaped,
  publicly-exposed js-meta.xml wrapper (`items`/`messages` expression defaults, `<targets>`)
  around the internal, non-builder `cartContents` bundle
  [os:cartB2bCartContents/cartB2bCartContents.js:1-19]
  [os:cartB2bCartContents/cartB2bCartContents.js-meta.xml:1-30].
- `cartSummary` and `cartSplitshipmentHeader` both carry `<targets>`/`<targetConfig>` (builder-
  placeable) yet diverge from the dominant expression-bound-container shape: `cartSummary` wires
  `CartStatusAdapter`/`CartContentsAdapter` directly instead of taking `{!Cart.*}`-bound props
  [os:cartSummary/cartSummary.js:2-3] [os:cartSummary/cartSummary.js:181-219]
  [os:cartSummary/cartSummary.js-meta.xml:1-18], and `cartSplitshipmentHeader`'s `targetConfig`
  declares **zero** `<property>` elements — a builder-placeable component with no configurable
  properties at all [os:cartSplitshipmentHeader/cartSplitshipmentHeader.js-meta.xml:11-15]. Both
  are legitimate but worth flagging if a generator defaults to always emitting expression
  bindings or at least one configurable property.
- `cartFailedActionEvaluator` and `cartEvaluatePriceOriginal` both declare
  `lightning__ServerRenderable` despite having no `.html` template and being pure logic modules —
  the capability declaration reads as generator boilerplate rather than functionally meaningful
  for a template-less bundle [os:cartFailedActionEvaluator/cartFailedActionEvaluator.js-meta.xml:1-8]
  [os:cartEvaluatePriceOriginal/cartEvaluatePriceOriginal.js-meta.xml:1-8].
- Step 1's rare-module scan flagged `site/cartFailedActionEvaluator` as imported by only
  `cartApplyCoupon` plus one order-family bundle (out of scope for this note). Confirmed by direct
  read: it is exactly the two-file evaluator archetype named in the task brief —
  `cartFailedActionEvaluator.js` re-exporting a single `getErrorInfo` function, and
  `cartErrorCodeEvaluator.js` holding the error-code `switch` — with no js-meta.xml `<targets>`
  [os:cartFailedActionEvaluator/cartFailedActionEvaluator.js:1-8]
  [os:cartFailedActionEvaluator/cartErrorCodeEvaluator.js:1-39].
