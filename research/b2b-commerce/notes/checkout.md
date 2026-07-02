# Deep-read notes: checkout

> Evidence notes for the B2B Commerce research (spec:
> docs/superpowers/specs/2026-07-02-b2b-commerce-skills-design.md). Every claim carries an
> [os:bundle/file:line] or [col:bundle/file:line] citation. os wins conflicts; divergences are
> recorded, not resolved silently.

## Bundles covered

Census slice: `family==='checkout'` returns **68 bundles, all `os` repo** (0 `col`) — confirmed by
filtering `census.json`. The `col` (commerce-on-lightning-components) repo has no checkout family at
all in this census.

**Read in full** (JS + HTML where present + `.js-meta.xml` + any co-located helper modules):
`checkoutButton` + `checkoutButtonUi`, `checkoutLayoutOnepage`, `checkoutLayoutAccordion`,
`checkoutSection`, `checkoutSectionAccordion`, `checkoutSectionOnePage`, `checkoutDeliverymethod`,
`checkoutDeliverymethodOptions`, `checkoutInputAddress`, `checkoutAddresses`, `checkoutAddressModal`
(partial — header/mode/labels), `checkoutDeliveryAddress`, `checkoutContactInfo`,
`checkoutPaymentSheet` + `checkoutPaymentSheetDeferredPromise`, `checkoutSummary`,
`checkoutErrorHandler` (+ `errorLabeler.js`, `checkoutException.js`), `checkoutNotification` (+
`utils.js`), `checkoutEkg`, `checkoutStencil`, `checkoutPlaceOrder`, `checkoutPurchaseOrder`,
`checkoutDualPayment`, `checkoutGiftOptions`, `checkoutPaymentByExpress` (+ `ExpressMode.js`),
`checkoutPaymentByExpressWrapper` (+ `labels.js`), `paymentByExpress`, `paymentProcessing`,
`legalConsentOptions`, `legalConsentBlanket`, `splitShipmentLayout`.

**Skimmed** (js-meta.xml + directory listing + grep, not full JS read): `checkoutBillingInfo`,
`checkoutGiftOptionsUi`, `checkoutPaymentSheetWithPO`, `checkoutSectionContactInformation`,
`checkoutSectionDelivery`, `checkoutSectionShipping`, `checkoutSectionPaymentDual`,
`legalTermsandconditionsModal`, `paymentAddPaymentMethods` / `paymentAddPaymentMethodsUi`,
`paymentSavedMethodsGrid` / `paymentSavedMethodsGridUi`, `paymentSavedPaymentMethodsCard`,
`paymentSavedMethodsActionModal`, `paymentSavedMethodsCardFooter`, `paymentAuthorizationError`,
`checkoutMultiCountryPhoneField`, `checkoutBillingAddressCombo`, `checkoutAddressVisualPicker`,
`checkoutShippingAddressEditButton`, `checkoutShippingInstructions`, `checkoutSubscriptionPolicyDisclaimer`,
`checkoutGiftMessage`, `checkoutGiftWrap`, `checkoutDeliverymethodGroup`, `checkoutHeading`,
`checkoutProcessingindicator`, `checkoutStencilUnified`, `checkoutInternationalization`,
`checkoutData`, `checkoutDeliveryestimates`, `checkoutNewshipmentModal`, `checkoutEmptyshipmentModal`,
`checkoutLayoutOnepageDual`, `checkoutLayoutAccordionDual`.

**Census-only** (name/import/apiProp counts from `census.json`, no file read): the remainder of the
68 — mostly thin wrapper/label bundles whose shape was already clear from the read set above
(`checkoutDualPayRow`, `checkoutSectionAccordion`'s siblings not separately listed, etc.). None of
the census-only bundles showed an anomalous flag worth chasing beyond what's covered in
**Anomalies & divergences** below.

## Data access — how this family gets data without Apex

- **Expression-bound `@api` properties are the primary data channel**, not wire adapters. Every
  checkout-engine leaf declares a `checkoutDetails` (and often `cartDetails`/`cartTotals`) `@api`
  getter/setter whose `js-meta.xml` default is a fixed builder expression the platform resolves at
  runtime: `{!Checkout.Details}` [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16],
  `{!Checkout.CartDetails}` [os:checkoutSummary/checkoutSummary.js-meta.xml:19],
  `{!Checkout.CartTotals}` [os:splitShipmentLayout/splitShipmentLayout.js-meta.xml:21],
  `{!Checkout.SessionError}` and `{!Checkout.PaymentLink}`
  [os:checkoutNotification/checkoutNotification.js-meta.xml:17-18]. The description text on these
  properties literally says "Do not change or delete"
  [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16]. The setter always re-derives
  local state synchronously (`onSetProperties()` / `computeErrorLabels()` / `paymentDataUpdate()`),
  not a wire callback [os:checkoutDeliverymethod/checkoutDeliverymethod.js:20-29;
  os:checkoutNotification/checkoutNotification.js:41-48].
- **`commerce/checkoutApi`** supplies the container/subscriber base classes, enums, and a small set
  of imperative payment/shipping helpers, consumed by 17 bundles in this family
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:3;
  os:checkoutPaymentSheet/checkoutPaymentSheet.js:2-3;
  os:checkoutPurchaseOrder/checkoutPurchaseOrder.js:4-5;
  os:checkoutLayoutOnepage/checkoutLayoutOnepage.js:1-2]. Names observed in use across the family:
  `CheckoutComponentBase`, `CheckoutContainerBase`, `CheckoutError`, `CheckoutLayout`,
  `CheckoutStage`, `CheckoutStatus`, `applyProcessShippingResult`, `checkoutStatusIsReady`,
  `defaultContainerAspect`, `ekgElapsedTime`, `ekgPublishLogs`, `isSameAvailableDeliveryMethods`,
  `postAuthorizePayment`, `processShippingForPaymentSheet`, `simplePurchaseOrderPayment`. The
  module itself is a platform module — not vendored in this repo — so only its usage surface is
  visible from these citations, not its implementation.
- **`commerce/contextApi`**'s `SessionContextAdapter`/`AppContextAdapter` wires supply cross-cutting
  config alongside the expression-bound checkout data: guest-checkout eligibility, shipping
  countries, split-shipment enablement, managed-checkout version, gifting config, skip-phone-number
  validation [os:checkoutDeliverymethod/checkoutDeliverymethod.js:61-68;
  os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:243-252;
  os:checkoutGiftOptions/checkoutGiftOptions.js:1,24-25].
- **Components that run outside the checkout container tree** — `paymentByExpress` (a self-contained
  express-pay widget) and `paymentProcessing` (the post-redirect landing page) — do **not** extend
  `CheckoutComponentBase` and instead wire `commerce/checkoutCartApi`'s `CheckoutAdapter` /
  `CartStatusAdapter` directly and call its imperative functions (`checkoutUpdate`, `checkoutReload`,
  `checkoutPlaceOrder`, `checkoutSubmitOrder`, `postAuthorizePayment`, `toCheckoutOrderReferenceNumber`)
  [os:paymentByExpress/paymentByExpress.js:11,137-184;
  os:paymentProcessing/paymentProcessing.js:5,87-157]. `commerce/checkoutCartApi` is a different
  module from `commerce/checkoutApi` and is the one imported by components that must work with no
  live container tree present.
