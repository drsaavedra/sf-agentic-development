# Deep-read notes: order, quote, subscription

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

**Read in full (js + html + js-meta.xml + local util modules):**

Order: `orderDetails` + `orderDetailsPreprocessor` [os:orderDetails], `orderDetailsUi`
[os:orderDetailsUi], `orderAmount` + `orderAmountPreprocessor` [os:orderAmount], `orderAmountUi`
[os:orderAmountUi], `orderDeliveryGroup` [os:orderDeliveryGroup], `orderDeliveryGroupContainer` +
`processOrderItemDataResponse` [os:orderDeliveryGroupContainer], `orderDeliveryGroupUi`
[os:orderDeliveryGroupUi], `orderConfirmationItems` + `itemMapperUtil` [os:orderConfirmationItems],
`orderConfirmationTotalsSummary` [os:orderConfirmationTotalsSummary], `orderConfirmationMessageError`
[os:orderConfirmationMessageError], `orderList` [os:orderList], `reorderButton` [os:reorderButton],
`reorderModal` [os:reorderModal], `reorderModalContents` + `textGenerator` [os:reorderModalContents].

Quote: `quoteAcceptandbuyButton` [os:quoteAcceptandbuyButton], `quoteList` [os:quoteList],
`quoteConfirmationItems` + `itemMapperUtil` + `quoteToOrderItemFormatter` [os:quoteConfirmationItems],
`quoteCartModalUi` [os:quoteCartModalUi], `quoteTocartModal` [os:quoteTocartModal].

Subscription: `subscriptionCard` + `dateUtil` + `cancelStatusConfig` [os:subscriptionCard],
`subscriptionCardList` [os:subscriptionCardList], `subscriptionCardV2` [os:subscriptionCardV2],
`subscriptionCardBuilder` [os:subscriptionCardBuilder], `subscriptionDetailsCard`
[os:subscriptionDetailsCard], `subscriptionAmendModal` [os:subscriptionAmendModal],
`subscriptionStatus` [os:subscriptionStatus], `subscriptionCancelModal` [os:subscriptionCancelModal],
`subscriptionRenewModal` [os:subscriptionRenewModal], `subscriptionPaymentMethodModal`
[os:subscriptionPaymentMethodModal].

**Skimmed (grepped for a single fact, meta-xml only, or one file of a multi-file bundle):**
`orderDeliveryGroupContainer/processOrderItemAdjustmentsData.js` (referenced, not opened),
`paymentSavedMethodsActionModal.html` (grepped one line to confirm `subscriptionCardList` consumer),
`orderQuickOrder.js` (opened only to confirm `commerce/dataEventApi` usage).

**Census-only (not opened; evidence is the `census.json` slice / findings-api-census.md rows):**
`orderLookup`/`orderLookupUi`, `orderSummary`/`orderSummaryUi`/`orderSummaryContentlayout`,
`orderQuickOrderDisplay`/`orderQuickOrderItem`, `orderConfirmationDeliverygroup`/
`orderConfirmationDetailsBilling`/`orderConfirmationFieldtable`/`orderConfirmationLayoutContent`/
`orderConfirmationMessageSuccess`, `orderItemInfo`, `orderLineitem`, `orderListDateFilter`/
`orderListDateFilterUi`/`orderListUi`, `orderProducts`, `orderPromotions`/`orderPromotionsApplied`/
`orderPromotionsAppliedUi`, `orderShipmentTracker`/`orderShipmentTrackerUi`, `orderTotals`/
`orderTotalsWithFields`, `orderDeliveryGroupDisplay`, `orderDetailsDisplay`, `quoteConfirmationErrorMessage`/
`quoteConfirmationLayoutContent`/`quoteConfirmationSuccessMessage`, `quoteDeclineRenegotiateButton`/
`quoteDeclineRenegotiateModalUi`, `quoteDuplicateToCartButton`, `quoteListDatefilter`/
`quoteListDatefilterUi`/`quoteListUi`, `quoteNotesThread`/`quoteNotesThreadUi`, `quoteRequestButton`/
`quoteRequestButtonProduct`/`quoteRequestModal`, `quoteStatusTracker`/`quoteStatusTrackerUi`,
`quoteSummary`/`quoteSummaryContentLayout`/`quoteSummaryErrorMessage`/`quoteSummaryProductMedia`/
`quoteSummaryUi`, `subscriptionActionHistoryCard`, `subscriptionHistoryPanel`/
`subscriptionHistoryDetailsPanel`, `subscriptionTermDetailsPill` (its usage inside `subscriptionCard`
was confirmed by reading `subscriptionCard.html`, but the bundle itself was not opened).

## Data access — how this family gets data without Apex

**Zero Apex confirmed for this scope.** Every `.js` file opened across all three families imports
only `lwc`, `lightning/*`, `@salesforce/*`, `commerce/*`, `experience/*`, or relative/`site/*`
modules — no `@salesforce/apex*` import appears anywhere in the order/quote/subscription bundles
read [os:orderDetails/orderDetails.js:1-3] [os:quoteTocartModal/quoteTocartModal.js:1-13]
[os:subscriptionAmendModal/subscriptionAmendModal.js:1-11]. This upholds the census's "0 Apex
imports" finding (`findings-api-census.md` open question 1) for this scope; no indirect Apex path
was found either — every mutation in this scope goes through a `commerce/*` module function.

**`{!...}` expression-bound `@api` properties** are the primary data-provider contract for
page-placed components — a Builder page provider (Order / Quote / DeliveryGroup / QuoteDetail /
QuoteSummary / OrderDeliveryGroup / Subscription / Cart / Product) resolves the expression at
runtime and passes JSON through the property. Roots observed in this scope:
- `{!Order.Details}` — [os:orderDetails/orderDetails.js-meta.xml:14],
  [os:orderAmount/orderAmount.js-meta.xml:16], [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js-meta.xml:19],
  [os:orderSummaryContentlayout/orderSummaryContentlayout.js-meta.xml:17]
- `{!Order.Adjustments}` — [os:orderAmount/orderAmount.js-meta.xml:17],
  [os:orderPromotionsApplied/orderPromotionsApplied.js-meta.xml:16], [os:orderPromotions/orderPromotions.js-meta.xml:19]
- `{!Order.Owner}` — [os:orderConfirmationDeliverygroup/orderConfirmationDeliverygroup.js-meta.xml:20],
  [os:orderConfirmationDetailsBilling/orderConfirmationDetailsBilling.js-meta.xml:20]
- `{!Order.ClientState}` — [os:orderConfirmationLayoutContent/orderConfirmationLayoutContent.js-meta.xml:19],
  [os:orderSummaryContentlayout/orderSummaryContentlayout.js-meta.xml:21]