- **`commerce/actionApi`** (`dispatchAction`/`dispatchActionAsync` + action-creator factories) is
  used for a narrower slice of mutations that are not "checkout field" mutations per se — Contact
  Point Address CRUD (`createCheckoutAddressesCreateAction`/`UpdateAction`/`PageChangeAction`) and
  cart inventory reservation (`createCartInventoryReserveAction`) — kept separate from the
  `dispatchUpdateAsync`/`dispatchCommit` checkout-engine pair
  [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:4,659-666;
  os:paymentByExpress/paymentByExpress.js:5,288].
- **`commerce/dataEventApi`** (`createCheckoutXDataEvent` + `dispatchDataEvent`) fires D360/analytics
  data events alongside or after checkout mutations — a decoupled side channel, not a mutation path
  [os:checkoutPaymentSheet/checkoutPaymentSheet.js:14,306-315;
  os:checkoutContactInfo/checkoutContactInfo.js:13,110-114;
  os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:17,347-366].
- **Two bundles in this family are pure-JS utility modules with no template**: `site/checkoutAddresses`
  (address/contact/delivery-method equality comparisons + single-line address formatting) and
  `site/checkoutErrorHandler` (error enum + label generation + normalization). Both declare
  `isExposed: true` and a `lightning__ServerRenderable*` capability in their `js-meta.xml` despite
  having no `.html` file in the bundle directory — they exist to be imported by other bundles via
  their `site/...` module specifier, not to render
  [os:checkoutAddresses/checkoutAddresses.js-meta.xml:1-8;
  os:checkoutErrorHandler/checkoutErrorHandler.js-meta.xml:1-8].

## Composition & structure

- **Three-tier container/subscriber hierarchy** (see "Guards"/engine contract section below for the
  mechanics): Layout (root, `CheckoutContainerBase`) → Section (mid-tier, `CheckoutContainerBase`) →
  Component (leaf, `CheckoutComponentBase`). Layouts: `checkoutLayoutOnepage`,
  `checkoutLayoutAccordion` (+ `...Dual` variants for the split credit-card/PO flow)
  [os:checkoutLayoutOnepage/checkoutLayoutOnepage.js:1,11;
  os:checkoutLayoutAccordion/checkoutLayoutAccordion.js:2,10]. Sections: `checkoutSection` itself
  renders either `<site-checkout-section-accordion>` or `<site-checkout-section-one-page>` depending
  on the aspect's `layout` value it received from its own container
  [os:checkoutSection/checkoutSection.js:2,12,41-51; os:checkoutSection/checkoutSection.html:6-45].
- **Container/`*Ui` split** repeats across builder-configurable, responsive components: the
  container (wiring, expression-bound data, derived getters) composes a presentational `*Ui`
  sibling that only owns DOM/click/navigation concerns. `checkoutButton` wires `CartContentsAdapter`
  / `CartStatusAdapter` / `SessionContextAdapter` / `AppContextAdapter`, computes button state, and
  renders two `<experience-responsive size="m-">` / `size="s"` breakpoints that each host
  `<site-checkout-button-ui>` with different derived props (e.g. `cart-total`)
  [os:checkoutButton/checkoutButton.html:1-33]; `checkoutButtonUi` only handles click → navigate and
  a one-time managed-checkout script prefetch [os:checkoutButtonUi/checkoutButtonUi.js:1-81]. Census
  shows the same `hasUiPair` shape for `checkoutGiftOptions`/`checkoutGiftOptionsUi` and
  `paymentAddPaymentMethods`/`...Ui` and `paymentSavedMethodsGrid`/`...Ui` (skimmed, not deep-read).
- **`checkoutDualPayment`** is a plain, non-subscriber tab-switch UI (`selectedSection` state, no
  `CheckoutContainerBase`) that shows/hides its two payment-method children — `checkoutPaymentSheet`
  (credit card) and `checkoutPurchaseOrder` (PO) — via CSS-driven expand classes; the engine
  contract for *which* payment method actually runs is owned by the two children themselves, not by
  the tab switcher [os:checkoutDualPayment/checkoutDualPayment.js:11-59].
- **`checkoutStencil`** is a single reusable component whose `render()` method swaps between eight
  named skeleton templates (`defaultStencil`, `defaultEdit`, `shippingAddress`,
  `shippingAddressPicker`, `shippingAddressEdit`, `shippingMethod`, `payment`, `contactInfoEdit`,
  `cartItems`) keyed by an `@api stencilType` set from the exported `CheckoutStencilType` enum
  [os:checkoutStencil/checkoutStencil.js:1-63]. Leaf components each pick their own `_stencilType`
  constant and show `<site-checkout-stencil>` while not yet ready
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:39,42-43;
  os:checkoutContactInfo/checkoutContactInfo.js:38-41].
- **`checkoutAddressModal`** is a `lightning/modal` (`LightningModal`) subclass opened imperatively
  via `AddressModal.open({...})`, configured with both `@api` data props and plain callback-function
  props (`onsubmit`, `onaddressdirty`) passed straight in the options object rather than only via DOM
  events [os:checkoutAddressModal/checkoutAddressModal.js:1-9;
  os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:565-591,596-624].
- **`checkoutInputAddress`** is a reusable, presentational address-form primitive — a plain
  `LightningElement` (not a `CheckoutComponentBase`) — that exposes get/set `@api` field properties
  plus imperative `focus()` / `checkValidity()` / `reportValidity()` / `validity(report)` methods and
  `addresschanged` / `addressdirty` / `closenewaddressformclick` events. It is consumed both by
  `checkoutAddressModal` and inline by `checkoutDeliveryAddress`'s own address form
  [os:checkoutInputAddress/checkoutInputAddress.js:221-343].
- **`splitShipmentLayout`** is a plain two-column `content`/`summary`-slot layout — despite being
  expression-bound to `{!Checkout.Details}` / `{!Checkout.CartDetails}` / `{!Checkout.CartTotals}`
  like the engine-integrated layouts, it is **not** a `CheckoutContainerBase` subclass; it never
  registers subscribers [os:splitShipmentLayout/splitShipmentLayout.js:1-50]. The actual
  split-shipment item-editing UI lives in the `cart` family (`cartSplitshipment*` bundles per
  census), outside this family's scope.
- **Legal/consent is three small, independent bundles**: `legalConsentOptions` (pure checkbox-list
  presentational component, dispatches `consentchange`)
  [os:legalConsentOptions/legalConsentOptions.js:1-19]; `legalConsentBlanket` (site-wide cookie-style
  consent banner using `commerce/consentApi`'s `hasBlanketConsent`/`needsBlanketConsent`/
  `setBlanketConsent`, page-exclusion list, not checkout-mutation related)
  [os:legalConsentBlanket/legalConsentBlanket.js:1-74]; `legalTermsandconditionsModal` (skimmed —
  a `lightning/modal` for full T&C text, 2 `@api` props per census).

## Events & communication