- `{!Order.Errors}` — [os:orderSummaryContentlayout/orderSummaryContentlayout.js-meta.xml:22]
- `{!Order.DeliveryGroups}` — [os:orderProducts/orderProducts.js-meta.xml:16]
- `{!Order.Details.status}` — dot-path into `Details` — [os:orderShipmentTracker/orderShipmentTracker.js-meta.xml:16]
- `{!OrderDeliveryGroup}` — a **separate, sibling root**, not a child path of `Order` —
  [os:orderDeliveryGroup/orderDeliveryGroup.js-meta.xml:16]
- `{!DeliveryGroup.lineItems}`, `{!DeliveryGroup.currencyIsoCode}`, `{!DeliveryGroup.id}` — a
  **third, distinct root** used specifically by the order-confirmation line-item list, one level
  below the page-level `Order`/`OrderDeliveryGroup` roots — [os:orderConfirmationItems/orderConfirmationItems.js-meta.xml:16-18]
- `{!recordId}` — the standard record-page binding (not commerce-specific) used by `reorderButton`
  to source `orderSummaryId` when placed on an `OrderSummary` record page —
  [os:reorderButton/reorderButton.js-meta.xml:16]
- `{!QuoteDetail.id}`, `{!QuoteDetail.status}`, `{!QuoteDetail.orderId}`, `{!QuoteDetail.hasLineItems}` —
  [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js-meta.xml:16-19]
- `{!QuoteDetail}` (whole object), `{!QuoteDetail.ClientState}` — [os:quoteSummaryContentLayout/quoteSummaryContentLayout.js-meta.xml:16] (found via
  `findings-api-census.md` grep evidence for the sibling `quoteConfirmationLayoutContent`)
- `{!QuoteDetail.Notes}` — `quoteNotesThread` (census-only)
- `{!QuoteSummary}` (whole object) — `quoteSummary` (census-only)
- `{!Cart.Details.cartId}` — `quoteRequestButton` (census-only) — quote-request is triggered from an
  in-progress cart, not from a quote data provider
- `{!Product.Details}`, `{!Product.Inventory}` — `quoteRequestButtonProduct` (census-only) — a PDP
  variant of the quote-request button binds to the product data provider instead
- `{!Subscription}` (whole object) — [os:subscriptionCardBuilder/subscriptionCardBuilder.js-meta.xml:16]
  is the only expression root in the subscription family in this scope; every other subscription
  bundle receives `item`/`items` as a plain (non-expression) `@api` property from a parent
  component, not directly from a page data provider.

**Imperative `commerce/*` action calls** (module, export, call site):
- `commerce/orderApi.startReOrder({ orderSummaryId, accessToken, cartStateOrId })` and
  `commerce/cartApi.refreshCartSummary()` — [os:reorderModal/reorderModal.js:3-4], [os:reorderModal/reorderModal.js:45-51]
- `commerce/checkoutCartApi.cartItemsAdd`, `commerce/checkoutCartApi.CartStatusAdapter`,
  `commerce/checkoutCartApi.toCommerceError` — [os:orderQuickOrder/orderQuickOrder.js:3] (quick-order
  add-to-cart reuses the checkout cart API, not a dedicated order-family API)
- `commerce/dataEventApi.createCartItemAddDataEvent` / `dispatchDataEvent` /
  `getAndRemoveSearchCorrelationId` — analytics/telemetry event dispatch on add-to-cart, distinct
  from DOM `CustomEvent`s — [os:orderQuickOrder/orderQuickOrder.js:4]
- `commerce/quoteApi.createCartFromQuote({ quoteId, operationType: 'CONVERT_TO_CART' | 'DUPLICATE_TO_CART' })`
  and `commerce/quoteApi.refreshQuoteDetail({ quoteId })` — identical in both
  [os:quoteTocartModal/quoteTocartModal.js:3], [os:quoteTocartModal/quoteTocartModal.js:96-110] and [os:quoteCartModalUi/quoteCartModalUi.js:3], [os:quoteCartModalUi/quoteCartModalUi.js:96-110]
  (see Anomalies)
- `commerce/subscriptionApi.amendSubscription({ subscriptionIds, quantityChange, amendStartDate })` —
  [os:subscriptionAmendModal/subscriptionAmendModal.js:8], [os:subscriptionAmendModal/subscriptionAmendModal.js:161-168]
- `commerce/subscriptionApi.unsubscribeItem({ subscriptionIds })` — [os:subscriptionCancelModal/subscriptionCancelModal.js:2], [os:subscriptionCancelModal/subscriptionCancelModal.js:44-46]
- `commerce/subscriptionApi.renewSubscription({ subscriptionIds, renewalStartDate, renewalEndDate, renewalTermLength, renewalTermUnit })` —
  [os:subscriptionRenewModal/subscriptionRenewModal.js:7], [os:subscriptionRenewModal/subscriptionRenewModal.js:92-102]
- `commerce/subscriptionApi.updateSavedPaymentMethod({ subscriptionRecordId, merchantAccountId, savedPaymentMethodId })` —
  [os:subscriptionPaymentMethodModal/subscriptionPaymentMethodModal.js:2], [os:subscriptionPaymentMethodModal/subscriptionPaymentMethodModal.js:28-34]