- **Form-primitive events**: `checkoutInputAddress` dispatches `addresschanged` (`detail: {valid,
  address}`), `addressdirty` (no valid form), and `closenewaddressformclick`
  [os:checkoutInputAddress/checkoutInputAddress.js:317-338].
- **`consentchange`** — `detail: {id, value}` — bubbles from `legalConsentOptions` per checkbox
  toggle [os:legalConsentOptions/legalConsentOptions.js:9-19].
- **`summarytoggle`** (cancelable) bubbles from `checkoutSummary`'s mobile expander and is caught by
  the root layout container to toggle its summary column's expanded class
  [os:checkoutSummary/checkoutSummary.js:70-77; os:checkoutLayoutOnepage/checkoutLayoutOnepage.html:14-15;
  os:checkoutLayoutOnepage/checkoutLayoutOnepage.js:51-53].
- **`navtosplitship`** bubbles from `checkoutDeliveryAddress` when the user picks "ship to multiple
  locations" and is caught on the `content` slot of `checkoutSectionAccordion`, which routes it into
  the same `handleProceed` flow as clicking the section's own proceed button
  [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:639-657;
  os:checkoutSectionAccordion/checkoutSectionAccordion.html:24-30].
- **Payment gateway DOM events** (opaque child element → checkout leaf) — see "Payment isolation"
  under Guards/engine-contract notes below for the full list; these are the *only* channel by which
  `checkoutPaymentSheet`/`paymentByExpress` learn about payment state.
- **`commerce/dataEventApi`** events are a separate, D360/analytics channel (see Data access) — they
  do not participate in checkout-engine aspect/stage messaging and should not be conflated with it.

## Errors, loading, and processing state

- **Readiness gate**: `CheckoutStatus` is a numeric enum — `Unknown=0`, `Ready=200`,
  `AsyncInProgress=202`, `ErrorNotFound=404`, `ErrorConflict=409`, `ErrorDbLock=423`, `ErrorGone=410`,
  `ReadyWithError=422` — and `checkoutStatusIsReady(status)` returns true only for `Ready`/
  `ReadyWithError` [os:checkoutNotification/utils.js:1-14]. `202 AsyncInProgress` means the platform
  is still recalculating (e.g. shipping/tax) after a mutation; UI stays disabled/stenciled until the
  status flips [os:checkoutPlaceOrder/checkoutPlaceOrder.js:65-67;
  os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:57-59].
- **Notifications vs. errors**: `checkoutDetails.notifications` (client/UX-level, groupId-scoped) is
  a separate array from `checkoutDetails.errors` (integration errors from the backend); components
  add/clear their own notification via `dispatchUpdateErrorAsync({groupId, type, exception})` /
  `dispatchUpdateErrorAsync({groupId})` (clear form)
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:104-127;
  os:checkoutNotification/checkoutNotification.js:110-141]. Observed groupIds: `DbbPayment`,
  `DbbDeliveryMethod`, `DbbDeliveryAddress`, `DbbDeliveryAddressPhone`, `DbbDeliveryAddressPerm`,
  `CheckoutPlaceOrder`.
- **`checkoutNotification` display precedence**: `sessionErrors` (fatal — renders a focus-trapped
  modal with "return to cart") is checked first, then `clientErrors` (from `notifications[0]`,
  filtered by type), then `integrationErrors` (from `errors[0]`), else `noErrorLabels`
  [os:checkoutNotification/checkoutNotification.js:110-146]. Fatal errors render
  `<site-common-focus-trap-manager>` wrapping a `role="dialog" aria-modal="true"` section; non-fatal
  errors render inline via `<site-common-scoped-notification>`
  [os:checkoutNotification/checkoutNotification.html:33-95]. Which error `type` strings are shown is
  controlled by per-type boolean `@api` flags mapped to a fixed list of `/commerce/errors/...`,
  `/commerce/integrations/...`, and `/site/commerceErrors/...` type constants
  [os:checkoutNotification/checkoutNotification.js:80-109].
- **EKG performance markers**: `ekgStart`/`ekgEnd`/`ekgElapsedTime`/`ekgPublishLogs`
  (`site/checkoutEkg`) wrap the `Performance` API to time load phases (`'address'`, `'method'`,
  `'0-ekg'`, `'t-checkout-1'`, `'t-address-1'`) and publish deltas onto a hidden `data-ekg` attribute
  that `checkoutNotification` exposes as `aria-hidden` markup for external harvesting
  [os:checkoutEkg/checkoutEkg.js:1-41; os:checkoutNotification/checkoutNotification.js:1,74-79;
  os:checkoutNotification/checkoutNotification.html:11-14].
- **`Deferred` promise class** (`checkoutPaymentSheetDeferredPromise.js`) implements a
  resolve/reject-once, resettable promise used to gate PayPal-style synchronous-approval payment
  flows against the engine's async `PAYMENT` stage
  [os:checkoutPaymentSheet/checkoutPaymentSheetDeferredPromise.js:1-43;
  os:checkoutPaymentSheet/checkoutPaymentSheet.js:411-417,498-507].
- **Processing spinner**: `paymentByExpress` shows `lightning-spinner` gated on
  `_showPaymentProcessingSpinner`, set true on payment approval and cleared on completion or error
  [os:paymentByExpress/paymentByExpress.js:307,356,361; os:paymentByExpress/paymentByExpress.html:2-6].
- **Poll-and-push refresh (a third, narrower data-refresh shape)**: `checkoutPaymentByExpressWrapper`
  — a plain `LightningElement`, not a `CheckoutComponentBase` subscriber — is the family's only
  caller of `checkoutLoadAsyncPoll()` from `commerce/checkoutCartApi`
  [os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:2,44]. Its
  `handleExpressButtonClick` `await`s the poll when its child `<site-checkout-payment-by-express>`
  (`checkoutPaymentByExpress`) dispatches an `expressbuttonclick` event, and on a `200` response
  pushes the polled payload straight onto the child's `@api checkoutDetails` setter via
  `this.refs.checkoutPaymentByExpress.checkoutDetails = ...` — bypassing the
  `dispatchUpdateAsync`/`dispatchCommit` engine channel entirely, because neither
  `checkoutPaymentByExpressWrapper` nor `checkoutPaymentByExpress` extends `CheckoutComponentBase`
  or imports `commerce/checkoutApi`
  [os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:42-48;
  os:checkoutPaymentByExpress/checkoutPaymentByExpress.js:16,115-122,211-219]. **Poll failure has no
  routed error path**: `site/checkoutErrorHandler`'s local `CheckoutError` enum defines a
  `CANNOT_POLL_CHECKOUT` code and maps it to the generic fatal-error body in `convertErrorBody`
  [os:checkoutErrorHandler/errorLabeler.js:6,61], but nothing in this poll path consumes it —
  `checkoutLoadAsyncPoll()` is `await`ed with no `try`/`catch` in
  `checkoutPaymentByExpressWrapper.handleExpressButtonClick`, and neither bundle imports
  `site/checkoutErrorHandler` or has `dispatchUpdateErrorAsync` available (no container tree); a
  rejected poll is an unhandled promise rejection here, not a user-visible, groupId-scoped
  notification like the rest of the family's error handling
  [os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:1-5,42-48]. This is a
  distinct, self-contained refresh strategy from the notify/update cycle documented in the
  "Checkout-engine child contract" section below — it is deliberately reserved for widgets like
  this one that have no live container to receive engine-broadcast aspects.

### Checkout-engine child contract (mutation sequencing, stage lifecycle, payment isolation)

- **Component base contract** (`CheckoutComponentBase`, extended by leaf fields): implement
  `setAspect(newAspect)` to react to container-driven UI state, and `stageAction(checkoutStage)` — a
  `switch` over the `CheckoutStage` enum returning a `Promise` — to participate in the global
  checkout flow. Call `this.dispatchRequestAspect(partial)` to ask the parent container to
  summarize/hide/collapse you, `await this.dispatchUpdateAsync(partialCheckoutDetails)` to stage a
  data change, `this.dispatchCommit()` to send staged changes to the server, and
  `this.dispatchUpdateErrorAsync({groupId, type?, exception?})` to raise/clear your own scoped
  notification [os:checkoutDeliverymethod/checkoutDeliverymethod.js:8,55-57;
  os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:144-187;
  os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:367-396].
- **Container base contract** (`CheckoutContainerBase`, extended by layouts and sections): implement
  `setAspect(newAspect)` to receive aspect from *your* parent, and override lifecycle hooks
  `handleConnect(component)` / `handleDisconnect(component)` / `handleRequestAspect(component,
  {summarizable, uneditable, hideable})` / `handleCommit(component, containerChild)`. Propagate to
  children only through `this.getSubscribers()` + `this.subscriberSetAspect(component, aspect)` /
  `this.subscriberStageAction(component, stage)` — never reach into a child directly
  [os:checkoutSectionOnePage/checkoutSectionOnePage.js:35-79;
  os:checkoutSectionAccordion/checkoutSectionAccordion.js:76-145;
  os:checkoutLayoutAccordion/checkoutLayoutAccordion.js:37-161].
- **Observed `CheckoutStage` values** (usage order across the family, not an asserted canonical
  sequence since the orchestrator itself is a platform module not in this repo):
  `CHECK_VALIDITY_UPDATE`, `REPORT_VALIDITY_SAVE`, `BEFORE_PAYMENT`, `START_PAYMENT_SESSION`,
  `PAYMENT`, `ABORT_PAYMENT_SESSION`, `PERSISTED`, `PREPARE_ORDER`, `SUBMIT_ORDER`, `PLACE_ORDER`
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:148-159;
  os:checkoutPaymentSheet/checkoutPaymentSheet.js:391-421;
  os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:379-396;
  os:checkoutPlaceOrder/checkoutPlaceOrder.js:199-210]. `checkoutPlaceOrder`'s click handler calls
  `this.dispatchFinalizeAsync()` [os:checkoutPlaceOrder/checkoutPlaceOrder.js:86-92] — the trigger
  that starts the platform's stage walk across every registered subscriber in the tree.
  `checkoutSectionAccordion.handleProceed` and `checkoutSectionOnePage.handleNavToSplitShip` show the
  same pattern at section scope: `Promise.all` the subscribers through `REPORT_VALIDITY_SAVE` (and
  `CHECK_VALIDITY_UPDATE`), and on any `false` result roll everyone back through
  `ABORT_PAYMENT_SESSION` before returning, only calling `dispatchCommit()` when every subscriber
  passed [os:checkoutSectionAccordion/checkoutSectionAccordion.js:122-141;
  os:checkoutSectionOnePage/checkoutSectionOnePage.js:89-99].
- **Aspect vocabulary** observed in `setAspect`/`dispatchRequestAspect` payloads: `summary`,
  `collapse`, `hide`, `layout`, `readOnlyIfValid`, `errorFocus`, `showPlaceOrder`, `uneditable`,
  `hideable`, `summarizable` [os:checkoutSectionAccordion/checkoutSectionAccordion.js:76-111;
  os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:367-378].
- **Accordion progression**: the root `checkoutLayoutAccordion` computes an ordered
  `_sortedSections` list from DOM order using `data-checkout-domkey` (set by
  `checkoutSection.setDomKey(suggestedDomKey)`)
  [os:checkoutSection/checkoutSection.js:25-28; os:checkoutLayoutAccordion/checkoutLayoutAccordion.js:101-120],
  then walks the list front-to-back in `setSectionsAspect()`, summarizing/collapsing every finished
  section, showing exactly one "current" section as editable, and flagging the last section with
  `showPlaceOrder: true` [os:checkoutLayoutAccordion/checkoutLayoutAccordion.js:37-80].
- **Mutation sequencing (await chains)**: the family's uniform pattern is *clear-error → await
  mutation → handle success/failure → clear-or-set error again*:
  `checkoutDeliverymethodOptions.handleShippingMethodChange` —
  `await this.dispatchUpdateAsync({...}); this.dispatchCommit();`
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172-187];
  `checkoutContactInfo.handleEmailChange`/`handlePhoneNumberChange` — same await-then-commit shape
  [os:checkoutContactInfo/checkoutContactInfo.js:183-204];
  `checkoutPlaceOrder.placeOrderAndNavigate`/`prepareOrder`/`submitOrderAndNavigate` — each does
  `await this.dispatchUpdateErrorAsync({groupId})` (clear) → `try { await this.dispatchXAsync(); ...
  navigate(...) } catch (e) { await this.dispatchUpdateErrorAsync({groupId, type, exception: e}) }`
  [os:checkoutPlaceOrder/checkoutPlaceOrder.js:95-198];
  `checkoutDeliveryAddress.reportValiditySave` — clears its groupId, `await`s
  `createContactPointAddress`/`updateContactPointAddress` (`commerce/actionApi`) *before*
  `dispatchFormRequest` (which itself `await`s `dispatchUpdateAsync`), catching into the same
  groupId on failure [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:411-482].
- **Debounce for free text**: `checkoutDeliveryAddress.handleAddressChanged` waits
  `INPUT_ADDRESS_CHANGE_DEBOUNCE_WAIT = 3000`ms after the last keystroke before calling
  `dispatchCommit()`, clearing any prior pending timeout on each new keystroke
  [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:20,625-634].
- **Payment isolation**: `checkoutPaymentSheet` never touches raw card data — it delegates to an
  opaque `experience-payment-sheet` custom element (`paymentSheetLocator`) and communicates only
  through named DOM `CustomEvent`s it registers in `connectedCallback`: `paymentsheetloaded`,
  `paymentmethodselected`, `paymentinitiated`, `paymentapproved`, `paymentcancel`, `paymenterrored`
  [os:checkoutPaymentSheet/checkoutPaymentSheet.js:15,382-387,549-564]. Only the resulting
  `paymentToken` and gateway-normalized `billingDetails` cross back into checkout state, inside
  `completePayment()` [os:checkoutPaymentSheet/checkoutPaymentSheet.js:257-325]. `paymentByExpress`
  follows the identical shape against a different opaque element,
  `experience-payment-by-express-container`, with its own named events:
  `paymentbuttonclick`, `paymentshippingratechanged`, `paymentshippingaddresschanged`,
  `paymentbuttonbeforeapprove`, `paymentapproved`, `expresspaymentcancelled`
  [os:paymentByExpress/paymentByExpress.html:10-39]. **Alternate payment methods are pluggable
  siblings behind the same `CheckoutStage.PAYMENT` contract**: `checkoutPaymentSheet` calls
  `postAuthorizePayment(...)` for tokenized card payments
  [os:checkoutPaymentSheet/checkoutPaymentSheet.js:301]; `checkoutPurchaseOrder` implements the same
  stage with `simplePurchaseOrderPayment(checkoutId, poNumber, address)` for PO/invoice payments,
  entirely independent of the card gateway
  [os:checkoutPurchaseOrder/checkoutPurchaseOrder.js:16,46-92]. `checkoutDualPayment` is the
  non-engine tab UI that shows one or the other, but does not itself decide which one "wins" the
  `PAYMENT` stage — each leaf owns that independently.