- `commerce/subscriptionApi.getARCToastMsg(exception, fallbackLabel)` — shared error-message
  normalizer for **A**mend/**R**enew/**C**ancel actions, used identically by all three modals —
  [os:subscriptionAmendModal/subscriptionAmendModal.js:8], [os:subscriptionAmendModal/subscriptionAmendModal.js:177], [os:subscriptionCancelModal/subscriptionCancelModal.js:2], [os:subscriptionCancelModal/subscriptionCancelModal.js:54],
  [os:subscriptionRenewModal/subscriptionRenewModal.js:7], [os:subscriptionRenewModal/subscriptionRenewModal.js:111]
- `commerce/subscriptionApi.ChildSubscriptionsAdapter` (`@wire`, params `subscriptionId`/
  `effectiveAccountId`) — [os:subscriptionCardBuilder/subscriptionCardBuilder.js:10], [os:subscriptionCardBuilder/subscriptionCardBuilder.js:101-104]

**`commerce/actionApi` is not used anywhere in the order, quote, or subscription families** in this
scope — confirmed by filtering `census.json` for `family in {order,quote,subscription}` and
`commerce/actionApi` in imports: zero matches. This closes `findings-api-census.md` open question 2
for these three families: the "enumerate actions dispatched through `commerce/actionApi`" task does
not apply here — that module is used by other families (cart/checkout/product/search), not this
one. `commerce/dataEventApi` is the only cross-cutting "fire and forget" API touched, and only by
`orderQuickOrder`/`orderQuickOrderItem`.

**Wire adapters observed:** `SessionContextAdapter`, `AppContextAdapter` (both `commerce/contextApi`),
`NavigationContext`/`CurrentPageReference` (`lightning/navigation`), `getI18nCountries`
(`experience/internationalizationApi`, called with static params
`{ countries: stateNameRequiredForCountries, excludeCountryFilter: false }`) —
[os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:2], [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:123-126], and `ChildSubscriptionsAdapter`
(`commerce/subscriptionApi`) as above.

## Composition & structure

**Container / `*Ui` / `*Display` split is real and consistent.** The page-facing, Builder-exposed
component (has `<targets>`, expression-bound defaults, `@api` design properties) is a thin
pass-through with no business logic; it renders a single child `site-<name>-ui` or
`site-<name>-display` component that carries all formatting/derivation logic and has **no**
`<targets>` block (meta-less, per `findings-api-census.md` open question 4 — confirmed genuinely
internal for every pair read, not a missed-property artifact):
- `orderDetails` → `site-order-details-ui` — [os:orderDetails/orderDetails.html:2-9], meta-less child confirmed [os:orderDetailsUi/orderDetailsUi.js-meta.xml] (no `<targetConfigs>`/design properties beyond bare `isExposed`)
- `orderAmount` → `site-order-totals-with-fields` (via `orderAmountUi`) — [os:orderAmountUi/orderAmountUi.html:4-14]
- `orderDeliveryGroup` → `site-order-delivery-group-ui` — [os:orderDeliveryGroup/orderDeliveryGroup.html:2-16]
- `orderDeliveryGroupContainer` (itself meta-less, no `<targets>` — [os:orderDeliveryGroupContainer/orderDeliveryGroupContainer.js-meta.xml:1-4]) → `site-order-delivery-group-display`

The pass-through layer's only job is to reshape `@api` inputs (parse JSON strings, compute CSS
custom-property strings, decide an error/loading branch) before handing off — e.g.
`orderDetails._orderSummaryFields` parses `orderSummaryHighlightsFieldMapping` JSON or falls back
to `getDefaultFields()` [os:orderDetails/orderDetails.js:20-22]; `orderAmountUi.filteredOrderDiscounts`
filters `orderDiscounts` down to `lineItemType === 'Order Product' || 'Product'` before passing to
the display child [os:orderAmountUi/orderAmountUi.js:51-56].

**Manual memoization in setter/getter pairs** is used where a `*Ui` child does expensive
reshaping of a large `@api` object: `orderDeliveryGroupUi` sets `_recomputeDeliveryGroup = true` in
the `orderDeliveryGroup` setter [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:33-36] and in the
`shippingFieldMapping` setter [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:40-44] — but **not**
in the `isFirstDeliveryGroup` setter, which only assigns `_isFirstDeliveryGroup`/`_isExpanded` and
never touches the recompute flag [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:48-52]. The
`formattedOrderDeliveryGroup` getter only re-runs `processODGData(...)` when that flag is set, then
clears it — [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:56-62]. This is a real
correctness need in LWC: template getters can be invoked more than once per render pass, so an
un-memoized expensive transform in a getter re-runs redundantly.

**`subscriptionStatus` is a shared status-banner leaf, reused by markup composition, not JS
import.** It is a plain presentational component (icon + main text + support text, no internal
state) placed via the `<site-subscription-status>` tag by three different bundles: twice by
`subscriptionAmendModal` — a negative-amendment warning banner
[os:subscriptionAmendModal/subscriptionAmendModal.html:90-94] and a general amend warning banner
[os:subscriptionAmendModal/subscriptionAmendModal.html:126-130] — once by `subscriptionCancelModal`
as a cancel-confirmation warning banner
[os:subscriptionCancelModal/subscriptionCancelModal.html:10-13], and twice by `subscriptionCardV2` —
a card-level lifecycle-status banner
[os:subscriptionCardV2/subscriptionCardV2.html:9-12] and a child-subscription status row
[os:subscriptionCardV2/subscriptionCardV2.html:75-80]. Like `site-cart-items-ui` (below), this is
tag-level markup composition rather than a JS `import`, so it does not surface in the census's
import-based reuse graph even though it is the single most-reused leaf component in this scope by
call-site count (five).

**Cross-family reuse of `site-cart-items-ui`.** Both `orderConfirmationItems` and
`quoteConfirmationItems` render the cart family's `site-cart-items-ui` component to list line items,
each supplying its own `itemsData` shaped by a local mapper util
(`itemMapperUtil.transformDeliveryToCartItems` for order,
`itemMapperUtil.transformQuoteToCartItems` for quote) that converts order/quote line-item shapes
into the cart-item shape `site-cart-items-ui` expects —
[os:orderConfirmationItems/orderConfirmationItems.html:17-33], [os:quoteConfirmationItems/quoteConfirmationItems.html:26-52].
This is the single strongest reuse signal in this scope: neither order nor quote confirmation
re-implements line-item rendering.

**Subscription: two cards, two purposes, one canonical.** `subscriptionCardV2` is rendered
exclusively by `subscriptionCardBuilder` [os:subscriptionCardBuilder/subscriptionCardBuilder.html:2-36],
which is the only subscription-card bundle with an expression-bound `{!Subscription}` default and
`<targets>` — i.e. **it is the only one placeable from Experience Builder as "the" subscription
card.** `subscriptionCard` (V1) is rendered exclusively by `subscriptionCardList`
[os:subscriptionCardList/subscriptionCardList.html:19-25], which in turn is rendered exclusively by
`paymentSavedMethodsActionModal` [os:paymentSavedMethodsActionModal/paymentSavedMethodsActionModal.html:9]
to show a **read-only** list of subscriptions affected when a buyer removes/unshares a saved
payment method. Repo-wide `<site-subscription-card` / `<site-subscription-card-v2` tag greps confirm
these are the only two consumers of each, respectively (see Anomalies for why V2 exists).

**Modal composition uses `lightning/modal`'s imperative `.open()`,** never a declaratively-nested
modal component, across every quote and subscription modal read
(`quoteTocartModal`, `quoteCartModalUi`, `reorderModal`, `subscriptionAmendModal`,
`subscriptionCancelModal`, `subscriptionRenewModal`, `subscriptionPaymentMethodModal`). Callers pass
initial state as plain config keys and, where the modal needs to signal something back to the
opener beyond its close value, an `on<event>` key in the same config object (see Events below).

**Cross-bundle module reuse (LWC importing named exports from a sibling bundle's JS, not just its
markup tag).** `subscriptionCancelModal` and `subscriptionRenewModal` both import `formatDate` from
`site/subscriptionAmendModal` — [os:subscriptionCancelModal/subscriptionCancelModal.js:6],
[os:subscriptionRenewModal/subscriptionRenewModal.js:10] — and `subscriptionDetailsCard` imports
`formatDate`, `SUBSCRIPTION_CANCEL_OPERATION_STATUSES`, and `getSubscriptionFrequencyLabel` from
`site/subscriptionCardV2` — [os:subscriptionDetailsCard/subscriptionDetailsCard.js:4]. This is a
real pattern (not a mistake): a bundle re-exports its internal date/status utilities so sibling
bundles can share formatting logic without a separate shared module, at the cost of a hidden
coupling that the census's per-bundle import view does not surface as "reuse" (it just looks like
one more `site/*` import).

## Events & communication

**Custom event naming is flat, lower-case, no dashes**, dispatched with `bubbles: true, composed: true`
from light-DOM leaf components: `cancel`, `navigatetoproduct`, `addorupdatesavedpaymentmethod` from
`subscriptionCard`/`subscriptionCardV2` [os:subscriptionCard/subscriptionCard.js:279-284], [os:subscriptionCard/subscriptionCard.js:285-291], [os:subscriptionCard/subscriptionCard.js:292-313],
plus `renew`, `amend`, `viewhistory` added only in V2
[os:subscriptionCardV2/subscriptionCardV2.js:342-347], [os:subscriptionCardV2/subscriptionCardV2.js:348-354], [os:subscriptionCardV2/subscriptionCardV2.js:491-497]. The parent
(`subscriptionCardBuilder`) listens with matching `on<name>` attributes and opens the corresponding
modal imperatively — [os:subscriptionCardBuilder/subscriptionCardBuilder.html:31-36].

**`@api`-decorated *methods* (not just properties) are a real, deliberate part of the public
contract.** `subscriptionCardV2` exposes `handleAmendClick()`, `handleCancelClick()`, and
`handleViewHistoryClick()` as `@api` methods in addition to dispatching the `amend`/`cancel`/
`viewhistory` events from its own template buttons —
[os:subscriptionCardV2/subscriptionCardV2.js:338-354], [os:subscriptionCardV2/subscriptionCardV2.js:484-497]. This resolves a census parsing
anomaly: the regex-based `apiProps` extractor in `census.mjs` matched `@api\n  handleAmendClick() {`
the same way it matches `@api\n  someProperty;`, so `handleAmendClick`/`handleCancelClick`/
`handleViewHistoryClick` appear in `census.json`'s `apiProps` list for `subscriptionCardV2` even
though they are methods, not data properties invocable via attribute binding. A parent holding a
reference to the card (e.g. via `template.querySelector`) can trigger these actions imperatively
instead of only via the card's own buttons.

**`LightningModal.open()` accepts `on<eventname>` config keys as event listeners**, not just plain
public-property assignments. `reorderButton.handleReorder()` passes `onviewcart: () => this.handleViewCart()`
in the same config object as `orderSummaryIdOrRefNumber`/`accessToken`/`cartUrl`
[os:reorderButton/reorderButton.js:49-58]; the modal itself dispatches `new CustomEvent('viewcart')`
from `handleViewCart()` before closing [os:reorderModal/reorderModal.js:59-63]. This is the
supported LightningModal pattern for a modal-to-opener callback that isn't just the `.close()`
resolve value.

**List-driven "status" `CustomEvent`s bubble up from Experience-Builder data-provider components
that are not part of this repo.** `orderList`/`quoteList` do not fetch data themselves; they listen
for `orderliststatus`/`quoteliststatus`, `filterbydate`, `loadingorders`/`loadingquotes`, and
`initfilter` events bubbling from child `commerce_data_provider-order-list-data-provider` /
`commerce_data_provider-quote-summary-list-data-provider` elements reached via `querySelector`
(these DXP data-provider components ship from the platform, not this repo) —
[os:orderList/orderList.js:43-96], [os:quoteList/quoteList.js:42-53], [os:quoteList/quoteList.js:69-89]. On a date-filter change
both re-dispatch synthetic `nextpage`/`previouspage` `CustomEvent`s at the nested
`dxp_content_layout-list` element to force the data provider to refetch — the same
`DXP_EVENT_NAME_NEXT_PAGE`/`DXP_EVENT_NAME_PREVIOUS_PAGE` static constants and dispatch shape appear
in both files. `orderList` additionally replays a buffered `initfilter` event on `renderedCallback`
if one arrived before the component was ready [os:orderList/orderList.js:55-60]; `quoteList` has no
equivalent replay (see Anomalies).

**Bundle-detail requests diverge between the two confirmation-item siblings.**
`orderConfirmationItems.handleSeeConfiguration` opens `site/productBundleDetailsModal` imperatively
via `ProductBundleDetailsModal.open({...})` [os:orderConfirmationItems/orderConfirmationItems.js:152-159].
`quoteConfirmationItems.handleSeeConfiguration` instead dispatches a `showbundledetails`
`CustomEvent` with the same payload shape (`headerTitle`, `currencyIsoCode`, `orderItem`, `label`,
`productUnavailableMessage`) and lets an ancestor open the modal
[os:quoteConfirmationItems/quoteConfirmationItems.js:168-194]. Same feature, two different modal-
invocation patterns — see Anomalies.

**Guest/logged-in destination is decided in the component, not the URL.**
`orderConfirmationMessageError.handleOnClick` branches on `SessionContextAdapter`'s
`isLoggedIn` to navigate to the standard `OrderSummary` list page for authenticated users or a
`comm__namedPage` "Order_Lookup" page (carrying the order number pulled from
`CurrentPageReference.state.orderNumber`) for guests
[os:orderConfirmationMessageError/orderConfirmationMessageError.js:22-48].

## Errors, loading, and processing state

**Error-code-to-label mapping via constant maps, with a fallback message**, is the dominant error
pattern for quote-to-cart operations. `quoteTocartModal`/`quoteCartModalUi.getQuoteToCartErrorMessage`
switches on `error.code` (`CART_ALREADY_CONTAINS_QUOTE_ITEMS`, `SUBSCRIPTION_PRODUCTS_NOT_SUPPORTED`,
`SUBSCRIPTION_PRODUCT_CHECK_FAILED`, `DUPLICATE_PRODUCT_IN_CART`, `CART_CREATION_FAILED`,
`QUOTE_CONTAINS_INVALID_PRODUCTS`) and, failing a code match, tests `error.message` against a literal
`'Out of stock.'` string and a regex `NOT_ENOUGH_STOCK_API_MESSAGE_PATTERN` before falling back to a
mode-dependent default label — [os:quoteTocartModal/quoteTocartModal.js:14-21], [os:quoteTocartModal/quoteTocartModal.js:50-75]. The catch
block additionally normalizes a possibly-string, possibly-object `error.error` payload by attempting
`JSON.parse` before extracting `errors[0]` — [os:quoteTocartModal/quoteTocartModal.js:111-124].

**Subscription lifecycle actions use a single shared normalizer** — `getARCToastMsg(exception,
fallbackLabel)` — called identically from `subscriptionAmendModal`, `subscriptionCancelModal`, and
`subscriptionRenewModal`'s catch blocks, all showing the result via the same `site/commonToast`
`Toast.show({ label, variant: 'error' }, this)` call — [os:subscriptionAmendModal/subscriptionAmendModal.js:175-182],
[os:subscriptionCancelModal/subscriptionCancelModal.js:52-59], [os:subscriptionRenewModal/subscriptionRenewModal.js:109-116].

**Reorder error classification is by `error.errors[0]?.type`, with a shape-tolerant read.**
`reorderModal.connectedCallback`'s failure handler reads
`Array.isArray(error.errors) ? error.errors[0]?.type : error.errors?.type` before storing
`_errorCode`, tolerating both an array and a single-object error shape from `startReOrder`
[os:reorderModal/reorderModal.js:53-57]. The child `reorderModalContents` then branches its heading
copy on a specific known code (`DYNAMIC_BUNDLE_REORDER_ACTION_NOT_ALLOWED`) before falling back to a
generic error heading [os:reorderModalContents/reorderModalContents.js:30-38].

**Loading state hides the body and disables the footer**, consistently, across every modal read:
each exposes `_isLoading`/`loading` and an `_isNotLoading` (or `loading`) getter that the template
uses to swap a `lightning-spinner` in for the body and to `disabled`-gate the footer's primary
button — [os:quoteTocartModal/quoteTocartModal.js:37-40] + [os:quoteTocartModal/quoteTocartModal.html:4-25],
[os:reorderModal/reorderModal.html:12] (footer hidden entirely via `if:false={_isLoading}` rather
than just disabled), [os:subscriptionAmendModal/subscriptionAmendModal.html:5], [os:subscriptionAmendModal/subscriptionAmendModal.html:133-141].

**Pagination "show more" is a client-side slice, not a new server fetch.** Both
`orderConfirmationItems` and `quoteConfirmationItems` keep the full `items` array in memory and
expose only `items.slice(0, _itemsToLoadCount)`; `handleShowMore` just grows `_itemsToLoadCount` by
`pageSize` (capped at the total length) — [os:orderConfirmationItems/orderConfirmationItems.js:135-138],
[os:quoteConfirmationItems/quoteConfirmationItems.js:141-144].

## Guards

**`{!Order.Details}`-bound data is guarded against `null`, not `undefined`.** Both `orderDetailsUi`
and `orderAmountUi` compute `_hasError` as `this.orderSummaryDetails === null` (strict equality, no
`??`/`?.`) — [os:orderDetailsUi/orderDetailsUi.js:22-27], [os:orderAmountUi/orderAmountUi.js:34-39].
This means the initial/undefined render frame (before the data provider resolves) is **not** treated
as an error and falls through to the "display" branch with `undefined` inputs; only an explicit
`null` from the data provider trips the error branch. `orderConfirmationTotalsSummary` instead uses a
truthy check, `!!this.summary` [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:146-148],
which does treat `undefined` the same as absent — an inconsistency between siblings worth flagging
(see review rules).

**`experience/clientApi.isDesignMode`/`isPreviewMode`** gate Experience-Builder-only behavior.
`quoteAcceptandbuyButton.shouldShowButton`/`isDisabled` both short-circuit to "always show, always
enabled" when `isDesignMode` is true, bypassing the real `quoteStatus`/`hasLineItems` checks so the
button is visible/clickable in the Builder canvas regardless of live data
[os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:69-84]. `orderList`/`quoteList` use
`isPreviewMode` to force `showEmptyState` true and suppress `hasError`/`showSpinner` in preview
[os:orderList/orderList.js:2], [os:orderList/orderList.js:25-38], [os:quoteList/quoteList.js:2], [os:quoteList/quoteList.js:24-38].

**Guest vs. authenticated is read from `SessionContextAdapter.isLoggedIn`**, not from a page
parameter or URL check — [os:orderConfirmationMessageError/orderConfirmationMessageError.js:4], [os:orderConfirmationMessageError/orderConfirmationMessageError.js:22-27], [os:orderConfirmationMessageError/orderConfirmationMessageError.js:66-70]
(also gates the accept-and-buy login redirect in `quoteAcceptandbuyButton`
[os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:2], [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:18], [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:66-68], [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:105-107]).

**No `window`/`document` guards were found** in any file read in this scope — none of the order,
quote, or subscription components access `window` or `document` directly; all environment-dependent
values (base path, locale, currency, timezone, form factor) come through `@salesforce/*` static
imports or `experience/*`/`commerce/*` modules, which is presumably why no guard is needed. This
should be treated as scope-limited evidence, not a repo-wide claim.

**SSR hydration capability is opted into per-bundle, and only on the confirmation-page family** —
`<capability>lightning__ServerRenderableWithHydration</capability>` appears in
`orderConfirmationDeliverygroup`, `orderConfirmationDetailsBilling`, `orderConfirmationFieldtable`,
`orderConfirmationLayoutContent`, `orderConfirmationMessageError`, `orderConfirmationTotalsSummary`,
`orderDiscounts`, `orderPromotions`, `orderSummaryMessageError`, `quoteConfirmationErrorMessage`,
`quoteConfirmationItems`, `quoteConfirmationLayoutContent`, `quoteSummaryErrorMessage`
[os:orderConfirmationMessageError/orderConfirmationMessageError.js-meta.xml:8-10],
[os:quoteConfirmationItems/quoteConfirmationItems.js-meta.xml:7-9] — but **not**
`orderConfirmationItems` (its own `.js-meta.xml`, read in full, has no `<capabilities>` block at
all) even though it is the direct structural analog of `quoteConfirmationItems`, which does declare
it. Order-history/My-Account components (`orderDetails`, `orderAmount`, `orderDeliveryGroup`) also
carry no SSR capability — SSR hydration in this scope is confirmation-page-specific, and even there
it is inconsistently applied (see Anomalies).

## Labels & i18n

**Every labeled bundle re-exports its `@salesforce/label/site.<bundle>.<key>` imports through a
local `labels.js` barrel** rather than importing labels directly in the component —
[os:orderDetails/labels.js:1-5] is representative: four `@salesforce/label/*` imports, re-exported
as named bindings the component then imports from `./labels`. This is uniform across every labeled
bundle read.

**Placeholder interpolation is manual `String.replace`, not a templating helper**, and both `{0}`
and named-token forms appear:
- Positional numeric — `reorderModalContents`'s `generateModalSubheading` chains
  `.replace('{0}', ...)`/`.replace('{1}', ...)` for the two-count "N added, M unavailable" message,
  branching over four count combinations before falling back to a "0 succeeded" label —
  [os:reorderModalContents/textGenerator.js:1-17]
- Named token — `subscriptionCancelModal.cancelConfirmationOnNextBillingDateMsg` replaces
  `{nextBillingDate}` — [os:subscriptionCancelModal/subscriptionCancelModal.js:34-37];
  `subscriptionCardV2.formatBannerText` replaces both `{0}` (quantity change) and `{1}` (effective
  date) via a global regex `/\{0}/g` / `/\{1}/g` — [os:subscriptionCardV2/subscriptionCardV2.js:118-125]

**Currency/date/locale formatting uses platform `Intl`/`@salesforce/i18n/*`, never a hand-rolled
formatter.** `subscriptionCard`'s `dateUtil.formatDate(locale, timeZone, date)` wraps
`Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone })`
[os:subscriptionCard/dateUtil.js:4-11]; currency codes fall back to `@salesforce/i18n/currency`'s
static import when the data payload doesn't carry one, e.g.
`orderConfirmationItems._currencyIsoCode = this.currencyIsoCode || currency`
[os:orderConfirmationItems/orderConfirmationItems.js:2], [os:orderConfirmationItems/orderConfirmationItems.js:64-66] (identically in
`quoteConfirmationItems`, [os:quoteConfirmationItems/quoteConfirmationItems.js:2], [os:quoteConfirmationItems/quoteConfirmationItems.js:74-76]).
`subscriptionCard`/`subscriptionCardV2` differ on which locale-timezone source they use for dates:
V1 passes both `LOCALE` (`@salesforce/i18n/locale`) and `timeZone`
(`@salesforce/i18n/timeZone`) into `formatDate` [os:subscriptionCard/subscriptionCard.js:6-7], [os:subscriptionCard/subscriptionCard.js:146-159];
V2's `formatDate` (re-exported from a different local `dateUtil.js`) is called with only `LOCALE`,
no explicit timezone argument [os:subscriptionCardV2/subscriptionCardV2.js:8], [os:subscriptionCardV2/subscriptionCardV2.js:235-249] — a real
signature/behavior divergence between the two card versions (see Anomalies).

## Accessibility

**`lightning-icon`/`svg` decorative images consistently carry `alternative-text=""` or
`aria-hidden="true"`** when purely illustrative — the reorder-modal-contents empty-state icon uses
`alternative-text=""` on its spinner and result icon
[os:reorderModalContents/reorderModalContents.html:5], [os:reorderModalContents/reorderModalContents.html:13-17]; `orderList`/`quoteList`'s warning icon
uses `aria-hidden="true"` [os:quoteList/quoteList.html:105-109 pattern mirrored in orderList].

**Toggle buttons expose `aria-expanded`.** The child-subscriptions disclosure button in both
`subscriptionCard` and `subscriptionCardV2` sets `aria-expanded={_isChildSubscriptionsExpanded}` on
the toggle `<button>` — [os:subscriptionCard/subscriptionCard.html:171-186] (identical pattern in
`subscriptionCardV2`).

**Button `aria-label` mirrors visible label text** in `subscriptionAmendModal`'s footer buttons
(`aria-label={_labels.amendCloseButtonLabel}` / `aria-label={_amendButtonLabel}`) even though the
button's own text content already renders the same label
[os:subscriptionAmendModal/subscriptionAmendModal.html:148-164] — redundant but harmless, and
consistent within the file.

**No focus-management (`.focus()`, focus trap) code was found** in any modal file read in this
scope; `lightning-modal-header`/`-body`/`-footer` presumably inherit focus handling from the base
`lightning/modal` component. This should be read as "not implemented at the custom-component level
in this scope," not "absent from the platform."

## Styling

**`experience/styling.generateStyleProperties([{name, value}, ...])` is the standard way to turn
Builder color/size properties into a CSS custom-property string** applied via `style={...}` on a
wrapper element — used identically in `orderConfirmationTotalsSummary`
[os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:6], [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:95-141],
`orderConfirmationItems`/`quoteConfirmationItems` (`--com-c-cart-item-*` custom properties)
[os:orderConfirmationItems/orderConfirmationItems.js:4], [os:orderConfirmationItems/orderConfirmationItems.js:90-114],
[os:quoteConfirmationItems/quoteConfirmationItems.js:4], [os:quoteConfirmationItems/quoteConfirmationItems.js:116-140], and `subscriptionCardBuilder`
(`--com-c-subscription-card-*` properties, plus `generateTextDecorationStyle` for the price
emphasis) [os:subscriptionCardBuilder/subscriptionCardBuilder.js:2], [os:subscriptionCardBuilder/subscriptionCardBuilder.js:155-186]. `orderDetails`/
`orderAmount`'s `*Ui` children instead hand-build a template-literal CSS custom-property block
directly (not through `generateStyleProperties`) — [os:orderDetailsUi/orderDetailsUi.js:31-38],
[os:orderAmountUi/orderAmountUi.js:43-50] — a second, inconsistent way to reach the same "Builder
color prop → CSS var" result (see review rules).

**`experience/styling.generateTextFontSize`/`generateButtonVariantClass`/`generateButtonSizeClass`/
`generateButtonStretchClass`** map Builder datasource string values (e.g. `variant="primary"`,
`size="standard"`, `width="stretch"`) to SLDS utility classes rather than the component hand-rolling
a switch statement — [os:reorderButton/reorderButton.js:2], [os:reorderButton/reorderButton.js:60-64].

## Candidate generation rules

1. When a component's default value is bound to a page data provider expression (`{!Order.*}`,
   `{!QuoteDetail.*}`, `{!Subscription}`, etc.), guard the "no data yet" render path with a
   **truthiness** check (`!!value`) rather than `value === null`, unless the data provider is known
   to only ever emit `null` (never `undefined`) on first render — `orderConfirmationTotalsSummary`
   does this correctly [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:146-148];
   `orderDetailsUi`/`orderAmountUi` do not [os:orderDetailsUi/orderDetailsUi.js:22-27].
2. Route Builder color/size/border properties through `experience/styling.generateStyleProperties`
   to build the `style` attribute string, not a hand-written template literal — it is the majority
   pattern in this scope [os:orderConfirmationTotalsSummary/orderConfirmationTotalsSummary.js:95-141]
   and keeps the CSS-custom-property naming convention (`--com-c-<component>-<property>`) consistent.
3. When a page-level component is a thin Builder-facing wrapper around a heavier `*Ui`/`*Display`
   child, give the child bundle **no `<targets>` block** in its `.js-meta.xml`
   [os:orderDeliveryGroupContainer/orderDeliveryGroupContainer.js-meta.xml:1-4] so it cannot be
   placed directly from Experience Builder — targets belong on the outer wrapper only.
4. For a `*Ui`/`*Display` child that receives a large object via an `@api` setter and derives an
   expensive transform from it in a getter, cache the transform behind a dirty flag set in the
   setter and cleared in the getter (`_recompute*`), rather than recomputing on every getter
   invocation — [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:33-46], [os:orderDeliveryGroupUi/orderDeliveryGroupUi.js:56-62].
5. When a confirmation/summary surface needs to render a product line-item list, reuse
   `site-cart-items-ui` with a small local item-shape mapper rather than re-implementing item
   rendering — both `orderConfirmationItems` and `quoteConfirmationItems` do this
   [os:orderConfirmationItems/orderConfirmationItems.html:17-33],
   [os:quoteConfirmationItems/quoteConfirmationItems.html:26-52].
6. For quote/subscription-to-cart or lifecycle-mutation modals opened via `lightning/modal`, pass a
   completion callback to the opener as an `on<eventname>` key in the same config object passed to
   `.open()`, and have the modal dispatch a matching `CustomEvent` before calling `.close()` — do
   not invent a separate promise-chaining mechanism —
   [os:reorderButton/reorderButton.js:49-58], [os:reorderModal/reorderModal.js:59-63].
7. Normalize action-mutation errors (amend/renew/cancel-style operations) through one shared
   `getARCToastMsg(exception, fallbackLabel)`-style helper and one shared toast call, rather than
   duplicating error-shape parsing per modal — the three subscription lifecycle modals in this scope
   all do this identically [os:subscriptionAmendModal/subscriptionAmendModal.js:175-182],
   [os:subscriptionCancelModal/subscriptionCancelModal.js:52-59],
   [os:subscriptionRenewModal/subscriptionRenewModal.js:109-116].
8. Format dates for display with `Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone })`
   fed by `@salesforce/i18n/locale` and `@salesforce/i18n/timeZone`, not a hand-rolled date
   formatter — [os:subscriptionCard/dateUtil.js:4-11].
9. When exposing an imperative action from a card/list-item component to a parent that holds a
   reference to it (e.g. an overflow "more actions" menu), declare it as an `@api`-decorated method
   in addition to (or instead of) a click handler wired only inside the component's own template —
   `subscriptionCardV2.handleAmendClick/handleCancelClick/handleViewHistoryClick`
   [os:subscriptionCardV2/subscriptionCardV2.js:338-354], [os:subscriptionCardV2/subscriptionCardV2.js:484-497].
10. Give a list-empty/error/loading component (`orderList`/`quoteList` style) an
    `experience/clientApi.isPreviewMode` branch that forces the empty state and suppresses the error
    and spinner in Experience Builder preview, so the canvas never shows a spinner or a live-data
    error while designing — [os:orderList/orderList.js:25-38], [os:quoteList/quoteList.js:24-38].
11. For a small, stateless icon+text "status banner" row needed by several unrelated modals/cards,
    factor it into its own presentational leaf bundle (props in, markup out, no wire/business logic)
    and reuse it by markup composition (`<site-<name>>` tag) across every caller instead of
    duplicating the icon/text markup — `subscriptionStatus` is reused this way by
    `subscriptionAmendModal`, `subscriptionCancelModal`, and `subscriptionCardV2`
    [os:subscriptionAmendModal/subscriptionAmendModal.html:90-94],
    [os:subscriptionCancelModal/subscriptionCancelModal.html:10-13],
    [os:subscriptionCardV2/subscriptionCardV2.html:9-12]. Remember this composition is tag-based, not
    a JS import, so an import-based reuse audit (like the census) will miss it.

## Candidate review rules / anti-patterns

1. **Inconsistent null-vs-undefined error guards on the same data shape.** Flag any `*Ui`/`*Display`
   component whose `_hasError`-style getter checks `value === null` instead of `!value`/`!!value`
   when the corresponding page property is expression-bound (`default="{!...}"`) — the pre-resolve
   render frame is typically `undefined`, not `null`, and a strict-`null` check silently renders the
   "success" branch with missing data on first paint —
   [os:orderDetailsUi/orderDetailsUi.js:22-27], [os:orderAmountUi/orderAmountUi.js:34-39].
2. **Per-feature copy-duplication instead of a shared, parameterized modal.** `quoteTocartModal` and
   `quoteCartModalUi` are line-for-line identical JS and HTML (same constants, same
   `getQuoteToCartErrorMessage` branches, same regex, same `createCartFromQuote`/`refreshQuoteDetail`
   calls) [os:quoteTocartModal/quoteTocartModal.js:1-129] vs
   [os:quoteCartModalUi/quoteCartModalUi.js:1-129] — but this is not unexplained duplication: each
   copy has exactly one dedicated consumer. `quoteAcceptandbuyButton` imports `quoteTocartModal`
   [os:quoteAcceptandbuyButton/quoteAcceptandbuyButton.js:4]; `quoteDuplicateToCartButton` imports
   `quoteCartModalUi` [os:quoteDuplicateToCartButton/quoteDuplicateToCartButton.js:4] — one modal
   *per feature* (accept-and-buy vs duplicate-to-cart) rather than one modal shared by both callers.
   The `.js-meta.xml` files diverge accordingly, and by more than just `isExposed`: `quoteTocartModal`
   only sets `isExposed` (`true`) [os:quoteTocartModal/quoteTocartModal.js-meta.xml:1-5], while
   `quoteCartModalUi` sets `isExposed` to `false` and additionally carries a feature-specific
   `masterLabel` (`Quote Cart Modal`) and `description`
   [os:quoteCartModalUi/quoteCartModalUi.js-meta.xml:1-7]. Flag this pattern for what it actually is
   — a per-feature copy of a modal instead of a single shared modal parameterized per caller (e.g. by
   label-key namespace or an `@api` mode property) — not as unexplained line-for-line duplication;
   the fix a reviewer should propose is consolidating to one parameterized modal, not just noting
   that the duplication exists.
3. **Same feature, two different "open a detail modal" mechanisms on sibling components.**
   `orderConfirmationItems.handleSeeConfiguration` calls `ProductBundleDetailsModal.open(...)`
   directly; `quoteConfirmationItems.handleSeeConfiguration` dispatches a `showbundledetails`
   `CustomEvent` for an ancestor to handle — [os:orderConfirmationItems/orderConfirmationItems.js:152-159]
   vs [os:quoteConfirmationItems/quoteConfirmationItems.js:168-194]. Pick one mechanism per feature
   across sibling families; flag the divergence when reviewing either in isolation.
4. **SSR hydration capability applied inconsistently between structural siblings.**
   `quoteConfirmationItems` declares `lightning__ServerRenderableWithHydration`; its direct order-
   family analog `orderConfirmationItems` does not
   [os:quoteConfirmationItems/quoteConfirmationItems.js-meta.xml:7-9] vs
   [os:orderConfirmationItems/orderConfirmationItems.js-meta.xml:1-9]. When reviewing a new
   confirmation-page component, check whether its sibling in the other family already declares this
   capability and flag a mismatch rather than assuming it doesn't matter.
5. **List-filter replay implemented in one sibling but not the other.** `orderList.renderedCallback`
   replays a buffered `initfilter` event if the filter arrived before the DXP data-provider child
   was ready to receive it; `quoteList` has no equivalent `renderedCallback`
   [os:orderList/orderList.js:55-60] vs [os:quoteList/quoteList.js] (no `renderedCallback` present).
   If the underlying race condition is real for orders, it is very likely also real for quotes;
   flag the missing replay as a probable latent bug in `quoteList`, not an intentional omission.
6. **`formatDate` signature drift between `subscriptionCard` and `subscriptionCardV2`.** V1's
   `dateUtil.formatDate(locale, timeZone, date)` takes three arguments; V2's `dateUtil.formatDate`
   (a separate file, same export name) is called with only `(LOCALE, date)` throughout
   [os:subscriptionCard/subscriptionCard.js:147], [os:subscriptionCard/subscriptionCard.js:153], [os:subscriptionCard/subscriptionCard.js:159] vs
   [os:subscriptionCardV2/subscriptionCardV2.js:236], [os:subscriptionCardV2/subscriptionCardV2.js:242], [os:subscriptionCardV2/subscriptionCardV2.js:248]. Because `subscriptionCancelModal`/
   `subscriptionRenewModal` import `formatDate` from `site/subscriptionAmendModal` (a third copy)
   while `subscriptionDetailsCard` imports it from `site/subscriptionCardV2`, a reviewer must check
   *which* `formatDate` a new caller is importing before assuming timezone handling is included —
   silently dropping the `timeZone` argument when switching between these two `formatDate`
   implementations is an easy latent bug.
7. **`@api`-decorated methods hiding in a component's public property list.** When auditing a
   bundle's `@api` surface, distinguish `@api` properties (data contract, bindable from a parent
   template attribute) from `@api` methods (imperative contract, callable only via a component
   reference) — conflating them (as a naive census/regex-based `@api` inventory does for
   `subscriptionCardV2`) misrepresents the component's actual template-bindable property count
   [os:subscriptionCardV2/subscriptionCardV2.js:338-354], [os:subscriptionCardV2/subscriptionCardV2.js:484-497].
8. **`{!DeliveryGroup.*}` vs `{!Order.*}` vs `{!OrderDeliveryGroup}` are three distinct expression
   roots that look related but are not interchangeable.** A reviewer should not assume a component
   bound to `{!Order.DeliveryGroups}` (the whole collection, on `orderProducts`) can be swapped for
   one bound to `{!OrderDeliveryGroup}` (a single group, on `orderDeliveryGroup`) or
   `{!DeliveryGroup.lineItems}` (a single group's items, on `orderConfirmationItems`) — verify the
   exact root and path before reusing a data-binding pattern across these three components
   [os:orderProducts/orderProducts.js-meta.xml:16], [os:orderDeliveryGroup/orderDeliveryGroup.js-meta.xml:16],
   [os:orderConfirmationItems/orderConfirmationItems.js-meta.xml:16].

## Anomalies & divergences

- **census open question 1 (Apex imports)** — closed for this scope: every order/quote/subscription
  file opened imports only `lwc`/`lightning/*`/`@salesforce/*`/`commerce/*`/`experience/*`/relative
  modules; no direct or indirect Apex path found.
- **census open question 2 (`commerce/actionApi` action enumeration)** — does not apply to this
  scope: filtering `census.json` for `family in {order,quote,subscription}` and
  `commerce/actionApi` in imports returns zero bundles. That module is used elsewhere.
- **census open question 4 (meta-less bundles)** — confirmed genuinely internal for every meta-less
  bundle read in this scope (`orderDetailsUi`, `orderAmountUi`, `orderDeliveryGroupContainer`,
  `orderDeliveryGroupUi`): each is a `*Ui`/`*Display`/`*Container` child rendered only by its
  Builder-facing sibling, never independently placeable, and the missing `<targets>` block is
  intentional, not a regex miss.
- **census open question 5 (zero test coverage)** — upheld: no `__tests__` directory or `*.test.js`
  file exists under any bundle read in this scope.
- **`subscriptionCard` (V1) vs `subscriptionCardV2` — why both exist.** V2 is a strict superset:
  in-progress/success/failed status **banners** for amend/cancel/renew operations
  (`amendmentStatusConfig.js`, `renewalStatusConfig.js`, extending V1's `cancelStatusConfig.js`) via
  `updateSubscriptionStatus()` [os:subscriptionCardV2/subscriptionCardV2.js:126-180] — rendered
  through the same shared `site-subscription-status` leaf used by the amend/cancel modals (see
  Composition & structure), at the card-level banner slot
  [os:subscriptionCardV2/subscriptionCardV2.html:9-12]; a **renew**
  section and button gated by `isInLastTerm()`/`getBillingUnitDays()` (30/365-day windows before
  `endDate`) that V1 has no equivalent of [os:subscriptionCardV2/subscriptionCardV2.js:317-336], [os:subscriptionCardV2/subscriptionCardV2.js:377-397];
  and `@api`-method actions (`handleAmendClick`/`handleCancelClick`/`handleViewHistoryClick`) for a
  parent-driven "more actions" affordance. V1 (`subscriptionCard`) is **not dead code** — it is the
  intentionally lighter, display-only, non-mutating card reused specifically inside
  `subscriptionCardList` → `paymentSavedMethodsActionModal`'s read-only "these N subscriptions use
  this payment method" confirmation list, where no cancel/amend/renew affordance is wanted
  [os:subscriptionCardList/subscriptionCardList.html:19-25],
  [os:paymentSavedMethodsActionModal/paymentSavedMethodsActionModal.html:9]. Repo-wide tag greps for
  `<site-subscription-card` and `<site-subscription-card-v2` confirm these are each used by exactly
  one consumer, and it is a different consumer per version. Note: because this composition is
  markup-only (an HTML custom-element tag, not a JS `import`), it is invisible to the census's
  JS-import-based reuse graph — a real gap in that method for detecting cross-bundle composition.
- **`{!Order.*}` confirmed present** (contra a naive read of the open-questions list, which only
  called out `commerce/actionApi` and Apex as things to verify): 12 distinct `{!Order.*}` expression
  paths were found across 9 order-family bundles (see Data access section) — this is the literal
  focus area the brief named, and it is real and common in this family, not a false lead.
- **`orderConfirmationItems`/`quoteConfirmationItems` bundle-detail-modal divergence** — see review
  rule 3; not resolved in source, both mechanisms are live and shipped as-is.
- **SSR-hydration-capability divergence between `orderConfirmationItems` and
  `quoteConfirmationItems`** — see review rule 4; not resolved in source.
- **`orderList`/`quoteList` `initfilter`-replay divergence** — see review rule 5; likely a latent gap
  in `quoteList`, not a deliberate design choice (no comment or difference in the surrounding logic
  explains the omission).
- **`formatDate` three-copy divergence** (`subscriptionCard/dateUtil.js`,
  `subscriptionCardV2/dateUtil.js`, re-exported again from `subscriptionAmendModal.js`) — see review
  rule 6; `subscriptionCard`'s version takes `(locale, timeZone, date)`, the other two take
  `(locale, date)` with no explicit timezone argument.