- **Redirect-based gateways**: `checkoutPaymentSheet` computes a return URL back to a fixed
  `Payment_Processing` named page (with `cartId` as a query param) for gateways that must redirect
  off-site [os:checkoutPaymentSheet/checkoutPaymentSheet.js:24-29,212-225]. The landing component,
  `paymentProcessing`, is a plain `LightningElement` (not `CheckoutComponentBase` — there is no
  container tree after a hard navigation); it dynamically loads an external payment SDK via
  `lightning/platformResourceLoader`'s `loadScript`, guarded by `if (!globalThis.SFPayments)`
  [os:paymentProcessing/paymentProcessing.js:100-111], reads the redirect result via
  `sfp.handleRedirect()`, then imperatively completes the same
  `postAuthorizePayment` → `checkoutSubmitOrder`/`checkoutPlaceOrder` sequence through
  `commerce/checkoutCartApi` [os:paymentProcessing/paymentProcessing.js:112-157].

## Guards

- **Undefined-on-first-render**: pervasive optional chaining on every `checkoutDetails?.x?.y` read
  since the expression-bound property starts `undefined` before the platform resolves it
  [os:checkoutDeliverymethod/checkoutDeliverymethod.js:30-31,48-50; representative of the whole
  family].
- **Guest vs. authenticated**: `SessionContextAdapter.data.isLoggedIn` gates address-book access
  (`_cpaEnabled`) in `checkoutDeliveryAddress`
  [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:269-277], saved-payment-method eligibility
  in `checkoutPaymentSheet` (`_enableSavedPaymentMethods` is `false` unless logged in, unless
  `isBusinessAccountPayment`) [os:checkoutPaymentSheet/checkoutPaymentSheet.js:144-149], and
  contact-info read-only state in `checkoutContactInfo`
  [os:checkoutContactInfo/checkoutContactInfo.js:164-169]. Subscription products cannot be
  guest-checked-out: `checkoutButton._cannotCheckoutWithSubscriptionProducts` blocks the button when
  `isLoggedIn === false` and the cart has subscription items
  [os:checkoutButton/checkoutButton.js:115-123].
- **SSR-safety**: `legalConsentBlanket.isStorefrontEditor` checks `!import.meta.env.SSR` before
  touching `globalThis.location`/`URLSearchParams`
  [os:legalConsentBlanket/legalConsentBlanket.js:46-51]; `checkoutButtonUi`'s managed-checkout
  prefetch guards `document`/`document.head` access the same way
  [os:checkoutButtonUi/checkoutButtonUi.js:41-63]. `checkoutButton.isCartProcessing` guards a
  `window`-dependent `.loading` read with `typeof window !== 'undefined'`
  [os:checkoutButton/checkoutButton.js:66-72].
- **Preview/design mode**: `isPreviewMode`/`isDesignMode` (from `experience/clientApi`) short-circuit
  stencils and auth-gated UI inside Experience Builder — e.g. `checkoutContactInfo.connectedCallback`
  disables the stencil and read-only state in preview
  [os:checkoutContactInfo/checkoutContactInfo.js:82-91]; `checkoutPurchaseOrder._expandedMode` forces
  the component visible in preview [os:checkoutPurchaseOrder/checkoutPurchaseOrder.js:100-107];
  `checkoutNotification.showReturnToCart` is forced `false` in design mode
  [os:checkoutNotification/checkoutNotification.js:146].

## Labels & i18n

- **Token replacement, not a formatting library**: `checkoutSummary` replaces a literal `{0}` in
  `expandableCartItemsTitle` with the parenthesized item count
  [os:checkoutSummary/checkoutSummary.js:19-24; os:checkoutSummary/checkoutSummary.js-meta.xml:17];
  `checkoutDeliverymethodOptions` replaces `{deliveryOptions}`/`{selectedOption}` tokens for its
  assistive-text summary [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:203-209];
  `checkoutPaymentSheet` replaces `{field}` in its required-field validation label
  [os:checkoutPaymentSheet/checkoutPaymentSheet.js:377-380]; `checkoutContactInfo` replaces `{0}`/
  `{1}` for the reCAPTCHA disclaimer's privacy-policy/terms-of-service URLs
  [os:checkoutContactInfo/checkoutContactInfo.js:53].
- **Currency**: `site/commonFormatterCurrency` formats amounts against a per-option
  `currencyIsoCode`, falling back to `@salesforce/i18n/currency` when the cart hasn't resolved a
  currency yet [os:checkoutButton/checkoutButton.js:3,63-65;
  os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:4,211].
- **Locale-driven address formatting**: `site/checkoutAddresses` builds a single-line address string
  by splitting `@salesforce/i18n/locale` into `[langCode, countryCode]` and delegating field order to
  `formatAddressAllFields` [os:checkoutAddresses/checkoutAddresses.js:1,76-90]. Field label swapping
  (state vs. province, zip vs. postal code) and first/last-name order are both driven by
  `site/checkoutInternationalization` helpers keyed off the selected country
  [os:checkoutInputAddress/checkoutInputAddress.js:212-220,248-260,270-272].

## Accessibility

- **Live-region busy indicator**: `checkoutNotification`'s a11y loading indicator is a visually
  hidden `role="status" aria-live="polite"` span, paired with (but separate from) the visible
  `lightning-spinner` [os:checkoutNotification/checkoutNotification.html:3-31].
- **Focus-trapped fatal-error dialog**: session errors render inside
  `<site-common-focus-trap-manager>` wrapping a `role="dialog" aria-modal="true"
  aria-labelledby="modal-heading-01"` section; non-fatal errors instead render an inline
  `<site-common-scoped-notification>` [os:checkoutNotification/checkoutNotification.html:33-95].
- **`errorFocus` aspect**: a container can ask a field to move focus to its own first
  `.slds-has-error` element after a failed validity pass, via `newAspect.errorFocus` in `setAspect`
  — implemented in both `checkoutDeliveryAddress` (single `.slds-has-error` query) and
  `checkoutContactInfo` (ordered candidate list: email ref, phone ref, multi-phone-field ref)
  [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:367-378;
  os:checkoutContactInfo/checkoutContactInfo.js:125-149].
- **Focus-first-control on section reopen**: when a summarized/collapsed accordion or one-page
  section reopens for edit, both `checkoutSectionAccordion.setFocusOnEdit` (200ms debounce) and
  `checkoutSectionOnePage.setAspect` (100ms debounce) query
  `input, select, textarea, button` for the first control with a non-null `offsetParent` and focus
  it [os:checkoutSectionAccordion/checkoutSectionAccordion.js:25-43;
  os:checkoutSectionOnePage/checkoutSectionOnePage.js:35-50].
- **Runtime-derived accessible title**: `checkoutSection.a11yTitle` is not a separate prop — it's
  read at `renderedCallback` time from the rendered `title` slot's own heading text
  (`h1`–`h5`/`p` query), so the visible heading and the accessible name never drift apart
  [os:checkoutSection/checkoutSection.js:66-77].
- **`fieldset`/`legend` wrapping**: `checkoutSectionAccordion`'s template wraps its whole section in
  a `<fieldset>` with a visually-hidden `<legend>` duplicating the visible title, giving the group an
  accessible name independent of the visual header markup
  [os:checkoutSectionAccordion/checkoutSectionAccordion.html:2-9].
- **Live region + `aria-invalid` on the shipping-method radio group**: `checkoutDeliverymethodOptions`
  puts its computed assistive summary in a `slds-assistive-text` node with `aria-live="polite"`
  inside a `<fieldset aria-invalid={_ariaInvalid}>`
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.html:60-74].

## Styling

- **Builder Color props → CSS custom properties**: `experience/styling`'s `generateStyleProperties`
  turns builder-exposed `Color`/`Integer` props into an inline style string of
  `--com-c-button-color`, `--com-c-button-color-hover`, `--com-c-button-color-background`,
  `--com-c-button-color-background-hover`, `--com-c-button-radius-border`,
  `--com-c-button-color-border` [os:checkoutButton/checkoutButton.js:5,93-114;
  os:checkoutPlaceOrder/checkoutPlaceOrder.js:37-58]. `generateElementAlignmentClass` similarly maps
  a builder alignment string to a utility class
  [os:checkoutPlaceOrder/checkoutPlaceOrder.js:59-61; os:checkoutSectionAccordion/checkoutSectionAccordion.js:58-59].
- **Layout-level custom properties**: `checkoutLayoutOnepage` and `splitShipmentLayout` both expose a
  single builder `Color` prop for the summary column and inject it (with a hard-coded fallback) as
  `--checkout-summary-background-color`, alongside a fixed
  `--com-c-checkout-summary-container-cart-items-height: 25rem`
  [os:checkoutLayoutOnepage/checkoutLayoutOnepage.js:22-27;
  os:splitShipmentLayout/splitShipmentLayout.js:41-44].
- **Runtime theme branching**: several components read `--com-c-theme-version` via
  `getComputedStyle(document.documentElement)` at render time and branch class names (`separators`,
  `separators summary`, `separators collapsed`) rather than relying on CSS alone — a live JS/CSS
  hybrid, not a pure styling-hooks pattern
  [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:213-219;
  os:checkoutSectionAccordion/checkoutSectionAccordion.js:146-157;
  os:checkoutSectionOnePage/checkoutSectionOnePage.js:100-103].

## Candidate generation rules

1. For a leaf field that must participate in checkout validity/summarize/error flow, extend
   `CheckoutComponentBase` from `commerce/checkoutApi` and implement `setAspect(newAspect)` +
   `stageAction(checkoutStage)` — don't invent a parallel custom-event contract for the same job.
   [os:checkoutDeliverymethod/checkoutDeliverymethod.js:8,55-57;
   os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:21,367-396]
2. Bind checkout data through a `checkoutDetails` `@api` getter/setter whose `js-meta.xml` default is
   the exact fixed string `{!Checkout.Details}` (copy it verbatim — the platform's runtime resolves
   this specific expression) and re-derive local state inside the setter, not a wire callback.
   [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16;
   os:checkoutNotification/checkoutNotification.js:41-48]
3. Sequence every checkout mutation as `await this.dispatchUpdateAsync(partial)` **then**
   `this.dispatchCommit()` — never call `dispatchCommit()` without a preceding awaited
   `dispatchUpdateAsync` for the same change. [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172-187;
   os:checkoutContactInfo/checkoutContactInfo.js:183-204]
4. Wrap async checkout mutations in try/catch and report failures with
   `dispatchUpdateErrorAsync({groupId, type, exception})` under a stable, component-owned `groupId`;
   clear it with `dispatchUpdateErrorAsync({groupId})` (no type/exception) once resolved.
   [os:checkoutPlaceOrder/checkoutPlaceOrder.js:95-137;
   os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:104-127]
5. Debounce free-text field commits (the family's own address field waits 3000ms) instead of
   dispatching a mutation on every keystroke; cancel the previous pending timeout on each new
   keystroke. [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:20,625-634]
6. Implement `stageAction(checkoutStage)` as a `switch` with a `default: return Promise.resolve(true)`
   — every registered subscriber is walked through every stage by the platform orchestrator, so an
   unhandled stage must still resolve truthy or it reads as a validation failure.
   [os:checkoutPurchaseOrder/checkoutPurchaseOrder.js:83-92;
   os:checkoutContactInfo/checkoutContactInfo.js:151-160]
7. Gate UI on server readiness with `checkoutStatusIsReady(checkoutDetails?.checkoutStatus)` (true
   only for `CheckoutStatus.Ready`/`ReadyWithError`), not a local boolean — `AsyncInProgress` (202)
   means the platform is still recalculating and edits/place-order should stay disabled or stenciled.
   [os:checkoutNotification/utils.js:1-14; os:checkoutPlaceOrder/checkoutPlaceOrder.js:65-67]
8. Show the matching named `<site-checkout-stencil stencil-type={...}>` (from
   `site/checkoutStencil`'s `CheckoutStencilType`) while loading, instead of hand-building a skeleton
   per component. [os:checkoutStencil/checkoutStencil.js:11-63;
   os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:39,42-43]
9. To add a new payment method, build a `CheckoutComponentBase` leaf implementing
   `stageAction(CheckoutStage.PAYMENT)` (and typically `REPORT_VALIDITY_SAVE`) with its own
   `completePayment()`-style method calling the matching `commerce/checkoutApi` payment function
   (`postAuthorizePayment` for tokenized card payments, `simplePurchaseOrderPayment` for PO/invoice
   payments) — new payment methods are new siblings behind the same stage contract, isolated from
   each other, not modifications to the card gateway component.
   [os:checkoutPurchaseOrder/checkoutPurchaseOrder.js:16,46-92;
   os:checkoutPaymentSheet/checkoutPaymentSheet.js:35,257-421]
10. Keep the actual payment-gateway UI behind a single opaque child element (e.g.
    `experience-payment-sheet`, `experience-payment-by-express-container`) and talk to it only
    through its documented custom events — never read card fields off component state; only the
    resulting `paymentToken`/`billingDetails` should reach checkout state.
    [os:checkoutPaymentSheet/checkoutPaymentSheet.js:467-548;
    os:paymentByExpress/paymentByExpress.html:10-39]
11. Components with no live container tree (post-redirect landing pages like `paymentProcessing`, or
    self-contained widgets like `paymentByExpress`) cannot extend `CheckoutComponentBase` — wire
    `commerce/checkoutCartApi`'s `CheckoutAdapter`/`CartStatusAdapter` and call its imperative
    functions directly instead. [os:paymentByExpress/paymentByExpress.js:11,137-184;
    os:paymentProcessing/paymentProcessing.js:5,87-157]
12. When building a new container (layout or section variant), extend `CheckoutContainerBase` and
    propagate to descendants only through `this.getSubscribers()` +
    `this.subscriberSetAspect(component, aspect)` / `subscriberStageAction` — never reach into a
    child directly. [os:checkoutSectionOnePage/checkoutSectionOnePage.js:35-79;
    os:checkoutLayoutAccordion/checkoutLayoutAccordion.js:37-127]
13. Load an external payment/redirect SDK exactly once, guarded by a `globalThis.<SDK>` presence
    check, via `lightning/platformResourceLoader`'s `loadScript`.
    [os:paymentProcessing/paymentProcessing.js:100-111]
14. Use `dispatchDataEvent(this, createCheckoutXDataEvent(...))` from `commerce/dataEventApi` for
    analytics/D360 signals as a side channel, independent of and never a substitute for the
    `dispatchUpdateAsync`/`dispatchCommit` mutation channel.
    [os:checkoutPaymentSheet/checkoutPaymentSheet.js:14,306-315;
    os:checkoutContactInfo/checkoutContactInfo.js:13,110-114]
15. Reuse `checkoutInputAddress` as the address-form primitive (imperative
    `focus()`/`checkValidity()`/`reportValidity()`, `addresschanged`/`addressdirty` events) instead
    of hand-rolling address fields — it already encodes locale-aware field order, state/zip label
    swapping, and compact-street conversion.
    [os:checkoutInputAddress/checkoutInputAddress.js:212-274,339-343]
16. Follow the container/`*Ui` split for builder-configurable, responsive components: wiring and
    expression-bound data stay in the container; DOM/click/navigation-only logic stays in `*Ui`;
    branch responsive markup with `<experience-responsive size="...">` in the container's template.
    [os:checkoutButton/checkoutButton.html:1-33; os:checkoutButtonUi/checkoutButtonUi.js:1-81]
17. Map any new error-type filter toggle to the family's fixed `/commerce/errors/...`,
    `/commerce/integrations/...`, `/site/commerceErrors/...` type-string constants rather than
    inventing new type strings, so `checkoutNotification` (or any future consumer) can filter on
    them. [os:checkoutNotification/checkoutNotification.js:80-109]
18. Reuse `site/checkoutErrorHandler`'s `generateErrorLabel`/`generateNotificationLabel`/
    `exceptionToNotification` helpers to turn a caught exception or a
    `checkoutDetails.notifications[0]`/`errors[0]` entry into a `{header, body}` label pair instead
    of writing new error-shape parsing per component.
    [os:checkoutErrorHandler/errorLabeler.js:123-160; os:checkoutErrorHandler/checkoutException.js:1-19]
19. For a self-contained widget that lives outside the checkout container tree (no
    `CheckoutComponentBase` ancestor) but still needs an on-demand refreshed checkout snapshot,
    call `checkoutLoadAsyncPoll()` from `commerce/checkoutCartApi` imperatively on the triggering
    interaction and push the resolved payload onto a child's `@api` setter directly — this is a
    third, deliberately narrower data-refresh shape alongside expression-bound props (engine tree)
    and wire adapters (`paymentByExpress`/`paymentProcessing`), reserved for widgets with no live
    container to receive engine-broadcast aspects. Wrap the call in `try`/`catch` (the family's
    other out-of-tree callers don't get an engine-supplied error path for it). Model (refresh shape
    only — add the missing guard, don't copy the missing error handling):
    `checkoutPaymentByExpressWrapper.handleExpressButtonClick` →
    `checkoutPaymentByExpress.checkoutDetails` setter.
    [os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:2,42-48;
    os:checkoutPaymentByExpress/checkoutPaymentByExpress.js:115-122]

## Candidate review rules / anti-patterns

1. Flag a `CheckoutComponentBase` mutation handler that calls `dispatchCommit()` without first
   `await`-ing `dispatchUpdateAsync()` for the same change — the commit can race the update and send
   stale/partial data. [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:172-187 is
   the correct await-then-commit reference]
2. Flag `dispatchUpdateErrorAsync({groupId, ...})` calls that reuse another component's known
   groupId (`DbbPayment`, `DbbDeliveryMethod`, `DbbDeliveryAddress`, `DbbDeliveryAddressPhone`,
   `DbbDeliveryAddressPerm`, `CheckoutPlaceOrder`, ...) — groupIds are how a component owns and
   clears its own error; collisions let one component silently clear another's.
   [os:checkoutPaymentSheet/checkoutPaymentSheet.js:258-260,318-322 vs.
   os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:104-127 each own a distinct id]
3. Flag a `stageAction(checkoutStage)` `switch` with no `default` case (or a default that doesn't
   return a resolved `Promise`) — every subscriber is walked through every stage by the engine, so a
   stage falling through to `undefined` reads as a validation failure.
   [os:checkoutContactInfo/checkoutContactInfo.js:151-160 shows the required default-resolve form]
4. Flag any new leaf that reads or stores card/payment field values as component state instead of
   delegating to the opaque gateway element and its event contract — this breaks the family's
   payment-isolation boundary. [os:checkoutPaymentSheet/checkoutPaymentSheet.js:35-90 keeps sensitive
   fields inside the gateway component; only `paymentToken`/`billingDetails` cross back at line 300-301]
5. Flag a checkout field that ignores `newAspect.errorFocus` in `setAspect` — a container may ask a
   field to move focus to its own invalid element after a failed `REPORT_VALIDITY_SAVE`; a component
   that doesn't implement this branch breaks the family's shared focus-management behavior.
   [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:367-378;
   os:checkoutContactInfo/checkoutContactInfo.js:125-149]
6. Flag a checkout field whose `js-meta.xml` `checkoutDetails` default is anything other than the
   literal `{!Checkout.Details}` string, or that renames the property — the shipped description
   explicitly warns "Do not change or delete"; a typo silently leaves the property `undefined`.
   [os:checkoutDeliverymethod/checkoutDeliverymethod.js-meta.xml:16]
7. Flag code that branches on raw numeric `checkoutStatus` literals (200, 202, 404, 409, 410, 422,
   423) instead of the `CheckoutStatus` enum / `checkoutStatusIsReady()` helper — the codes mirror
   HTTP-status-style semantics that are easy to get backwards (e.g. treating 202-async as an error).
   [os:checkoutNotification/utils.js:1-14 is the canonical enum + helper]
8. Flag a new layout/section component that hand-rolls parent/child aspect propagation instead of
   extending `CheckoutContainerBase` and using `getSubscribers()`/`subscriberSetAspect`/
   `subscriberStageAction` — it will not interoperate with the existing layout → section → leaf tree
   or with `dispatchFinalizeAsync()`. [os:checkoutSectionOnePage/checkoutSectionOnePage.js:35-79]
9. Flag a feature that imports `CheckoutError` from `site/checkoutErrorHandler` in one component and
   from `commerce/checkoutApi` in a sibling component of the same feature — these are two different
   import sources whose members happen to overlap on the values actually used, but are not confirmed
   to be the same object (the `commerce/checkoutApi` copy is a platform module not in this repo).
   Pick one source per feature and stay consistent.
   [os:checkoutErrorHandler/errorLabeler.js:4-20 defines a local copy;
   os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:3 imports the same member names
   from commerce/checkoutApi — see Anomalies below]
10. Flag a redirect-return page component (playing `paymentProcessing`'s role) that tries to extend
    `CheckoutComponentBase` or call `dispatchCommit()`/`dispatchUpdateAsync` — there is no checkout
    container on that page after a hard navigation away from checkout; it must drive
    `commerce/checkoutCartApi`'s imperative functions directly.
    (no `CheckoutComponentBase` import; all mutation calls go through `commerce/checkoutCartApi`)
    [os:paymentProcessing/paymentProcessing.js:5]
11. Flag a `loadScript` call for a payment/redirect SDK with no `globalThis.<SDK>` presence guard —
    re-injecting the script on every render/re-mount is wasteful and can throw on double
    registration. [os:paymentProcessing/paymentProcessing.js:102-104 is the guarded reference form]
12. Flag a free-text field's `oninput` handler calling `dispatchCommit()` synchronously on every
    keystroke instead of debouncing — this floods the checkout engine with mutation calls and fights
    the platform's own async recalculation cycle.
    [os:checkoutDeliveryAddress/checkoutDeliveryAddress.js:625-634 is the reference 3000ms debounce]
13. Flag a checkout notification/error component that doesn't distinguish `sessionErrors` (fatal,
    should block the page in a focus-trapped dialog) from `clientErrors`/`integrationErrors`
    (recoverable, inline) — collapsing the distinction diverges from the family's precedence order
    and modal-vs-inline rendering split. [os:checkoutNotification/checkoutNotification.js:110-146]
14. Flag an imperative `commerce/checkoutCartApi` poll call (e.g. `checkoutLoadAsyncPoll()`) that
    isn't wrapped in `try`/`catch` before its result is pushed onto a child's `@api` property —
    unlike the `dispatchUpdateAsync`/`dispatchCommit` engine channel (whose failures route through
    `dispatchUpdateErrorAsync`), a poll call outside the container tree has no engine-supplied error
    path; the shared `CheckoutError.CANNOT_POLL_CHECKOUT` code exists in `site/checkoutErrorHandler`
    but nothing consumes it unless the caller catches the rejection and routes it there itself.
    [os:checkoutPaymentByExpressWrapper/checkoutPaymentByExpressWrapper.js:42-48 is the uncaught
    reference; os:checkoutErrorHandler/errorLabeler.js:6,61 defines the code with no consumer]

## Anomalies & divergences

- **No "Open questions for deep reads" section exists in the supplied `census.md`.** Checked every
  heading in the file (`Bundles per family`, `Module imports (all)`, `Wire adapters`, `Expression
  bindings`, `Apex imports`, `Structure per family`, `Anomalies` → `Rare modules` and `Bundles with
  no js-meta.xml properties`) — none is titled "Open questions." Treated the `Anomalies` section's
  two subsections as the closest equivalent; no checkout/payment-family entries there pointed at
  anything not already covered above.
- **`checkout` family is 100% `os` (68/68); `col` has zero checkout bundles.** No os-vs-col
  divergence exists for this family — confirmed directly from the census slice, not inferred.
- **`CheckoutError` enum has two distinct import sources with overlapping member names.**
  `site/checkoutErrorHandler`'s `errorLabeler.js` defines its own `CheckoutError` enum
  (`CANNOT_START_CHECKOUT`, `NO_DELIVERY_METHODS`, `MISSING_ORDER_REFERENCE_NUMBER`,
  `CANNOT_POLL_CHECKOUT`, etc.) [os:checkoutErrorHandler/errorLabeler.js:4-20], re-exported (not
  redefined) by the bundle's `checkoutErrorHandler.js` barrel
  [os:checkoutErrorHandler/checkoutErrorHandler.js:1] — `checkoutException.js` in the same bundle
  holds only `exceptionToNotification` and does not define the enum
  [os:checkoutErrorHandler/checkoutException.js:1-19]. `checkoutDeliverymethodOptions.js`
  imports the same-named `CheckoutError` (and uses `.NO_DELIVERY_METHODS`) from `commerce/checkoutApi`
  instead [os:checkoutDeliverymethodOptions/checkoutDeliverymethodOptions.js:3,120]. Since
  `commerce/checkoutApi` is a platform module not vendored in this repo, it cannot be confirmed
  whether the two are the same object or two independently-maintained enums that happen to agree on
  the values this family actually uses. Recorded as a divergence, not resolved.
- **Two "component" bundles are pure JS module packages with no `.html`.**
  `checkoutAddresses` and `checkoutErrorHandler` both ship a `js-meta.xml` with `isExposed: true`
  and a `lightning__ServerRenderable*` capability but have no template file in their bundle directory
  — confirmed via directory listing (`checkoutAddresses`: `_meta.json`, `checkoutAddresses.js`,
  `checkoutAddresses.js-meta.xml`, `content.json`, `labels.js`, `utils.js` — no `.html`; same shape
  for `checkoutErrorHandler`). This is a legitimate first-class pattern in the family (utility
  modules imported by `site/...` specifier), not a build defect.
- **Census's `hasUiPair` flag is a naming-convention match, not an import-graph match.**
  `checkoutButton` is flagged `hasUiPair: true` in the census, but `checkoutButton.js` never
  `import`s `checkoutButtonUi` as a JS module — the relationship is expressed only through the child
  custom element tag `<site-checkout-button-ui>` in `checkoutButton.html`
  [os:checkoutButton/checkoutButton.html:3,19]. Anyone consuming the census's `hasUiPair` field
  programmatically should treat it as "same base name exists," not "one imports the other."
- **`splitShipmentLayout` looks like a third `CheckoutContainerBase` layout but isn't one.** It
  shares the expression-binding surface (`{!Checkout.Details}`, `{!Checkout.CartDetails}`,
  `{!Checkout.CartTotals}`) and the two-column content/summary shape of `checkoutLayoutOnepage`, but
  is a plain `LightningElement` that never registers subscribers
  [os:splitShipmentLayout/splitShipmentLayout.js:1-50] — confirmed by the absence of any
  `commerce/checkoutApi` import in the file, unlike `checkoutLayoutOnepage`
  [os:checkoutLayoutOnepage/checkoutLayoutOnepage.js:1-2]. Split shipment is architecturally a
  separate page/flow, not a `CheckoutStage` participant.
- **"checkout family" in the census is a directory/naming grouping, not a guarantee of
  `commerce/checkoutApi` usage.** `paymentByExpress` and `paymentProcessing` are both filed under
  `family: checkout` but neither imports `commerce/checkoutApi` — both use `commerce/checkoutCartApi`
  instead [os:paymentByExpress/paymentByExpress.js:11; os:paymentProcessing/paymentProcessing.js:5].
  Anyone mining the census by family for "uses the checkout engine" should additionally filter on
  the actual `commerce/checkoutApi` import list.
